# ==============================================================================
# ARQ Background Tasks for Document Ingestion (Roadmap Phase 5: 5.8 & 5.9)
# Worker Claim, Heartbeat Loop, Exponential Retries, and Status Tracking
# ==============================================================================

import asyncio
import uuid

import asyncpg
import fitz  # PyMuPDF for reading real page count from PDF bytes  # [OFFICE PDF FIX]
import structlog
from arq import Retry

from app.core.config import settings
from app.engines.converter import convert_office_to_pdf  # [OFFICE PDF FIX]
from app.engines.ingestion import document_ingestion_engine
from app.engines.storage import build_converted_storage_key, storage_engine  # [OFFICE PDF FIX]

logger = structlog.get_logger(__name__)


async def _claim_document(document_id: str, worker_id: uuid.UUID | None = None) -> bool:
    """
    Attempts to atomically claim a document for ingestion using the DB RPC function.
    Returns True if successfully claimed, False if already claimed or unavailable.
    """
    if not settings.DATABASE_URL:
        # In mock / non-DB dev environments, allow job to proceed
        return True
    worker_id = worker_id or uuid.uuid4()

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
        row = await conn.fetchrow(
            "SELECT public.claim_document_ingestion($1, $2) AS claimed;",
            uuid.UUID(document_id),
            worker_id,
        )
        await conn.close()
        if row and row["claimed"] is True:
            return True
        return False
    except Exception as e:
        logger.warning("worker_claim_call_failed", document_id=document_id, error=str(e))
        return False


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


async def _heartbeat_loop(document_id: str, worker_id: uuid.UUID, interval: int = 30):
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
                    "SELECT public.heartbeat_document_ingestion($1, $2);",
                    uuid.UUID(document_id),
                    worker_id,
                )
                await conn.close()
                logger.debug("worker_heartbeat_ping_sent", document_id=document_id)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("worker_heartbeat_failed", document_id=document_id, error=str(e))


async def _get_document_meta(document_id: str) -> dict | None:  # [OFFICE PDF FIX]
    """Fetches document metadata including storage_key, mime_type, and converted_key."""  # [OFFICE PDF FIX]
    if not settings.DATABASE_URL:  # [OFFICE PDF FIX]
        return None  # [OFFICE PDF FIX]
    try:  # [OFFICE PDF FIX]
        conn = await asyncpg.connect(
            settings.DATABASE_URL, statement_cache_size=0
        )  # [OFFICE PDF FIX]
        row = await conn.fetchrow(  # [OFFICE PDF FIX]
            """  # [OFFICE PDF FIX]
            SELECT id, storage_key, mime_type, converted_key, university_id, course_code, page_count  # [OFFICE PDF FIX]
            FROM public.documents  # [OFFICE PDF FIX]
            WHERE id = $1;  # [OFFICE PDF FIX]
            """,  # [OFFICE PDF FIX]
            uuid.UUID(document_id),  # [OFFICE PDF FIX]
        )  # [OFFICE PDF FIX]
        await conn.close()  # [OFFICE PDF FIX]
        return dict(row) if row else None  # [OFFICE PDF FIX]
    except Exception as e:  # [OFFICE PDF FIX]
        logger.warning(
            "worker_get_document_meta_failed", document_id=document_id, error=str(e)
        )  # [OFFICE PDF FIX]
        return None  # [OFFICE PDF FIX]


