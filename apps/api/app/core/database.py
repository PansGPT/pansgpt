# ==============================================================================
# PansGPT 2.0 Database Connection & Query Helper (Supabase PostgreSQL)
# ==============================================================================

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)
CONNECT_TIMEOUT_S = 10.0


_db_pool: asyncpg.Pool | None = None


async def init_db_pool(min_size: int = 1, max_size: int = 10) -> asyncpg.Pool | None:
    """Initializes global asyncpg connection pool with statement_cache_size=0 for Supabase pooler."""
    global _db_pool
    if _db_pool is not None:
        return _db_pool
    if not settings.DATABASE_URL:
        return None
    try:
        _db_pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            statement_cache_size=0,
            min_size=min_size,
            max_size=max_size,
            timeout=CONNECT_TIMEOUT_S,
            command_timeout=15.0,
        )
        logger.info("database_connection_pool_initialized", min_size=min_size, max_size=max_size)
        return _db_pool
    except Exception as exc:
        logger.warning("database_pool_initialization_failed", error_type=type(exc).__name__)
        return None


async def close_db_pool() -> None:
    """Gracefully shuts down global connection pool."""
    global _db_pool
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
                error_type=type(exc).__name__,
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

    # 2. Transient single-connection fallback
    conn: asyncpg.Connection | None = None
    try:
        conn = await asyncpg.connect(
            settings.DATABASE_URL,
            statement_cache_size=0,
            timeout=max(timeout, CONNECT_TIMEOUT_S),
            command_timeout=15.0,
        )
    except Exception as exc:
        logger.warning("database_connection_failed", error_type=type(exc).__name__)
    if conn is None:
        yield None
        return
    try:
        yield conn
    finally:
        if conn:
            try:
                await conn.close()
            except Exception:
                pass


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
