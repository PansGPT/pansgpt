# ==============================================================================
# ARQ Worker Settings (Phase 5)
# Background job runner connected to Upstash Redis queue
# ==============================================================================

from arq import func  # [PHASE2 FIX]
from arq.connections import RedisSettings

from app.core.config import settings
from workers.tasks import describe_document_images_job, ingest_document_job  # [PHASE2 FIX]


def get_redis_settings() -> RedisSettings:
    """Parse Upstash Redis DSN for ARQ worker queue."""
    url = settings.redis_connection_url
    if url:
        return RedisSettings.from_dsn(url)
    # Default localhost for local test workers
    return RedisSettings(host="localhost", port=6379)


class WorkerSettings:
    """Configuration class for arq worker process: `arq workers.settings.WorkerSettings`."""

    functions = [  # [WORKER FIX 4]
        func(ingest_document_job, timeout=1800),  # [WORKER FIX 4]
        func(describe_document_images_job, timeout=7200, max_tries=8),  # [PHASE2 FIX]
    ]  # [WORKER FIX 4]
    redis_settings = get_redis_settings()
    max_jobs = 3  # Free tier single-worker concurrency limit
    job_timeout = 1800  # 30 minutes maximum per monograph ingestion [WORKER FIX 4]
    keep_result = 3600  # Retain job results for 1 hour
