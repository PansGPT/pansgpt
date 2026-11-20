"""Shared rolling-minute admission, provider cooldowns and safe usage telemetry."""

import asyncio
import hashlib
import json
import math
import re
import time
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from uuid import uuid4

import structlog
from redis.asyncio import BlockingConnectionPool, Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.core.config import settings
from app.core.diagnostics import error_fields

logger = structlog.get_logger(__name__)
_redis: Redis | None = None


class CapacityDeferred(RuntimeError):
    def __init__(self, seconds: float, reason: str = "provider_capacity") -> None:
        super().__init__("AI capacity is temporarily unavailable")
        self.seconds = max(1, min(86400, math.ceil(seconds)))
        self.reason = reason


def generation_token_limit(provider: str, payload: object, desired: int) -> int:
    """Fit the requested output to the configured free-tier minute allowance.

    A model's context window is not its TPM allowance. Preserve the selected
    input; never reserve a fixed output maximum that makes every fallback fail.
    """
    if not settings.AI_CAPACITY_ENABLED:
        return desired
    input_tokens = math.ceil(len(json.dumps(payload, ensure_ascii=False, default=str).encode()) / 3)
    available = settings.AI_PROVIDER_BUDGETS[provider]["tpm"] - input_tokens
    if available < 256:
        logger.info(
            "provider_context_rejected",
            provider=provider,
            input_estimate=input_tokens,
            token_limit=settings.AI_PROVIDER_BUDGETS[provider]["tpm"],
        )
        raise CapacityDeferred(60, "request_exceeds_budget")
    limit = min(desired, available)
    if limit != desired:
        logger.info(
            "provider_output_budget_fitted",
            provider=provider,
            input_estimate=input_tokens,
            requested_output_tokens=desired,
            output_tokens=limit,
        )
    return limit


def redis_client() -> Redis:
    global _redis
    if _redis is None:
        if not settings.redis_connection_url:
            raise CapacityDeferred(30, "capacity_store_unavailable")
        pool = BlockingConnectionPool.from_url(
            settings.redis_connection_url,
            decode_responses=True,
            socket_timeout=3,
            socket_connect_timeout=3,
            max_connections=8,
            timeout=3,
            health_check_interval=30,
            socket_keepalive=True,
            # Retry RESERVE only through its receipt-aware application path.
            retry=Retry(NoBackoff(), 0),
        )
        _redis = Redis.from_pool(pool)
    return _redis


async def close_capacity() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


