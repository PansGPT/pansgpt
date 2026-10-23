"""Regression coverage for the remaining chat and approval gaps. [CHAT FIX 2]"""

import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.engines.rag import ABSENCE_NOTICE
from app.main import app
from app.models.library import DocumentPatchRequest
from app.routers import library
from tests.conftest import TenantTestState

DOC_ID = "018f3a30-0001-7000-8000-000000000001"


def test_absence_answer_is_saved_before_done(tenant_state: TenantTestState) -> None:
    tenant_state.retrieval.return_value = (
        "This topic was not found in your course materials.",
        [],
    )
    response = TestClient(app).post(
        f"/api/v1/ai/chat/sessions/{DOC_ID}/stream",
        json={"message": "unrelated topic"},
    )
    assert response.status_code == 200
    assert "event: done" in response.text
    inserts = [
        call
        for call in tenant_state.connection.execute.call_args_list
        if "'assistant'" in call.args[0]
    ]
    assert len(inserts) == 1
    assert inserts[0].args[4] == ABSENCE_NOTICE
    assert inserts[0].args[5] is None
    tenant_state.ai.assert_not_called()


@pytest.mark.parametrize("alias", ["confirm-upload", "complete"])
def test_pending_upload_waits_for_approval(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, alias: str
) -> None:
    tenant_state.user.update(role="lecturer", roles=["lecturer"])
    tenant_state.documents[uuid.UUID(DOC_ID)]["status"] = "pending_review"
    enqueue = AsyncMock(return_value="unit-job")
    monkeypatch.setattr(library, "enqueue_ingestion_job", enqueue)
    path = (
        f"/api/v1/library/{DOC_ID}/confirm-upload"
        if alias == "confirm-upload"
        else f"/api/v1/library/documents/{DOC_ID}/complete"
    )
    response = TestClient(app).post(path)
    assert response.status_code == 202
    assert response.json()["mode"] == "awaiting_approval"
    assert response.json()["job_id"] is None
    enqueue.assert_not_awaited()


def test_active_upload_is_still_queued(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    tenant_state.user.update(role="university_admin", roles=["university_admin"])
    enqueue = AsyncMock(return_value="queued-job")
    monkeypatch.setattr(library, "enqueue_ingestion_job", enqueue)
    response = TestClient(app).post(f"/api/v1/library/{DOC_ID}/confirm-upload")
    assert response.status_code == 202
    assert response.json()["job_id"] == "queued-job"
    enqueue.assert_awaited_once()


def test_queue_failure_is_not_reported_as_synchronous_processing(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    tenant_state.user.update(role="university_admin", roles=["university_admin"])
    enqueue = AsyncMock(return_value=None)
    monkeypatch.setattr(library, "enqueue_ingestion_job", enqueue)
    response = TestClient(app).post(f"/api/v1/library/{DOC_ID}/confirm-upload")
    assert response.status_code == 503
    assert "Retry confirmation" in response.json()["detail"]
    enqueue.assert_awaited_once()


@pytest.mark.parametrize("status", ["archived", "rejected"])
def test_non_active_upload_cannot_queue(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, status: str
) -> None:
    tenant_state.user.update(role="university_admin", roles=["university_admin"])
    tenant_state.documents[uuid.UUID(DOC_ID)]["status"] = status
    enqueue = AsyncMock(return_value="unit-job")
    monkeypatch.setattr(library, "enqueue_ingestion_job", enqueue)
    response = TestClient(app).post(f"/api/v1/library/{DOC_ID}/confirm-upload")
    assert response.status_code == 409
    enqueue.assert_not_awaited()


@pytest.mark.parametrize(
    "uploaded,embedding_status,queue_result,expected",
    [
        (True, "pending", "job-1", 200),
        (False, "pending", "job-1", 200),
        (True, "completed", "job-1", 200),
        (True, "pending", None, 503),
    ],
)
async def test_approval_dispatches_only_uploaded_pending_ingestion(
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    uploaded: bool,
    embedding_status: str,
    queue_result: str | None,
    expected: int,
) -> None:
    from fastapi import HTTPException

    tenant_state.user.update(role="university_admin", roles=["university_admin"])
    row = tenant_state.documents[uuid.UUID(DOC_ID)]
    row.update(status="pending_review", embedding_status=embedding_status)
    original_fetchrow = tenant_state.connection.fetchrow.side_effect

    async def fetchrow(sql: str, *args: object) -> dict[str, object] | None:
        if "UPDATE public.documents" in sql:
            assert "RETURNING id, storage_key, embedding_status" in sql
            row["status"] = "active"
            return row
        return await original_fetchrow(sql, *args)

    tenant_state.connection.fetchrow.side_effect = fetchrow
    head = AsyncMock(return_value=100 if uploaded else None)
    enqueue = AsyncMock(return_value=queue_result)
    monkeypatch.setattr(library.storage_engine, "get_object_size", head)
    monkeypatch.setattr(library, "enqueue_ingestion_job", enqueue)
    if expected == 503:
        with pytest.raises(HTTPException) as error:
            await library.update_document_metadata(
                DOC_ID, DocumentPatchRequest(status="active"), tenant_state.user
            )
        assert error.value.status_code == 503
        assert "Please retry approval" in error.value.detail
    else:
        await library.update_document_metadata(
            DOC_ID, DocumentPatchRequest(status="active"), tenant_state.user
        )
    if uploaded and embedding_status == "pending":
        enqueue.assert_awaited_once_with(DOC_ID, row["storage_key"])
    else:
        enqueue.assert_not_awaited()
    assert row["status"] == "active"


async def test_rls_never_uses_application_database(monkeypatch: pytest.MonkeyPatch) -> None:
    from tests import test_rls_security

    monkeypatch.delenv("RLS_TEST_DATABASE_URL", raising=False)
    connect = AsyncMock()
    monkeypatch.setattr(test_rls_security.asyncpg, "connect", connect)
    assert await test_rls_security._get_live_test_connection() is None
    connect.assert_not_awaited()


def test_default_suite_blocks_service_connections_and_model_loading() -> None:
    import socket

    from app.engines.reranker import CandidateReranker

    with socket.socket() as connection:
        with pytest.raises(OSError, match="Network disabled in unit tests"):
            connection.connect(("127.0.0.1", 6379))
    assert CandidateReranker()._get_flashrank_client() is None


async def test_windows_asyncio_socketpair_still_works() -> None:
    import asyncio

    await asyncio.sleep(0)
    assert asyncio.get_running_loop().is_running()


async def test_async_connections_are_blocked_before_native_windows_io() -> None:
    import asyncio
    import socket

    with pytest.raises(OSError, match="Network disabled in unit tests"):
        await asyncio.get_running_loop().create_connection(asyncio.Protocol, "127.0.0.1", 6379)
    with socket.socket() as connection:
        with pytest.raises(OSError, match="Network disabled in unit tests"):
            await asyncio.get_running_loop().sock_connect(connection, ("127.0.0.1", 6379))
    with pytest.raises(OSError, match="Network disabled in unit tests"):
        socket.getaddrinfo("example.invalid", 443)


def test_services_are_neutralized_before_singletons_load() -> None:
    from app.core.config import settings
    from app.engines.query_expansion import query_expansion_engine

    assert settings.DATABASE_URL == "offline-unit-test"
    assert not settings.UPSTASH_REDIS_URL
    assert not settings.REDIS_URL
    assert not settings.SENTRY_DSN
    assert query_expansion_engine.gemini_key == "test-mock-key"
    assert query_expansion_engine.groq_key == "test-mock-key"
