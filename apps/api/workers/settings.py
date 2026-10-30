# ==============================================================================
# ARQ Worker Settings (Phase 5)
# Background job runner connected to Upstash Redis queue
# ==============================================================================

from arq import cron, func  # [PHASE2 FIX]
from arq.connections import RedisSettings

from app.core.config import settings
from app.engines.job_outbox import reconcile_jobs
from workers.maintenance import cleanup_storage, shutdown, startup
from workers.quiz import dispatch_quiz_jobs, generate_quiz_job
from workers.quiz_inventory import warm_quiz_inventory
from workers.tasks import describe_document_images_job, ingest_document_job  # [PHASE2 FIX]

PICTURE_QUEUE_NAME = "arq:picture_queue"  # [QUEUE SPLIT]


def get_redis_settings() -> RedisSettings:
    """Parse Upstash Redis DSN for ARQ worker queue."""
    url = settings.redis_connection_url
    if url:  # [QUEUE SPLIT 2]
        redis_settings = RedisSettings.from_dsn(url)  # [QUEUE SPLIT 2]
    else:  # [QUEUE SPLIT 2]
        redis_settings = RedisSettings(host="localhost", port=6379)  # [QUEUE SPLIT 2]
    redis_settings.conn_timeout = 10  # [QUEUE SPLIT 2]
    redis_settings.conn_retries = 5  # [QUEUE SPLIT 2]
    redis_settings.conn_retry_delay = 2  # [QUEUE SPLIT 2]
    return redis_settings  # [QUEUE SPLIT 2]


class WorkerSettings:  # [QUEUE SPLIT]
    """Main worker settings; launch with `python -m workers.runner` for instant quiz pickup."""  # [QUEUE SPLIT]

    on_startup = startup
    on_shutdown = shutdown
    cron_jobs = [
        cron(reconcile_jobs, second={0}),
        cron(dispatch_quiz_jobs, second={15}, run_at_startup=True),
        cron(warm_quiz_inventory, minute={0, 10, 20, 30, 40, 50}, second={5}),
        cron(
            cleanup_storage,
            minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
            run_at_startup=True,
        ),
    ]
    functions = [  # [QUEUE SPLIT]
        func(ingest_document_job, timeout=1800),  # [QUEUE SPLIT]
        func(generate_quiz_job, timeout=1800),
    ]  # [QUEUE SPLIT]
    redis_settings = get_redis_settings()
    max_jobs = 3  # Free tier single-worker concurrency limit
    job_timeout = 1800  # 30 minutes maximum per monograph ingestion [WORKER FIX 4]
    poll_delay = 30.0  # Idle poll interval: ~86.4K commands/month (<=100K budget) [QUEUE SPLIT]
    keep_result = 3600  # Retain job results for 1 hour


class PictureWorkerSettings:  # [QUEUE SPLIT]
    """Configuration class for on-demand picture worker process: `python -m arq workers.settings.PictureWorkerSettings`."""  # [QUEUE SPLIT]

    on_startup = startup
    on_shutdown = shutdown
    queue_name = PICTURE_QUEUE_NAME  # [QUEUE SPLIT]
    functions = [  # [QUEUE SPLIT]
        func(describe_document_images_job, timeout=7200, max_tries=8),  # [QUEUE SPLIT]
    ]  # [QUEUE SPLIT]
    redis_settings = get_redis_settings()  # [QUEUE SPLIT]
    max_jobs = 1  # Concurrency limit for image vision tasks [QUEUE SPLIT]
    job_timeout = 7200  # 2 hours maximum per document image description job [QUEUE SPLIT]
    burst = True  # Auto-exit when queue is empty (0 idle Redis cost) [QUEUE SPLIT]
    keep_result = 3600  # Retain job results for 1 hour [QUEUE SPLIT]
