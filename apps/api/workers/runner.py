"""Run the durable ARQ worker with low-cost, immediate quiz notifications."""

import asyncio
import time
from contextlib import suppress

import structlog
from arq.constants import in_progress_key_prefix
from arq.utils import timestamp_ms
from arq.worker import Worker, get_kwargs
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import ResponseError, WatchError
from redis.exceptions import TimeoutError as RedisTimeoutError

from workers.quiz import QUIZ_WAKE_CHANNEL
from workers.settings import WorkerSettings

logger = structlog.get_logger(__name__)


class RecoveringWorker(Worker):
    """Keep the worker alive when a temporary transport failure ends ARQ polling."""

    async def start_jobs(self, job_ids: list[bytes]) -> None:
        """Return pickup slots on disconnect/cancellation before task ownership.

        The installed ARQ pickup implementation handles WATCH conflicts but
        leaks admission on transport errors. Polling and notifications both use
        this guarded equivalent; the Redis claim and task release stay intact.
        """
        for job_id_b in job_ids:
            await self.sem.acquire()
            counted = handed_off = False
            try:
                if self.job_counter >= self.max_jobs:
                    return
                self.job_counter += 1
                counted = True
                job_id = job_id_b.decode()
                key = in_progress_key_prefix + job_id
                async with self.pool.pipeline(transaction=True) as pipe:
                    await pipe.watch(key)
                    ongoing = await pipe.exists(key)
                    score = await pipe.zscore(self.queue_name, job_id)
                    if ongoing or not score or score > timestamp_ms():
                        continue
                    pipe.multi()
                    pipe.psetex(key, int(self.in_progress_timeout_s * 1000), b"1")
                    try:
                        await pipe.execute()
                    except (ResponseError, WatchError):
                        continue
                    task = self.loop.create_task(self.run_job(job_id, int(score)))
                    task.add_done_callback(lambda _: self._release_sem_dec_counter_on_complete())
                    self.tasks[job_id] = task
                    handed_off = True
            finally:
                if not handed_off:
                    if counted:
                        self.job_counter -= 1
                    self.sem.release()

    async def main(self) -> None:
        delay = 5
        while True:
            started = time.monotonic()
            try:
                await super().main()
                return
            except (RedisConnectionError, RedisTimeoutError, OSError) as exc:
                if time.monotonic() - started >= 60:
                    delay = 5
                logger.warning(
                    "worker_connection_retry", error_type=type(exc).__name__, retry_seconds=delay
                )
                await asyncio.sleep(delay)
                delay = min(delay * 2, 30)


async def listen(worker: Worker, ready: asyncio.Event) -> None:
    """Notifications accelerate delivery; the durable queue survives missed events."""
    while True:
        try:
            async with worker.pool.pubsub() as subscriber:
                await subscriber.subscribe(QUIZ_WAKE_CHANNEL)
                async for message in subscriber.listen():
                    if message["type"] == "subscribe":
                        ready.set()
                        logger.info("quiz_wake_listening")
                    if message["type"] != "message":
                        continue
                    data = message["data"]
                    if isinstance(data, str):
                        data = data.encode()
                    if isinstance(data, bytes) and data.startswith(b"quiz:") and len(data) < 200:
                        await worker.start_jobs([data])
        except Exception as exc:
            logger.warning("quiz_wake_reconnecting", error_type=type(exc).__name__)
            await asyncio.sleep(5)


def main() -> None:
    worker = RecoveringWorker(**get_kwargs(WorkerSettings))
    original_startup, original_shutdown = worker.on_startup, worker.on_shutdown
    listener: asyncio.Task[None] | None = None

    async def startup(ctx: dict[str, object]) -> None:
        nonlocal listener
        if listener:
            listener.cancel()
            with suppress(asyncio.CancelledError):
                await listener
        if original_startup:
            await original_startup(ctx)
        ready = asyncio.Event()
        listener = asyncio.create_task(listen(worker, ready))
        try:
            async with asyncio.timeout(3):
                await ready.wait()
        except TimeoutError:
            logger.warning("quiz_wake_unavailable_using_durable_poll")

    async def shutdown(ctx: dict[str, object]) -> None:
        if listener:
            listener.cancel()
            with suppress(asyncio.CancelledError):
                await listener
        if original_shutdown:
            await original_shutdown(ctx)

    worker.on_startup, worker.on_shutdown = startup, shutdown
    worker.run()


if __name__ == "__main__":
    main()
