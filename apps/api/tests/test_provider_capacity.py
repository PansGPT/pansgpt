"""Quota admission never sends prompts, keys or responses to the capacity store."""

import asyncio
import json
import math
import os
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import httpx
import pytest
from redis.asyncio import Redis
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines import provider_capacity as capacity
from app.engines.quiz_flight import question_flight
from app.models.quiz import QuizConfig


def test_output_reservation_fits_free_tier_without_truncating_input(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    payload = {"messages": [{"role": "user", "content": "x" * 16000}]}
    before = json.dumps(payload)
    limit = capacity.generation_token_limit("groq", payload, 4096)
    estimated = math.ceil(len(json.dumps(payload, ensure_ascii=False, default=str).encode()) / 3)
    assert 256 <= limit < 4096
    assert estimated + limit <= settings.AI_PROVIDER_BUDGETS["groq"]["tpm"]
    assert json.dumps(payload) == before


def test_oversized_context_fails_before_inference(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    with pytest.raises(capacity.CapacityDeferred) as caught:
        capacity.generation_token_limit("groq", {"text": "x" * 30000}, 4096)
    assert caught.value.reason == "request_exceeds_budget"


@pytest.mark.parametrize(
    "value,expected", [(None, 0), ("2", 2), ("7.66s", 7.66), ("1m2s", 62), ("250ms", 0.25)]
)
def test_provider_reset_headers_parse_duration(value, expected):
    assert capacity.seconds_header(value) == expected


async def test_budget_denial_never_enters_provider_call(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock()
    store.eval = AsyncMock(return_value=[0, 9, 1])
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    with pytest.raises(capacity.CapacityDeferred) as caught:
        async with capacity.provider_budget("groq", "fixture", "private synthetic prompt", 100):
            pytest.fail("Provider must not run without capacity")
    assert caught.value.seconds == 9
    assert "private synthetic prompt" not in str(store.eval.call_args)


async def test_lost_reservation_reply_retries_same_receipt_before_provider_call(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(side_effect=[RedisTimeoutError(), [1, 0, 7, 300]]))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    calls = 0
    async with capacity.provider_budget("google", "fixture", "synthetic", 100):
        calls += 1
    assert calls == 1 and store.eval.await_count == 2
    assert store.eval.call_args_list[0] == store.eval.call_args_list[1]
    args = store.eval.call_args.args
    assert args[1] == 6 and ":receipt:" in args[7]
    assert capacity.active.get() is None


async def test_capacity_outage_fails_closed_after_one_bounded_retry(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(side_effect=RedisTimeoutError()))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    with pytest.raises(capacity.CapacityDeferred) as caught:
        async with capacity.provider_budget("google", "fixture", "synthetic", 100):
            pytest.fail("No confirmed reservation means no provider call")
    assert caught.value.reason == "capacity_store_unavailable"
    assert store.eval.await_count == 2
    assert capacity.active.get() is None


@pytest.mark.live
async def test_real_redis_reservation_receipt_does_not_double_count(isolated_redis):
    client, prefix = isolated_redis
    receipt = prefix + ":receipt:lost-reply"
    keys = [prefix + suffix for suffix in (":events", ":weights", ":day", ":blocked", ":limits")]
    try:
        first = await client.eval(
            capacity.RESERVE, 6, *keys, receipt, "lost-reply", 100, 30, 100, 1000, 10000
        )
        second = await client.eval(
            capacity.RESERVE, 6, *keys, receipt, "lost-reply", 100, 30, 100, 1000, 10000
        )
        assert first == second and first[0] == 1
        assert await client.hget(keys[2], "requests") == "1"
        assert await client.hget(keys[2], "tokens") == "100"
        assert await client.zcard(keys[0]) == 1
    finally:
        await client.delete(receipt)


async def test_generation_uses_atomic_output_grant_and_records_exact_reservation(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(side_effect=[[1, 0, 1, 2500], 1]))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    payload = {"text": "synthetic"}
    estimated = math.ceil(len(json.dumps(payload).encode()) / 3)
    async with capacity.provider_budget(
        "groq", "fixture", payload, 4096, fit_output=True
    ) as output:
        assert output == 2500 - estimated
        assert capacity.active.get().reserved == 2500
    args = store.eval.call_args_list[0].args
    assert args[-2:] == (estimated, 1024)
    assert capacity.active.get() is None


@pytest.mark.live
async def test_real_redis_fits_remaining_capacity_without_overbooking(isolated_redis):
    client, prefix = isolated_redis
    keys = [prefix + suffix for suffix in (":events", ":weights", ":day", ":blocked", ":limits")]

    async def reserve(identifier, tokens, input_tokens=0, minimum=0):
        return await client.eval(
            capacity.RESERVE,
            5,
            *keys,
            identifier,
            tokens,
            30,
            100,
            8000,
            100000,
            input_tokens,
            minimum,
        )

    assert (await reserve("routing", 3031))[0] == 1
    attempts = await asyncio.gather(
        *(reserve(f"generation-{i}", 8000, 3000, 1024) for i in range(3))
    )
    admitted = [row for row in attempts if row[0] == 1]
    assert len(admitted) == 1 and admitted[0][3] == 4969
    assert sum(int(value) for value in (await client.hvals(keys[1]))) == 8000


@pytest.mark.live
async def test_real_redis_fitted_output_respects_observed_and_daily_limits(isolated_redis):
    client, prefix = isolated_redis
    keys = [prefix + suffix for suffix in (":events", ":weights", ":day", ":blocked", ":limits")]
    await client.eval(capacity.OBSERVE, 1, keys[4], 6000, 100, 4500, 30, 50, 3600)
    result = await client.eval(
        capacity.RESERVE, 5, *keys, "generation", 8000, 30, 100, 8000, 10000, 3000, 1024
    )
    assert result[0] == 1 and result[3] == 4500
    assert (await client.hget(keys[4], "tokens_remaining")) == "0"
    rejected = await client.eval(
        capacity.RESERVE, 5, *keys, "next", 8000, 30, 100, 8000, 10000, 3000, 1024
    )
    assert rejected[0] != 1
    await client.hset(keys[4], mapping={"tokens_until": 0})
    await client.hset(keys[2], mapping={"tokens": 9000})
    daily_rejected = await client.eval(
        capacity.RESERVE, 5, *keys, "daily", 8000, 30, 100, 8000, 10000, 100, 1024
    )
    assert daily_rejected[0] == 0


@pytest.mark.parametrize(
    "stored,reason",
    [
        ("provider_rate_limit", "provider_rate_limit"),
        ("provider_unavailable", "provider_unavailable"),
        ("1", "provider_unavailable"),
    ],
)
async def test_shared_cooldown_keeps_service_failure_distinct_from_quota(
    monkeypatch, stored, reason
):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(return_value=[0, 30, 1, stored]))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    with pytest.raises(capacity.CapacityDeferred) as caught:
        async with capacity.provider_budget("google", "fixture", "synthetic", 1):
            pytest.fail("Cooldown must prevent provider access")
    assert caught.value.reason == reason


async def test_usage_reconciles_reservation_and_safe_headers(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock()
    store.eval = AsyncMock(side_effect=[[1, 0, 1], 1, 1])
    store.hset = AsyncMock()
    store.expire = AsyncMock()
    pipe = MagicMock()
    pipe.execute = AsyncMock()
    store.pipeline.return_value.__aenter__ = AsyncMock(return_value=pipe)
    store.pipeline.return_value.__aexit__ = AsyncMock()
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    async with capacity.provider_budget("groq", "fixture", "synthetic", 200):
        await capacity.observe({"x-ratelimit-limit-tokens": "5000"}, 100, 50)
    assert store.eval.call_args.args[-2:] == (150, 1)
    assert capacity.active.get() is None


async def test_rate_limit_defers_using_retry_after(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock()
    store.eval = AsyncMock(return_value=[1, 0, 1])
    store.set = AsyncMock()
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    response = httpx.Response(
        429, headers={"retry-after": "17"}, request=httpx.Request("POST", "https://example.test")
    )
    with pytest.raises(capacity.CapacityDeferred) as caught:
        async with capacity.provider_budget("groq", "fixture", "synthetic", 200):
            response.raise_for_status()
    assert caught.value.seconds == 17
    assert store.set.call_args.kwargs["ex"] == 17


@pytest.fixture
async def isolated_redis(monkeypatch):
    url = os.getenv("CAPACITY_TEST_REDIS_URL") or os.getenv("WORKER_TEST_REDIS_URL")
    if not url:
        pytest.skip("Designated Redis test connection not configured")
    client = Redis.from_url(url, decode_responses=True, socket_timeout=5, socket_connect_timeout=5)
    scope = "quiz-capacity-test-" + uuid4().hex
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    monkeypatch.setattr(settings, "AI_CAPACITY_SCOPE", scope)
    monkeypatch.setattr(capacity, "redis_client", lambda: client)
    prefix = capacity.scope_prefix("groq", "synthetic-test-model")
    try:
        yield client, prefix
    finally:
        await client.delete(
            *(prefix + suffix for suffix in (":events", ":weights", ":day", ":blocked", ":limits"))
        )
        await client.aclose()


async def test_local_timeout_does_not_block_shared_provider(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(return_value=[1, 0, 1]), set=AsyncMock())
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    with pytest.raises(TimeoutError):
        async with capacity.provider_budget("google", "fixture", "synthetic", 200):
            raise TimeoutError()
    store.set.assert_not_awaited()
    assert capacity.active.get() is None


async def test_server_failure_logs_status_without_private_content(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(return_value=[1, 0, 1]), set=AsyncMock())
    log = MagicMock()
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    monkeypatch.setattr(capacity, "logger", log)
    response = httpx.Response(503, request=httpx.Request("POST", "https://example.test/private"))
    with pytest.raises(capacity.CapacityDeferred) as caught:
        async with capacity.provider_budget("google", "fixture", "PRIVATE PROMPT", 200):
            response.raise_for_status()
    assert caught.value.reason == "provider_unavailable"
    assert log.warning.call_args.kwargs["status"] == 503
    assert "PRIVATE" not in str(log.mock_calls) and "/private" not in str(log.mock_calls)
    assert store.set.call_args.kwargs["ex"] == 120


@pytest.mark.live
async def test_real_redis_atomic_admission_settlement_and_cooldown(isolated_redis):
    client, prefix = isolated_redis
    keys = [prefix + s for s in (":events", ":weights", ":day", ":blocked", ":limits")]

    async def reserve(identifier, tokens):
        return await client.eval(
            capacity.RESERVE, 5, *keys, identifier, tokens, 30, 100, 1000, 10000
        )

    attempts = await asyncio.gather(*(reserve(str(i), 450) for i in range(8)))
    assert sum(int(row[0]) == 1 for row in attempts) == 2
    admitted = [str(i) for i, row in enumerate(attempts) if int(row[0]) == 1]
    day = next(row[2] for row in attempts if int(row[0]) == 1)
    assert (await reserve("third", 300))[0] == 0
    await client.eval(capacity.SETTLE, 2, keys[1], keys[2], admitted[0], 100, day)
    assert (await reserve("after-settle", 300))[0] == 1
    await client.set(keys[3], "1", ex=12)
    blocked = await reserve("blocked", 1)
    assert blocked[0] == 0 and 1 <= blocked[1] <= 12
    await client.delete(keys[3])
    await client.hset(keys[4], mapping={"tpm": 500})
    assert (await reserve("observed-lower-limit", 600))[0] == -1
    await client.eval(capacity.OBSERVE, 1, keys[4], 1000, 100, 10, 7, 100, 3600)
    header_limited = await reserve("provider-remaining-budget", 50)
    assert header_limited[0] == 0 and 1 <= header_limited[1] <= 7
    await client.hset(keys[4], mapping={"tokens_until": 0})
    assert (await reserve("after-provider-reset", 50))[0] == 1


@pytest.mark.live
async def test_real_redis_coalesces_same_scope_and_preserves_successor_lease(isolated_redis):
    client, _ = isolated_redis
    user = UserContext(
        id=uuid4(),
        email="synthetic@example.test",
        role="student",
        roles=["student"],
        university_id=uuid4(),
        current_level="400",
    )
    config = QuizConfig(course_code="SYNTHETIC 401")
    async with question_flight(config, user):
        with pytest.raises(capacity.CapacityDeferred) as waiting:
            async with question_flight(config, user):
                pytest.fail("Same scope must coalesce")
        assert waiting.value.reason == "shared_questions_pending"
        other = UserContext(**{**user, "university_id": uuid4()})
        async with question_flight(config, other):
            pass
    async with question_flight(config, user):
        pass

    import hashlib

    identity = [
        str(user.university_id),
        user.current_level,
        config.course_code,
        config.topic.casefold(),
        config.difficulty,
        config.question_type,
    ]
    key = "pansgpt:quiz:flight:" + hashlib.sha256(json.dumps(identity).encode()).hexdigest()
    try:
        async with question_flight(config, user):
            await client.set(key, "synthetic-successor", ex=30)
        assert await client.get(key) == "synthetic-successor"
    finally:
        await client.delete(key)
