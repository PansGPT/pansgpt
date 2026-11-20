# ==============================================================================
# PansGPT 2.0 Database Connection & Query Helper (Supabase PostgreSQL)
# ==============================================================================

import asyncio
import random
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any
from weakref import WeakKeyDictionary

import asyncpg
import structlog

from app.core.config import settings
from app.core.diagnostics import error_fields

logger = structlog.get_logger(__name__)
CONNECT_TIMEOUT_S = 10.0


_db_pool: asyncpg.Pool | None = None
_recovery_task: asyncio.Task[None] | None = None
_init_locks: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = WeakKeyDictionary()
_fallback_slots: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore] = (
    WeakKeyDictionary()
)


async def init_db_pool(min_size: int = 1, max_size: int = 10) -> asyncpg.Pool | None:
    """Initializes global asyncpg connection pool with statement_cache_size=0 for Supabase pooler."""
    global _db_pool
    if _db_pool is not None:
        return _db_pool
    if not settings.DATABASE_URL:
        return None
    lock = _init_locks.setdefault(asyncio.get_running_loop(), asyncio.Lock())
    async with lock:
        if _db_pool is not None:
            return _db_pool
        started = time.monotonic()
        try:
            _db_pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                statement_cache_size=0,
                min_size=min_size,
                max_size=max_size,
                timeout=CONNECT_TIMEOUT_S,
                command_timeout=15.0,
            )
            logger.info(
                "database_connection_pool_initialized",
                min_size=min_size,
                max_size=max_size,
                elapsed_ms=round((time.monotonic() - started) * 1000),
            )
            return _db_pool
        except Exception as exc:
            logger.warning(
                "database_pool_initialization_failed",
                phase="postgres_connect",
                timeout_s=CONNECT_TIMEOUT_S,
                elapsed_ms=round((time.monotonic() - started) * 1000),
                recovery="background_retry",
                **error_fields(exc),
            )
            return None


def start_db_recovery() -> None:
    """One bounded retry loop per worker, rather than a new pool per request."""
    global _recovery_task
    if (
        _db_pool is not None
        or not settings.DATABASE_URL
        or (_recovery_task and not _recovery_task.done())
    ):
        return

    async def recover() -> None:
        attempt = 0
        while _db_pool is None:
            delay = min(30, 2 ** min(attempt, 5)) + random.uniform(0, 0.25)
            logger.info(
                "database_pool_recovery_wait", attempt=attempt + 1, retry_after_s=round(delay, 2)
            )
            await asyncio.sleep(delay)
            if await init_db_pool() is not None:
                logger.info("database_pool_recovered", attempts=attempt + 1)
                return
            attempt += 1

    _recovery_task = asyncio.create_task(recover(), name="database-pool-recovery")


async def close_db_pool() -> None:
    """Gracefully shuts down global connection pool."""
    global _db_pool, _recovery_task
    if _recovery_task is not None:
        _recovery_task.cancel()
        await asyncio.gather(_recovery_task, return_exceptions=True)
        _recovery_task = None
    if _db_pool:
        await _db_pool.close()
        _db_pool = None
        logger.info("database_connection_pool_closed")


@asynccontextmanager
async def get_db_connection(
    timeout: float = 5.0,
) -> AsyncGenerator[asyncpg.Connection | None, None]:
    """
    Async context manager yielding an active asyncpg connection.
    Uses the bounded pool when initialized, or a direct connection before pool startup.
    The caller's queue-wait allowance is separate from the cold-connection budget:
    asyncpg acquire also includes DNS/TCP/TLS/authentication for a new connection.
    CRITICAL: statement_cache_size=0 is required for Supabase pgbouncer / connection pooler.
    """
    if not settings.DATABASE_URL:
        yield None
        return

    # Catch acquisition errors only. Exceptions raised by the caller must propagate.
    if _db_pool is not None:
        try:
            pooled_conn = await _db_pool.acquire(timeout=timeout + CONNECT_TIMEOUT_S)
        except Exception as exc:
            logger.warning(
                "pooled_connection_acquire_failed",
                **error_fields(exc),
                timeout_s=timeout + CONNECT_TIMEOUT_S,
            )
            # Opening extra direct connections when the pool is saturated defeats
            # its limit and can exhaust the hosted free-tier connection allowance.
            yield None
            return
        else:
            try:
                yield pooled_conn
            finally:
                await _db_pool.release(pooled_conn)
            return

    # Startup failure must not remove all connection bounds.
    slots = _fallback_slots.setdefault(asyncio.get_running_loop(), asyncio.Semaphore(3))
    try:
        async with asyncio.timeout(timeout):
            await slots.acquire()
    except TimeoutError as exc:
        logger.warning("database_fallback_saturated", timeout_s=timeout, **error_fields(exc))
        yield None
        return
    if _db_pool is not None:
        slots.release()
        async with get_db_connection(timeout=timeout) as connection:
            yield connection
        return
    # 2. Bounded transient connection while the single recovery loop runs.
    conn: asyncpg.Connection | None = None
    try:
        conn = await asyncpg.connect(
            settings.DATABASE_URL,
            statement_cache_size=0,
            timeout=max(timeout, CONNECT_TIMEOUT_S),
            command_timeout=15.0,
        )
    except asyncio.CancelledError:
        slots.release()
        raise
    except Exception as exc:
        logger.warning("database_connection_failed", phase="postgres_connect", **error_fields(exc))
    if conn is None:
        slots.release()
        yield None
        return
    try:
        yield conn
    finally:
        try:
            if conn:
                await conn.close(timeout=2)
        except Exception:
            pass
        finally:
            slots.release()


async def fetch_rows(sql: str, *args: Any, timeout: float = 5.0) -> list[asyncpg.Record]:
    """Executes a SELECT query and returns all matching records."""
    async with get_db_connection(timeout=timeout) as conn:
        if not conn:
            return []
        return await conn.fetch(sql, *args)


async def fetch_one(sql: str, *args: Any, timeout: float = 5.0) -> asyncpg.Record | None:
    """Executes a SELECT query and returns a single record or None."""
    async with get_db_connection(timeout=timeout) as conn:
        if not conn:
            return None
        return await conn.fetchrow(sql, *args)


async def execute_command(sql: str, *args: Any, timeout: float = 5.0) -> str | None:
    """Executes an INSERT, UPDATE, or DELETE command."""
    async with get_db_connection(timeout=timeout) as conn:
        if not conn:
            return None
        return await conn.execute(sql, *args)
