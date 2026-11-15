"""Request-local AI settings; never mutate shared provider singleton settings."""

from collections.abc import AsyncGenerator, AsyncIterator
from contextvars import ContextVar
from uuid import UUID

import asyncpg
from pydantic import BaseModel

from app.core.config import settings

temperature: ContextVar[float] = ContextVar("governance_temperature", default=0.2)


class GenerationPolicy(BaseModel):
    system_prompt: str = ""
    temperature: float = 0.2
    rag_threshold: float = 0.25
    web_search_enabled: bool = True
    curriculum_context: str = ""


async def load_policy(
    conn: asyncpg.Connection,
    university: UUID | None = None,
    level: str | None = None,
    course: str | None = None,
) -> GenerationPolicy:
    if not settings.ENABLE_GOVERNANCE:
        return GenerationPolicy()
    row = await conn.fetchrow(
        "SELECT system_prompt,temperature,rag_threshold,web_search_enabled FROM public.system_settings WHERE id=1"
    )
    policy = GenerationPolicy.model_validate(dict(row)) if row else GenerationPolicy()
    if university is not None and level is not None:
        # User-approved shared curriculum context; never private notes/history.
        entries = await conn.fetch(
            """SELECT left(knowledge_text,1500) AS context FROM public.course_knowledge
        WHERE university_id=$1 AND level=$2::public.university_level AND deleted_at IS NULL
        AND (course_code IS NULL OR upper(course_code)=upper($3)) ORDER BY updated_at DESC LIMIT 8""",
            university,
            level,
            course,
        )
        policy.curriculum_context = "\n\n".join(entry["context"] for entry in entries)[:12000]
    return policy


async def configured_generation[T](events: AsyncIterator[T], value: float) -> AsyncIterator[T]:
    try:
        while True:
            # A stream may be resumed or finalized in another asyncio context.
            # Never retain a ContextVar token across a yield boundary.
            token = temperature.set(value)
            try:
                event = await anext(events)
            except StopAsyncIteration:
                return
            finally:
                temperature.reset(token)
            yield event
    finally:
        token = temperature.set(value)
        try:
            if isinstance(events, AsyncGenerator):
                await events.aclose()
        finally:
            temperature.reset(token)
