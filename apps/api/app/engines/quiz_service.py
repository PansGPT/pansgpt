"""Transactional, owner/tenant-scoped assessment lifecycle."""

import hashlib
import json
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import asyncpg
from fastapi import HTTPException

from app.core.authorization import require_university
from app.core.database import get_db_connection
from app.core.dependencies import UserContext
from app.engines.quiz_generation import grade_written
from app.engines.quiz_grading import grade_question, percentage, validate_answer
from app.models.quiz import (
    Answer,
    AnswerKey,
    Attempt,
    Course,
    CreateQuiz,
    Feedback,
    HistoryItem,
    Question,
    QuizConfig,
    QuizHistory,
    QuizInfo,
    QuizJob,
    QuizResult,
    QuizStats,
    QuizTaskConfig,
    SaveAnswers,
    ShareSummary,
    Source,
)

ELIGIBLE = """d.university_id=$1 AND d.status='active' AND d.deleted_at IS NULL
AND d.embedding_status='completed' AND (cardinality(d.target_levels)=0 OR $2::public.university_level=ANY(d.target_levels))"""


def unpack(value: object) -> object:
    return json.loads(value) if isinstance(value, str) else value


@asynccontextmanager
async def database() -> AsyncIterator[asyncpg.Connection]:
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Quiz storage is unavailable. Please retry.")
        yield conn


def scope(user: UserContext) -> UUID:
    university = require_university(user)
    if not user.current_level:
        raise HTTPException(403, "Complete your academic profile before starting a quiz.")
    return university


async def check_exam(conn: asyncpg.Connection, user: UserContext, course: str) -> None:
    blocked = await conn.fetchval(
        """SELECT EXISTS(SELECT 1 FROM public.exam_restrictions
    WHERE university_id=$1 AND level=$2::public.university_level AND (course_code IS NULL OR course_code=$3)
    AND status IN ('active','scheduled') AND start_time<=now() AND end_time>now())""",
        scope(user),
        user.current_level,
        course,
    )
    if blocked:
        raise HTTPException(
            423, "Practice is temporarily restricted for this course during an assessment."
        )


async def courses(user: UserContext) -> list[Course]:
    async with database() as conn:
        rows = await conn.fetch(
            f"""SELECT d.course_code, min(d.course_title) AS title,
        array_remove(array_agg(DISTINCT d.topic),NULL) AS topics, count(*) AS count
        FROM public.documents d WHERE {ELIGIBLE} GROUP BY d.course_code ORDER BY d.course_code""",
            scope(user),
            user.current_level,
        )
    return [
        Course(
            code=r["course_code"],
            title=r["title"],
            topics=[t for t in r["topics"] if t],
            document_count=r["count"],
        )
        for r in rows
    ]


def quiz_info(row: asyncpg.Record) -> QuizInfo:
    return QuizInfo(
        id=row["id"],
        title=row["title"],
        course_code=row["course_code"],
        topic=row["topic"],
        question_type=row["question_format"],
        difficulty=row["difficulty"],
        count=row["num_questions"],
        time_limit_sec=row["time_limit_sec"],
    )


def question(row: asyncpg.Record) -> Question:
    return Question(
        id=row["id"],
        position=row["question_order"],
        question_type=row["question_type"],
        prompt=row["prompt"],
        options=unpack(row["options"]) or [],
        points=row["points"],
        concept=row["concept"],
    )


async def owned_quiz(conn: asyncpg.Connection, quiz_id: UUID, user: UserContext) -> asyncpg.Record:
    row = await conn.fetchrow(
        "SELECT q.*,j.id AS generation_job_id,j.status AS generation_status FROM public.quizzes q LEFT JOIN public.quiz_generation_jobs j ON j.quiz_id=q.id WHERE q.id=$1 AND q.user_id=$2 AND q.university_id=$3 AND q.deleted_at IS NULL AND COALESCE(j.request_payload->>'bank_refill','false')!='true'",
        quiz_id,
        user.id,
        scope(user),
    )
    if row is None:
        raise HTTPException(404, "Quiz not found.")
    return row


