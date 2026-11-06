"""Cold queue connections and cancellation must not strand producer resources."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from workers import quiz


@pytest.fixture
def producer(monkeypatch):
    monkeypatch.setattr(settings, "UPSTASH_REDIS_URL", "rediss://synthetic.invalid:6379")
    monkeypatch.setattr(settings, "REDIS_URL", None)
    client = MagicMock()
    client.aclose = AsyncMock()
    factory = MagicMock(return_value=client)
    monkeypatch.setattr(quiz.ArqRedis, "from_url", factory)
    return client, factory


async def test_cold_dispatch_longer_than_old_deadline_completes(producer, monkeypatch):
    client, factory = producer
    delivered = False

    async def dispatch(ctx):
        nonlocal delivered
        assert ctx["redis"] is client
        await asyncio.sleep(3.05)
        delivered = True

    monkeypatch.setattr(quiz, "dispatch_quiz_jobs", dispatch)
    await quiz.wake_quiz_worker()
    assert delivered
    factory.assert_called_once_with(
        "rediss://synthetic.invalid:6379", socket_connect_timeout=5, socket_timeout=5
    )
    client.aclose.assert_awaited_once()


@pytest.mark.parametrize("failure", [TimeoutError, ConnectionError])
async def test_failed_dispatch_closes_owned_client_and_keeps_request_recoverable(
    producer, monkeypatch, failure
):
    client, _ = producer
    dispatch = AsyncMock(side_effect=failure("synthetic"))
    monkeypatch.setattr(quiz, "dispatch_quiz_jobs", dispatch)
    await quiz.wake_quiz_worker()
    dispatch.assert_awaited_once()
    client.aclose.assert_awaited_once()


async def test_cancelled_dispatch_closes_client_and_propagates_cancellation(producer, monkeypatch):
    client, _ = producer
    monkeypatch.setattr(quiz, "dispatch_quiz_jobs", AsyncMock(side_effect=asyncio.CancelledError()))
    with pytest.raises(asyncio.CancelledError):
        await quiz.wake_quiz_worker()
    client.aclose.assert_awaited_once()


async def test_expired_dispatch_deadline_does_not_cancel_cleanup(producer, monkeypatch):
    client, _ = producer
    timeout = asyncio.timeout
    closed = False

    async def dispatch(ctx):
        await asyncio.Event().wait()

    async def close():
        nonlocal closed
        await asyncio.sleep(0.02)
        closed = True

    monkeypatch.setattr(
        quiz.asyncio, "timeout", lambda delay: timeout(0.01 if delay == 15 else delay)
    )
    monkeypatch.setattr(quiz, "dispatch_quiz_jobs", dispatch)
    client.aclose.side_effect = close
    await quiz.wake_quiz_worker()
    assert closed


async def test_cleanup_failure_does_not_turn_saved_request_into_api_failure(producer, monkeypatch):
    client, _ = producer
    client.aclose.side_effect = ConnectionError("synthetic")
    monkeypatch.setattr(quiz, "dispatch_quiz_jobs", AsyncMock())
    await quiz.wake_quiz_worker()
    client.aclose.assert_awaited_once()


async def test_missing_redis_leaves_durable_reconciliation_as_fallback(producer, monkeypatch):
    client, factory = producer
    monkeypatch.setattr(settings, "UPSTASH_REDIS_URL", None)
    await quiz.wake_quiz_worker()
    factory.assert_not_called()
    client.aclose.assert_not_awaited()


async def test_client_construction_failure_preserves_saved_request(producer):
    client, factory = producer
    factory.side_effect = ValueError("synthetic invalid DSN")
    await quiz.wake_quiz_worker()
    client.aclose.assert_not_awaited()
