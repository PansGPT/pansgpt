"""Coalesce fresh generation for matching university/course quiz scopes."""

import hashlib
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines import provider_capacity
from app.engines.provider_capacity import CapacityDeferred
from app.models.quiz import QuizConfig


@asynccontextmanager
async def question_flight(config: QuizConfig, user: UserContext) -> AsyncIterator[None]:
    if not settings.AI_CAPACITY_ENABLED or config.revision_result_id:
        yield
        return
    identity = [
        str(user.university_id),
        user.current_level,
        config.course_code,
        config.topic.casefold(),
        config.difficulty,
        config.question_type,
    ]
    key = "pansgpt:quiz:flight:" + hashlib.sha256(json.dumps(identity).encode()).hexdigest()
    token = uuid4().hex
    try:
        claimed = await provider_capacity.redis_client().set(key, token, nx=True, ex=300)
    except Exception as exc:
        raise CapacityDeferred(15, "inventory_store_unavailable") from exc
    if not claimed:
        raise CapacityDeferred(5, "shared_questions_pending")
    try:
        yield
    finally:
        # Never release a successor's lease after expiry or cancellation.
        try:
            await provider_capacity.redis_client().eval(
                "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",
                1,
                key,
                token,
            )
        except Exception:
            pass