async def job_view(conn: asyncpg.Connection, job_id: UUID, user: UserContext) -> QuizJob:
    row = await conn.fetchrow(
        """SELECT j.*, q.time_limit_sec, (SELECT count(*) FROM public.quiz_questions WHERE quiz_id=j.quiz_id) AS count
    FROM public.quiz_generation_jobs j JOIN public.quizzes q ON q.id=j.quiz_id AND q.deleted_at IS NULL
    WHERE j.id=$1 AND j.user_id=$2 AND j.university_id=$3 AND COALESCE(j.request_payload->>'bank_refill','false')!='true'""",
        job_id,
        user.id,
        scope(user),
    )
    if row is None:
        raise HTTPException(404, "Generation job not found.")
    return QuizJob(
        id=row["id"],
        quiz_id=row["quiz_id"],
        status=row["status"],
        generated_count=row["count"],
        target_count=QuizTaskConfig.model_validate(unpack(row["request_payload"])).count,
        can_start=row["status"] == "completed"
        and row["count"] == QuizTaskConfig.model_validate(unpack(row["request_payload"])).count,
        current_step="Generation stopped"
        if row["status"] == "failed"
        else row["current_step"] or "Waiting to begin",
        error_message="Question generation has stopped. Retry this quiz to continue without starting over."
        if row["status"] == "failed"
        else row["error_message"],
    )


async def create_job(payload: CreateQuiz, user: UserContext) -> QuizJob:
    config = QuizConfig(**payload.model_dump(exclude={"request_key"}))
    config.course_code = config.course_code.upper().strip()
    async with database() as conn, conn.transaction():
        # Serialize only this owner's creation requests, bounding free-tier work.
        await conn.execute("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", str(user.id))
        previous = await conn.fetchval(
            "SELECT id FROM public.quiz_generation_jobs WHERE user_id=$1 AND request_key=$2",
            user.id,
            payload.request_key,
        )
        if previous:
            previous_row = await conn.fetchrow(
                "SELECT request_payload FROM public.quiz_generation_jobs WHERE id=$1", previous
            )
            requested = config.model_dump(mode="json")
            stored = QuizTaskConfig.model_validate(
                unpack(previous_row["request_payload"])
            ).model_dump(mode="json", include=set(QuizConfig.model_fields))
            if stored != requested:
                raise HTTPException(409, "This request was already used for a different quiz.")
            return await job_view(conn, previous, user)
        course = config.course_code
        await check_exam(conn, user, course)
        busy = await conn.fetchval(
            "SELECT count(*) FROM public.quiz_generation_jobs WHERE user_id=$1 AND COALESCE(request_payload->>'bank_refill','false')!='true' AND status IN ('queued','retrieving','generating','saving')",
            user.id,
        )
        recent = await conn.fetchval(
            "SELECT count(*) FROM public.quiz_generation_jobs WHERE user_id=$1 AND COALESCE(request_payload->>'bank_refill','false')!='true' AND created_at>now()-interval '1 hour'",
            user.id,
        )
        if busy >= 2 or recent >= 10:
            raise HTTPException(429, "Please finish your active quizzes or try again later.")
        document = await conn.fetchrow(
            f"SELECT d.id,d.course_title FROM public.documents d WHERE {ELIGIBLE} AND d.course_code=$3 ORDER BY d.created_at DESC LIMIT 1",
            scope(user),
            user.current_level,
            course,
        )
        if document is None:
            raise HTTPException(
                422, "No ready course materials were found for your university and level."
            )
        if config.revision_result_id:
            result = await conn.fetchrow(
                """SELECT a.feedback,q.course_code FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id
            WHERE a.id=$1 AND a.user_id=$2 AND q.university_id=$3 AND q.deleted_at IS NULL""",
                config.revision_result_id,
                user.id,
                scope(user),
            )
            if result is None or result["course_code"] != course:
                raise HTTPException(404, "Revision result not found for this course.")
        title = payload.topic or document["course_title"]
        quiz_id = await conn.fetchval(
            """INSERT INTO public.quizzes(user_id,university_id,document_id,title,course_code,course_title,level,difficulty,num_questions,time_limit_sec,topic,question_format)
        VALUES($1,$2,$3,$4,$5,$6,$7::public.university_level,$8,$9,$10,$11,$12) RETURNING id""",
            user.id,
            scope(user),
            document["id"],
            title[:200],
            course,
            document["course_title"],
            user.current_level,
            config.difficulty,
            config.count,
            config.time_limit_sec,
            config.topic,
            config.question_type,
        )
        job_id = await conn.fetchval(
            """INSERT INTO public.quiz_generation_jobs(user_id,university_id,quiz_id,request_payload,request_key,current_step)
        VALUES($1,$2,$3,$4::jsonb,$5,'Waiting for a generation worker') RETURNING id""",
            user.id,
            scope(user),
            quiz_id,
            config.model_dump_json(),
            payload.request_key,
        )
        return await job_view(conn, job_id, user)


