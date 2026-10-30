"""Redis pickup failures must not consume worker capacity forever."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from arq.utils import timestamp_ms
from redis.exceptions import WatchError

from workers.runner import RecoveringWorker, RedisConnectionError


def pickup_worker() -> tuple[RecoveringWorker, MagicMock]:
    worker = object.__new__(RecoveringWorker)
    worker.sem = asyncio.BoundedSemaphore(3)
    worker.max_jobs = 2
    worker.job_counter = 0
    worker.queue_name = "synthetic"
    worker.in_progress_timeout_s = 60
    worker.loop = asyncio.get_running_loop()
    worker.tasks = {}
    worker.run_job = AsyncMock()
    pipe = MagicMock()
    pipe.watch = AsyncMock()
    pipe.exists = AsyncMock(return_value=False)
    pipe.zscore = AsyncMock(return_value=timestamp_ms() - 1)
    pipe.execute = AsyncMock()
    pipe.__aenter__ = AsyncMock(return_value=pipe)
    pipe.__aexit__ = AsyncMock(return_value=False)
    worker._pool = MagicMock()
    worker._pool.pipeline.return_value = pipe
    return worker, pipe


@pytest.mark.parametrize("stage", ["watch", "exists", "zscore", "execute"])
async def test_repeated_pickup_disconnects_release_slots_then_recover(stage: str) -> None:
    worker, pipe = pickup_worker()
    failing = getattr(pipe, stage)
    failing.side_effect = RedisConnectionError("Synthetic disconnect")
    for _ in range(5):
        with pytest.raises(RedisConnectionError):
            await worker.start_jobs([b"quiz:synthetic"])
        assert worker.job_counter == 0 and worker.sem._value == 3
    failing.side_effect = None
    await worker.start_jobs([b"quiz:synthetic"])
    await asyncio.gather(*worker.tasks.values())
    await asyncio.sleep(0)
    assert worker.job_counter == 0 and worker.sem._value == 3
    worker.run_job.assert_awaited_once()


async def test_cancelled_pickup_releases_slot() -> None:
    worker, pipe = pickup_worker()
    pipe.__aenter__.side_effect = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await worker.start_jobs([b"quiz:synthetic"])
    assert worker.job_counter == 0 and worker.sem._value == 3


@pytest.mark.parametrize("reason", ["ongoing", "future", "missing", "conflict"])
async def test_unclaimable_delivery_does_not_consume_slot(reason: str) -> None:
    worker, pipe = pickup_worker()
    if reason == "ongoing":
        pipe.exists.return_value = True
    elif reason == "future":
        pipe.zscore.return_value = timestamp_ms() + 60000
    elif reason == "missing":
        pipe.zscore.return_value = None
    else:
        pipe.execute.side_effect = WatchError()
    await worker.start_jobs([b"quiz:synthetic"])
    assert worker.job_counter == 0 and worker.sem._value == 3
    worker.run_job.assert_not_awaited()