RESERVE = """
local now=redis.call('TIME'); local ms=tonumber(now[1])*1000+math.floor(tonumber(now[2])/1000)
local day=math.floor(tonumber(now[1])/86400)
-- A timed-out reply may hide a committed reservation. Reuse its original grant,
-- including its original day, before evaluating a second admission.
if KEYS[6] then
 local previous=redis.call('GET',KEYS[6])
 if previous then return cjson.decode(previous) end
end
local blocked=redis.call('PTTL',KEYS[4]); if blocked>0 then return {0,math.ceil(blocked/1000),day,redis.call('GET',KEYS[4])} end
local expired=redis.call('ZRANGEBYSCORE',KEYS[1],'-inf',ms-60000)
for _,id in ipairs(expired) do redis.call('HDEL',KEYS[2],id) end
redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ms-60000)
if tonumber(redis.call('HGET',KEYS[3],'day') or '-1')~=day then
 redis.call('DEL',KEYS[3]); redis.call('HSET',KEYS[3],'day',day)
end
local rpm=tonumber(ARGV[3]); local tpm=tonumber(ARGV[5])
local observed=tonumber(redis.call('HGET',KEYS[5],'tpm') or '0'); if observed>0 then tpm=math.min(tpm,observed) end
local rpd=tonumber(ARGV[4]); observed=tonumber(redis.call('HGET',KEYS[5],'rpd') or '0'); if observed>0 then rpd=math.min(rpd,observed) end
local tokens=tonumber(ARGV[2])
local used=0; for _,v in ipairs(redis.call('HVALS',KEYS[2])) do used=used+tonumber(v) end
local daily_r=tonumber(redis.call('HGET',KEYS[3],'requests') or '0')
local daily_t=tonumber(redis.call('HGET',KEYS[3],'tokens') or '0')
-- Generation may reduce its output ceiling, never its input or another run's reservation.
local input=tonumber(ARGV[7] or '0'); local minimum=tonumber(ARGV[8] or '0')
if minimum>0 then
 if tokens>tpm and input+minimum<=tpm then tokens=tpm end
 local room=math.min(tpm-used,tonumber(ARGV[6])-daily_t)
 local deadline=tonumber(redis.call('HGET',KEYS[5],'tokens_until') or '0')
 local remaining=tonumber(redis.call('HGET',KEYS[5],'tokens_remaining') or '-1')
 if deadline>tonumber(now[1]) and remaining>=0 then room=math.min(room,remaining) end
 if room>=input+minimum then tokens=math.min(tokens,room) end
end
if tokens>tpm then return {-1,60,day} end
for _,kind in ipairs({'tokens','requests'}) do
 local deadline=tonumber(redis.call('HGET',KEYS[5],kind..'_until') or '0')
 local remaining=tonumber(redis.call('HGET',KEYS[5],kind..'_remaining') or '-1')
 local needed=kind=='tokens' and tokens or 1
 if deadline>tonumber(now[1]) and remaining>=0 and remaining<needed then
  return {0,math.ceil(deadline-tonumber(now[1])),day}
 end
end
if daily_r>=rpd or daily_t+tokens>tonumber(ARGV[6]) then return {0,86400-(tonumber(now[1])%86400),day} end
if redis.call('ZCARD',KEYS[1])>=rpm or used+tokens>tpm then
 local first=redis.call('ZRANGE',KEYS[1],0,0,'WITHSCORES')
 return {0,math.max(1,math.ceil((tonumber(first[2] or ms)+60001-ms)/1000)),day}
end
redis.call('ZADD',KEYS[1],ms,ARGV[1]); redis.call('HSET',KEYS[2],ARGV[1],tokens)
redis.call('HINCRBY',KEYS[3],'requests',1); redis.call('HINCRBY',KEYS[3],'tokens',tokens)
for _,kind in ipairs({'tokens','requests'}) do
 if tonumber(redis.call('HGET',KEYS[5],kind..'_until') or '0')>tonumber(now[1]) then
  redis.call('HINCRBY',KEYS[5],kind..'_remaining',-(kind=='tokens' and tokens or 1))
 end
end
redis.call('EXPIRE',KEYS[1],120); redis.call('EXPIRE',KEYS[2],120); redis.call('EXPIRE',KEYS[3],172800)
local granted={1,0,day,tokens}
if KEYS[6] then redis.call('SET',KEYS[6],cjson.encode(granted),'EX',120) end
return granted
"""

SETTLE = """
local previous=redis.call('HGET',KEYS[1],ARGV[1])
if previous then
 redis.call('HSET',KEYS[1],ARGV[1],ARGV[2])
 if tonumber(redis.call('HGET',KEYS[2],'day') or '-1')==tonumber(ARGV[3]) then
  redis.call('HINCRBY',KEYS[2],'tokens',tonumber(ARGV[2])-tonumber(previous))
 end
end
return 1
"""

OBSERVE = """
local now=tonumber(redis.call('TIME')[1])
if tonumber(ARGV[1])>0 then redis.call('HSET',KEYS[1],'tpm',ARGV[1]) end
if tonumber(ARGV[2])>0 then redis.call('HSET',KEYS[1],'rpd',ARGV[2]) end
for i,kind in ipairs({'tokens','requests'}) do
 local value=tonumber(ARGV[i*2+1]); local reset=tonumber(ARGV[i*2+2])
 if value>=0 and reset>0 then
  local deadline=tonumber(redis.call('HGET',KEYS[1],kind..'_until') or '0')
  local previous=tonumber(redis.call('HGET',KEYS[1],kind..'_remaining') or '-1')
  if deadline<=now or previous<0 then
   redis.call('HSET',KEYS[1],kind..'_remaining',value,kind..'_until',now+reset)
  else
   redis.call('HSET',KEYS[1],kind..'_remaining',math.min(previous,value))
  end
 end
end
redis.call('EXPIRE',KEYS[1],172800)
return 1
"""


@dataclass
class Reservation:
    prefix: str
    identifier: str
    day: int
    reserved: int
    actual: int | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    thinking_tokens: int | None = None