async def get_job(job_id: UUID, user: UserContext) -> QuizJob:
    async with database() as conn:
        return await job_view(conn, job_id, user)


async def cancel_job(job_id: UUID, user: UserContext) -> QuizJob:
    async with database() as conn, conn.transaction():
        view = await job_view(conn, job_id, user)
        await conn.execute(
            "SELECT id FROM public.quizzes WHERE id=$1 FOR NO KEY UPDATE", view.quiz_id
        )
        if await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM public.quiz_sessions WHERE quiz_id=$1)", view.quiz_id
        ):
            raise HTTPException(
                409, "This quiz has already started. Save and leave to continue later."
            )
        await conn.execute(
            """UPDATE public.quiz_generation_jobs SET status='cancelled',completed_at=now(),lease_id=NULL,lease_until=NULL,current_step='Cancelled'
        WHERE id=$1 AND user_id=$2 AND university_id=$3 AND status NOT IN ('completed','failed','cancelled')""",
            job_id,
            user.id,
            scope(user),
        )
        return await job_view(conn, job_id, user)


async def session_row(
    conn: asyncpg.Connection, attempt_id: UUID, user: UserContext, lock: bool = False
) -> asyncpg.Record:
    row = await conn.fetchrow(
        """SELECT s.* FROM public.quiz_sessions s JOIN public.quizzes q ON q.id=s.quiz_id AND q.deleted_at IS NULL
    WHERE s.id=$1 AND s.user_id=$2 AND s.university_id=$3"""
        + (" FOR UPDATE OF s" if lock else ""),
        attempt_id,
        user.id,
        scope(user),
    )
    if row is None:
        raise HTTPException(404, "Attempt not found.")
    return row


async def attempt_view(conn: asyncpg.Connection, attempt_id: UUID, user: UserContext) -> Attempt:
    row = await session_row(conn, attempt_id, user)
    quiz = await owned_quiz(conn, row["quiz_id"], user)
    rows = await conn.fetch(
        "SELECT id,question_order,question_type,prompt,options,points,concept FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
        quiz["id"],
    )
    return Attempt(
        id=row["id"],
        quiz=quiz_info(quiz),
        questions=[question(r) for r in rows],
        answers=unpack(row["answers"]),
        flagged_ids=row["flagged_ids"],
        revision=row["revision"],
        status=row["status"],
        started_at=row["started_at"],
        deadline_at=row["deadline_at"],
        server_now=await conn.fetchval("SELECT now()"),
        result_id=row["result_id"],
        generation_job_id=quiz.get("generation_job_id"),
        generation_status=quiz.get("generation_status") or "completed",
    )


