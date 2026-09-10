# ==============================================================================
# PansGPT 2.0 Database Connection & Query Helper (Supabase PostgreSQL)
# ==============================================================================

import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def get_db_connection(
    timeout: float = 5.0,
) -> AsyncGenerator[asyncpg.Connection | None, None]:
    """
    Async context manager yielding an active asyncpg connection.
    CRITICAL: statement_cache_size=0 is required for Supabase pgbouncer / connection pooler.
    """
    if not settings.DATABASE_URL:
        yield None
        return

    conn: asyncpg.Connection | None = None
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0),
            timeout=timeout,
        )
        yield conn
    except Exception as exc:
        logger.warning("database_connection_failed", error=str(exc))
        yield None
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