async def _update_document_converted_info(  # [OFFICE PDF FIX]
    document_id: str,
    converted_key: str,
    page_count: int | None = None,  # [OFFICE PDF FIX]
) -> None:  # [OFFICE PDF FIX]
    """Updates documents.converted_key and optionally page_count."""  # [OFFICE PDF FIX]
    if not settings.DATABASE_URL:  # [OFFICE PDF FIX]
        return  # [OFFICE PDF FIX]
    try:  # [OFFICE PDF FIX]
        conn = await asyncpg.connect(
            settings.DATABASE_URL, statement_cache_size=0
        )  # [OFFICE PDF FIX]
        if page_count is not None:  # [OFFICE PDF FIX]
            await conn.execute(  # [OFFICE PDF FIX]
                """  # [OFFICE PDF FIX]
                UPDATE public.documents  # [OFFICE PDF FIX]
                SET converted_key = $1, page_count = $2, updated_at = NOW()  # [OFFICE PDF FIX]
                WHERE id = $3;  # [OFFICE PDF FIX]
                """,  # [OFFICE PDF FIX]
                converted_key,  # [OFFICE PDF FIX]
                page_count,  # [OFFICE PDF FIX]
                uuid.UUID(document_id),  # [OFFICE PDF FIX]
            )  # [OFFICE PDF FIX]
        else:  # [OFFICE PDF FIX]
            await conn.execute(  # [OFFICE PDF FIX]
                """  # [OFFICE PDF FIX]
                UPDATE public.documents  # [OFFICE PDF FIX]
                SET converted_key = $1, updated_at = NOW()  # [OFFICE PDF FIX]
                WHERE id = $2;  # [OFFICE PDF FIX]
                """,  # [OFFICE PDF FIX]
                converted_key,  # [OFFICE PDF FIX]
                uuid.UUID(document_id),  # [OFFICE PDF FIX]
            )  # [OFFICE PDF FIX]
        await conn.close()  # [OFFICE PDF FIX]
    except Exception as e:  # [OFFICE PDF FIX]
        logger.warning(
            "worker_update_converted_info_failed", document_id=document_id, error=str(e)
        )  # [OFFICE PDF FIX]


