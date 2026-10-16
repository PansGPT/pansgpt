# ==============================================================================
# ARQ Worker Settings (Phase 5)
# Background job runner connected to Upstash Redis queue
# ==============================================================================

from arq import func  # [PHASE2 FIX]
from arq.connections import RedisSettings

from app.core.config import settings
from workers.tasks import describe_document_images_job, ingest_document_job  # [PHASE2 FIX]

PICTURE_QUEUE_NAME = "arq:picture_queue"  # [QUEUE SPLIT]


def get_redis_settings() -> RedisSettings:
    """Parse Upstash Redis DSN for ARQ worker queue."""
    url = settings.redis_connection_url
    if url:
        return RedisSettings.from_dsn(url)
    # Default localhost for local test workers
    return RedisSettings(host="localhost", port=6379)


class WorkerSettings:  # [QUEUE SPLIT]
    """Configuration class for main arq worker process: `python -m arq workers.settings.WorkerSettings`."""  # [QUEUE SPLIT]

    functions = [  # [QUEUE SPLIT]
        func(ingest_document_job, timeout=1800),  # [QUEUE SPLIT]
    ]  # [QUEUE SPLIT]
    redis_settings = get_redis_settings()
    max_jobs = 3  # Free tier single-worker concurrency limit
    job_timeout = 1800  # 30 minutes maximum per monograph ingestion [WORKER FIX 4]
    poll_delay = 30.0  # Idle poll interval: ~86.4K commands/month (<=100K budget) [QUEUE SPLIT]
    keep_result = 3600  # Retain job results for 1 hour


class PictureWorkerSettings:  # [QUEUE SPLIT]
    """Configuration class for on-demand picture worker process: `python -m arq workers.settings.PictureWorkerSettings`."""  # [QUEUE SPLIT]

    queue_name = PICTURE_QUEUE_NAME  # [QUEUE SPLIT]
    functions = [  # [QUEUE SPLIT]
        func(describe_document_images_job, timeout=7200, max_tries=8),  # [QUEUE SPLIT]
    ]  # [QUEUE SPLIT]
    redis_settings = get_redis_settings()  # [QUEUE SPLIT]
    max_jobs = 1  # Concurrency limit for image vision tasks [QUEUE SPLIT]
    job_timeout = 7200  # 2 hours maximum per document image description job [QUEUE SPLIT]
    burst = True  # Auto-exit when queue is empty (0 idle Redis cost) [QUEUE SPLIT]
    keep_result = 3600  # Retain job results for 1 hour [QUEUE SPLIT]
