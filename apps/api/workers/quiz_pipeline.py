"""Bounded concurrent batches with serial, cancellation-safe persistence."""

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from contextlib import AbstractAsyncContextManager
from typing import Protocol
from uuid import UUID

import asyncpg
import structlog

from app.core.dependencies import UserContext
from app.engines.provider_capacity import CapacityDeferred
from app.engines.quiz_bank import reusable_questions, schedule_refill
from app.engines.quiz_flight import question_flight
from app.engines.quiz_generation import duplicate
from app.engines.quiz_ordering import shuffle_matrix
from app.engines.quiz_service import unpack
from app.models.quiz import GeneratedQuestion, QuizTaskConfig, Source

Connect = Callable[[], AbstractAsyncContextManager[asyncpg.Connection]]
Item = tuple[GeneratedQuestion, list[Source]]
logger = structlog.get_logger(__name__)


PREVIOUS_QUESTIONS = """SELECT p.prompt FROM public.quiz_questions p
JOIN public.quizzes q ON q.id=p.quiz_id
JOIN public.quiz_generation_jobs g ON g.quiz_id=q.id
WHERE q.user_id=$1 AND q.university_id=$2 AND q.course_code=$3 AND q.id!=$4
AND q.deleted_at IS NULL AND COALESCE(g.request_payload->>'bank_refill','false')!='true'
ORDER BY q.created_at DESC,p.question_order DESC"""


class BatchLoader(Protocol):
    async def __call__(
        self,
        config: QuizTaskConfig,
        excerpts: list[dict[str, object]],
        existing: list[str],
        count: int,
        academic_level: str | None = None,
        variation: int = 0,
    ) -> list[GeneratedQuestion]: ...


async def append_questions(
    connect: Connect, job: asyncpg.Record, lease: UUID, config: QuizTaskConfig, items: list[Item]
) -> int | None:
    async with connect() as conn, conn.transaction():
        locked = await conn.fetchrow(
            "SELECT status,lease_id FROM public.quiz_generation_jobs WHERE id=$1 FOR UPDATE",
            job["id"],
        )
        if locked["status"] in ("completed", "failed", "cancelled") or locked["lease_id"] != lease:
            return None
        # Serialize the existing duplicate check across a student's parallel
        # requests, then refresh history before committing any questions.
        await conn.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
            f"quiz-fresh:{job['user_id']}:{config.course_code}",
        )
        prior = (
            []
            if config.bank_refill
            else await conn.fetch(
                PREVIOUS_QUESTIONS,
                job["user_id"],
                job["university_id"],
                config.course_code,
                job["quiz_id"],
            )
        )
        rows = await conn.fetch(
            "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
            job["quiz_id"],
        )
        prompts = [r["prompt"] for r in rows]
        values = []
        for item, sources in items:
            if len(prompts) >= config.count:
                break
            if duplicate(item.prompt, [r["prompt"] for r in prior] + prompts):
                continue
            item = shuffle_matrix(item)
            prompts.append(item.prompt)
            points = (
                3
                if item.question_type == "multi_select"
                else 5
                if item.question_type == "statement_matrix"
                else 1
            )
            values.append(
                (
                    job["quiz_id"],
                    len(prompts),
                    item.question_type,
                    item.prompt,
                    json.dumps([o.model_dump() for o in item.options]),
                    item.answer_key.model_dump_json(),
                    item.explanation,
                    points,
                    json.dumps([s.model_dump(mode="json") for s in sources]),
                    item.concept,
                )
            )
        if values:
            await conn.executemany(
                """INSERT INTO public.quiz_questions(quiz_id,question_order,question_type,prompt,options,correct_answer,answer_key,explanation,points,sources,concept)
            VALUES($1,$2,$3,$4,$5::jsonb,$6::text,($6::text)::jsonb,$7,$8,$9::jsonb,$10)""",
                values,
            )
        await conn.execute(
            "UPDATE public.quiz_generation_jobs SET progress=$3,lease_until=now()+interval '5 minutes',current_step=$4 WHERE id=$1 AND lease_id=$2",
            job["id"],
            lease,
            int(len(prompts) / config.count * 100),
            f"{len(prompts)} of {config.count} questions ready",
        )
        return len(prompts)


