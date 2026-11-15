"""Safe retries must stay bounded, cancellable and inside one authorized run."""

import asyncio
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.engines import rag as rag_module
from app.engines import recovery
from app.main import app
from app.models.chat import ChatRecoveryEvent


async def test_temporary_lookup_recovers_without_another_credit_or_turn(tenant_state, monkeypatch):
    monkeypatch.setattr(recovery, "backoff", lambda *args: 0)
    tenant_state.retrieval.side_effect = [TimeoutError(), ("University A content", [])]
    result = TestClient(app).post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Synthetic recovery question"},
    )
    assert result.status_code == 200
    assert "event: recovery" in result.text and "event: error" not in result.text
    assert "Scoped test answer" in result.text
    assert tenant_state.retrieval.await_count == 2
    assert tenant_state.retrieval.await_args_list[0] == tenant_state.retrieval.await_args_list[1]
    tenant_state.credit.assert_awaited_once()


@pytest.mark.parametrize("status", [400, 401, 402, 403, 404, 413, 415, 422, 429])
async def test_permanent_failures_are_never_retried(status):
    operation = AsyncMock(side_effect=HTTPException(status, "Synthetic failure"))
    with pytest.raises(HTTPException):
        await recovery.retry_transient(operation)
    operation.assert_awaited_once()


async def test_retry_limit_and_exponential_delays(monkeypatch):
    pauses = []

    async def pause(delay):
        pauses.append(delay)

    monkeypatch.setattr(recovery.random, "uniform", lambda a, b: 0)
    monkeypatch.setattr(recovery.asyncio, "sleep", pause)
    operation = AsyncMock(side_effect=ConnectionError())
    with pytest.raises(ConnectionError):
        await recovery.retry_transient(operation)
    assert operation.await_count == 3 and pauses == [0.5, 1.0]


async def test_cancel_during_backoff_never_starts_another_attempt(monkeypatch):
    sleeping = asyncio.Event()

    async def pause(delay):
        sleeping.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(recovery.asyncio, "sleep", pause)
    operation = AsyncMock(side_effect=ConnectionError())
    task = asyncio.create_task(recovery.retry_transient(operation))
    await sleeping.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    operation.assert_awaited_once()


async def test_long_retry_after_is_never_retried_early():
    response = httpx.Response(
        429, headers={"Retry-After": "90"}, request=httpx.Request("GET", "https://example.test")
    )
    error = httpx.HTTPStatusError("Synthetic limit", request=response.request, response=response)
    assert recovery.backoff(1, error) == 90
    operation = AsyncMock(side_effect=error)
    with pytest.raises(httpx.HTTPStatusError):
        await recovery.retry_transient(operation)
    operation.assert_awaited_once()


def test_recovery_frames_are_bounded_and_cannot_impersonate_model_progress():
    assert ChatRecoveryEvent(attempt=1, retry_after_ms=500).state == "retrying"
    for change in (
        {"attempt": 4},
        {"retry_after_ms": -1},
        {"state": "complete"},
        {"source": "model"},
    ):
        with pytest.raises(ValidationError):
            ChatRecoveryEvent.model_validate({"attempt": 1, "retry_after_ms": 500, **change})


@pytest.mark.parametrize("document", [False, True])
async def test_retrieval_storage_outage_is_never_silently_relabelled_as_no_matches(
    monkeypatch, document
):
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def unavailable():
        yield None

    monkeypatch.setattr(rag_module, "get_db_connection", unavailable)
    monkeypatch.setattr(rag_module.settings, "ENABLE_QUERY_EXPANSION", False)
    monkeypatch.setattr(rag_module.gemini_embedder, "embed_batch", AsyncMock(return_value=[]))
    with pytest.raises(ConnectionError):
        await rag_module.RagRetrievalEngine().retrieve_context(
            "Synthetic query",
            university_id="01900000-0000-7000-8000-000000000002",
            document_id="01900000-0000-7000-8000-000000000001" if document else None,
            allow_web_search=False,
        )
