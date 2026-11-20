"""Enabled throttles, trusted identity and real optional Redis boundaries."""

import asyncio
import logging
import os
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException, Request
from httpx import ASGITransport, AsyncClient
from redis.asyncio import BlockingConnectionPool, Redis
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request as StarletteRequest

from app.core import chat_limits
from app.core.config import settings
from app.core.dependencies import UserContext
from app.core.diagnostics import RedactAccessQueries
from app.core.rate_limit import get_real_client_ip, rate_limit_exceeded_handler
from app.engines import provider_capacity as capacity


def test_untrusted_proxy_headers_cannot_change_rate_identity():
    request = StarletteRequest(
        {
            "type": "http",
            "client": ("198.51.100.23", 123),
            "headers": [
                (b"x-forwarded-for", b"203.0.113.1"),
                (b"cf-connecting-ip", b"203.0.113.2"),
            ],
        }
    )
    assert get_real_client_ip(request) == "198.51.100.23"


@pytest.mark.parametrize(
    "path",
    ["/api/v1/ai/chat/sessions/search?q=PRIVATE_SEARCH", "/auth/callback?code=PRIVATE_OAUTH_CODE"],
)
def test_server_access_logs_redact_private_queries(path):
    record = logging.LogRecord(
        "uvicorn.access",
        logging.INFO,
        __file__,
        1,
        '%s - "%s %s HTTP/%s" %d',
        ("client", "GET", path, "1.1", 200),
        None,
    )
    assert RedactAccessQueries().filter(record)
    assert "PRIVATE" not in record.getMessage()
    assert path.partition("?")[0] in record.getMessage()


