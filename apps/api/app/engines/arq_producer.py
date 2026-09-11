# ==============================================================================
# ARQ Job Producer Engine (Roadmap Phase 5: 5.8)
# Enqueues asynchronous document processing jobs to Upstash Redis
# ==============================================================================

import structlog
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings

logger = structlog.get_logger(__name__)


async def enqueue_ingestion_job(
    document_id: str,
    storage_key: str,
) -> str | None:
    """
    Enqueues an `ingest_document_job` to the ARQ Redis task queue.
    Returns the ARQ job_id if successfully enqueued, or None if Redis is not configured
    (such as in local CI / test environments).
    """
    redis_url = settings.UPSTASH_REDIS_URL or settings.REDIS_URL
    if not redis_url or "placeholder" in redis_url.lower() or "test" in redis_url.lower():
        logger.warning(
            "arq_redis_unconfigured_skipping_queue",
            document_id=document_id,
            msg="No operational Redis URL configured. Ingestion job was not enqueued.",
        )
        return None

    try:
        redis_settings = RedisSettings.from_dsn(redis_url)
        redis_pool = await create_pool(redis_settings)
        job = await redis_pool.enqueue_job(
            "ingest_document_job",
            document_id=document_id,
            storage_key=storage_key,
        )
        await redis_pool.close()

        logger.info(
            "ingestion_job_enqueued",
            document_id=document_id,
            job_id=job.job_id if job else None,
        )
        return job.job_id if job else None
    except Exception as e:
        logger.error(
            "arq_enqueue_failed",
            document_id=document_id,
            error=str(e),
        )
        return None
