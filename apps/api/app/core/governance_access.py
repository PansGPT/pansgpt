"""Server-time checks performed before reserving AI credits or starting inference."""

import asyncpg
from fastapi import HTTPException

from app.core.config import settings
from app.core.dependencies import UserContext


async def check_ai_access(
    conn: asyncpg.Connection, user: UserContext, course: str | None = None
) -> None:
    if not settings.ENABLE_GOVERNANCE:
        return
    maintenance = await conn.fetchval(
        "SELECT maintenance_mode FROM public.system_settings WHERE id=1"
    )
    if maintenance is True and "super_admin" not in user.roles:
        raise HTTPException(503, "AI assistance is temporarily paused for maintenance.")
    if user.role != "student":
        return
    # Chat cannot establish a trustworthy course from user text, so an active
    # cohort restriction pauses chat. Quiz generation supplies its validated course.
    blocked = await conn.fetchval(
        """SELECT EXISTS(SELECT 1 FROM public.exam_restrictions
    WHERE university_id=$1 AND level=$2::public.university_level AND status IN ('active','scheduled')
    AND start_time<=now() AND end_time>now() AND ($3::text IS NULL OR course_code IS NULL OR course_code=$3))""",
        user.university_id,
        user.current_level,
        course,
    )
    if blocked is True:
        raise HTTPException(423, "AI assistance is paused during your scheduled assessment.")
    exhausted = await conn.fetchval(
        """SELECT coalesce((SELECT sum(t.prompt_tokens+t.completion_tokens)
    FROM public.ai_telemetry t WHERE t.university_id=u.id AND t.created_at>=date_trunc('month',now())),0)>=u.monthly_token_quota
    FROM public.universities u WHERE u.id=$1""",
        user.university_id,
    )
    if exhausted is True:
        raise HTTPException(429, "Your university has reached its monthly AI token allocation.")