active: ContextVar[Reservation | None] = ContextVar("provider_reservation", default=None)


def mark_request_unsent() -> None:
    """Transport-proven no-send: settle tokens, retaining conservative attempt limits."""
    ticket = active.get()
    if ticket is not None and ticket.actual is None:
        ticket.actual = 0


def scope_prefix(provider: str, model: str) -> str:
    scope = hashlib.sha256(f"{settings.AI_CAPACITY_SCOPE}:{provider}:{model}".encode()).hexdigest()[
        :24
    ]
    return "pansgpt:capacity:{" + scope + "}"


async def cool_provider(provider: str, model: str, seconds: int) -> None:
    if not settings.AI_CAPACITY_ENABLED:
        return
    try:
        await redis_client().set(scope_prefix(provider, model) + ":blocked", "1", ex=seconds)
    except Exception:
        pass


def seconds_header(value: str | None) -> float:
    if not value:
        return 0
    try:
        return max(0, float(value))
    except ValueError:
        units = {"ms": 0.001, "s": 1, "m": 60, "h": 3600}
        return sum(
            float(number) * units[unit] for number, unit in re.findall(r"([\d.]+)(ms|s|m|h)", value)
        )


async def observe(
    headers: Mapping[str, str],
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
) -> None:
    ticket = active.get()
    if ticket is None:
        return
    if prompt_tokens is not None and completion_tokens is not None:
        ticket.actual = max(0, prompt_tokens + completion_tokens)
    if type(prompt_tokens) is int:
        ticket.prompt_tokens = prompt_tokens
    if type(completion_tokens) is int:
        ticket.completion_tokens = completion_tokens
    observed_started = time.monotonic()
    try:
        limits = {}
        for header, field in [
            ("x-ratelimit-limit-tokens", "tpm"),
            ("x-ratelimit-limit-requests", "rpd"),
        ]:
            value = headers.get(header)
            if value and value.isdigit():
                limits[field] = int(value)
        if limits or any(
            headers.get("x-ratelimit-remaining-" + kind) is not None
            for kind in ("tokens", "requests")
        ):
            remaining = []
            for kind in ("tokens", "requests"):
                value = headers.get("x-ratelimit-remaining-" + kind, "")
                remaining.extend(
                    [
                        int(value) if value.isdigit() else -1,
                        math.ceil(seconds_header(headers.get("x-ratelimit-reset-" + kind))),
                    ]
                )
            await redis_client().eval(
                OBSERVE,
                1,
                ticket.prefix + ":limits",
                limits.get("tpm", 0),
                limits.get("rpd", 0),
                *remaining,
            )
        logger.debug(
            "provider_capacity_observed",
            input_tokens=prompt_tokens,
            output_tokens=completion_tokens,
            remaining_tokens=headers.get("x-ratelimit-remaining-tokens"),
            remaining_requests=headers.get("x-ratelimit-remaining-requests"),
            elapsed_ms=round((time.monotonic() - observed_started) * 1000),
        )
    except Exception as exc:
        logger.warning("provider_capacity_observation_deferred", error_type=type(exc).__name__)


