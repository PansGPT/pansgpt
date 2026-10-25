"""Database timeouts must not trigger a second expensive query or web fallback."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import asyncpg
import pytest

from app.core.config import settings
from app.engines import rag
from app.engines.tools import tool_engine


@pytest.mark.parametrize(
    "error", [TimeoutError("query deadline"), asyncpg.QueryCanceledError("statement timeout")]
)
async def test_hybrid_timeout_stops_without_rpc_or_web_fallback(
    monkeypatch: pytest.MonkeyPatch, error: Exception
) -> None:
    conn = AsyncMock()
    conn.fetch.side_effect = error

    @asynccontextmanager
    async def database() -> AsyncIterator[AsyncMock]:
        yield conn

    monkeypatch.setattr(rag, "get_db_connection", database)
    monkeypatch.setitem(settings.__dict__, "ENABLE_QUERY_EXPANSION", False)
    monkeypatch.setattr(rag.gemini_embedder, "embed_batch", AsyncMock(return_value=[[0.0] * 1536]))
    web = AsyncMock()
    monkeypatch.setattr(tool_engine, "execute_web_search", web)
    with pytest.raises(type(error)):
        await rag.RagRetrievalEngine().retrieve_context(
            "Synthetic query", university_id="018f3a10-0001-7000-8000-000000000001"
        )
    assert conn.fetch.await_count == 1
    web.assert_not_awaited()
