"""Durable quiz dispatcher and retry-safe, cooperatively cancelled generation worker."""

import asyncio
from typing import Protocol, cast
from uuid import UUID, uuid4

import structlog
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines.embedder import gemini_embedder
from app.engines.provider_capacity import CapacityDeferred
from app.engines.quiz_generation import generate_batch
from app.engines.quiz_service import ELIGIBLE, check_exam, database, unpack
from app.models.quiz import QuizConfig

logger = structlog.get_logger(__name__)


class Queue(Protocol):
    async def enqueue_job(self, function: str, *args: object, **kwargs: object) -> object: ...
    async def publish(self, channel: str, message: str) -> object: ...


QUIZ_WAKE_CHANNEL = "pansgpt:quiz:wake"


async def dispatch_quiz_jobs(ctx: dict[str, object]) -> None:
    if not settings.ENABLE_QUIZ:
        return
    async with database() as conn:
        await conn.execute("""UPDATE public.quiz_generation_jobs SET status='failed',completed_at=now(),error_message='Generation was interrupted repeatedly. Please create a new quiz.'
        WHERE status IN ('queued','retrieving','generating','saving') AND attempts>=3 AND (lease_until IS NULL OR lease_until<now())""")
        rows = await conn.fetch(
            """SELECT id,attempts,updated_at FROM public.quiz_generation_jobs WHERE status IN ('queued','retrieving','generating','saving')
        AND attempts<3 AND (lease_until IS NULL OR lease_until<now())
        AND ($1::boolean OR COALESCE(request_payload->>'bank_refill','false')!='true')
        AND (COALESCE(request_payload->>'bank_refill','false')!='true' OR NOT EXISTS(
            SELECT 1 FROM public.quiz_generation_jobs interactive
            WHERE interactive.status IN ('queued','retrieving','generating','saving')
            AND COALESCE(interactive.request_payload->>'bank_refill','false')!='true'))
        ORDER BY COALESCE(request_payload->>'bank_refill','false')='true',created_at LIMIT 20""",
            settings.ENABLE_QUIZ_INVENTORY,
        )
    redis = cast(Queue, ctx["redis"])
    for row in rows:
        delivery = f"quiz:{row['id']}:{row['attempts']}:{row['updated_at'].isoformat()}"
        await redis.enqueue_job(
            "generate_quiz_job",
            str(row["id"]),
            _job_id=delivery,
        )
        await redis.publish(QUIZ_WAKE_CHANNEL, delivery)


async def schedule_quiz_retry(ctx: dict[str, object], job_id: str, delay: int) -> None:
    """Queue the next delivery durably; the database reconciler remains the backup."""
    if ctx.get("redis") is None:
        return
    try:
        redis = cast(Queue, ctx["redis"])
        await redis.enqueue_job(
            "generate_quiz_job",
            job_id,
            _job_id=f"quiz:{job_id}:retry:{uuid4()}",
            _defer_by=delay,
        )
    except Exception as exc:
        logger.warning("quiz_retry_dispatch_deferred", error_type=type(exc).__name__)


async def wake_quiz_worker() -> None:
    """Redis failure leaves the durable request for the scheduled reconciler."""
    url = settings.redis_connection_url
    if not url:
        return
    try:
        async with asyncio.timeout(3):
            redis = await create_pool(RedisSettings.from_dsn(url))
            try:
                await dispatch_quiz_jobs({"redis": redis})
            finally:
                await redis.aclose()
    except Exception as exc:
        logger.warning("quiz_dispatch_deferred", error_type=type(exc).__name__)
        return


