"""Real PostgreSQL transactions; only a designated disposable database is accepted."""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
from urllib.parse import urlparse
from uuid import uuid4

import asyncpg
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.core.dependencies import UserContext
from app.engines import quiz_service as service
from app.models.quiz import Answer, CreateQuiz, SaveAnswers

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.fixture
async def quiz_database(monkeypatch):
    url = os.getenv("QUIZ_TEST_DATABASE_URL") or os.getenv("RLS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Disposable QUIZ_TEST_DATABASE_URL or RLS_TEST_DATABASE_URL not configured")
    if urlparse(url).hostname not in ("127.0.0.1", "localhost"):
        pytest.fail("Quiz lifecycle tests require a disposable loopback database")
    conn = await asyncpg.connect(url, statement_cache_size=0)
    university = (
        await conn.fetchval("INSERT INTO public.universities DEFAULT VALUES RETURNING id")
        if os.getenv("QUIZ_TEST_DATABASE_URL")
        else None
    )
    if university is None:
        university = await conn.fetchval(
            "INSERT INTO public.universities(name,short_name,slug,status) VALUES('Quiz test','QUIZ',$1,'active') RETURNING id",
            "quiz-" + uuid4().hex,
        )
    if os.getenv("QUIZ_TEST_DATABASE_URL"):
        owner = await conn.fetchval(
            "INSERT INTO public.users(email,university_id,current_level) VALUES('synthetic@example.test',$1,'400') RETURNING id",
            university,
        )
        document = await conn.fetchval(
            "INSERT INTO public.documents(university_id,title,course_code,course_title,topic) VALUES($1,'Synthetic pharmacology','PCL 401','Pharmacology','Absorption') RETURNING id",
            university,
        )
    else:
        owner = uuid4()
        await conn.execute(
            "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",
            owner,
            f"{owner}@example.test",
        )
        await conn.execute(
            "UPDATE public.users SET university_id=$2,current_level='400' WHERE id=$1",
            owner,
            university,
        )
        document = await conn.fetchval(
            "INSERT INTO public.documents(university_id,title,course_code,course_title,topic,storage_key,status,embedding_status,uploaded_by) VALUES($1,'Synthetic pharmacology','PCL 401','Pharmacology','Absorption','synthetic-test','active','completed',$2) RETURNING id",
            university,
            owner,
        )
    user = UserContext(
        id=owner,
        email="synthetic@example.test",
        role="student",
        roles=["student"],
        university_id=university,
        current_level="400",
    )

    @asynccontextmanager
    async def database():
        connection = await asyncpg.connect(url, statement_cache_size=0)
        try:
            yield connection
        finally:
            await connection.close()

    monkeypatch.setattr(service, "database", database)
    from app.engines import quiz_bank

    monkeypatch.setattr(quiz_bank, "database", database)
    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    monkeypatch.setattr(settings, "ENABLE_QUIZ_INVENTORY", True)
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", False)
    try:
        yield conn, user, document
    finally:
        await conn.execute("DELETE FROM public.quiz_result_shares WHERE user_id=$1", owner)
        await conn.execute("DELETE FROM public.quiz_sessions WHERE user_id=$1", owner)
        await conn.execute("DELETE FROM public.quizzes WHERE user_id=$1", owner)
        await conn.execute("DELETE FROM public.quiz_generation_jobs WHERE user_id=$1", owner)
        await conn.execute("DELETE FROM public.documents WHERE id=$1", document)
        await conn.execute(
            "DELETE FROM public.exam_restrictions WHERE university_id=$1", university
        )
        if os.getenv("QUIZ_TEST_DATABASE_URL"):
            await conn.execute("DELETE FROM public.users WHERE id=$1", owner)
        else:
            await conn.execute("DELETE FROM auth.users WHERE id=$1", owner)
        await conn.execute("DELETE FROM public.universities WHERE id=$1", university)
        await conn.close()


async def ready(conn, user, time_limit_sec=None):
    payload = CreateQuiz(
        course_code="PCL 401", count=5, request_key=uuid4(), time_limit_sec=time_limit_sec
    )
    job = await service.create_job(payload, user)
    for index in range(5):
        await conn.execute(
            """INSERT INTO public.quiz_questions(quiz_id,question_order,question_type,prompt,options,correct_answer,answer_key,explanation,points,concept)
        VALUES($1,$2,'objective','Which process describes drug absorption?',$3::jsonb,'B',$4::jsonb,'Absorption moves drug into systemic circulation.',1,'Absorption')""",
            job.quiz_id,
            index + 1,
            json.dumps([{"id": i, "text": f"Option {i}"} for i in "ABCD"]),
            json.dumps({"choice_ids": ["B"], "truth_values": {}, "text": ""}),
        )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='completed',request_payload=request_payload || '{\"content_generation_version\":1}'::jsonb WHERE id=$1",
        job.id,
    )
    return job


async def test_real_create_idempotence_and_cancel(quiz_database):
    conn, user, _ = quiz_database
    payload = CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4())
    job = await service.create_job(payload, user)
    assert (await service.create_job(payload, user)).id == job.id
    assert (await service.cancel_job(job.id, user)).status == "cancelled"
    with pytest.raises(HTTPException) as error:
        await service.start_attempt(job.quiz_id, user)
    assert error.value.status_code == 409


async def test_real_saved_attempt_resume_grade_and_submit_retry(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user, 300)
    attempt = await service.start_attempt(job.quiz_id, user)
    assert attempt.id.version == 7
    assert (await service.start_attempt(job.quiz_id, user)).deadline_at == attempt.deadline_at
    answer = Answer(question_id=attempt.questions[0].id, selected_option_ids=["B"])
    saved = await service.save_answers(
        attempt.id,
        SaveAnswers(revision=0, answers=[answer], flagged_ids=[attempt.questions[2].id]),
        user,
    )
    assert saved.revision == 1 and saved.answers == [answer]
    assert (await service.get_attempt(attempt.id, user)).flagged_ids == saved.flagged_ids
    result = await service.submit_attempt(attempt.id, user)
    assert result.percentage == 20 and result.score == 1 and len(result.feedback) == 5
    assert (await service.submit_attempt(attempt.id, user)).id == result.id
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_attempts WHERE session_id=$1", attempt.id
        )
        == 1
    )
    with pytest.raises(HTTPException):
        await service.save_answers(attempt.id, SaveAnswers(revision=1, answers=[]), user)
    history = await service.history(user)
    assert history.items[0].question_type == "objective"
    assert history.stats.completed == 1 and history.items[0].id == result.id


