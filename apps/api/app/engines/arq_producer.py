# ==============================================================================
# ARQ Job Producer Engine (Roadmap Phase 5: 5.8)
# Enqueues asynchronous document processing jobs to Upstash Redis
# ==============================================================================

import structlog
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.engines.job_outbox import deliver_job, record_job

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
    job_id = await record_job(document_id, storage_key, "ingest_document_job")
    if not settings.ENABLE_INGESTION or not settings.provider_privacy_allowed("google"):
        return job_id
    redis_url = settings.UPSTASH_REDIS_URL or settings.REDIS_URL
    if not redis_url or "placeholder" in redis_url.lower() or "test" in redis_url.lower():
        logger.warning(
            "arq_redis_unconfigured_skipping_queue",
            document_id=document_id,
            msg="No operational Redis URL configured. Ingestion job was not enqueued.",
        )
        return job_id

    try:
        redis_settings = RedisSettings.from_dsn(redis_url)
        redis_pool = await create_pool(redis_settings)
        try:
            await deliver_job(redis_pool, job_id, "ingest_document_job", document_id, storage_key)
        finally:
            await redis_pool.aclose()
        return job_id

    except Exception as e:
        logger.error(
            "arq_enqueue_failed",
            document_id=document_id,
            error=str(e),
        )
        return job_id