async def start_attempt(quiz_id: UUID, user: UserContext) -> Attempt:
    async with database() as conn, conn.transaction():
        quiz = await owned_quiz(conn, quiz_id, user)
        await check_exam(conn, user, quiz["course_code"])
        await conn.execute("SELECT id FROM public.quizzes WHERE id=$1 FOR UPDATE", quiz_id)
        current = await conn.fetchval(
            "SELECT id FROM public.quiz_sessions WHERE quiz_id=$1 AND user_id=$2 AND status!='completed'",
            quiz_id,
            user.id,
        )
        if current is not None:
            # Recover attempts started under the previous partial-start behavior.
            return await attempt_view(conn, current, user)
        ready = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM public.quiz_generation_jobs WHERE quiz_id=$1 AND status='completed')",
            quiz_id,
        )
        count = await conn.fetchval(
            "SELECT count(*) FROM public.quiz_questions WHERE quiz_id=$1", quiz_id
        )
        if not ready or count != quiz["num_questions"]:
            raise HTTPException(409, "Your quiz is still being prepared.")

        if current is None:
            current = await conn.fetchval(
                """INSERT INTO public.quiz_sessions(quiz_id,user_id,university_id,deadline_at)
            VALUES($1,$2,$3,CASE WHEN $4::integer IS NULL THEN NULL ELSE now()+$4*interval '1 second' END) RETURNING id""",
                quiz_id,
                user.id,
                scope(user),
                quiz["time_limit_sec"],
            )
        return await attempt_view(conn, current, user)


async def get_attempt(attempt_id: UUID, user: UserContext) -> Attempt:
    async with database() as conn:
        return await attempt_view(conn, attempt_id, user)


def validate_snapshot(rows: list[asyncpg.Record], payload: SaveAnswers) -> None:
    questions = {r["id"]: question(r) for r in rows}
    ids = [a.question_id for a in payload.answers]
    if (
        len(ids) != len(set(ids))
        or not set(ids) <= questions.keys()
        or not set(payload.flagged_ids) <= questions.keys()
    ):
        raise HTTPException(422, "Answers or flags contain unknown or repeated questions.")
    try:
        for answer in payload.answers:
            validate_answer(questions[answer.question_id], answer)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


async def save_answers(attempt_id: UUID, payload: SaveAnswers, user: UserContext) -> Attempt:
    async with database() as conn, conn.transaction():
        row = await session_row(conn, attempt_id, user, lock=True)
        if row["status"] != "in_progress":
            raise HTTPException(409, "This attempt has already been submitted.")
        if row["deadline_at"] and row["deadline_at"] <= await conn.fetchval("SELECT now()"):
            raise HTTPException(409, "Time is up. Submit your saved answers to see your results.")
        if row["revision"] != payload.revision:
            raise HTTPException(409, "This attempt changed in another tab. Reload before editing.")
        rows = await conn.fetch(
            "SELECT * FROM public.quiz_questions WHERE quiz_id=$1", row["quiz_id"]
        )
        validate_snapshot(rows, payload)
        await conn.execute(
            "UPDATE public.quiz_sessions SET answers=$2::jsonb,flagged_ids=$3,revision=revision+1 WHERE id=$1",
            attempt_id,
            json.dumps([a.model_dump(mode="json") for a in payload.answers]),
            payload.flagged_ids,
        )
        return await attempt_view(conn, attempt_id, user)