async def test_real_deadline_and_stale_tab_cannot_replace_saved_answers(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user, 300)
    attempt = await service.start_attempt(job.quiz_id, user)
    answer = Answer(question_id=attempt.questions[0].id, selected_option_ids=["B"])
    await service.save_answers(attempt.id, SaveAnswers(revision=0, answers=[answer]), user)
    with pytest.raises(HTTPException) as stale:
        await service.save_answers(attempt.id, SaveAnswers(revision=0, answers=[]), user)
    assert stale.value.status_code == 409
    await conn.execute(
        "UPDATE public.quiz_sessions SET deadline_at=now()-interval '1 second' WHERE id=$1",
        attempt.id,
    )
    with pytest.raises(HTTPException) as expired:
        await service.save_answers(attempt.id, SaveAnswers(revision=1, answers=[]), user)
    assert expired.value.status_code == 409
    assert (await service.submit_attempt(attempt.id, user)).score == 1


async def test_real_cross_owner_and_cross_tenant_isolation(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user)
    attempt = await service.start_attempt(job.quiz_id, user)
    result = await service.submit_attempt(attempt.id, user)
    for foreign in [
        UserContext(
            id=uuid4(),
            email="foreign@example.test",
            role="student",
            roles=["student"],
            university_id=user.university_id,
            current_level="400",
        ),
        UserContext(
            id=user.id,
            email=user.email,
            role="student",
            roles=["student"],
            university_id=uuid4(),
            current_level="400",
        ),
    ]:
        for action in [
            lambda: service.get_job(job.id, foreign),
            lambda: service.start_attempt(job.quiz_id, foreign),
            lambda: service.get_attempt(attempt.id, foreign),
            lambda: service.submit_attempt(attempt.id, foreign),
            lambda: service.get_result(result.id, foreign),
            lambda: service.create_share(result.id, foreign),
        ]:
            with pytest.raises(HTTPException) as denied:
                await action()
            assert denied.value.status_code == 404


async def test_real_grants_reject_answer_reads_grade_writes_and_job_tampering(quiz_database):
    conn, user, _ = quiz_database
    for role in ["anon", "authenticated"]:
        for table in [
            "quizzes",
            "quiz_questions",
            "quiz_attempts",
            "quiz_generation_jobs",
            "quiz_sessions",
            "quiz_result_shares",
        ]:
            privileges = await conn.fetchrow(
                "SELECT has_table_privilege($1,$2,'SELECT') AS read,has_table_privilege($1,$2,'INSERT') AS write,has_table_privilege($1,$2,'UPDATE') AS update",
                role,
                "public." + table,
            )
            assert not any(privileges.values())
    async with conn.transaction():
        await conn.execute("SET LOCAL ROLE authenticated")
        with pytest.raises(asyncpg.InsufficientPrivilegeError):
            await conn.fetch("SELECT answer_key FROM public.quiz_questions")


async def test_real_share_is_minimal_and_revocable(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user)
    attempt = await service.start_attempt(job.quiz_id, user)
    result = await service.submit_attempt(attempt.id, user)
    token = await service.create_share(result.id, user)
    summary = await service.public_share(token)
    assert summary.percentage == 0 and summary.question_count == 5
    assert token not in (
        await conn.fetchval(
            "SELECT token_hash FROM public.quiz_result_shares WHERE result_id=$1", result.id
        )
    )
    await service.revoke_shares(result.id, user)
    with pytest.raises(HTTPException):
        await service.public_share(token)


async def test_real_exam_window_blocks_generation(quiz_database):
    conn, user, _ = quiz_database
    if os.getenv("QUIZ_TEST_DATABASE_URL"):
        await conn.execute(
            "INSERT INTO public.exam_restrictions(university_id,level,course_code,status,start_time,end_time) VALUES($1,'400','PCL 401','active',now()-interval '1 minute',now()+interval '1 minute')",
            user.university_id,
        )
    else:
        await conn.execute(
            "INSERT INTO public.exam_restrictions(university_id,created_by,title,level,course_code,status,start_time,end_time) VALUES($1,$2,'Synthetic exam','400','PCL 401','active',now()-interval '1 minute',now()+interval '1 minute')",
            user.university_id,
            user.id,
        )
    with pytest.raises(HTTPException) as blocked:
        await service.create_job(CreateQuiz(course_code="PCL 401", request_key=uuid4()), user)
    assert blocked.value.status_code == 423


async def test_real_concurrent_starts_and_saves_are_serialized(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user)
    left, right = await asyncio.gather(
        service.start_attempt(job.quiz_id, user), service.start_attempt(job.quiz_id, user)
    )
    assert left.id == right.id
    payload = SaveAnswers(
        revision=0, answers=[Answer(question_id=left.questions[0].id, selected_option_ids=["B"])]
    )
    outcomes = await asyncio.gather(
        service.save_answers(left.id, payload, user),
        service.save_answers(left.id, payload, user),
        return_exceptions=True,
    )
    assert (
        sum(
            isinstance(outcome, HTTPException) and outcome.status_code == 409
            for outcome in outcomes
        )
        == 1
    )
    assert (await service.get_attempt(left.id, user)).revision == 1
    results = await asyncio.gather(
        service.submit_attempt(left.id, user),
        service.submit_attempt(left.id, user),
        return_exceptions=True,
    )
    assert all(
        not isinstance(outcome, Exception)
        or isinstance(outcome, HTTPException)
        and outcome.status_code == 409
        for outcome in results
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_attempts WHERE session_id=$1", left.id
        )
        == 1
    )