async def generate_questions(
    connect: Connect,
    job: asyncpg.Record,
    lease: UUID,
    user: UserContext,
    config: QuizTaskConfig,
    source_loader: Callable[..., Awaitable[list[dict[str, object]]]],
    batch_loader: BatchLoader,
) -> None:
    started = time.monotonic()
    async with connect() as conn:
        recent = await conn.fetch(
            PREVIOUS_QUESTIONS,
            user.id,
            user.university_id,
            config.course_code,
            job["quiz_id"],
        )
        current = await conn.fetch(
            "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
            job["quiz_id"],
        )
        if config.revision_result_id:
            previous = await conn.fetchval(
                """SELECT a.feedback FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id
            WHERE a.id=$1 AND a.user_id=$2 AND q.university_id=$3 AND q.deleted_at IS NULL""",
                config.revision_result_id,
                user.id,
                user.university_id,
            )
            if previous:
                focus = [
                    item["question"]["concept"]
                    for item in unpack(previous)
                    if item["outcome"] != "correct"
                ]
                config = config.model_copy(
                    update={"topic": (config.topic + "; Focus on: " + ", ".join(focus))[:300]}
                )
    avoid = [r["prompt"] for r in recent]
    bank_hits = 0
    if config.bank_refill:
        inventory = await reusable_questions(config, user, job["quiz_id"], [], 40)
        avoid.extend(question.prompt for question, _ in inventory)
    if not config.bank_refill and len(current) < config.count:
        cached = await reusable_questions(
            config,
            user,
            job["quiz_id"],
            avoid + [r["prompt"] for r in current],
            config.count - len(current),
        )
        count = await append_questions(connect, job, lease, config, cached)
        if count is None:
            return
        bank_hits = count - len(current)
    else:
        count = len(current)
    if count < config.count:
        async with question_flight(config, user):
            if not config.bank_refill:
                async with connect() as conn:
                    prompts = await conn.fetch(
                        "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1", job["quiz_id"]
                    )
                cached = await reusable_questions(
                    config,
                    user,
                    job["quiz_id"],
                    avoid + [r["prompt"] for r in prompts],
                    config.count - count,
                )
                count = await append_questions(connect, job, lease, config, cached)
                if count is None:
                    return
                bank_hits += len(cached)
            if count < config.count:
                excerpts = await source_loader(config, user)
                sources = {str(row["chunk_id"]): Source.model_validate(row) for row in excerpts}
                # Persist up to two concurrent batches independently for recovery.
                # New attempts become available only after the complete set is saved.
                async with asyncio.timeout(120):
                    max_batch_size = 2 if config.question_type == "statement_matrix" else 5
                    batch_size = max_batch_size
                    invalid_without_progress = False
                    max_waves = max(
                        5, (config.count + max_batch_size * 2 - 1) // (max_batch_size * 2) + 2
                    )
                    for wave in range(max_waves):
                        async with connect() as conn:
                            active = await conn.fetchval(
                                "UPDATE public.quiz_generation_jobs SET status='generating',lease_until=now()+interval '5 minutes' WHERE id=$1 AND lease_id=$2 AND status NOT IN ('completed','cancelled','failed') RETURNING id",
                                job["id"],
                                lease,
                            )
                            if active is None:
                                return
                            current = await conn.fetch(
                                "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
                                job["quiz_id"],
                            )
                        remaining = config.count - len(current)
                        if remaining <= 0:
                            break
                        existing = avoid + [r["prompt"] for r in current]
                        # Retry smaller batches after invalid/duplicate output, rather
                        # than repeatedly paying for the same failing five-question shape.
                        wave_start_count = len(current)
                        sizes = [min(batch_size, remaining)]
                        if remaining > batch_size:
                            sizes.append(min(batch_size, remaining - batch_size))
                        tasks = [
                            asyncio.create_task(
                                batch_loader(
                                    config,
                                    excerpts,
                                    existing,
                                    size,
                                    user.current_level,
                                    wave * 8 + index * 4,
                                )
                            )
                            for index, size in enumerate(sizes)
                        ]
                        deferred: list[CapacityDeferred] = []
                        rejected_batch = False
                        try:
                            for done in asyncio.as_completed(tasks):
                                try:
                                    batch = await done
                                except CapacityDeferred as exc:
                                    deferred.append(exc)
                                    continue
                                except Exception as exc:
                                    rejected_batch = True
                                    invalid_without_progress = True
                                    logger.warning(
                                        "quiz_batch_failed",
                                        job_id=str(job["id"]),
                                        error_type=type(exc).__name__,
                                    )
                                    continue
                                items = [
                                    (q, [sources[str(source)] for source in q.source_ids])
                                    for q in batch
                                ]
                                count = await append_questions(connect, job, lease, config, items)
                                if count is None:
                                    return
                                if not batch or count == wave_start_count:
                                    rejected_batch = True
                                    invalid_without_progress = True
                                if count > wave_start_count:
                                    invalid_without_progress = False
                                if count >= config.count:
                                    break
                            if deferred and count < config.count:
                                if rejected_batch and batch_size > 1:
                                    # An invalid sibling must not lose adaptive recovery
                                    # merely because another sibling was capacity-limited.
                                    batch_size = max(1, batch_size // 2)
                                    continue
                                if count > wave_start_count:
                                    # A completed sibling has settled its reservation.
                                    # Recheck capacity now instead of sleeping on a
                                    # denial calculated before that capacity was freed.
                                    # Admission still enforces all provider cooldowns.
                                    continue
                                if invalid_without_progress:
                                    raise ValueError(
                                        "Invalid questions produced before capacity wait"
                                    )
                                raise min(deferred, key=lambda item: item.seconds)
                            if count < wave_start_count + sum(sizes):
                                batch_size = max(1, batch_size // 2)
                            else:
                                batch_size = min(max_batch_size, batch_size * 2)
                        finally:
                            for task in tasks:
                                if not task.done():
                                    task.cancel()
                            await asyncio.gather(*tasks, return_exceptions=True)
    async with connect() as conn:
        count = await conn.fetchval(
            "SELECT count(*) FROM public.quiz_questions WHERE quiz_id=$1", job["quiz_id"]
        )
        if count != config.count:
            raise ValueError("Not enough distinct valid questions were produced")
        complete = await conn.fetchval(
            """UPDATE public.quiz_generation_jobs SET status='completed',progress=100,current_step='Ready to begin',completed_at=now(),lease_id=NULL,lease_until=NULL,error_message=NULL
        WHERE id=$1 AND lease_id=$2 AND status NOT IN ('cancelled','failed') RETURNING id""",
            job["id"],
            lease,
        )
    logger.info(
        "quiz_generation_ready",
        job_id=str(job["id"]),
        questions=count,
        bank_hits=bank_hits,
        elapsed_ms=round((time.monotonic() - started) * 1000),
    )
    if complete and bank_hits and not config.bank_refill:
        try:
            await schedule_refill(config, user, job["quiz_id"])
        except Exception as exc:
            # Inventory is best-effort; it must never turn a ready quiz into an error.
            logger.warning("quiz_bank_refill_deferred", error_type=type(exc).__name__)