async def retrieve_sources(config: QuizConfig, user: UserContext) -> list[dict[str, object]]:
    vector = None
    if config.topic:
        async with asyncio.timeout(35):
            values = await gemini_embedder.embed_single(config.topic, kind="query")
        vector = "[" + ",".join(str(v) for v in values) + "]"
    async with database() as conn:
        await check_exam(conn, user, config.course_code)
        if vector:
            rows = await conn.fetch(
                f"""SELECT c.id AS chunk_id,c.document_id,d.title,c.page_start AS page,left(c.content,1800) AS excerpt
            FROM public.document_chunks c JOIN public.documents d ON d.id=c.document_id
            WHERE {ELIGIBLE} AND d.course_code=$3
            ORDER BY c.embedding::halfvec(1536) <=> $4::halfvec(1536) LIMIT 160""",
                user.university_id,
                user.current_level,
                config.course_code,
                vector,
            )
        else:
            # One random chunk per ordered section of each document provides
            # coverage from the beginning through the end, rather than hoping a
            # uniform random subset happens to cover every part of the material.
            rows = await conn.fetch(
                f"""WITH sections AS (
            SELECT c.id AS chunk_id,c.document_id,d.title,c.page_start AS page,left(c.content,1800) AS excerpt,
            ntile(8) OVER (PARTITION BY d.id ORDER BY c.chunk_index,c.id) AS section
            FROM public.document_chunks c JOIN public.documents d ON d.id=c.document_id
            WHERE {ELIGIBLE} AND d.course_code=$3), candidates AS (
            SELECT *,row_number() OVER (PARTITION BY document_id,section ORDER BY md5(chunk_id::text || $4::text)) AS pick
            FROM sections)
            , sampled AS (
            SELECT chunk_id,document_id,title,page,excerpt,section FROM candidates WHERE pick=1
            ORDER BY CASE section WHEN 1 THEN 1 WHEN 8 THEN 2 WHEN 4 THEN 3 WHEN 6 THEN 4
                WHEN 2 THEN 5 WHEN 7 THEN 6 WHEN 3 THEN 7 ELSE 8 END,
                md5(document_id::text || $4::text) LIMIT 24)
            SELECT chunk_id,document_id,title,page,excerpt FROM sampled
            ORDER BY section,md5(document_id::text || $4::text)""",
                user.university_id,
                user.current_level,
                config.course_code,
                str(uuid4()),
            )
    excerpts: list[dict[str, object]] = []
    counts: dict[UUID, int] = {}
    for row in rows:
        document = row["document_id"]
        if counts.get(document, 0) >= 8:
            continue
        excerpts.append(
            {key: row[key] for key in ("chunk_id", "document_id", "title", "page", "excerpt")}
        )
        counts[document] = counts.get(document, 0) + 1
        if len(excerpts) == 24:
            break
    if not excerpts:
        raise ValueError("No eligible source passages")
    return excerpts