async def test_real_written_grading_failure_preserves_frozen_submission(quiz_database, monkeypatch):
    from app.models.quiz import WrittenGrade, WrittenGrades

    conn, user, _ = quiz_database
    job = await ready(conn, user)
    await conn.execute(
        "UPDATE public.quiz_questions SET question_type='short_answer',options='[]',answer_key=$2::jsonb WHERE quiz_id=$1",
        job.quiz_id,
        json.dumps({"choice_ids": [], "truth_values": {}, "text": "Reference rubric"}),
    )
    attempt = await service.start_attempt(job.quiz_id, user)
    answer = Answer(question_id=attempt.questions[0].id, text="An accurate paraphrase")
    await service.save_answers(attempt.id, SaveAnswers(revision=0, answers=[answer]), user)
    monkeypatch.setattr(
        service, "grade_written", AsyncMock(side_effect=RuntimeError("Provider unavailable"))
    )
    with pytest.raises(HTTPException) as failure:
        await service.submit_attempt(attempt.id, user)
    assert failure.value.status_code == 503
    frozen = await service.get_attempt(attempt.id, user)
    assert frozen.status == "grading_failed" and frozen.answers == [answer]
    with pytest.raises(HTTPException):
        await service.save_answers(attempt.id, SaveAnswers(revision=1, answers=[]), user)
    monkeypatch.setattr(
        service,
        "grade_written",
        AsyncMock(
            return_value=WrittenGrades(
                grades=[
                    WrittenGrade(
                        question_id=answer.question_id,
                        score=0.5,
                        feedback="Include the missing mechanism",
                    )
                ]
            )
        ),
    )
    result = await service.submit_attempt(attempt.id, user)
    assert result.score == 0.5 and result.feedback[0].outcome == "partial"


async def test_real_worker_cancellation_prevents_late_batch_commit(quiz_database, monkeypatch):
    from app.models.quiz import GeneratedQuestion
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    chunk = uuid4()
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": chunk,
                    "document_id": document,
                    "title": "Synthetic source",
                    "page": 1,
                    "excerpt": "A source excerpt for synthetic questions.",
                }
            ]
        ),
    )
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )

    async def interrupted(*args):
        await service.cancel_job(job.id, user)
        return [
            GeneratedQuestion(
                question_type="objective",
                prompt="Which process describes absorption?",
                options=[{"id": i, "text": f"Option {i}"} for i in "ABCD"],
                answer_key={"choice_ids": ["A"]},
                explanation="Source grounded explanation of absorption.",
                concept="Absorption",
                source_ids=[chunk],
            )
        ]

    monkeypatch.setattr(worker, "generate_batch", interrupted)
    await worker.generate_quiz_job({}, str(job.id))
    assert (await service.get_job(job.id, user)).status == "cancelled"
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_questions WHERE quiz_id=$1", job.quiz_id
        )
        == 0
    )


async def test_real_worker_retries_expired_leases_with_durable_job_ids(quiz_database, monkeypatch):
    from unittest.mock import MagicMock

    from workers import quiz as worker

    conn, user, _ = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='generating',attempts=1,lease_until=now()-interval '1 minute' WHERE id=$1",
        job.id,
    )
    queue = MagicMock()
    queue.enqueue_job = AsyncMock()
    queue.publish = AsyncMock()
    await worker.dispatch_quiz_jobs({"redis": queue})
    assert any(
        call.kwargs["_job_id"].startswith(f"quiz:{job.id}:1:")
        for call in queue.enqueue_job.await_args_list
    )
    await conn.execute("UPDATE public.quiz_generation_jobs SET attempts=3 WHERE id=$1", job.id)
    await worker.dispatch_quiz_jobs({"redis": queue})
    assert (await service.get_job(job.id, user)).status == "failed"


async def test_real_api_taking_and_result_boundaries(quiz_database, client, monkeypatch):
    from app.core.dependencies import get_current_user
    from app.main import app
    from app.routers import quiz as routes

    conn, user, _ = quiz_database
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)
    monkeypatch.setattr(settings, "X_API_KEY_WEB", "quiz-test-client-key")
    client.headers["X-API-Key"] = "quiz-test-client-key"
    monkeypatch.setattr(routes, "wake_quiz_worker", AsyncMock())
    job = await ready(conn, user)
    response = await client.post(f"/api/v1/quiz/quizzes/{job.quiz_id}/attempts")
    assert response.status_code == 200
    body = response.json()
    assert all(
        not {"answer_key", "correct_answer", "explanation", "sources"} & q.keys()
        for q in body["questions"]
    )
    attempt_id = body["id"]
    save = await client.put(
        f"/api/v1/quiz/attempts/{attempt_id}/answers",
        json={
            "revision": 0,
            "answers": [{"question_id": body["questions"][0]["id"], "selected_option_ids": ["B"]}],
            "flagged_ids": [],
        },
    )
    assert save.status_code == 200
    submitted = await client.post(f"/api/v1/quiz/attempts/{attempt_id}/submit")
    assert submitted.status_code == 200 and submitted.json()["percentage"] == 20
    assert submitted.json()["feedback"][0]["answer_key"]["choice_ids"] == ["B"]
    foreign = UserContext(
        id=uuid4(),
        email="foreign@example.test",
        role="student",
        roles=["student"],
        university_id=user.university_id,
        current_level="400",
    )
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: foreign)
    for path in [
        f"/attempts/{attempt_id}",
        f"/results/{submitted.json()['id']}",
        f"/jobs/{job.id}",
    ]:
        assert (await client.get("/api/v1/quiz" + path)).status_code == 404


async def test_real_worker_completes_exact_count_and_duplicate_delivery_is_noop(
    quiz_database, monkeypatch
):
    from app.models.quiz import GeneratedQuestion
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    chunk = uuid4()
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": chunk,
                    "document_id": document,
                    "title": "Synthetic source",
                    "page": 1,
                    "excerpt": "Synthetic academic evidence.",
                }
            ]
        ),
    )
    generated = [
        GeneratedQuestion(
            question_type="objective",
            prompt=[
                "How does absorption move medicine into circulation?",
                "Define the hepatic transformation of a xenobiotic.",
                "Which organ excretes filtered drug in urine?",
                "Describe receptor binding and affinity.",
                "Why does plasma protein binding affect distribution?",
            ][i],
            options=[{"id": letter, "text": f"Option {letter}"} for letter in "ABCD"],
            answer_key={"choice_ids": ["B"]},
            explanation="A source grounded explanation of the concept.",
            concept="Absorption",
            source_ids=[chunk],
        )
        for i in range(5)
    ]
    batch = AsyncMock(return_value=generated)
    monkeypatch.setattr(worker, "generate_batch", batch)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    await worker.generate_quiz_job({}, str(job.id))
    assert (await service.get_job(job.id, user)).status == "completed"
    attempt = await service.start_attempt(job.quiz_id, user)
    assert len(attempt.questions) == 5
    assert batch.await_args.args[4] == "400"
    await worker.generate_quiz_job({}, str(job.id))
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_questions WHERE quiz_id=$1", job.quiz_id
        )
        == 5
    )
    assert batch.await_count == 1


