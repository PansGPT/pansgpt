"""Bounded retries for safe operations inside an existing authorized chat run."""

import asyncio
import random
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import asyncpg
import httpx
import structlog

logger = structlog.get_logger(__name__)


def transient(exc: Exception) -> bool:
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    response = getattr(exc, "response", None)
    status = status or getattr(response, "status_code", None)
    if status is not None:
        if str(status) == "429":
            # A bare provider 429 may mean exhausted free-tier quota. Fail over instead
            # of hammering it; retry the same operation only for an explicit cooldown.
            headers = getattr(response, "headers", None) or getattr(exc, "headers", None) or {}
            return bool(headers.get("retry-after") or headers.get("Retry-After"))
        return str(status) in {"408", "429", "500", "502", "503", "504"}
    return isinstance(
        exc,
        (TimeoutError, ConnectionError, httpx.TransportError, asyncpg.PostgresConnectionError),
    )


def backoff(attempt: int, exc: Exception | None = None) -> float:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None) or getattr(exc, "headers", None) or {}
    hint = headers.get("retry-after") or headers.get("Retry-After")
    if hint:
        try:
            return max(0.0, float(hint))
        except (TypeError, ValueError):
            try:
                return max(0.0, (parsedate_to_datetime(hint) - datetime.now(UTC)).total_seconds())
            except (TypeError, ValueError, OverflowError):
                pass
    return min(4.0, 0.5 * 2 ** (attempt - 1)) + random.uniform(0, 0.25)


async def retry_transient[T](
    operation: Callable[[], Awaitable[T]],
    *,
    attempts: int = 3,
    on_retry: Callable[[int, float], None] | None = None,
) -> T:
    for attempt in range(1, attempts + 1):
        try:
            return await operation()
        except Exception as exc:
            if attempt == attempts or not transient(exc):
                raise
            delay = backoff(attempt, exc)
            # Long Retry-After values belong to the caller's explicit wait UI, not an early retry.
            if delay > 30:
                raise
            logger.info(
                "chat_operation_retry",
                attempt=attempt,
                delay_s=round(delay, 2),
                error_type=type(exc).__name__,
            )
            if on_retry:
                on_retry(attempt, delay)
            await asyncio.sleep(delay)
    raise RuntimeError("Retry budget exhausted")
