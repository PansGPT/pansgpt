"""Retry exhaustion and mixed failures use real isolated PostgreSQL state."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.engines import quiz_service as service
from app.engines.provider_capacity import CapacityDeferred
from app.engines.quiz_retry import retry_job
from app.models.quiz import CreateQuiz
from tests.test_quiz_database import quiz_database as quiz_database
from tests.test_quiz_database import ready
from workers import quiz as worker

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.mark.parametrize("waits,seconds", [(7, 17), (0, 3600)])
async def test_waits_stop_without_losing_progress_and_explicit_retry_resets_budget(
    quiz_database, monkeypatch, waits, seconds
):
    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    import app.engines.quiz_retry as retry

    monkeypatch.setattr(retry, "database", service.database)
    job = await ready(conn, user)
    await conn.execute(
        "DELETE FROM quiz_questions WHERE quiz_id=$1 AND question_order>2", job.quiz_id
    )
    await conn.execute(
        "UPDATE quiz_generation_jobs SET status='queued', attempts=0, lease_until=NULL, request_payload=jsonb_set(request_payload,'{capacity_waits}',to_jsonb($2::int)) WHERE id=$1",
        job.id,
        waits,
    )
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": uuid4(),
                    "document_id": document,
                    "title": "Synthetic",
                    "page": 1,
                    "excerpt": "Synthetic teaching evidence.",
                }
            ]
        ),
    )
    monkeypatch.setattr(worker, "generate_batch", AsyncMock(side_effect=CapacityDeferred(seconds)))
    redis = AsyncMock()
    await worker.generate_quiz_job({"redis": redis}, str(job.id))
    view = await service.get_job(job.id, user)
    assert view.status == "failed" and view.generated_count == 2 and not view.can_start
    redis.enqueue_job.assert_not_awaited()
    await worker.generate_quiz_job({"redis": redis}, str(job.id))
    assert worker.generate_batch.await_count == 1
    resumed = await retry_job(job.id, user)
    assert resumed.status == "queued" and resumed.generated_count == 2
    assert (
        await conn.fetchval(
            "SELECT request_payload->>'capacity_waits' FROM quiz_generation_jobs WHERE id=$1",
            job.id,
        )
        is None
    )


async def test_rejected_sibling_with_capacity_wait_cannot_refund_failed_attempts(
    quiz_database, monkeypatch
):
    conn, user, document = quiz_database
    monkeypatch.setattr(worker, "database", service.database)
    monkeypatch.setattr(
        worker,
        "retrieve_sources",
        AsyncMock(
            return_value=[
                {
                    "chunk_id": uuid4(),
                    "document_id": document,
                    "title": "Synthetic",
                    "page": 1,
                    "excerpt": "Synthetic teaching evidence.",
                }
            ]
        ),
    )
    calls = []

    async def batch(config, excerpts, existing, count, level, variation):
        calls.append(count)
        if len(calls) % 2 == 0:
            raise CapacityDeferred(60)
        return []

    monkeypatch.setattr(worker, "generate_batch", batch)
    job = await service.create_job(
        CreateQuiz(course_code="PCL 401", count=10, request_key=uuid4()), user
    )
    for _ in range(3):
        await worker.generate_quiz_job({}, str(job.id))
    view = await service.get_job(job.id, user)
    assert view.status == "failed" and view.generated_count == 0
    assert await conn.fetchval("SELECT attempts FROM quiz_generation_jobs WHERE id=$1", job.id) == 3
    assert calls[:6] == [5, 5, 2, 2, 1, 1]
    before = len(calls)
    await worker.generate_quiz_job({}, str(job.id))
    assert len(calls) == before