async def test_real_stopped_job_retry_retains_quiz_and_uses_new_delivery_identity(
    quiz_database, monkeypatch
):
    from unittest.mock import MagicMock

    from app.engines import quiz_retry
    from workers import quiz as worker

    conn, user, _ = quiz_database
    monkeypatch.setattr(quiz_retry, "database", service.database)
    monkeypatch.setattr(worker, "database", service.database)
    job = await ready(conn, user)
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='queued',attempts=0 WHERE id=$1", job.id
    )
    queue = MagicMock()
    queue.enqueue_job = AsyncMock()
    queue.publish = AsyncMock()
    await worker.dispatch_quiz_jobs({"redis": queue})
    first = next(
        call.kwargs["_job_id"]
        for call in queue.enqueue_job.await_args_list
        if call.args[1] == str(job.id)
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='failed',attempts=3,error_message='Your request will retry automatically.' WHERE id=$1",
        job.id,
    )
    stopped = await service.get_job(job.id, user)
    assert stopped.current_step == "Generation stopped"
    assert "automatically" not in stopped.error_message
    retried = await quiz_retry.retry_job(job.id, user)
    assert retried.id == job.id and retried.quiz_id == job.quiz_id
    assert (
        retried.status == "queued"
        and retried.generated_count == 5
        and retried.error_message is None
    )
    queue.enqueue_job.reset_mock()
    await worker.dispatch_quiz_jobs({"redis": queue})
    second = next(
        call.kwargs["_job_id"]
        for call in queue.enqueue_job.await_args_list
        if call.args[1] == str(job.id)
    )
    assert first != second


SYNTHETIC_PROMPTS = [
    "How does absorption move medicine into circulation?",
    "Define hepatic transformation of a xenobiotic.",
    "Which organ excretes filtered drug in urine?",
    "Describe receptor binding and affinity.",
    "Why does plasma protein binding affect distribution?",
    "Explain competitive enzyme inhibition kinetics.",
    "What determines the efficacy of a partial agonist?",
    "Identify the purpose of a loading dose.",
    "When does zero order elimination occur?",
    "Compare oral and intravenous bioavailability.",
]


def synthetic_questions(chunk, start=0, count=5):
    from app.models.quiz import GeneratedQuestion

    return [
        GeneratedQuestion(
            question_type="objective",
            prompt=SYNTHETIC_PROMPTS[i],
            options=[{"id": letter, "text": f"Option {letter}"} for letter in "ABCD"],
            answer_key={"choice_ids": ["B"]},
            explanation="A concise synthetic academic explanation.",
            concept=f"Concept {i}",
            source_ids=[chunk],
        )
        for i in range(start, start + count)
    ]


async def test_real_concurrent_batches_start_only_after_complete_set(quiz_database, monkeypatch):
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    chunk = uuid4()
    source = {
        "chunk_id": chunk,
        "document_id": document,
        "title": "Synthetic source",
        "page": 1,
        "excerpt": "Synthetic academic evidence.",
    }
    monkeypatch.setattr(worker, "retrieve_sources", AsyncMock(return_value=[source]))
    entered = 0
    both = asyncio.Event()
    release = asyncio.Event()

    async def batch(config, excerpts, existing, count, level, variation):
        nonlocal entered
        entered += 1
        if entered == 2:
            both.set()
        await asyncio.wait_for(both.wait(), 3)
        if variation:
            await release.wait()
        return synthetic_questions(chunk, 5 if variation else 0, count)

    monkeypatch.setattr(worker, "generate_batch", batch)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=10, request_key=uuid4()), user
    )
    task = asyncio.create_task(worker.generate_quiz_job({}, str(job.id)))
    try:
        async with asyncio.timeout(5):
            while (await service.get_job(job.id, user)).generated_count < 5:
                await asyncio.sleep(0.02)
        view = await service.get_job(job.id, user)
        assert not view.can_start and view.status == "generating" and entered == 2
        with pytest.raises(HTTPException) as premature:
            await service.start_attempt(job.quiz_id, user)
        assert premature.value.status_code == 409
        assert (
            await conn.fetchval(
                "SELECT count(*) FROM public.quiz_sessions WHERE quiz_id=$1", job.quiz_id
            )
            == 0
        )
        release.set()
        await asyncio.wait_for(task, 5)
        assert (await service.get_job(job.id, user)).can_start
        attempt = await service.start_attempt(job.quiz_id, user)
        assert len(attempt.questions) == 10
        answer = Answer(question_id=attempt.questions[0].id, selected_option_ids=["B"])
        saved = await service.save_answers(
            attempt.id, SaveAnswers(revision=0, answers=[answer]), user
        )
        final = await service.get_attempt(attempt.id, user)
        assert final.revision == saved.revision and final.answers == [answer]
        assert (await service.submit_attempt(attempt.id, user)).max_score == 10
    finally:
        release.set()
        if not task.done():
            task.cancel()
        await asyncio.gather(task, return_exceptions=True)


@pytest.mark.parametrize("time_limit_sec", [None, 300])
@pytest.mark.parametrize("status", ["generating", "completed"])
async def test_real_quiz_cannot_start_partial_set(quiz_database, time_limit_sec, status):
    conn, user, _ = quiz_database
    job = await ready(conn, user, time_limit_sec=time_limit_sec)
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status=$2 WHERE id=$1", job.id, status
    )
    await conn.execute(
        "DELETE FROM public.quiz_questions WHERE quiz_id=$1 AND question_order>2", job.quiz_id
    )
    assert not (await service.get_job(job.id, user)).can_start
    with pytest.raises(HTTPException) as blocked:
        await service.start_attempt(job.quiz_id, user)
    assert blocked.value.status_code == 409
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_sessions WHERE quiz_id=$1", job.quiz_id
        )
        == 0
    )


