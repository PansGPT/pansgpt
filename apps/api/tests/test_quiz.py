"""Scoring, malformed model output and safe transport regressions."""

import json
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import settings
from app.engines import quiz_generation as generation
from app.engines import quiz_service as service
from app.engines.quiz_grading import grade_question, percentage, validate_answer
from app.models.quiz import (
    Answer,
    AnswerKey,
    GeneratedQuestion,
    Option,
    Question,
    QuizConfig,
    WrittenGrade,
)


@pytest.fixture(autouse=True)
def quiz_client_key(monkeypatch):
    monkeypatch.setattr(settings, "X_API_KEY_WEB", "quiz-test-client-key")
    monkeypatch.setattr(settings, "GROQ_SECONDARY_MODEL", settings.GROQ_FALLBACK_MODEL)


async def test_configured_secondary_groq_is_tried_before_openrouter(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_SECONDARY_MODEL", "configured-secondary")
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    calls = AsyncMock(
        side_effect=[CapacityDeferred(86400), json.dumps({"questions": [generated()]})]
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    result = await generation.complete("Synthetic", {}, generation.QuestionBatch)
    assert len(result.questions) == 1
    assert [c.args[1] for c in calls.await_args_list] == [
        settings.GROQ_FALLBACK_MODEL,
        "configured-secondary",
    ]


@pytest.mark.parametrize("partial", [False, True])
async def test_matrix_quality_controls_fallback_and_preserves_valid_siblings(monkeypatch, partial):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_SECONDARY_MODEL", "configured-secondary")
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    candidate = generated() | {
        "question_type": "statement_matrix",
        "options": [{"id": i, "text": f"Distinct statement {i}"} for i in "ABCDE"],
        "answer_key": {"truth_values": dict(zip("ABCDE", [True, False, True, False, True]))},
    }
    valid = wire_batch(candidate)
    invalid = valid.model_copy(deep=True)
    invalid.questions[0].f[0].v = "Unsupported replacement"
    first = invalid.model_copy(
        update={"questions": invalid.questions + valid.questions if partial else invalid.questions}
    )
    calls = AsyncMock(side_effect=[first.model_dump_json(), valid.model_dump_json()])
    monkeypatch.setattr(generation, "routing_completion", calls)
    result = await generation.generate_batch(
        QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
        [{"chunk_id": candidate["source_ids"][0], "excerpt": "Synthetic sites L and K."}],
        [],
        2,
    )
    assert len(result) == 1
    assert result[0].options[1].text == generation.compile_matrix(valid).questions[0].o[1]
    assert calls.await_count == (1 if partial else 2)
    assert [call.args[1] for call in calls.await_args_list] == (
        [settings.GROQ_FALLBACK_MODEL]
        if partial
        else [settings.GROQ_FALLBACK_MODEL, "configured-secondary"]
    )


async def test_unusable_questions_do_not_turn_into_a_capacity_refund(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_SECONDARY_MODEL", "configured-secondary")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    candidate = generated()
    calls = AsyncMock(
        side_effect=[wire_batch(candidate, ref=7).model_dump_json(), CapacityDeferred(60)]
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    with pytest.raises(RuntimeError, match="required schema"):
        await generation.generate_batch(
            QuizConfig(course_code="TEST 401"),
            [{"chunk_id": candidate["source_ids"][0], "excerpt": "Synthetic evidence"}],
            [],
            1,
        )


async def test_disabled_inventory_does_not_retrieve_or_schedule(monkeypatch):
    from app.engines import quiz_bank
    from workers import quiz_inventory

    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    monkeypatch.setattr(settings, "ENABLE_QUIZ_INVENTORY", False)
    retrieve = AsyncMock()
    database = MagicMock(side_effect=AssertionError("Must not open a database"))
    monkeypatch.setattr(quiz_bank, "reusable_questions", retrieve)
    monkeypatch.setattr(quiz_inventory, "database", database)
    assert not await quiz_bank.schedule_inventory(
        QuizConfig(course_code="TEST 101"), MagicMock(), uuid4()
    )
    await quiz_inventory.warm_quiz_inventory({})
    retrieve.assert_not_awaited()
    database.assert_not_called()


async def test_disabled_inventory_ignores_existing_queue_delivery(monkeypatch):
    from workers import quiz

    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    monkeypatch.setattr(settings, "ENABLE_AI", True)
    monkeypatch.setattr(settings, "ENABLE_QUIZ_INVENTORY", False)
    conn = MagicMock()
    conn.fetchrow = AsyncMock(
        return_value={
            "status": "queued",
            "lease_until": None,
            "attempts": 0,
            "request_payload": {"bank_refill": True},
        }
    )
    conn.fetchval = AsyncMock(return_value=datetime.now(UTC))
    conn.execute = AsyncMock()

    @asynccontextmanager
    async def transaction():
        yield conn

    conn.transaction = transaction
    monkeypatch.setattr(quiz, "database", transaction)
    await quiz.generate_quiz_job({}, str(uuid4()))
    conn.execute.assert_not_awaited()


def make_question(kind="objective"):
    ids = (
        "ABCD"
        if kind == "objective"
        else "ABCDE"
        if kind in ("multi_select", "statement_matrix")
        else ""
    )
    return Question(
        id=uuid4(),
        position=1,
        question_type=kind,
        prompt="Which process describes drug absorption?",
        options=[Option(id=i, text=f"Option {i}") for i in ids],
        points=3 if kind == "multi_select" else 5 if kind == "statement_matrix" else 1,
        concept="Absorption",
    )


@pytest.mark.parametrize("selected,expected", [("B", 1), ("A", 0), ("", 0)])
def test_objective_grades_identifier_not_first_character(selected, expected):
    q = make_question()
    q.options[1].text = "Absorption"
    answer = Answer(question_id=q.id, selected_option_ids=[selected] if selected else [])
    result = grade_question(q, AnswerKey(choice_ids=["B"]), answer, "Teaching explanation", [])
    assert result.earned == expected


@pytest.mark.parametrize("selected,expected", [(["A", "C", "E"], 3), (["A", "B"], 1), ([], 0)])
def test_multi_select_has_no_implicit_false_or_negative_marks(selected, expected):
    q = make_question("multi_select")
    assert (
        grade_question(
            q,
            AnswerKey(choice_ids=["A", "C", "E"]),
            Answer(question_id=q.id, selected_option_ids=selected),
            "Explanation",
            [],
        ).earned
        == expected
    )


def test_matrix_distinguishes_false_from_unanswered_and_keeps_negative_score():
    q = make_question("statement_matrix")
    key = AnswerKey(truth_values={"A": True, "B": False, "C": True, "D": False, "E": True})
    result = grade_question(
        q,
        key,
        Answer(question_id=q.id, truth_values={"A": False, "B": False, "C": False}),
        "Explanation",
        [],
    )
    assert result.earned == -1
    assert [g.earned for g in result.option_grades] == [-1, 1, -1, 0, 0]
    assert percentage(-1, 5) == 0
    assert percentage(3, 5) == 60


def test_false_is_a_real_answer():
    q = make_question("true_false")
    assert (
        grade_question(
            q,
            AnswerKey(truth_values={"A": False}),
            Answer(question_id=q.id, truth_values={"A": False}),
            "Explanation",
            [],
        ).outcome
        == "correct"
    )


def test_written_grading_never_silently_falls_back_to_exact_match():
    q = make_question("short_answer")
    answer = Answer(question_id=q.id, text="An accurate paraphrase")
    with pytest.raises(ValueError, match="unavailable"):
        grade_question(q, AnswerKey(text="Rubric"), answer, "Explanation", [])
    result = grade_question(
        q,
        AnswerKey(text="Rubric"),
        answer,
        "Explanation",
        [],
        WrittenGrade(question_id=q.id, score=0.5, feedback="Missing one key concept"),
    )
    assert result.earned == 0.5 and result.outcome == "partial"
    with pytest.raises(ValidationError):
        WrittenGrade(question_id=q.id, score=1.5, feedback="Invalid model score")


@pytest.mark.parametrize(
    "payload",
    [
        {"selected_option_ids": ["E"]},
        {"text": "A"},
        {"truth_values": {"A": True}},
        {"selected_option_ids": ["A", "B"]},
    ],
)
def test_answer_shape_rejected_before_persistence(payload):
    q = make_question()
    with pytest.raises(ValueError):
        validate_answer(q, Answer(question_id=q.id, **payload))


def generated():
    return {
        "question_type": "objective",
        "prompt": "Which process describes drug absorption?",
        "options": [{"id": i, "text": f"Process {i}"} for i in "ABCD"],
        "answer_key": {"choice_ids": ["B"]},
        "explanation": "Absorption moves a drug into the systemic circulation.",
        "concept": "Absorption",
        "source_ids": [str(uuid4())],
    }


def wire_batch(candidate, ref=1):
    from app.engines.quiz_wire import MatrixDraftBatch, WireBatch, WireQuestion

    question = GeneratedQuestion.model_validate(candidate)
    key = question.answer_key
    answer = key.choice_ids or list(key.truth_values.values()) or key.text
    options = [item.text for item in question.options]
    edits = []
    if question.question_type == "statement_matrix":
        for index, truth in enumerate(key.truth_values.values()):
            if not truth:
                correct = f"Synthetic concept {index} uses site L."
                options[index] = correct
                edits.append({"i": index, "r": "L", "v": "K"})
        return MatrixDraftBatch.model_validate(
            {
                "questions": [
                    {
                        "p": question.prompt,
                        "t": options,
                        "f": edits,
                        "e": question.explanation,
                        "c": question.concept,
                        "s": [ref],
                    }
                ]
            }
        )
    return WireBatch(
        questions=[
            WireQuestion(
                p=question.prompt,
                o=options,
                a=answer,
                e=question.explanation,
                c=question.concept,
                s=[ref],
                f=edits,
            )
        ]
    )


@pytest.mark.parametrize(
    "change",
    [
        {"answer_key": {"choice_ids": ["E"]}},
        {"answer_key": {"choice_ids": ["A", "B"]}},
        {"options": []},
        {"source_ids": []},
    ],
)
def test_generated_questions_require_valid_keys_structure_and_sources(change):
    with pytest.raises(ValidationError):
        GeneratedQuestion.model_validate(generated() | change)


def test_duplicate_detection_is_not_case_or_punctuation_sensitive():
    assert generation.duplicate("WHAT IS absorption?", ["What is absorption"])
    assert not generation.duplicate("Explain renal clearance of drugs", ["What is absorption"])


async def test_generation_discards_unknown_sources_and_wrong_format(monkeypatch):
    candidate = generated()
    monkeypatch.setattr(
        generation,
        "complete",
        AsyncMock(return_value=wire_batch(candidate, ref=7)),
    )
    assert (
        await generation.generate_batch(
            QuizConfig(course_code="PCL 401"),
            [{"chunk_id": uuid4(), "excerpt": "Synthetic source"}],
            [],
            1,
        )
        == []
    )


async def test_written_model_must_grade_each_requested_question_once(monkeypatch):
    expected = uuid4()
    response = generation.WireWrittenGrades(
        grades=[{"question_id": uuid4(), "marks": 2, "feedback": "Correct reference response"}]
    )
    monkeypatch.setattr(generation, "complete", AsyncMock(return_value=response))
    with pytest.raises(ValueError, match="Incomplete"):
        await generation.grade_written([{"question_id": expected}])


async def test_disabled_feature_does_not_touch_database(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_QUIZ", False)
    result = await client.get("/api/v1/quiz/courses")
    assert result.status_code == 503


async def test_safe_question_projection_cannot_contain_answer_key():
    q = make_question()
    row = {
        "id": q.id,
        "question_order": 1,
        "question_type": q.question_type,
        "prompt": q.prompt,
        "options": json.dumps([o.model_dump() for o in q.options]),
        "points": 1,
        "concept": q.concept,
        "answer_key": {"choice_ids": ["B"]},
        "correct_answer": "B",
        "explanation": "Private until submitted",
        "sources": [],
    }
    safe = service.question(row).model_dump()
    assert not {"answer_key", "correct_answer", "explanation", "sources"} & safe.keys()


async def test_foreign_quiz_cannot_be_loaded(authenticated_student, monkeypatch):
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value=None)
    authenticated_student["current_level"] = "400"
    with pytest.raises(HTTPException) as error:
        await service.owned_quiz(conn, uuid4(), authenticated_student)
    assert error.value.status_code == 404
    _, _, owner, tenant = conn.fetchrow.await_args.args
    assert owner == authenticated_student.id and tenant == authenticated_student.university_id


async def test_transport_excludes_grading_fields_even_if_service_returns_extra(
    client, authenticated_student, monkeypatch
):
    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    q = make_question()
    private = q.model_dump(mode="json") | {"answer_key": {"choice_ids": ["A"]}}
    # Strict public models reject accidental leakage rather than trusting TS omissions.
    with pytest.raises(ValidationError):
        Question.model_validate(private)


async def test_public_share_has_no_private_ids_or_question_data(client, monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    monkeypatch.setattr(
        service,
        "public_share",
        AsyncMock(
            return_value={
                "title": "Absorption",
                "course_code": "PCL 401",
                "percentage": 80,
                "question_count": 5,
                "completed_at": "2026-10-26T12:00:00Z",
            }
        ),
    )
    result = await client.post(
        "/api/v1/quiz/shared",
        json={"token": "x" * 43},
        headers={"X-API-Key": "quiz-test-client-key"},
    )
    assert result.status_code == 200
    assert set(result.json()) == {
        "title",
        "course_code",
        "percentage",
        "question_count",
        "completed_at",
    }
    assert result.headers["cache-control"] == "no-store"


async def test_progress_stream_uses_authenticated_ownership_not_url_tokens(
    client, authenticated_student, monkeypatch
):
    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    job_id, quiz_id = uuid4(), uuid4()
    view = service.QuizJob(
        id=job_id,
        quiz_id=quiz_id,
        status="completed",
        generated_count=5,
        target_count=5,
        current_step="Ready",
        error_message=None,
    )
    get = AsyncMock(return_value=view)
    monkeypatch.setattr(service, "get_job", get)
    result = await client.get(
        f"/api/v1/quiz/jobs/{job_id}/events", headers={"X-API-Key": "quiz-test-client-key"}
    )
    assert result.status_code == 200 and "event: progress" in result.text
    assert "answer_key" not in result.text and "correct_answer" not in result.text
    assert get.await_args.args[1].id == authenticated_student.id


async def test_quiz_requires_client_identity_even_with_valid_user(
    client, authenticated_student, monkeypatch
):
    monkeypatch.setattr(settings, "ENABLE_QUIZ", True)
    assert (await client.get("/api/v1/quiz/courses")).status_code == 401


async def test_generation_uses_one_call_without_semantic_review(monkeypatch):
    candidate = generated()
    provider = AsyncMock(return_value=wire_batch(candidate))
    monkeypatch.setattr(generation, "complete", provider)
    result = await generation.generate_batch(
        QuizConfig(course_code="PCL 401"),
        [{"chunk_id": candidate["source_ids"][0], "excerpt": "Synthetic source"}],
        [],
        1,
        "400",
    )
    assert len(result) == 1
    assert provider.await_count == 1


def test_true_false_keys_and_ai_scores_do_not_coerce_strings_or_booleans():
    with pytest.raises(ValidationError):
        AnswerKey(truth_values={"A": "false"})
    with pytest.raises(ValidationError):
        WrittenGrade(question_id=uuid4(), score=True, feedback="A boolean is not a numeric grade")


async def test_quiz_completion_falls_back_to_compatible_json_and_validates_it(monkeypatch):
    payload = {"questions": [generated()]}
    transport = AsyncMock(side_effect=[TimeoutError(), TimeoutError(), json.dumps(payload)])
    monkeypatch.setattr(generation, "routing_completion", transport)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    result = await generation.complete(
        "Return JSON",
        {"schema": generation.QuestionBatch.model_json_schema()},
        generation.QuestionBatch,
    )
    assert len(result.questions) == 1
    assert transport.await_args.args[0] == "groq"
    assert transport.await_args.kwargs["constrained_json"] is False
    assert transport.await_args.kwargs["max_output_tokens"] == 3200


async def test_batch_prompt_is_bounded_to_supplied_evidence(monkeypatch):
    candidate = generated()
    excerpts = [{"chunk_id": str(uuid4()), "excerpt": "x" * 1800} for _ in range(24)]
    # Each batch samples separated portions of the evidence pool.
    candidate["source_ids"] = [excerpts[0]["chunk_id"]]
    provider = AsyncMock(
        side_effect=[
            wire_batch(candidate),
        ]
    )
    monkeypatch.setattr(generation, "complete", provider)
    result = await generation.generate_batch(
        QuizConfig(course_code="PCL 401"), excerpts, ["z" * 1000 for _ in range(25)], 5
    )
    assert len(result) == 1
    context = provider.await_args_list[0].args[1]
    assert len(context["excerpts"]) == 4
    assert all(len(row["text"]) <= 700 for row in context["excerpts"])
    assert all(len(prompt) <= 180 for prompt in context["avoid"])
    assert provider.await_count == 1


async def test_provider_deadlines_and_cooldown_skip_slow_primary(monkeypatch):
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits(threshold=1, cooldown=60))
    calls = AsyncMock(
        side_effect=[
            TimeoutError(),
            TimeoutError(),
            json.dumps({"questions": [generated()]}),
            json.dumps({"questions": [generated()]}),
        ]
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    for _ in range(2):
        await generation.complete(
            "Synthetic only", {"requested_count": 1}, generation.QuestionBatch
        )
    assert [c.args[0] for c in calls.await_args_list] == ["google", "google", "groq", "groq"]
    assert [c.kwargs["timeout_s"] for c in calls.await_args_list] == [30, 30, 12, 12]
    assert all(c.kwargs["google_thinking_level"] == "minimal" for c in calls.await_args_list)
    assert calls.await_args.kwargs["max_output_tokens"] == 856


async def test_quiz_wakeup_filters_messages_and_starts_delivery_without_poll(monkeypatch):
    import asyncio

    from workers.quiz import QUIZ_WAKE_CHANNEL
    from workers.runner import listen

    delivered = asyncio.Event()
    hold = asyncio.Event()

    class Subscriber:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def subscribe(self, channel):
            assert channel == QUIZ_WAKE_CHANNEL

        async def listen(self):
            yield {"type": "subscribe", "data": 1}
            yield {"type": "message", "data": b"not-a-quiz"}
            yield {"type": "message", "data": b"quiz:synthetic-delivery"}
            await hold.wait()

    worker = MagicMock()
    worker.pool.pubsub.return_value = Subscriber()

    async def start(ids):
        assert ids == [b"quiz:synthetic-delivery"]
        delivered.set()

    worker.start_jobs = AsyncMock(side_effect=start)
    ready = asyncio.Event()
    task = asyncio.create_task(listen(worker, ready))
    try:
        await asyncio.wait_for(delivered.wait(), 0.5)
        assert ready.is_set()
        worker.start_jobs.assert_awaited_once()
    finally:
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task


@pytest.mark.parametrize("failure", ["connection", "timeout", "socket"])
async def test_worker_recovers_transport_failure_without_resetting_jobs(monkeypatch, failure):
    from arq.worker import Worker

    from workers import runner

    errors = {
        "connection": runner.RedisConnectionError("synthetic disconnect"),
        "timeout": runner.RedisTimeoutError("synthetic timeout"),
        "socket": OSError("synthetic socket failure"),
    }
    poll = AsyncMock(side_effect=[errors[failure], None])
    pause = AsyncMock()
    monkeypatch.setattr(Worker, "main", poll)
    monkeypatch.setattr(runner.asyncio, "sleep", pause)
    worker = object.__new__(runner.RecoveringWorker)
    await worker.main()
    assert poll.await_count == 2
    pause.assert_awaited_once_with(5)


async def test_worker_does_not_hide_programming_errors_or_shutdown(monkeypatch):
    import asyncio

    from arq.worker import Worker

    from workers import runner

    pause = AsyncMock()
    monkeypatch.setattr(runner.asyncio, "sleep", pause)
    worker = object.__new__(runner.RecoveringWorker)
    for error in [ValueError("synthetic code defect"), asyncio.CancelledError()]:
        monkeypatch.setattr(Worker, "main", AsyncMock(side_effect=error))
        with pytest.raises(type(error)):
            await worker.main()
    pause.assert_not_awaited()


async def test_matrix_generation_prompt_requires_five_statement_options(monkeypatch):
    candidate = generated()
    candidate.update(
        question_type="statement_matrix",
        options=[{"id": i, "text": f"Distinct statement {i}"} for i in "ABCDE"],
        answer_key={"truth_values": {"A": True, "B": False, "C": True, "D": False, "E": True}},
    )
    provider = AsyncMock(return_value=wire_batch(candidate))
    monkeypatch.setattr(generation, "complete", provider)
    result = await generation.generate_batch(
        QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
        [
            {
                "chunk_id": candidate["source_ids"][0],
                "excerpt": "Synthetic teaching evidence. Sites L and K are source entities.",
            }
        ],
        [],
        1,
    )
    context = provider.await_args.args[1]
    assert context["format"] == "statement_matrix"
    system = provider.await_args.args[0]
    assert "common misconceptions" in system and "unambiguously false" in system
    assert "NEVER by letters" in system
    assert len(context["shape"]["t"]) == 5
    assert len({edit["i"] for edit in context["shape"]["f"]}) == 2
    assert "a" not in context["shape"] and "o" not in context["shape"]
    assert [item.id for item in result[0].options] == list("ABCDE")
    assert (
        result[0].source_ids == [candidate["source_ids"][0]]
        or str(result[0].source_ids[0]) == candidate["source_ids"][0]
    )


async def test_matrix_positional_explanations_are_rejected_before_shuffle(monkeypatch):
    candidate = generated()
    candidate.update(
        question_type="statement_matrix",
        options=[{"id": i, "text": f"Distinct statement {i}"} for i in "ABCDE"],
        answer_key={
            "truth_values": dict(zip("ABCDE", [True, False, True, False, True], strict=True))
        },
        explanation="Statement A is true and statement B is false based on the source.",
    )
    monkeypatch.setattr(generation, "complete", AsyncMock(return_value=wire_batch(candidate)))
    result = await generation.generate_batch(
        QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
        [
            {
                "chunk_id": candidate["source_ids"][0],
                "excerpt": "Synthetic evidence. Sites L and K are source entities.",
            }
        ],
        [],
        1,
    )
    assert result == []


@pytest.mark.parametrize("bad", ['{"questions": []}', "not JSON"])
async def test_invalid_fallback_payload_does_not_inherit_primary_capacity_wait(monkeypatch, bad):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits(threshold=1, cooldown=60))
    calls = AsyncMock(
        side_effect=[
            CapacityDeferred(114),
            CapacityDeferred(112),
            bad,
            CapacityDeferred(110),
            CapacityDeferred(108),
            json.dumps({"questions": [generated()]}),
        ]
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    with pytest.raises(RuntimeError, match="required schema") as caught:
        await generation.complete("Synthetic", {"requested_count": 1}, generation.QuestionBatch)
    assert not isinstance(caught.value, CapacityDeferred)
    result = await generation.complete(
        "Synthetic", {"requested_count": 1}, generation.QuestionBatch
    )
    assert len(result.questions) == 1
    assert [call.args[0] for call in calls.await_args_list] == [
        "google",
        "google",
        "groq",
        "google",
        "google",
        "groq",
    ]


async def test_all_provider_capacity_waits_still_defer_to_earliest_retry(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    calls = AsyncMock(
        side_effect=[
            CapacityDeferred(114),
            CapacityDeferred(80),
            CapacityDeferred(12),
            CapacityDeferred(90),
        ]
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    with pytest.raises(CapacityDeferred) as caught:
        await generation.complete("Synthetic", {}, generation.QuestionBatch)
    assert caught.value.seconds == 12
    assert calls.await_count == 4


def test_validation_diagnostics_exclude_inputs_and_unknown_model_keys():
    from pydantic import BaseModel, ConfigDict

    class SafeSchema(BaseModel):
        model_config = ConfigDict(extra="forbid")
        score: int

    with pytest.raises(ValidationError) as caught:
        SafeSchema.model_validate({"score": "private answer text", "private source text": "secret"})
    summary = generation.validation_summary(caught.value)
    assert summary == [
        {"path": ["score"], "type": "int_parsing"},
        {"path": ["unknown"], "type": "extra_forbidden"},
    ]
    assert "private" not in str(summary) and "secret" not in str(summary)


async def test_transport_validation_does_not_override_genuine_provider_wait(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    with pytest.raises(ValidationError) as failure:
        generation.WireBatch.model_validate({"questions": []})
    calls = AsyncMock(side_effect=[CapacityDeferred(19), CapacityDeferred(30), failure.value])
    monkeypatch.setattr(generation, "routing_completion", calls)
    with pytest.raises(CapacityDeferred) as caught:
        await generation.complete("Synthetic", {}, generation.WireBatch)
    assert caught.value.seconds == 19


async def test_capacity_retry_is_durable_and_not_published_before_deadline():
    from workers.quiz import schedule_quiz_retry

    queue = MagicMock()
    queue.enqueue_job = AsyncMock()
    queue.publish = AsyncMock()
    job = str(uuid4())
    await schedule_quiz_retry({"redis": queue}, job, 18)
    args = queue.enqueue_job.await_args
    assert args.args == ("generate_quiz_job", job)
    assert args.kwargs["_defer_by"] == 18
    assert args.kwargs["_job_id"].startswith(f"quiz:{job}:retry:")
    queue.publish.assert_not_called()


async def test_retry_queue_failure_leaves_database_reconciler_as_backup():
    from workers.quiz import schedule_quiz_retry

    queue = MagicMock()
    queue.enqueue_job = AsyncMock(side_effect=ConnectionError("synthetic"))
    await schedule_quiz_retry({"redis": queue}, str(uuid4()), 4)
    await schedule_quiz_retry({}, str(uuid4()), 4)


async def test_matrix_output_budget_covers_correction_metadata(monkeypatch):
    from app.engines.quiz_wire import WireBatch
    from tests.test_quiz_wire import matrix_sample

    calls = AsyncMock(return_value=json.dumps({"questions": [matrix_sample()]}))
    monkeypatch.setattr(generation, "routing_completion", calls)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    await generation.complete(
        "Synthetic", {"format": "statement_matrix", "requested_count": 1}, WireBatch
    )
    assert calls.await_args.kwargs["max_output_tokens"] == 1056
    assert calls.await_args.kwargs["constrained_json"] is True
    assert calls.await_args.kwargs["structured_schema"] is not None


async def test_provider_structured_rejection_retries_without_model_cooldown(monkeypatch):
    import httpx

    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    circuit = generation.ModelCircuits(threshold=1, cooldown=60)
    monkeypatch.setattr(generation, "circuits", circuit)
    response = httpx.Response(
        400,
        json={"error": {"code": "json_validate_failed", "message": "Synthetic truncation"}},
        request=httpx.Request("POST", "https://example.test"),
    )
    error = httpx.HTTPStatusError("Synthetic", request=response.request, response=response)
    calls = AsyncMock(side_effect=[error, json.dumps({"questions": [generated()]})])
    monkeypatch.setattr(generation, "routing_completion", calls)
    with pytest.raises(RuntimeError, match="required schema"):
        await generation.complete("Synthetic", {}, generation.QuestionBatch)
    result = await generation.complete("Synthetic", {}, generation.QuestionBatch)
    assert len(result.questions) == 1 and calls.await_count == 2


async def test_secondary_gemma_is_used_before_leaving_google(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    calls = AsyncMock(side_effect=[CapacityDeferred(120), json.dumps({"questions": [generated()]})])
    monkeypatch.setattr(generation, "routing_completion", calls)
    result = await generation.complete(
        "Synthetic", {"requested_count": 1}, generation.QuestionBatch
    )
    assert len(result.questions) == 1
    assert [(call.args[0], call.args[1]) for call in calls.await_args_list] == [
        ("google", settings.GEMINI_PRIMARY_MODEL),
        ("google", settings.GEMINI_SECONDARY_MODEL),
    ]


async def test_duplicate_configured_gemma_model_is_not_called_twice(monkeypatch):
    from app.engines.provider_capacity import CapacityDeferred

    monkeypatch.setattr(settings, "GEMINI_SECONDARY_MODEL", settings.GEMINI_PRIMARY_MODEL)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    calls = AsyncMock(side_effect=[CapacityDeferred(120), json.dumps({"questions": [generated()]})])
    monkeypatch.setattr(generation, "routing_completion", calls)
    await generation.complete("Synthetic", {}, generation.QuestionBatch)
    assert [call.args[0] for call in calls.await_args_list] == ["google", "groq"]


async def test_course_neutral_prompt_and_batches_cover_separated_sections(monkeypatch):
    candidate = generated()
    excerpts = [{"chunk_id": str(uuid4()), "excerpt": f"Synthetic section {i}"} for i in range(24)]
    seen = []

    async def provider(system, context, schema, *, validate):
        seen.append((system, context))
        return validate(wire_batch(candidate))

    monkeypatch.setattr(generation, "complete", provider)
    candidate["source_ids"] = [excerpts[0]["chunk_id"]]
    await generation.generate_batch(
        QuizConfig(course_code="HISTORY 101"), excerpts, [], 1, variation=0
    )
    candidate["source_ids"] = [excerpts[1]["chunk_id"]]
    await generation.generate_batch(
        QuizConfig(course_code="HISTORY 101"), excerpts, [], 1, variation=4
    )
    assert [r["text"] for r in seen[0][1]["excerpts"]] == [
        f"Synthetic section {i}" for i in (0, 6, 12, 18)
    ]
    assert [r["text"] for r in seen[1][1]["excerpts"]] == [
        f"Synthetic section {i}" for i in (1, 7, 13, 19)
    ]
    prompt = seen[0][0].lower()
    assert "pharmacology" not in prompt and "pharmacy" not in prompt
    assert "never assume a particular discipline" in prompt
    assert "changing wording or option order" in prompt


@pytest.mark.parametrize("marks,score", [(0, 0), (1, 0.5), (2, 1)])
async def test_provider_integer_marks_preserve_authoritative_score_contract(
    monkeypatch, marks, score
):
    question_id = uuid4()
    response = generation.WireWrittenGrades(
        grades=[
            {"question_id": question_id, "marks": marks, "feedback": "Synthetic rubric feedback"}
        ]
    )
    provider = AsyncMock(return_value=response)
    monkeypatch.setattr(generation, "complete", provider)
    result = await generation.grade_written([{"question_id": question_id}])
    assert result.grades[0].score == score and result.grades[0].question_id == question_id
    assert provider.await_args.args[2] is generation.WireWrittenGrades


@pytest.mark.parametrize("marks", [-1, 3, True, 0.5, "1"])
def test_provider_marks_reject_invalid_values(marks):
    with pytest.raises(ValidationError):
        generation.WireWrittenGrades.model_validate(
            {"grades": [{"question_id": uuid4(), "marks": marks, "feedback": "Synthetic feedback"}]}
        )


async def test_grading_output_reservation_scales_with_answer_count(monkeypatch):
    question_id = uuid4()
    calls = AsyncMock(
        return_value=json.dumps(
            {
                "grades": [
                    {"question_id": str(question_id), "marks": 2, "feedback": "Matches the rubric"}
                ]
            }
        )
    )
    monkeypatch.setattr(generation, "routing_completion", calls)
    monkeypatch.setattr(generation, "circuits", generation.ModelCircuits())
    await generation.complete("Synthetic", [{}] * 5, generation.WireWrittenGrades)
    assert calls.await_args.kwargs["max_output_tokens"] == 1056