async def ingest_document_job(  # [OFFICE PDF FIX]
    ctx: dict,  # [OFFICE PDF FIX]
    document_id: str,  # [OFFICE PDF FIX]
    storage_key: str,  # [OFFICE PDF FIX]
    force_reconvert: bool = False,  # [OFFICE PDF FIX]
) -> bool:  # [OFFICE PDF FIX]
    """
    ARQ Background Job:
    1. Claims document concurrency lock via `claim_document_ingestion`
    2. Transitions status to 'processing'
    3. Spawns 30s heartbeat loop
    4. Converts Office files (.doc, .docx, .ppt, .pptx) to faithful visual PDF via LibreOffice  # [OFFICE PDF FIX]
    5. Runs full 8-stage extraction, chunking, and 1536d vector pipeline on the PDF  # [DIM 1536]
    6. Retries with exponential backoff on transient errors (30s, 60s, 120s)
    7. Transitions status to 'completed' (or 'failed' if retries exhausted)
    """
    job_try = ctx.get("job_try", 1) if isinstance(ctx, dict) else 1
    logger.info(
        "worker_starting_ingest_job",
        document_id=document_id,
        key=storage_key,
        attempt=job_try,
        force_reconvert=force_reconvert,  # [OFFICE PDF FIX]
    )
    worker_id = uuid.uuid4()

    # 1. Concurrency Claim Check
    claimed = await _claim_document(document_id, worker_id)
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
    heartbeat_task = asyncio.create_task(_heartbeat_loop(document_id, worker_id, interval=30))

    try:
        # Determine if file is Office format (.doc, .docx, .ppt, .pptx)  # [OFFICE PDF FIX]
        ext = (
            storage_key.rsplit(".", 1)[-1].lower() if "." in storage_key else ""
        )  # [OFFICE PDF FIX]
        doc_meta = await _get_document_meta(document_id)  # [OFFICE PDF FIX]
        mime_type = doc_meta.get("mime_type") if doc_meta else ""  # [OFFICE PDF FIX]
        university_id = doc_meta.get("university_id") if doc_meta else None  # [OFFICE PDF FIX]
        course_code = doc_meta.get("course_code") if doc_meta else None  # [OFFICE PDF FIX]
        db_converted_key = doc_meta.get("converted_key") if doc_meta else None  # [OFFICE PDF FIX]

        office_extensions = ("doc", "docx", "ppt", "pptx")  # [OFFICE PDF FIX]
        is_office = ext in office_extensions  # [OFFICE PDF FIX]
        if not is_office and mime_type:  # [OFFICE PDF FIX]
            mime_lower = mime_type.lower()  # [OFFICE PDF FIX]
            if any(
                m in mime_lower for m in ("wordprocessing", "msword", "officedocument.word")
            ):  # [OFFICE PDF FIX]
                is_office = True  # [OFFICE PDF FIX]
                ext = ext or "docx"  # [OFFICE PDF FIX]
            elif any(
                m in mime_lower
                for m in ("presentation", "powerpoint", "officedocument.presentation")
            ):  # [OFFICE PDF FIX]
                is_office = True  # [OFFICE PDF FIX]
                ext = ext or "pptx"  # [OFFICE PDF FIX]

        key_to_ingest = storage_key  # [OFFICE PDF FIX]
        if is_office:  # [OFFICE PDF FIX]
            reused = False  # [OFFICE PDF FIX]
            if db_converted_key and not force_reconvert:  # [OFFICE PDF FIX]
                if storage_engine.is_configured:  # [OFFICE PDF FIX]
                    if await storage_engine.object_exists(db_converted_key):  # [OFFICE PDF FIX]
                        key_to_ingest = db_converted_key  # [OFFICE PDF FIX]
                        reused = True  # [OFFICE PDF FIX]
                else:  # [OFFICE PDF FIX]
                    key_to_ingest = db_converted_key  # [OFFICE PDF FIX]
                    reused = True  # [OFFICE PDF FIX]

            if not reused:  # [OFFICE PDF FIX]
                original_bytes = await storage_engine.download_bytes(
                    storage_key
                )  # [OFFICE PDF FIX]
                if not original_bytes:  # [OFFICE PDF FIX]
                    raise FileNotFoundError(
                        f"Original Office file '{storage_key}' not found in R2."
                    )  # [OFFICE PDF FIX]

                pdf_bytes = await convert_office_to_pdf(
                    original_bytes, ext or "docx"
                )  # [OFFICE PDF FIX]
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [OFFICE PDF FIX]
                real_page_count = doc.page_count  # [OFFICE PDF FIX]
                doc.close()  # [OFFICE PDF FIX]

                if not db_converted_key and (not university_id or not course_code):  # [VISION FIX]
                    raise ValueError(  # [VISION FIX]
                        f"Cannot convert Office document '{document_id}': "  # [VISION FIX]
                        "missing university_id or course_code in database metadata."  # [VISION FIX]
                    )  # [VISION FIX]
                target_converted_key = (
                    db_converted_key
                    or build_converted_storage_key(  # [VISION FIX]
                        document_id,  # [VISION FIX]
                        university_id=str(university_id) if university_id else None,  # [VISION FIX]
                        course_code=course_code,  # [VISION FIX]
                    )
                )  # [VISION FIX]
                await storage_engine.upload_bytes(  # [OFFICE PDF FIX]
                    target_converted_key,  # [OFFICE PDF FIX]
                    pdf_bytes,  # [OFFICE PDF FIX]
                    content_type="application/pdf",  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]
                await _update_document_converted_info(  # [OFFICE PDF FIX]
                    document_id,
                    target_converted_key,
                    page_count=real_page_count,  # [OFFICE PDF FIX]
                )  # [OFFICE PDF FIX]
                key_to_ingest = target_converted_key  # [OFFICE PDF FIX]
            else:  # [OFFICE PDF FIX]
                # Reused: ensure page_count is synchronized if not set  # [OFFICE PDF FIX]
                if not doc_meta or not doc_meta.get("page_count"):  # [OFFICE PDF FIX]
                    try:  # [OFFICE PDF FIX]
                        existing_pdf_bytes = await storage_engine.download_bytes(
                            key_to_ingest
                        )  # [OFFICE PDF FIX]
                        if existing_pdf_bytes:  # [OFFICE PDF FIX]
                            doc = fitz.open(
                                stream=existing_pdf_bytes, filetype="pdf"
                            )  # [OFFICE PDF FIX]
                            real_page_count = doc.page_count  # [OFFICE PDF FIX]
                            doc.close()  # [OFFICE PDF FIX]
                            await _update_document_converted_info(  # [OFFICE PDF FIX]
                                document_id,
                                key_to_ingest,
                                page_count=real_page_count,  # [OFFICE PDF FIX]
                            )  # [OFFICE PDF FIX]
                    except Exception:  # [OFFICE PDF FIX]
                        pass  # [OFFICE PDF FIX]

        # 4. Run ingestion pipeline on key_to_ingest (converted PDF key or original PDF)  # [OFFICE PDF FIX]
        success = await document_ingestion_engine.ingest_document_from_r2(  # [OFFICE PDF FIX]
            document_id=document_id,  # [OFFICE PDF FIX]
            storage_key=key_to_ingest,  # [OFFICE PDF FIX]
        )  # [OFFICE PDF FIX]
        logger.info(  # [OFFICE PDF FIX]
            "worker_completed_ingest_job",  # [OFFICE PDF FIX]
            document_id=document_id,  # [OFFICE PDF FIX]
            key=key_to_ingest,  # [OFFICE PDF FIX]
            success=success,  # [OFFICE PDF FIX]
        )  # [OFFICE PDF FIX]
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