async def test_real_question_bank_scope_freshness_and_hidden_refill(quiz_database, monkeypatch):
    from app.engines import quiz_bank as bank
    from app.models.quiz import QuizConfig, Source
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    if os.getenv("QUIZ_TEST_DATABASE_URL"):
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,'Synthetic academic evidence.',1,0) RETURNING id",
            document,
        )
    else:
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index,embedding) VALUES($1,'Synthetic academic evidence.',1,0,$2::vector(1536)) RETURNING id",
            document,
            "[" + ",".join(["0.1"] * 1536) + "]",
        )
    source = Source(
        chunk_id=chunk,
        document_id=document,
        title="Synthetic source",
        page=1,
        excerpt="Synthetic academic evidence.",
    )
    inventory = await ready(conn, user)
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"bank_refill\":true}'::jsonb WHERE id=$1",
        inventory.id,
    )
    for i, q in enumerate(synthetic_questions(chunk)):
        await conn.execute(
            "UPDATE public.quiz_questions SET prompt=$3,sources=$4::jsonb WHERE quiz_id=$1 AND question_order=$2",
            inventory.quiz_id,
            i + 1,
            q.prompt,
            json.dumps([source.model_dump(mode="json")]),
        )
    config = QuizConfig(course_code="PCL 401")
    target = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload-'content_generation_version' WHERE id=$1",
        inventory.id,
    )
    assert await bank.reusable_questions(config, user, target.quiz_id, [], 5) == []
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"content_generation_version\":1}'::jsonb WHERE id=$1",
        inventory.id,
    )
    assert len(await bank.reusable_questions(config, user, target.quiz_id, [], 5)) == 5
    assert (
        len(await bank.reusable_questions(config, user, target.quiz_id, [SYNTHETIC_PROMPTS[0]], 5))
        == 4
    )
    assert (
        await bank.reusable_questions(
            config.model_copy(update={"difficulty": "hard"}), user, target.quiz_id, [], 5
        )
        == []
    )
    assert (
        await bank.reusable_questions(
            config, UserContext(**{**user, "current_level": "300"}), target.quiz_id, [], 5
        )
        == []
    )
    assert (
        await bank.reusable_questions(
            config, UserContext(**{**user, "university_id": uuid4()}), target.quiz_id, [], 5
        )
        == []
    )
    await conn.execute("UPDATE public.documents SET deleted_at=now() WHERE id=$1", document)
    assert await bank.reusable_questions(config, user, target.quiz_id, [], 5) == []
    await conn.execute("UPDATE public.documents SET deleted_at=NULL WHERE id=$1", document)
    await conn.execute(
        "UPDATE public.document_chunks SET content='Changed evidence' WHERE id=$1", chunk
    )
    assert await bank.reusable_questions(config, user, target.quiz_id, [], 5) == []
    await conn.execute(
        "UPDATE public.document_chunks SET content='Synthetic academic evidence.' WHERE id=$1",
        chunk,
    )
    generate = AsyncMock(side_effect=AssertionError("A bank hit must not call AI"))
    retrieve = AsyncMock(side_effect=AssertionError("A bank hit must not embed or retrieve"))
    monkeypatch.setattr(worker, "generate_batch", generate)
    monkeypatch.setattr(worker, "retrieve_sources", retrieve)
    await worker.generate_quiz_job({}, str(target.id))
    assert (await service.get_job(target.id, user)).status == "completed"
    generate.assert_not_called()
    retrieve.assert_not_called()
    hidden = await conn.fetchrow(
        "SELECT id,quiz_id FROM public.quiz_generation_jobs WHERE user_id=$1 AND request_payload->>'bank_refill'='true'",
        user.id,
    )
    assert hidden
    await bank.schedule_refill(config, user, target.quiz_id)
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_generation_jobs WHERE user_id=$1 AND request_payload->>'bank_refill'='true'",
            user.id,
        )
        == 2
    )
    history = await service.history(user, 0)
    assert hidden["id"] not in [j.id for j in history.jobs]
    with pytest.raises(HTTPException):
        await service.get_job(hidden["id"], user)
    with pytest.raises(HTTPException):
        await service.start_attempt(hidden["quiz_id"], user)


async def test_real_capacity_deferral_preserves_progress_without_spending_attempts(
    quiz_database, monkeypatch
):
    from app.engines.provider_capacity import CapacityDeferred
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    job = await ready(conn, user)
    await conn.execute(
        "DELETE FROM public.quiz_questions WHERE quiz_id=$1 AND question_order>2", job.quiz_id
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='queued',attempts=0,lease_until=NULL WHERE id=$1",
        job.id,
    )
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": uuid4(),
                    "document_id": document,
                    "title": "Synthetic evidence",
                    "page": 1,
                    "excerpt": "Synthetic academic evidence.",
                }
            ]
        ),
    )
    batch = AsyncMock(side_effect=CapacityDeferred(17))
    monkeypatch.setattr(worker, "generate_batch", batch)
    await worker.generate_quiz_job({}, str(job.id))
    row = await conn.fetchrow(
        "SELECT status,attempts,lease_until,now() AS now FROM public.quiz_generation_jobs WHERE id=$1",
        job.id,
    )
    assert row["status"] == "queued" and row["attempts"] == 0 and row["lease_until"] > row["now"]
    view = await service.get_job(job.id, user)
    assert view.generated_count == 2 and not view.can_start
    await worker.generate_quiz_job({}, str(job.id))
    assert batch.await_count == 1
    with pytest.raises(HTTPException) as blocked:
        await service.start_attempt(job.quiz_id, user)
    assert blocked.value.status_code == 409


async def test_real_ingestion_warms_hidden_inventory_once(quiz_database, monkeypatch):
    from workers import quiz_inventory

    conn, user, document = quiz_database
    monkeypatch.setattr(quiz_inventory, "database", service.database)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    await quiz_inventory.warm_quiz_inventory({}, str(document))
    rows = await conn.fetch(
        "SELECT request_payload FROM public.quiz_generation_jobs WHERE user_id=$1", user.id
    )
    assert len(rows) == 1
    payload = service.unpack(rows[0]["request_payload"])
    assert (
        payload["bank_refill"]
        and payload["count"] == 10
        and payload["question_type"] == "objective"
    )
    await quiz_inventory.warm_quiz_inventory({}, str(document))
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.quiz_generation_jobs WHERE user_id=$1", user.id
        )
        == 1
    )
    assert (await service.history(user)).jobs == []


