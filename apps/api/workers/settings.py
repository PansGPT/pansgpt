# ==============================================================================
# ARQ Worker Settings (Phase 5)
# Background job runner connected to Upstash Redis queue
# ==============================================================================

from arq.connections import RedisSettings

from app.core.config import settings
from workers.tasks import ingest_document_job


def get_redis_settings() -> RedisSettings:
    """Parse Upstash Redis DSN for ARQ worker queue."""
    url = settings.redis_connection_url
    if url:
        return RedisSettings.from_dsn(url)
    # Default localhost for local test workers
    return RedisSettings(host="localhost", port=6379)


class WorkerSettings:
    """Configuration class for arq worker process: `arq workers.settings.WorkerSettings`."""

    functions = [ingest_document_job]
    redis_settings = get_redis_settings()
    max_jobs = 3  # Free tier single-worker concurrency limit
    job_timeout = 600  # 10 minutes maximum per monograph ingestion
    keep_result = 3600  # Retain job results for 1 hour