async def submit_attempt(attempt_id: UUID, user: UserContext) -> QuizResult:
    lease = uuid4()
    async with database() as conn, conn.transaction():
        row = await session_row(conn, attempt_id, user, lock=True)
        if row["result_id"]:
            return await result_view(conn, row["result_id"], user)
        generation = await conn.fetchval(
            "SELECT status FROM public.quiz_generation_jobs WHERE quiz_id=$1", row["quiz_id"]
        )
        if generation != "completed":
            raise HTTPException(
                409,
                "The remaining questions are still being prepared. Retry generation if it has stopped, then finish your quiz.",
            )
        now = await conn.fetchval("SELECT now()")
        if row["status"] == "grading" and row["grading_until"] and row["grading_until"] > now:
            raise HTTPException(409, "Your answers are being graded. Please wait a moment.")
        await conn.execute(
            """UPDATE public.quiz_sessions SET status='grading',submitted_at=COALESCE(submitted_at,now()),grading_lease=$2,grading_until=now()+interval '3 minutes' WHERE id=$1""",
            attempt_id,
            lease,
        )
        rows = await conn.fetch(
            "SELECT * FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
            row["quiz_id"],
        )
        answers = {
            a.question_id: a for a in [Answer.model_validate(v) for v in unpack(row["answers"])]
        }
    try:
        written_rows = [
            {
                "question_id": r["id"],
                "question": r["prompt"],
                "reference": AnswerKey.model_validate(unpack(r["answer_key"])).text,
                "answer": answers[r["id"]].text,
            }
            for r in rows
            if r["question_type"] == "short_answer" and r["id"] in answers and answers[r["id"]].text
        ]
        written = (
            {g.question_id: g for g in (await grade_written(written_rows)).grades}
            if written_rows
            else {}
        )
        feedback = [
            grade_question(
                question(r),
                AnswerKey.model_validate(unpack(r["answer_key"])),
                answers.get(r["id"], Answer(question_id=r["id"])),
                r["explanation"],
                [Source.model_validate(s) for s in unpack(r["sources"])],
                written.get(r["id"]),
            )
            for r in rows
        ]
        earned = sum(f.earned for f in feedback)
        maximum = sum(f.question.points for f in feedback)
        async with database() as conn, conn.transaction():
            current = await session_row(conn, attempt_id, user, lock=True)
            if current["result_id"]:
                return await result_view(conn, current["result_id"], user)
            if current["grading_lease"] != lease:
                raise HTTPException(409, "Another grading request is completing this attempt.")
            end = (
                min(current["submitted_at"], current["deadline_at"])
                if current["deadline_at"]
                else current["submitted_at"]
            )
            elapsed = max(0, int((end - current["started_at"]).total_seconds()))
            result_id = await conn.fetchval(
                """INSERT INTO public.quiz_attempts(quiz_id,user_id,score,max_score,percentage,time_taken_sec,answers,session_id,feedback)
            VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb) RETURNING id""",
                current["quiz_id"],
                user.id,
                earned,
                maximum,
                percentage(earned, maximum),
                elapsed,
                json.dumps(unpack(current["answers"])),
                attempt_id,
                json.dumps([f.model_dump(mode="json") for f in feedback]),
            )
            await conn.execute(
                "UPDATE public.quiz_sessions SET status='completed',result_id=$2,grading_until=NULL WHERE id=$1",
                attempt_id,
                result_id,
            )
            return await result_view(conn, result_id, user)
    except Exception as exc:
        async with database() as conn:
            await conn.execute(
                "UPDATE public.quiz_sessions SET status='grading_failed',grading_until=NULL WHERE id=$1 AND grading_lease=$2 AND result_id IS NULL",
                attempt_id,
                lease,
            )
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(
            503, "Your submitted answers are safe. Grading is unavailable; please retry."
        ) from exc


async def result_view(conn: asyncpg.Connection, result_id: UUID, user: UserContext) -> QuizResult:
    row = await conn.fetchrow(
        """SELECT a.* FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id
    WHERE a.id=$1 AND a.user_id=$2 AND q.user_id=$2 AND q.university_id=$3 AND q.deleted_at IS NULL""",
        result_id,
        user.id,
        scope(user),
    )
    if row is None:
        raise HTTPException(404, "Result not found.")
    quiz = await owned_quiz(conn, row["quiz_id"], user)
    return QuizResult(
        id=row["id"],
        quiz=quiz_info(quiz),
        score=float(row["score"]),
        max_score=float(row["max_score"]),
        percentage=float(row["percentage"]),
        time_taken_sec=row["time_taken_sec"] or 0,
        completed_at=row["completed_at"],
        feedback=[Feedback.model_validate(f) for f in unpack(row["feedback"])],
    )