async def test_real_matching_requests_share_generation_then_reuse_inventory(
    quiz_database, monkeypatch
):
    url = os.getenv("CAPACITY_TEST_REDIS_URL") or os.getenv("WORKER_TEST_REDIS_URL")
    if not url:
        pytest.skip("Designated Redis test connection not configured")
    from redis.asyncio import Redis

    from app.engines import provider_capacity
    from workers import quiz as worker

    conn, user, document = quiz_database
    client = Redis.from_url(url, decode_responses=True, socket_timeout=5, socket_connect_timeout=5)
    monkeypatch.setattr(provider_capacity, "redis_client", lambda: client)
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    monkeypatch.setattr(worker, "database", service.database)
    if os.getenv("QUIZ_TEST_DATABASE_URL"):
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,'Synthetic academic evidence.',1,0) RETURNING id",
            document,
        )
    else:
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index,embedding) VALUES($1,'Synthetic academic evidence.',1,0,$2::vector(1536)) RETURNING id",
            document,
            "[" + ",".join(["0.1"] * 1536) + "]",
        )
    source = {
        "chunk_id": chunk,
        "document_id": document,
        "title": "Synthetic source",
        "page": 1,
        "excerpt": "Synthetic academic evidence.",
    }
    retrieve = AsyncMock(return_value=[source])
    monkeypatch.setattr(worker, "retrieve_sources", retrieve)
    entered = asyncio.Event()
    release = asyncio.Event()

    async def generate(*args):
        entered.set()
        await release.wait()
        return synthetic_questions(chunk)

    batch = AsyncMock(side_effect=generate)
    monkeypatch.setattr(worker, "generate_batch", batch)
    leader = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    follower = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    # The shared leader represents hidden inventory, not a previous student quiz.
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"bank_refill\":true}'::jsonb WHERE id=$1",
        leader.id,
    )
    task = asyncio.create_task(worker.generate_quiz_job({}, str(leader.id)))
    try:
        await asyncio.wait_for(entered.wait(), 5)
        await worker.generate_quiz_job({}, str(follower.id))
        waiting = await conn.fetchrow(
            "SELECT status,attempts FROM public.quiz_generation_jobs WHERE id=$1", follower.id
        )
        assert waiting["status"] == "queued" and waiting["attempts"] == 0 and batch.await_count == 1
        release.set()
        await asyncio.wait_for(task, 5)
        await conn.execute(
            "UPDATE public.quiz_generation_jobs SET lease_until=NULL WHERE id=$1", follower.id
        )
        await worker.generate_quiz_job({}, str(follower.id))
        assert (await service.get_job(follower.id, user)).status == "completed"
        assert batch.await_count == 1 and retrieve.await_count == 1
    finally:
        release.set()
        if not task.done():
            task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await client.aclose()


async def test_real_matrix_shuffle_survives_bank_copy_and_resume(quiz_database, monkeypatch):
    from app.engines import quiz_bank, quiz_ordering
    from app.models.quiz import GeneratedQuestion, QuizConfig
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    if os.getenv("QUIZ_TEST_DATABASE_URL"):
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,'Synthetic academic evidence.',1,0) RETURNING id",
            document,
        )
    else:
        chunk = await conn.fetchval(
            "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index,embedding) VALUES($1,'Synthetic academic evidence.',1,0,$2::vector(1536)) RETURNING id",
            document,
            "[" + ",".join(["0.1"] * 1536) + "]",
        )
    source = {
        "chunk_id": chunk,
        "document_id": document,
        "title": "Synthetic source",
        "page": 1,
        "excerpt": "Synthetic academic evidence.",
    }
    monkeypatch.setattr(worker, "retrieve_sources", AsyncMock(return_value=[source]))

    def rotate(items):
        items[:] = items[1:] + items[:1]

    monkeypatch.setattr(quiz_ordering.rng, "shuffle", rotate)
    questions = [
        GeneratedQuestion(
            question_type="statement_matrix",
            prompt=prompt,
            options=[
                {"id": letter, "text": f"Synthetic claim {index}"}
                for index, letter in enumerate("ABCDE")
            ],
            answer_key={
                "truth_values": dict(zip("ABCDE", [True, False, True, False, True], strict=True))
            },
            explanation="The route and target claims differ from the evidenced facts.",
            concept="Synthetic concept",
            source_ids=[chunk],
        )
        for prompt in SYNTHETIC_PROMPTS[:5]
    ]
    generate = AsyncMock(return_value=questions)
    monkeypatch.setattr(worker, "generate_batch", generate)
    payload = CreateQuiz(
        course_code="PCL 401", question_type="statement_matrix", count=5, request_key=uuid4()
    )
    first = await service.create_job(payload, user)
    await worker.generate_quiz_job({}, str(first.id))
    assert (await service.get_job(first.id, user)).status == "completed"
    initial_generation_calls = generate.await_count
    assert (await service.create_job(payload, user)).id == first.id
    rows = await conn.fetch(
        "SELECT options,answer_key FROM public.quiz_questions WHERE quiz_id=$1 ORDER BY question_order",
        first.quiz_id,
    )
    facts = {
        f"Synthetic claim {i}": truth for i, truth in enumerate([True, False, True, False, True])
    }
    for row in rows:
        options = service.unpack(row["options"])
        key = service.unpack(row["answer_key"])["truth_values"]
        assert [option["text"] for option in options] != [
            option.text for option in questions[0].options
        ]
        assert all(key[option["id"]] == facts[option["text"]] for option in options)
    config = QuizConfig(course_code="PCL 401", question_type="statement_matrix", count=5)
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload-'matrix_generation_version' WHERE id=$1",
        first.id,
    )
    assert await quiz_bank.reusable_questions(config, user, uuid4(), [], 5) == []
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"matrix_generation_version\":1}'::jsonb WHERE id=$1",
        first.id,
    )
    # Source questions are hidden inventory; same-student interactive questions
    # are deliberately excluded under the fresh-repeat contract.
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET request_payload=request_payload || '{\"bank_refill\":true}'::jsonb WHERE id=$1",
        first.id,
    )
    second = await service.create_job(CreateQuiz(**config.model_dump(), request_key=uuid4()), user)
    await worker.generate_quiz_job({}, str(second.id))
    assert (
        await service.get_job(second.id, user)
    ).status == "completed" and generate.await_count == initial_generation_calls
    attempt = await service.start_attempt(second.quiz_id, user)
    answers = [
        Answer(
            question_id=question.id,
            truth_values={option.id: facts[option.text] for option in question.options},
        )
        for question in attempt.questions
    ]
    saved = await service.save_answers(attempt.id, SaveAnswers(revision=0, answers=answers), user)
    resumed = await service.get_attempt(attempt.id, user)
    assert resumed.questions == attempt.questions and resumed.answers == saved.answers
    result = await service.submit_attempt(attempt.id, user)
    assert result.score == 25 and result.percentage == 100


