"""Shared per-account admission for costly chat actions, independent of sessions."""

import asyncio
import hashlib
import uuid
from typing import Literal

import structlog
from fastapi import HTTPException

from app.core.config import settings
from app.core.dependencies import UserContext
from app.core.diagnostics import error_fields
from app.engines.provider_capacity import redis_client

logger = structlog.get_logger(__name__)
Action = Literal["send", "upload", "voice"]

ADMIT = """
local now=redis.call('TIME'); local ms=tonumber(now[1])*1000+math.floor(tonumber(now[2])/1000)
redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ms-60000)
if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[1]) then
 local first=redis.call('ZRANGE',KEYS[1],0,0,'WITHSCORES')
 return {0,math.max(1,math.ceil((tonumber(first[2])+60001-ms)/1000))}
end
redis.call('ZADD',KEYS[1],ms,ARGV[2]); redis.call('EXPIRE',KEYS[1],61)
return {1,0}
"""


async def admit_chat_action(user: UserContext, action: Action) -> None:
    if not settings.CHAT_ACTION_RATE_LIMIT_ENABLED:
        return
    # No JWT, address, prompt or raw identity enters Redis keys/logs.
    scope = hashlib.sha256(
        f"{settings.AI_CAPACITY_SCOPE}:{user.id}:{user.university_id}".encode()
    ).hexdigest()[:32]
    key = f"pansgpt:chat-actions:{{{scope}}}:{action}"
    try:
        async with asyncio.timeout(5):
            result = await redis_client().eval(
                ADMIT, 1, key, settings.CHAT_ACTION_LIMITS[action], uuid.uuid4().hex
            )
    except Exception as exc:
        logger.warning("chat_action_admission_unavailable", action=action, **error_fields(exc))
        raise HTTPException(
            503, "Something went wrong. Please try again.", headers={"Retry-After": "2"}
        ) from None
    if int(result[0]) != 1:
        delay = max(1, min(60, int(result[1])))
        logger.info("chat_action_rate_limited", action=action, retry_after_s=delay)
        raise HTTPException(
            429, "Too many requests. Please try again shortly.", headers={"Retry-After": str(delay)}
        )