async def get_result(result_id: UUID, user: UserContext) -> QuizResult:
    async with database() as conn:
        return await result_view(conn, result_id, user)


async def history(user: UserContext, offset: int = 0, course: str | None = None) -> QuizHistory:
    async with database() as conn:
        where = "a.user_id=$1 AND q.user_id=$1 AND q.university_id=$2 AND q.deleted_at IS NULL AND ($3::text IS NULL OR q.course_code=$3)"
        rows = await conn.fetch(
            f"""SELECT a.id,a.quiz_id,q.title,q.course_code,q.question_format AS question_type,a.percentage,a.time_taken_sec,a.completed_at
        FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id WHERE {where} ORDER BY a.completed_at DESC,a.id DESC LIMIT 21 OFFSET $4""",
            user.id,
            scope(user),
            course,
            offset,
        )
        stats = await conn.fetchrow(
            f"""SELECT count(*) AS completed,COALESCE(avg(a.percentage),0) AS average,COALESCE(max(a.percentage),0) AS best,COALESCE(sum(a.time_taken_sec),0) AS study_seconds
        FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id WHERE {where}""",
            user.id,
            scope(user),
            course,
        )
        jobs = await conn.fetch(
            """SELECT j.id FROM public.quiz_generation_jobs j JOIN public.quizzes q ON q.id=j.quiz_id AND q.deleted_at IS NULL
        WHERE j.user_id=$1 AND j.university_id=$2 AND COALESCE(j.request_payload->>'bank_refill','false')!='true' AND (j.status NOT IN ('completed','cancelled') OR NOT EXISTS(SELECT 1 FROM public.quiz_sessions s WHERE s.quiz_id=j.quiz_id)) ORDER BY j.created_at DESC LIMIT 10""",
            user.id,
            scope(user),
        )
        active = await conn.fetch(
            "SELECT s.id FROM public.quiz_sessions s JOIN public.quizzes q ON q.id=s.quiz_id AND q.deleted_at IS NULL WHERE s.user_id=$1 AND s.university_id=$2 AND s.status!='completed' ORDER BY s.started_at DESC LIMIT 10",
            user.id,
            scope(user),
        )
        return QuizHistory(
            items=[HistoryItem(**dict(r)) for r in rows[:20]],
            next_offset=offset + 20 if len(rows) > 20 else None,
            stats=QuizStats(**dict(stats)),
            jobs=[await job_view(conn, r["id"], user) for r in jobs],
            active_attempts=[await attempt_view(conn, r["id"], user) for r in active],
        )


async def create_share(result_id: UUID, user: UserContext) -> str:
    token = secrets.token_urlsafe(32)
    async with database() as conn:
        await result_view(conn, result_id, user)
        await conn.execute(
            "INSERT INTO public.quiz_result_shares(user_id,result_id,token_hash) VALUES($1,$2,$3)",
            user.id,
            result_id,
            hashlib.sha256(token.encode()).hexdigest(),
        )
    return token


async def revoke_shares(result_id: UUID, user: UserContext) -> None:
    async with database() as conn:
        await result_view(conn, result_id, user)
        await conn.execute(
            "UPDATE public.quiz_result_shares SET revoked_at=now() WHERE user_id=$1 AND result_id=$2",
            user.id,
            result_id,
        )


async def public_share(token: str) -> ShareSummary:
    if not 30 <= len(token) <= 100:
        raise HTTPException(404, "Shared result not found.")
    async with database() as conn:
        row = await conn.fetchrow(
            """SELECT q.title,q.course_code,a.percentage,q.num_questions AS question_count,a.completed_at
        FROM public.quiz_result_shares s JOIN public.quiz_attempts a ON a.id=s.result_id JOIN public.quizzes q ON q.id=a.quiz_id
        WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND q.deleted_at IS NULL""",
            hashlib.sha256(token.encode()).hexdigest(),
        )
    if row is None:
        raise HTTPException(404, "Shared result not found.")
    return ShareSummary(**dict(row))