@pytest.mark.parametrize("total,invalid_first_wave", [(25, False), (10, True)])
async def test_real_worker_reduces_invalid_batches_and_preserves_large_quiz_completion(
    quiz_database, monkeypatch, total, invalid_first_wave
):
    from app.models.quiz import GeneratedQuestion
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    chunk = uuid4()
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": chunk,
                    "document_id": document,
                    "title": "Synthetic source",
                    "page": 1,
                    "excerpt": "Synthetic teaching evidence.",
                }
            ]
        ),
    )
    sizes = []

    async def generate(config, excerpts, existing, count, level, variation):
        sizes.append(count)
        if invalid_first_wave and len(sizes) <= 2:
            raise RuntimeError("Synthetic malformed response")
        return [
            GeneratedQuestion(
                question_type="objective",
                prompt=f"{uuid4().hex} represents which synthetic process?",
                options=[{"id": i, "text": f"Option {i}"} for i in "ABCD"],
                answer_key={"choice_ids": ["A"]},
                explanation="A synthetic source-grounded explanation of the concept.",
                concept="Absorption",
                source_ids=[chunk],
            )
            for _ in range(count)
        ]

    monkeypatch.setattr(worker, "generate_batch", generate)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=total, request_key=uuid4()), user
    )
    await worker.generate_quiz_job({}, str(job.id))
    saved = await service.get_job(job.id, user)
    assert saved.status == "completed" and saved.generated_count == total
    if invalid_first_wave:
        assert sizes[:2] == [5, 5] and sizes[2:4] == [2, 2]
    else:
        assert sizes == [5, 5, 5, 5, 5]


async def test_real_sampling_draws_randomly_from_beginning_middle_and_end(
    quiz_database, monkeypatch
):
    from app.models.quiz import QuizConfig
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    if not os.getenv("QUIZ_TEST_DATABASE_URL"):
        pytest.skip("Synthetic no-vector baseline only")
    await conn.executemany(
        "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,$2,$3,$4)",
        [(document, f"Synthetic teaching section {i}", i + 1, i) for i in range(80)],
    )
    a = await worker.retrieve_sources(QuizConfig(course_code="PCL 401"), user)
    b = await worker.retrieve_sources(QuizConfig(course_code="PCL 401"), user)
    assert len(a) == len(b) == 8
    assert {(row["page"] - 1) // 10 for row in a} == set(range(8))
    assert {(row["page"] - 1) // 10 for row in b} == set(range(8))
    assert [row["chunk_id"] for row in a] != [row["chunk_id"] for row in b]


async def test_real_repeat_avoids_all_25_previously_generated_unstarted_questions(
    quiz_database, monkeypatch
):
    from app.models.quiz import GeneratedQuestion
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    chunk = uuid4()
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": chunk,
                    "document_id": document,
                    "title": "Synthetic",
                    "page": 1,
                    "excerpt": "Synthetic teaching.",
                }
            ]
        ),
    )
    observed = []

    async def generate(config, excerpts, existing, count, level, variation):
        observed.append(list(existing))
        return [
            GeneratedQuestion(
                question_type="objective",
                prompt=f"{uuid4().hex} represents which synthetic learning point?",
                options=[{"id": i, "text": f"Option {i}"} for i in "ABCD"],
                answer_key={"choice_ids": ["A"]},
                explanation="A complete synthetic teaching explanation.",
                concept="Concept",
                source_ids=[chunk],
            )
            for _ in range(count)
        ]

    monkeypatch.setattr(worker, "generate_batch", generate)
    first = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=25, request_key=uuid4()), user
    )
    await worker.generate_quiz_job({}, str(first.id))
    prior = {
        r["prompt"]
        for r in await conn.fetch(
            "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1", first.quiz_id
        )
    }
    assert len(prior) == 25
    observed.clear()
    second = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
    )
    await worker.generate_quiz_job({}, str(second.id))
    assert (await service.get_job(second.id, user)).status == "completed"
    assert prior <= set(observed[0])
    fresh = {
        r["prompt"]
        for r in await conn.fetch(
            "SELECT prompt FROM public.quiz_questions WHERE quiz_id=$1", second.quiz_id
        )
    }
    assert len(fresh) == 5 and not fresh & prior
    assert (
        await conn.fetchval("SELECT count(*) FROM public.quiz_sessions WHERE user_id=$1", user.id)
        == 0
    )


async def test_real_concurrent_requests_do_not_commit_the_same_question(quiz_database):
    from app.models.quiz import QuizTaskConfig, Source
    from workers.quiz_pipeline import append_questions

    conn, user, document = quiz_database
    jobs = []
    for _ in range(2):
        job = await service.create_job(
            CreateQuiz(course_code="PCL 401", count=5, request_key=uuid4()), user
        )
        lease = uuid4()
        await conn.execute(
            "UPDATE public.quiz_generation_jobs SET status='generating',lease_id=$2 WHERE id=$1",
            job.id,
            lease,
        )
        jobs.append(
            (
                await conn.fetchrow(
                    "SELECT * FROM public.quiz_generation_jobs WHERE id=$1", job.id
                ),
                lease,
            )
        )
    chunk = uuid4()
    item = synthetic_questions(chunk, 0, 1)[0]
    source = Source(
        chunk_id=chunk,
        document_id=document,
        title="Synthetic",
        page=1,
        excerpt="Synthetic teaching.",
    )
    counts = await asyncio.gather(
        *(
            append_questions(
                service.database,
                job,
                lease,
                QuizTaskConfig(course_code="PCL 401"),
                [(item, [source])],
            )
            for job, lease in jobs
        )
    )
    assert sorted(counts) == [0, 1]