async def generate_quiz_job(ctx: dict[str, object], job_id: str) -> None:
    if not settings.ENABLE_QUIZ or not settings.ENABLE_AI:
        return
    from app.models.quiz import QuizTaskConfig
    from workers.quiz_pipeline import generate_questions

    lease = uuid4()
    identifier = UUID(job_id)
    async with database() as conn, conn.transaction():
        job = await conn.fetchrow(
            "SELECT g.*,(SELECT count(*) FROM public.quiz_questions p WHERE p.quiz_id=g.quiz_id) AS saved_count FROM public.quiz_generation_jobs g WHERE id=$1 FOR UPDATE",
            identifier,
        )
        now = await conn.fetchval("SELECT now()")
        if (
            job is None
            or job["status"] in ("completed", "cancelled", "failed")
            or (job["lease_until"] and job["lease_until"] > now)
            or job["attempts"] >= 3
        ):
            return
        # Already-enqueued deliveries must also respect the inventory switch.
        if unpack(job["request_payload"]).get("bank_refill") and not settings.ENABLE_QUIZ_INVENTORY:
            return
        await conn.execute(
            "UPDATE public.quiz_generation_jobs SET lease_id=$2,lease_until=now()+interval '5 minutes',attempts=attempts+1,status='retrieving',current_step='Finding your course material',error_message=NULL WHERE id=$1",
            identifier,
            lease,
        )
        profile = await conn.fetchrow(
            "SELECT u.id,u.email,u.university_id,u.current_level FROM public.users u JOIN public.quizzes q ON q.id=$3 AND q.level=u.current_level AND q.deleted_at IS NULL WHERE u.id=$1 AND u.university_id=$2 AND u.deleted_at IS NULL",
            job["user_id"],
            job["university_id"],
            job["quiz_id"],
        )
    try:
        if profile is None:
            raise ValueError("Owner is no longer eligible")
        user = UserContext(**dict(profile), role="student", roles=["student"])
        config = QuizTaskConfig.model_validate(unpack(job["request_payload"]))
        if job["saved_count"] == 0:
            async with database() as conn:
                await conn.execute(
                    "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"content_generation_version\":1}'::jsonb WHERE id=$1 AND lease_id=$2",
                    identifier,
                    lease,
                )
        if config.question_type == "statement_matrix":
            async with database() as conn:
                count = await conn.fetchval(
                    "SELECT count(*) FROM public.quiz_questions WHERE quiz_id=$1", job["quiz_id"]
                )
                if count == 0:
                    await conn.execute(
                        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"matrix_generation_version\":1}'::jsonb WHERE id=$1 AND lease_id=$2",
                        identifier,
                        lease,
                    )
                    config = config.model_copy(update={"matrix_generation_version": 1})
        await generate_questions(
            database, job, lease, user, config, retrieve_sources, generate_batch
        )
    except CapacityDeferred as exc:
        logger.info(
            "quiz_generation_deferred", job_id=job_id, reason=exc.reason, retry_seconds=exc.seconds
        )
        waits = min(8, config.capacity_waits + 1)
        stopped = waits >= 8 or exc.seconds >= 900
        step = (
            "Generation stopped"
            if stopped
            else "Preparing shared questions"
            if exc.reason == "shared_questions_pending"
            else "Waiting for quiz service connection"
            if exc.reason in ("capacity_store_unavailable", "inventory_store_unavailable")
            else "Waiting for AI service recovery"
            if exc.reason in ("provider_unavailable", "provider_timeout")
            else "Waiting for AI service capacity"
        )
        async with database() as conn:
            changed = await conn.fetchval(
                """UPDATE public.quiz_generation_jobs SET status=CASE WHEN $6 THEN 'failed'::public.quiz_job_status ELSE 'queued'::public.quiz_job_status END,attempts=GREATEST(0,attempts-1),
            current_step=$3,error_message=CASE WHEN $6 THEN 'Automatic preparation stopped after repeated service waits. Saved questions are kept; retry when the service is available.' ELSE NULL END,
            lease_id=NULL,lease_until=CASE WHEN $6 THEN NULL ELSE now()+$4*interval '1 second' END,
            completed_at=CASE WHEN $6 THEN now() ELSE NULL END,
            request_payload=jsonb_set(request_payload,'{capacity_waits}',to_jsonb($5::int))
            WHERE id=$1 AND lease_id=$2 AND status!='cancelled' RETURNING id""",
                identifier,
                lease,
                step,
                exc.seconds + 1,
                waits,
                stopped,
            )
        if changed and not stopped:
            await schedule_quiz_retry(ctx, job_id, exc.seconds + 1)
    except Exception as exc:
        logger.warning("quiz_generation_retry", job_id=job_id, error_type=type(exc).__name__)
        async with database() as conn:
            await conn.execute(
                """UPDATE public.quiz_generation_jobs SET status=CASE WHEN attempts>=3 THEN 'failed'::public.quiz_job_status ELSE 'queued'::public.quiz_job_status END,
            current_step=CASE WHEN attempts>=3 THEN 'Generation stopped' ELSE 'Waiting to retry generation' END,
            error_message=CASE WHEN attempts>=3 THEN 'Question generation could not finish after three attempts. Retry this request when the service is available.' ELSE 'Question generation was interrupted. Your request will retry automatically.' END,lease_until=NULL,lease_id=NULL
            WHERE id=$1 AND lease_id=$2 AND status!='cancelled'""",
                identifier,
                lease,
            )
