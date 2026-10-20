"""Real ARQ retry/cancellation contracts against disposable CI services only."""

import asyncio
import os
import uuid
from collections.abc import AsyncIterator
from types import SimpleNamespace
from urllib.parse import urlsplit

import pytest
from arq.connections import ArqRedis, RedisSettings, create_pool
from arq.constants import (
    in_progress_key_prefix,
    job_key_prefix,
    result_key_prefix,
    retry_key_prefix,
)

from app.core.config import settings
from app.core.database import close_db_pool
from workers import verify_batch
from workers.settings import PictureWorkerSettings, WorkerSettings

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.fixture
async def redis(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[ArqRedis]:
    database_url = os.getenv("RLS_TEST_DATABASE_URL")
    redis_url = os.getenv("WORKER_TEST_REDIS_URL")
    if not database_url or not redis_url:
        pytest.skip("Dedicated disposable database and Redis URLs not configured")
    assert urlsplit(database_url).hostname in ("localhost", "127.0.0.1")
    assert urlsplit(redis_url).hostname in ("localhost", "127.0.0.1")
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)
    monkeypatch.setattr(settings, "ENABLE_INGESTION", False)
    monkeypatch.setattr(settings, "GOOGLE_ZDR_CONFIRMED", False)
    redis_settings = RedisSettings.from_dsn(redis_url)
    monkeypatch.setattr(WorkerSettings, "redis_settings", redis_settings)
    monkeypatch.setattr(PictureWorkerSettings, "redis_settings", redis_settings)
    pool = await create_pool(redis_settings)
    try:
        yield pool
    finally:
        await pool.aclose()
        await close_db_pool()


async def test_real_retry_restart_preserves_rows_and_application_queues(redis: ArqRedis) -> None:
    before = await verify_batch.snapshot()
    sentinels = [(queue, uuid.uuid4().hex) for queue in ("arq:queue", "arq:picture_queue")]
    try:
        for queue, job_id in sentinels:
            await redis.enqueue_job(
                "must_not_be_consumed", _job_id=job_id, _queue_name=queue, _expires=300
            )
        async with asyncio.timeout(45):
            await verify_batch.verify_queue(redis, WorkerSettings, "main")
            await verify_batch.verify_queue(redis, PictureWorkerSettings, "picture")
        for queue, job_id in sentinels:
            assert await redis.zscore(queue, job_id) is not None
            assert await redis.exists(job_key_prefix + job_id)
        assert await verify_batch.snapshot() == before
    finally:
        for queue, job_id in sentinels:
            await redis.zrem(queue, job_id)
            await redis.delete(job_key_prefix + job_id)


async def test_real_cancellation_removes_only_canary_keys(
    redis: ArqRedis, monkeypatch: pytest.MonkeyPatch
) -> None:
    token = uuid.uuid4().hex
    monkeypatch.setattr(
        verify_batch, "uuid", SimpleNamespace(uuid4=lambda: SimpleNamespace(hex=token))
    )
    started = asyncio.Event()

    async def blocked(ctx: dict[str, object]) -> None:
        started.set()
        await asyncio.Event().wait()

    blocked.__name__ = "transport_probe"
    monkeypatch.setattr(verify_batch, "transport_probe", blocked)
    task = asyncio.create_task(verify_batch.verify_queue(redis, WorkerSettings, "cancel"))
    try:
        async with asyncio.timeout(20):
            await started.wait()
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    queue = f"arq:pansgpt-verification:{token}:cancel"
    job_id = f"pansgpt-verification-{token}"
    assert not await redis.exists(
        queue,
        queue + ":health-check",
        *(
            prefix + job_id
            for prefix in (
                job_key_prefix,
                result_key_prefix,
                retry_key_prefix,
                in_progress_key_prefix,
            )
        ),
    )
