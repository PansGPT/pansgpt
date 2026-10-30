"""Warm recent quiz scopes and newly ingested courses during idle capacity."""

from uuid import UUID

import structlog

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines.quiz_bank import schedule_inventory
from app.engines.quiz_service import database
from app.models.quiz import QuizConfig

logger = structlog.get_logger(__name__)


async def warm_quiz_inventory(ctx: dict[str, object], document_id: str | None = None) -> None:
    if not settings.ENABLE_QUIZ or not settings.ENABLE_AI or not settings.ENABLE_QUIZ_INVENTORY:
        return
    try:
        async with database() as conn:
            # One globally bounded background inventory job at a time.
            if await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM public.quiz_generation_jobs WHERE status IN ('queued','retrieving','generating','saving'))"
            ):
                return
            if document_id:
                rows = await conn.fetch(
                    """SELECT d.id AS document_id,d.course_code,'' AS topic,'objective' AS question_format,'medium' AS difficulty,
                u.id,u.email,u.university_id,u.current_level FROM public.documents d JOIN public.users u ON u.university_id=d.university_id
                WHERE d.id=$1 AND d.status='active' AND d.embedding_status='completed' AND d.deleted_at IS NULL
                AND u.deleted_at IS NULL AND u.role='student' AND u.current_level IS NOT NULL
                AND (cardinality(d.target_levels)=0 OR u.current_level=ANY(d.target_levels)) ORDER BY u.id LIMIT 1""",
                    UUID(document_id),
                )
            else:
                rows = await conn.fetch("""SELECT DISTINCT ON(q.university_id,q.level,q.course_code,q.topic,q.difficulty,q.question_format)
                q.document_id,q.course_code,q.topic,q.difficulty,q.question_format,u.id,u.email,u.university_id,u.current_level
                FROM public.quizzes q JOIN public.users u ON u.id=q.user_id AND u.current_level=q.level
                JOIN public.quiz_generation_jobs j ON j.quiz_id=q.id
                WHERE q.deleted_at IS NULL AND u.deleted_at IS NULL AND j.status='completed'
                AND COALESCE(j.request_payload->>'bank_refill','false')!='true' AND q.created_at>now()-interval '30 days'
                ORDER BY q.university_id,q.level,q.course_code,q.topic,q.difficulty,q.question_format,q.created_at DESC LIMIT 8""")
        for row in rows:
            user = UserContext(
                id=row["id"],
                email=row["email"],
                university_id=row["university_id"],
                current_level=row["current_level"],
                role="student",
                roles=["student"],
            )
            config = QuizConfig(
                course_code=row["course_code"],
                topic=row["topic"],
                difficulty=row["difficulty"],
                question_type=row["question_format"],
            )
            if await schedule_inventory(config, user, row["document_id"]):
                logger.info("quiz_inventory_scheduled", format=config.question_type)
                return
    except Exception as exc:
        # Inventory scheduling must not invalidate a successfully ingested document.
        logger.warning("quiz_inventory_warming_deferred", error_type=type(exc).__name__)
