"""Bounded staging checks on isolated ARQ queues; never consume application jobs."""

import asyncio
import contextlib
import json
import logging
import os
import sys
import uuid
from typing import TYPE_CHECKING, Any
from urllib.parse import urlsplit

from arq import Retry
from arq.connections import ArqRedis, create_pool
from arq.constants import (
    health_check_key_suffix,
    in_progress_key_prefix,
    job_key_prefix,
    result_key_prefix,
    retry_key_prefix,
)
from arq.worker import Worker, create_worker, func

if TYPE_CHECKING:
    from app.core.config import Settings

STAGING_PROJECT = "nrzbjhqtcxlfiyvoeanb"
PROVIDERS = ("GOOGLE", "GROQ", "OPENROUTER", "OPENAI", "TAVILY", "COHERE")
TABLES = ("documents", "document_chunks", "background_jobs", "storage_cleanup_jobs")


def validate_target(settings: "Settings") -> None:
    """Reject production, enabled inference, provider credentials and privacy overrides."""
    database = urlsplit(settings.DATABASE_URL or "")
    expected_database = database.hostname == f"db.{STAGING_PROJECT}.supabase.co" or (
        (database.hostname or "").endswith(".pooler.supabase.com")
        and (database.username or "").endswith(f".{STAGING_PROJECT}")
    )
    if (
        settings.ENVIRONMENT != "staging"
        or urlsplit(settings.SUPABASE_URL or "").hostname != f"{STAGING_PROJECT}.supabase.co"
        or not expected_database
        or settings.r2_bucket_name != "pansgpt-library-staging"
        or not (settings.redis_connection_url or "").startswith("rediss://")
        or settings.LOCAL_DEV_MODE
        or settings.EMBEDDER_FAKE_MODE
        or settings.VISION_FAKE_MODE
        or settings.ENABLE_AI
        or settings.ENABLE_INGESTION
        or any(getattr(settings, f"{provider}_ZDR_CONFIRMED") for provider in PROVIDERS)
        or any(
            getattr(settings, key)
            for key in (
                "GEMINI_API_KEY",
                "GROQ_API_KEY",
                "OPENROUTER_API_KEY",
                "OPENAI_API_KEY",
                "TAVILY_API_KEY",
                "COHERE_API_KEY",
            )
        )
    ):
        raise RuntimeError("Staging verification policy rejected the configuration")


async def snapshot() -> dict[str, tuple[int, str]]:
    """Keep row fingerprints in memory; publish neither rows nor checksums."""
    from app.core.database import get_db_connection

    result: dict[str, tuple[int, str]] = {}
    async with get_db_connection() as connection:
        if connection is None:
            raise RuntimeError("Database unavailable")
        async with connection.transaction(isolation="repeatable_read", readonly=True):
            for table in TABLES:
                # Identifiers are a fixed source-controlled allowlist, never user input.
                row = await connection.fetchrow(
                    f"SELECT count(*) AS count, "
                    f"md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS digest "
                    f"FROM public.{table} t;"
                )
                result[table] = (row["count"], row["digest"])
    return result


async def transport_probe(ctx: dict[str, Any]) -> str:
    """Exercise real Postgres/Redis and defer once to verify restart delivery."""
    from app.core.database import get_db_connection

    async with get_db_connection() as connection:
        if connection is None or await connection.fetchval("SELECT 1") != 1:
            raise RuntimeError("Database probe failed")
    if not await ctx["redis"].ping():
        raise RuntimeError("Redis probe failed")
    if ctx["job_try"] == 1:
        raise Retry(defer=1)
    return "verified"


async def run_worker(worker: Worker) -> None:
    """Always release ARQ in-progress markers and the application's pool on cancellation."""
    try:
        await worker.async_run()
    finally:
        async with asyncio.timeout(30):
            await worker.close()


async def verify_queue(redis: ArqRedis, settings_class: type, label: str) -> None:
    """Run each real startup/shutdown hook, replacing only the queue and workload."""
    token = uuid.uuid4().hex
    queue = f"arq:pansgpt-verification:{token}:{label}"
    job_id = f"pansgpt-verification-{token}"
    keys = [
        queue,
        queue + health_check_key_suffix,
        *(
            prefix + job_id
            for prefix in (
                job_key_prefix,
                result_key_prefix,
                retry_key_prefix,
                in_progress_key_prefix,
            )
        ),
    ]
    try:
        job = await redis.enqueue_job(
            "transport_probe", _job_id=job_id, _queue_name=queue, _expires=180
        )
        if job is None:
            raise RuntimeError("Canary enqueue failed")
        await redis.expire(queue, 300)
        for attempt in (1, 2):
            worker = create_worker(
                settings_class,
                functions=[func(transport_probe, timeout=10, keep_result=60, max_tries=3)],
                queue_name=queue,
                cron_jobs=[],
                burst=True,
                max_jobs=1,
                max_burst_jobs=1,
                poll_delay=1,
                handle_signals=False,
                log_results=False,
            )
            await run_worker(worker)
            if worker.jobs_failed or (
                attempt == 1 and (worker.jobs_retried != 1 or worker.jobs_complete != 0)
            ):
                raise RuntimeError("Canary retry failed")
            if attempt == 2 and worker.jobs_complete != 1:
                raise RuntimeError("Canary restart failed")
        if await job.result(timeout=5) != "verified":
            raise RuntimeError("Canary result failed")
    finally:
        # Exact keys belonging to this invocation; no scans, wildcard deletes or flushes.
        await redis.delete(*keys)
    if await redis.exists(*keys):
        raise RuntimeError("Canary cleanup failed")


async def run_checks() -> dict[str, object]:
    from app.core.config import settings

    validate_target(settings)

    from app.core.database import close_db_pool
    from app.engines.storage import storage_engine
    from workers.settings import PictureWorkerSettings, WorkerSettings, get_redis_settings

    before = await snapshot()
    async with storage_engine.get_client() as client:
        await client.head_bucket(Bucket=settings.r2_bucket_name)
    redis = await create_pool(get_redis_settings())
    try:
        await verify_queue(redis, WorkerSettings, "main")
        await verify_queue(redis, PictureWorkerSettings, "picture")
        if await snapshot() != before:
            raise RuntimeError("Staging rows changed during verification")
    finally:
        await redis.aclose()
        await close_db_pool()
    return {
        "status": "passed",
        "database": "ok",
        "redis": "ok",
        "storage": "ok",
        "main_canary_restart": "passed",
        "picture_canary_restart": "passed",
        "staging_rows": "unchanged",
        "application_queues": "not_consumed",
        "providers": "blocked",
    }


async def bounded_checks() -> dict[str, object]:
    async with asyncio.timeout(180):
        return await run_checks()


def main() -> int:
    # The repository's Actions logs are public. Discard raw SDK/ARQ logs, tracebacks,
    # configuration validation values and document metadata, including import output.
    logging.disable(logging.CRITICAL)
    try:
        with open(os.devnull, "w", encoding="utf-8") as sink:
            with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
                result = asyncio.run(bounded_checks())
    except Exception as exc:
        result = {"status": "failed", "error_type": type(exc).__name__}
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
