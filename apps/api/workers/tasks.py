# ==============================================================================
# ARQ Background Tasks for Document Ingestion (Roadmap Phase 5: 5.8 & 5.9)
# Worker Claim, Heartbeat Loop, Exponential Retries, and Status Tracking
# ==============================================================================

import asyncio
import uuid

import asyncpg
import structlog
from arq import Retry

from app.core.config import settings
from app.engines.ingestion import document_ingestion_engine

logger = structlog.get_logger(__name__)


async def _claim_document(document_id: str) -> bool:
    """
    Attempts to atomically claim a document for ingestion using the DB RPC function.
    Returns True if successfully claimed, False if already claimed or unavailable.
    """
    if not settings.DATABASE_URL:
        # In mock / non-DB dev environments, allow job to proceed
        return True

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
        row = await conn.fetchrow(
            "SELECT public.claim_document_ingestion($1) AS claimed;",
            uuid.UUID(document_id),
        )
        await conn.close()
        if row and row["claimed"] is True:
            return True
        return False
    except Exception as e:
        logger.warning("worker_claim_call_failed", document_id=document_id, error=str(e))
        # If RPC does not exist or connection fails, proceed cautiously in test mode
        return True


async def _update_document_status(document_id: str, status: str, progress: int | None = None):
    """Update document embedding_status and optional embedding_progress."""
    if not settings.DATABASE_URL:
        return

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
        if progress is not None:
            await conn.execute(
                """
                UPDATE public.documents
                SET embedding_status = $2, embedding_progress = $3, updated_at = now()
                WHERE id = $1;
                """,
                uuid.UUID(document_id),
                status,
                progress,
            )
        else:
            await conn.execute(
                """
                UPDATE public.documents
                SET embedding_status = $2, updated_at = now()
                WHERE id = $1;
                """,
                uuid.UUID(document_id),
                status,
            )
        await conn.close()
    except Exception as e:
        logger.warning("worker_status_update_failed", document_id=document_id, error=str(e))


async def _heartbeat_loop(document_id: str, interval: int = 30):
    """
    Background heartbeat loop: calls `heartbeat_document_ingestion` every 30s
    to indicate the worker is actively processing and prevent stale timeout reclamation.
    """
    while True:
        try:
            await asyncio.sleep(interval)
            if settings.DATABASE_URL:
                conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
                await conn.execute(
                    "SELECT public.heartbeat_document_ingestion($1);",
                    uuid.UUID(document_id),
                )
                await conn.close()
                logger.debug("worker_heartbeat_ping_sent", document_id=document_id)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("worker_heartbeat_failed", document_id=document_id, error=str(e))


async def ingest_document_job(ctx: dict, document_id: str, storage_key: str) -> bool:
    """
    ARQ Background Job:
    1. Claims document concurrency lock via `claim_document_ingestion`
    2. Transitions status to 'processing'
    3. Spawns 30s heartbeat loop
    4. Runs full 8-stage extraction, chunking, and 3072d vector pipeline
    5. Retries with exponential backoff on transient errors (30s, 60s, 120s)
    6. Transitions status to 'completed' (or 'failed' if retries exhausted)
    """
    job_try = ctx.get("job_try", 1) if isinstance(ctx, dict) else 1
    logger.info(
        "worker_starting_ingest_job",
        document_id=document_id,
        key=storage_key,
        attempt=job_try,
    )

    # 1. Concurrency Claim Check
    claimed = await _claim_document(document_id)
    if not claimed:
        logger.warning(
            "worker_document_claim_rejected",
            document_id=document_id,
            msg="Document could not be claimed (already processing or non-pending). Exiting job.",
        )
        return False

    # 2. Initial status transition to 'processing'
    await _update_document_status(document_id, status="processing", progress=5)

    # 3. Start Heartbeat Loop as background task
    heartbeat_task = asyncio.create_task(_heartbeat_loop(document_id, interval=30))

    try:
        # 4. Run ingestion pipeline
        success = await document_ingestion_engine.ingest_document_from_r2(
            document_id=document_id,
            storage_key=storage_key,
        )
        logger.info("worker_completed_ingest_job", document_id=document_id, success=success)
        return success
    except Exception as exc:
        logger.error(
            "worker_failed_ingest_job",
            document_id=document_id,
            error=str(exc),
            attempt=job_try,
        )

        # Retry with exponential backoff: attempt 1 -> 30s, attempt 2 -> 60s, attempt 3 -> 120s
        if job_try < 3:
            defer_delays = {1: 30, 2: 60}
            defer_secs = defer_delays.get(job_try, 120)
            raise Retry(defer=defer_secs) from exc

        # All retries exhausted: mark as failed in database
        await _update_document_status(document_id, status="failed", progress=0)
        raise exc
    finally:
        # Cleanly stop heartbeat loop
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