async def test_real_bank_sampling_spreads_questions_across_material_sections(quiz_database):
    from app.engines import quiz_bank as bank
    from app.models.quiz import QuizConfig, Source

    conn, user, document = quiz_database
    if not os.getenv("QUIZ_TEST_DATABASE_URL"):
        pytest.skip("Synthetic no-vector baseline only")
    chunks = []
    for i in range(80):
        chunks.append(
            await conn.fetchval(
                "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,'Synthetic teaching.', $2,$3) RETURNING id",
                document,
                i + 1,
                i,
            )
        )
    inventory = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=25, request_key=uuid4()), user
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='completed',request_payload=request_payload || '{\"content_generation_version\":1,\"bank_refill\":true}'::jsonb WHERE id=$1",
        inventory.id,
    )
    for i in range(25):
        section = i % 8
        source = Source(
            chunk_id=chunks[section * 10],
            document_id=document,
            title="Synthetic",
            page=section * 10 + 1,
            excerpt="Synthetic teaching.",
        )
        await conn.execute(
            "INSERT INTO public.quiz_questions(quiz_id,question_order,question_type,prompt,options,correct_answer,answer_key,explanation,points,sources,concept) VALUES($1,$2,'objective',$3,$4::jsonb,'A',$5::jsonb,'A complete synthetic explanation.',1,$6::jsonb,'Concept')",
            inventory.quiz_id,
            i + 1,
            f"{uuid4().hex} represents which synthetic learning point?",
            json.dumps([{"id": key, "text": f"Option {key}"} for key in "ABCD"]),
            json.dumps({"choice_ids": ["A"], "truth_values": {}, "text": ""}),
            json.dumps([source.model_dump(mode="json")]),
        )
    result = await bank.reusable_questions(QuizConfig(course_code="PCL 401"), user, uuid4(), [], 5)
    assert len(result) == 5
    assert len({(sources[0].page - 1) // 10 for _, sources in result}) >= 4


async def test_real_multi_material_sampling_keeps_end_sections_in_bounded_pool(
    quiz_database, monkeypatch
):
    from app.models.quiz import QuizConfig
    from workers import quiz as worker

    conn, user, document = quiz_database
    if not os.getenv("QUIZ_TEST_DATABASE_URL"):
        pytest.skip("Synthetic no-vector baseline only")
    monkeypatch.setattr(worker, "database", service.database)
    extra = []
    try:
        for _ in range(3):
            extra.append(
                await conn.fetchval(
                    "INSERT INTO public.documents(university_id,title,course_code,course_title,topic) VALUES($1,'Synthetic extra material','PCL 401','Synthetic course','Topic') RETURNING id",
                    user.university_id,
                )
            )
        for doc in [document] + extra:
            await conn.executemany(
                "INSERT INTO public.document_chunks(document_id,content,page_start,chunk_index) VALUES($1,$2,$3,$4)",
                [(doc, f"Synthetic teaching section {i}", i + 1, i) for i in range(80)],
            )
        result = await worker.retrieve_sources(QuizConfig(course_code="PCL 401"), user)
        assert len(result) == 24
        for doc in [document] + extra:
            sections = {(r["page"] - 1) // 10 for r in result if r["document_id"] == doc}
            assert 0 in sections and 7 in sections
    finally:
        for doc in extra:
            await conn.execute("DELETE FROM public.documents WHERE id=$1", doc)


@pytest.mark.parametrize("invalid_sibling", [False, True])
async def test_real_completed_sibling_retries_capacity_without_durable_wait(
    quiz_database, monkeypatch, invalid_sibling
):
    from app.engines.provider_capacity import CapacityDeferred
    from workers import quiz as worker

    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    chunk = uuid4()
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": chunk,
                    "document_id": document,
                    "title": "Synthetic",
                    "page": 1,
                    "excerpt": "Synthetic teaching.",
                }
            ]
        ),
    )
    calls = []

    async def generate(config, excerpts, existing, count, level, variation):
        calls.append(count)
        if len(calls) == 2:
            raise CapacityDeferred(60)
        if invalid_sibling and len(calls) == 1:
            return []
        offset = sum(calls) - count - calls[1] if len(calls) > 1 else 0
        if invalid_sibling:
            offset -= calls[0]
        return synthetic_questions(chunk, offset, count)

    monkeypatch.setattr(worker, "generate_batch", generate)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=10, request_key=uuid4()), user
    )
    await worker.generate_quiz_job({}, str(job.id))
    view = await service.get_job(job.id, user)
    assert view.status == "completed" and view.generated_count == 10 and view.can_start
    if invalid_sibling:
        assert calls[:4] == [5, 5, 2, 2]
    else:
        assert calls == [5, 5, 5]
    assert (
        await conn.fetchval("SELECT attempts FROM public.quiz_generation_jobs WHERE id=$1", job.id)
        == 1
    )


async def test_real_legacy_partial_attempt_can_resume_its_saved_answers(quiz_database):
    conn, user, _ = quiz_database
    job = await ready(conn, user)
    attempt = await service.start_attempt(job.quiz_id, user)
    answer = Answer(question_id=attempt.questions[0].id, selected_option_ids=["B"])
    saved = await service.save_answers(attempt.id, SaveAnswers(revision=0, answers=[answer]), user)
    await conn.execute(
        "DELETE FROM public.quiz_questions WHERE quiz_id=$1 AND question_order>2", job.quiz_id
    )
    await conn.execute(
        "UPDATE public.quiz_generation_jobs SET status='generating' WHERE id=$1", job.id
    )
    assert not (await service.get_job(job.id, user)).can_start
    resumed = await service.start_attempt(job.quiz_id, user)
    assert (
        resumed.id == attempt.id
        and resumed.answers == [answer]
        and resumed.revision == saved.revision
    )