async def test_enabled_ip_throttle_enforces_boundary_and_consistent_retry_metadata():
    app = FastAPI()
    limiter = Limiter(key_func=get_real_client_ip, default_limits=["2/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    @app.get("/synthetic")
    async def endpoint(request: Request):
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://synthetic") as client:
        assert (await client.get("/synthetic")).status_code == 200
        assert (await client.get("/synthetic")).status_code == 200
        response = await client.get("/synthetic", headers={"X-Forwarded-For": "203.0.113.77"})
    assert response.status_code == 429
    assert 1 <= int(response.headers["retry-after"]) <= 60
    assert response.json()["retry_after"] == int(response.headers["retry-after"])
    assert "Limit:" not in response.json()["detail"]


async def test_account_admission_rejection_precedes_lease_credit_and_inference(
    client, tenant_state, monkeypatch
):
    from app.routers import chat

    monkeypatch.setattr(settings, "CHAT_ACTION_RATE_LIMIT_ENABLED", True)
    store = SimpleNamespace(eval=AsyncMock(return_value=[0, 17]))
    monkeypatch.setattr(chat_limits, "redis_client", lambda: store)
    prepare = AsyncMock()
    monkeypatch.setattr(chat, "prepare_turn", prepare)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Synthetic request"},
        headers={"Origin": settings.ALLOWED_ORIGINS[0]},
    )
    assert response.status_code == 429 and response.headers["retry-after"] == "17"
    assert "retry-after" in response.headers["access-control-expose-headers"].lower()
    prepare.assert_not_awaited()
    tenant_state.credit.assert_not_awaited()
    tenant_state.ai.assert_not_called()


async def test_admission_keys_are_account_scoped_not_session_scoped(tenant_state, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ACTION_RATE_LIMIT_ENABLED", True)
    store = SimpleNamespace(eval=AsyncMock(return_value=[1, 0]))
    monkeypatch.setattr(chat_limits, "redis_client", lambda: store)
    await chat_limits.admit_chat_action(tenant_state.user, "send")
    await chat_limits.admit_chat_action(tenant_state.user, "send")
    other = UserContext(**{**tenant_state.user, "id": uuid.uuid4()})
    await chat_limits.admit_chat_action(other, "send")
    keys = [call.args[2] for call in store.eval.call_args_list]
    assert keys[0] == keys[1] and keys[0] != keys[2]
    assert str(tenant_state.user.id) not in keys[0]


async def test_admission_store_failure_fails_closed_without_private_error(
    tenant_state, monkeypatch
):
    monkeypatch.setattr(settings, "CHAT_ACTION_RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(
        chat_limits,
        "redis_client",
        lambda: SimpleNamespace(
            eval=AsyncMock(side_effect=ConnectionError("PRIVATE redis credential"))
        ),
    )
    with pytest.raises(HTTPException) as caught:
        await chat_limits.admit_chat_action(tenant_state.user, "voice")
    assert caught.value.status_code == 503 and "PRIVATE" not in caught.value.detail


async def test_requests_only_provider_headers_are_observed(monkeypatch):
    store = SimpleNamespace(eval=AsyncMock())
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    token = capacity.active.set(capacity.Reservation("synthetic", "ticket", 1, 100))
    try:
        await capacity.observe(
            {"x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-requests": "1h"}
        )
    finally:
        capacity.active.reset(token)
    assert store.eval.call_args.args[-2:] == (0, 3600)


async def test_voice_bytes_are_bounded_before_transcription(tenant_state, monkeypatch):
    from app.routers import chat

    monkeypatch.setattr(settings, "WHISPER_MAX_FILE_SIZE_BYTES", 4)
    upload = SimpleNamespace(
        read=AsyncMock(return_value=b"12345"), content_type="audio/webm", filename="synthetic.webm"
    )
    transcribe = AsyncMock()
    monkeypatch.setattr(chat.llm_engine, "transcribe_audio", transcribe)
    with pytest.raises(HTTPException) as caught:
        await chat.transcribe_voice_audio(file=upload, current_user=tenant_state.user)
    assert caught.value.status_code == 413
    upload.read.assert_awaited_once_with(5)
    transcribe.assert_not_awaited()


async def test_attachment_timeout_is_retryable_not_an_unsupported_file(
    client, tenant_state, monkeypatch
):
    from app.routers import chat_interactions

    tenant_state.connection.fetchval.return_value = 0
    monkeypatch.setattr(
        chat_interactions,
        "document_text",
        AsyncMock(side_effect=TimeoutError("PRIVATE parser context")),
    )
    save = AsyncMock()
    monkeypatch.setattr(chat_interactions, "save_attachment", save)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/attachments",
        files={"file": ("synthetic.txt", b"synthetic note", "text/plain")},
    )
    assert response.status_code == 504
    assert "PRIVATE" not in response.text
    save.assert_not_awaited()


@pytest.fixture
async def redis_namespace():
    url = os.getenv("CAPACITY_TEST_REDIS_URL")
    if not url:
        pytest.skip("Designated Redis integration URL required")
    pool = BlockingConnectionPool.from_url(
        url,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        max_connections=4,
        timeout=15,
    )
    client = Redis.from_pool(pool)
    key = "chat-system-audit:" + uuid.uuid4().hex
    keys = [key + suffix for suffix in ("", ":events", ":weights", ":day", ":blocked", ":limits")]
    try:
        yield client, keys
    finally:
        await client.delete(*keys)
        await client.aclose()


@pytest.mark.live
async def test_real_shared_redis_admits_exactly_the_limit_under_concurrency(redis_namespace):
    client, keys = redis_namespace
    results = await asyncio.gather(
        *(client.eval(chat_limits.ADMIT, 1, keys[0], 3, f"request-{i}") for i in range(20))
    )
    assert sum(int(result[0]) for result in results) == 3
    denied = await client.eval(chat_limits.ADMIT, 1, keys[0], 3, "other-worker")
    assert denied[0] == 0 and 1 <= denied[1] <= 60
    seconds, microseconds = await client.time()
    old = seconds * 1000 + microseconds // 1000 - 60001
    entries = await client.zrange(keys[0], 0, -1)
    await client.zadd(keys[0], {entry: old for entry in entries})
    assert (await client.eval(chat_limits.ADMIT, 1, keys[0], 3, "after-window"))[0] == 1


@pytest.mark.live
async def test_real_daily_token_budget_and_reset_are_distinct_from_minute_limits(redis_namespace):
    client, keys = redis_namespace

    async def reserve(name, tokens):
        return await client.eval(capacity.RESERVE, 5, *keys[1:], name, tokens, 20, 100, 1000, 300)

    first = await reserve("first", 150)
    assert first[0] == 1 and (await reserve("second", 150))[0] == 1
    assert (await reserve("daily-exhausted", 1))[0] == 0
    await client.hset(keys[3], mapping={"day": int(first[2]) - 1, "requests": 1000, "tokens": 1000})
    assert (await reserve("new-day", 1))[0] == 1


@pytest.mark.live
@pytest.mark.parametrize("budget", ["rpm", "rpd"])
async def test_real_request_windows_are_enforced_independently(redis_namespace, budget):
    client, keys = redis_namespace

    async def reserve(name):
        return await client.eval(
            capacity.RESERVE,
            5,
            *keys[1:],
            name,
            1,
            2 if budget == "rpm" else 100,
            2 if budget == "rpd" else 100,
            1000,
            1000,
        )

    assert (await reserve("one"))[0] == 1
    assert (await reserve("two"))[0] == 1
    third = await reserve("three")
    assert third[0] == 0 and 1 <= third[1] <= (60 if budget == "rpm" else 86400)


@pytest.mark.live
async def test_real_requests_only_headers_block_then_recover(redis_namespace, monkeypatch):
    client, keys = redis_namespace
    monkeypatch.setattr(capacity, "redis_client", lambda: client)
    token = capacity.active.set(capacity.Reservation(keys[0], "synthetic", 1, 1))
    try:
        await capacity.observe(
            {"x-ratelimit-remaining-requests": "0", "x-ratelimit-reset-requests": "5s"}
        )
    finally:
        capacity.active.reset(token)

    async def reserve():
        return await client.eval(
            capacity.RESERVE, 5, *keys[1:], "synthetic", 1, 100, 100, 1000, 1000
        )

    blocked = await reserve()
    assert blocked[0] == 0 and 1 <= blocked[1] <= 5
    await client.hset(keys[5], "requests_until", 0)
    assert (await reserve())[0] == 1