@asynccontextmanager
async def provider_budget(
    provider: str,
    model: str,
    payload: object,
    output_tokens: int,
    *,
    input_token_reserve: int = 0,
    fit_output: bool = False,
) -> AsyncIterator[int]:
    if not settings.AI_CAPACITY_ENABLED:
        yield output_tokens
        return
    limits = settings.AI_PROVIDER_BUDGETS[provider]
    prefix = scope_prefix(provider, model)
    identifier = uuid4().hex
    input_estimate = math.ceil(
        len(json.dumps(payload, ensure_ascii=False, default=str).encode()) / 3
    ) + max(0, input_token_reserve)
    reserved = input_estimate + output_tokens
    admission_started = time.monotonic()
    try:
        async with asyncio.timeout(5):
            for attempt in range(2):
                try:
                    result = await redis_client().eval(
                        RESERVE,
                        6,
                        prefix + ":events",
                        prefix + ":weights",
                        prefix + ":day",
                        prefix + ":blocked",
                        prefix + ":limits",
                        prefix + ":receipt:" + identifier,
                        identifier,
                        reserved,
                        limits["rpm"],
                        limits["rpd"],
                        limits["tpm"],
                        limits["tpd"],
                        input_estimate,
                        min(output_tokens, 1024) if fit_output else 0,
                    )
                    break
                except (RedisConnectionError, RedisTimeoutError, TimeoutError) as exc:
                    if attempt:
                        raise
                    logger.warning(
                        "provider_admission_retry",
                        provider=provider,
                        model=model,
                        **error_fields(exc),
                    )
                    await asyncio.sleep(0.15)
    except Exception as exc:
        logger.warning(
            "provider_admission_failed",
            provider=provider,
            model=model,
            elapsed_ms=round((time.monotonic() - admission_started) * 1000),
            **error_fields(exc),
        )
        raise CapacityDeferred(30, "capacity_store_unavailable") from exc
    if int(result[0]) != 1:
        reason = "request_exceeds_budget" if int(result[0]) == -1 else "provider_capacity"
        if len(result) > 3:
            reason = (
                "provider_rate_limit"
                if result[3] == "provider_rate_limit"
                else "provider_unavailable"
            )
        logger.info(
            "provider_admission_deferred",
            provider=provider,
            model=model,
            reason=reason,
            retry_after_s=float(result[1]),
            reserved_tokens=reserved,
            token_limit=limits["tpm"],
        )
        raise CapacityDeferred(
            float(result[1]),
            reason,
        )
    granted = int(result[3]) if len(result) > 3 else reserved
    if granted != reserved:
        logger.info(
            "provider_output_capacity_fitted",
            provider=provider,
            model=model,
            requested_output_tokens=output_tokens,
            output_tokens=granted - input_estimate,
            reserved_tokens=granted,
        )
    reserved = granted
    ticket = Reservation(prefix, identifier, int(result[2]), reserved)
    logger.info(
        "provider_admission_granted",
        provider=provider,
        model=model,
        reserved_tokens=reserved,
        elapsed_ms=round((time.monotonic() - admission_started) * 1000),
    )
    token = active.set(ticket)
    started = time.monotonic()
    try:
        yield reserved - input_estimate
    except BaseException as exc:
        code = (
            getattr(exc, "code", None)
            or getattr(exc, "status_code", None)
            or getattr(getattr(exc, "response", None), "status_code", None)
        )
        if code == 429 or isinstance(code, int) and code >= 500:
            logger.warning(
                "provider_request_rejected",
                provider=provider,
                model=model,
                status=code,
                **error_fields(exc),
                elapsed_ms=round((time.monotonic() - started) * 1000),
            )
            headers = getattr(getattr(exc, "response", None), "headers", {})
            wait = max(
                seconds_header(headers.get("retry-after")),
                seconds_header(headers.get("x-ratelimit-reset-tokens")),
                seconds_header(headers.get("x-ratelimit-reset-requests"))
                if headers.get("x-ratelimit-remaining-requests") == "0"
                else 0,
            )
            if not wait:
                wait = 60 if code == 429 else 120
            try:
                await redis_client().set(
                    prefix + ":blocked",
                    "provider_rate_limit" if code == 429 else "provider_unavailable",
                    ex=math.ceil(min(wait, 86400)),
                )
            except Exception:
                pass
            raise CapacityDeferred(
                wait, "provider_rate_limit" if code == 429 else "provider_unavailable"
            ) from exc
        # Local timeouts do not prove provider-wide unavailability or quota
        # exhaustion. The caller owns its bounded retry/circuit policy.
        raise
    finally:
        active.reset(token)
        if ticket.actual is not None:
            try:
                await asyncio.shield(
                    redis_client().eval(
                        SETTLE,
                        2,
                        prefix + ":weights",
                        prefix + ":day",
                        identifier,
                        ticket.actual,
                        ticket.day,
                    )
                )
            except Exception as exc:
                logger.warning(
                    "provider_capacity_settlement_deferred", error_type=type(exc).__name__
                )
        logger.info(
            "provider_request_budget",
            provider=provider,
            model=model,
            reserved_tokens=reserved,
            actual_tokens=ticket.actual,
            prompt_tokens=ticket.prompt_tokens,
            completion_tokens=ticket.completion_tokens,
            thinking_tokens=ticket.thinking_tokens,
            elapsed_ms=round((time.monotonic() - started) * 1000),
        )
