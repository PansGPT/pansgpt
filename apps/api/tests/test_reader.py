"""Reader contracts, geometry bounds and authoritative document scope."""

import json
import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import UserContext, get_current_user
from app.engines.tools import tool_engine
from app.main import app
from app.routers import reader as api

DOC = "01900000-0000-7000-8000-000000000001"
HIGHLIGHT = "01900000-0000-7000-8000-000000000004"
SESSION = "01900000-0000-7000-8000-000000000005"
UNI = uuid.UUID("01900000-0000-7000-8000-000000000002")
OWNER = uuid.UUID("01900000-0000-7000-8000-000000000003")
RECT = {"x": 0.1, "y": 0.2, "width": 0.4, "height": 0.05}
REQUEST = {
    "page_number": 2,
    "selected_text": "Synthetic passage",
    "color": "yellow",
    "rects": [RECT],
}


@pytest.fixture
def reader_store(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[UserContext, MagicMock]]:
    user = UserContext(
        id=OWNER, email="reader@example.test", role="student", roles=["student"], university_id=UNI
    )
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetchval = AsyncMock(return_value=None)
    conn.fetch = AsyncMock(return_value=[])

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    monkeypatch.setattr(api, "get_db_connection", database)
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        yield user, conn
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def document() -> dict[str, object]:
    return {
        "id": DOC,
        "title": "Synthetic monograph",
        "course_code": "PCL 401",
        "course_title": "Pharmacology",
        "topic": None,
        "lecturer_name": None,
        "page_count": 12,
        "file_size_bytes": 2000,
        "mime_type": "application/pdf",
        "status": "active",
        "embedding_status": "completed",
        "target_levels": ["400"],
        "academic_session": None,
        "semester": None,
        "created_at": "2026-11-11T00:00:00Z",
        "updated_at": "2026-11-11T00:00:00Z",
        "last_opened_at": "2026-11-11T00:00:00Z",
        "last_page_read": 4,
    }


def test_reader_restores_owned_page_but_always_starts_an_empty_chat(reader_store):
    _, conn = reader_store
    conn.fetchrow.return_value = document()
    conn.fetchval.return_value = SESSION
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/reader")
    assert response.status_code == 200, response.text
    assert response.json() == {"document": document(), "chat_session_id": None}
    assert response.headers["cache-control"] == "private, no-store"
    query, *values = conn.fetchrow.call_args.args
    assert "p.user_id=$4" in query and "university_id = $1" in query
    assert "deleted_at IS NULL" in query and "status = 'active' OR $2" in query
    assert values == [UNI, False, uuid.UUID(DOC), OWNER]
    conn.fetchval.assert_not_awaited()


def test_reader_history_is_document_owner_scoped_and_paginated(reader_store):
    _, conn = reader_store
    conn.fetchval.return_value = uuid.UUID(DOC)
    item = {
        "id": SESSION,
        "user_id": str(OWNER),
        "document_id": DOC,
        "title": "Synthetic study chat",
        "summary": None,
        "created_at": "2026-11-14T00:00:00Z",
        "updated_at": "2026-11-14T00:00:00Z",
        "is_pinned": False,
        "archived_at": None,
        "title_source": "generated",
        "last_message_at": "2026-11-14T00:00:00Z",
    }
    conn.fetch.return_value = [item, {**item, "id": str(uuid.uuid4())}]
    response = TestClient(app).get(
        f"/api/v1/library/catalog/{DOC}/conversations?limit=1&user_id={uuid.uuid4()}"
    )
    assert response.status_code == 200
    assert response.json() == {"sessions": [item], "next_offset": 1}
    assert response.headers["cache-control"] == "private, no-store"
    sql, *values = conn.fetchval.call_args.args
    assert "university_id = $1" in sql and "deleted_at IS NULL" in sql
    assert values == [UNI, False, uuid.UUID(DOC)]
    sql, *values = conn.fetch.call_args.args
    assert "user_id=$1 AND document_id=$2" in sql
    assert "deleted_at IS NULL AND archived_at IS NULL" in sql
    assert "coalesce(last_message_at,created_at)" in sql
    assert values == [OWNER, uuid.UUID(DOC), 2, 0]


def test_reader_history_foreign_document_never_loads_sessions(reader_store):
    _, conn = reader_store
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/conversations")
    assert response.status_code == 404
    conn.fetch.assert_not_awaited()


def test_reader_history_search_is_document_scoped_and_reads_only_visible_message_content(
    reader_store,
):
    _, conn = reader_store
    conn.fetchval.return_value = uuid.UUID(DOC)
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/conversations?q=Synthetic")
    assert response.status_code == 200
    sql, *values = conn.fetch.call_args.args
    assert "user_id=$1 AND document_id=$2" in sql
    assert "m.session_id=chat_sessions.id" in sql and "m.is_active_branch" in sql
    assert "lower(m.content)" in sql and "thinking_text" not in sql
    assert values == [OWNER, uuid.UUID(DOC), 31, 0, "Synthetic"]


@pytest.mark.parametrize("query", ["x", " ", "x" * 201])
def test_reader_history_search_rejects_invalid_queries(reader_store, query):
    _, conn = reader_store
    response = TestClient(app).get(
        f"/api/v1/library/catalog/{DOC}/conversations", params={"q": query}
    )
    assert response.status_code == 422
    conn.fetch.assert_not_awaited()


@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "offset=100001"])
def test_reader_history_rejects_unbounded_pagination(reader_store, query):
    _, conn = reader_store
    assert (
        TestClient(app).get(f"/api/v1/library/catalog/{DOC}/conversations?{query}").status_code
        == 422
    )
    conn.fetch.assert_not_awaited()


def test_reader_history_outage_is_not_a_fake_empty_list(reader_store):
    _, conn = reader_store
    conn.fetchval.side_effect = OSError("private connection details")
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/conversations")
    assert response.status_code == 503
    assert "private connection" not in response.text


@pytest.mark.parametrize("path", ["reader", "highlights"])
def test_foreign_deleted_or_inaccessible_document_is_not_empty_success(reader_store, path):
    _, conn = reader_store
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/{path}")
    assert response.status_code == 404
    conn.fetch.assert_not_awaited()


def test_progress_upsert_validates_page_in_the_authorized_document(reader_store):
    _, conn = reader_store
    conn.fetchrow.return_value = {
        "document_id": DOC,
        "last_opened_at": "2026-11-11T00:00:00Z",
        "last_page_read": 3,
        "total_pages": 12,
    }
    response = TestClient(app).patch(f"/api/v1/library/catalog/{DOC}/progress", json={"page": 3})
    assert response.status_code == 200
    sql, *values = conn.fetchrow.call_args.args
    assert "university_id = $1" in sql and "$5<=GREATEST(page_count,1)" in sql
    assert "last_page_read=EXCLUDED.last_page_read" in sql
    assert values == [UNI, False, uuid.UUID(DOC), OWNER, 3]


@pytest.mark.parametrize(
    "payload",
    [
        {"page": 0},
        {"page": -1},
        {"page": 1.2},
        {"page": True},
        {"page": "3"},
        {"page": 2, "user_id": str(OWNER)},
    ],
)
def test_invalid_progress_never_reaches_storage(reader_store, payload):
    _, conn = reader_store
    assert (
        TestClient(app).patch(f"/api/v1/library/catalog/{DOC}/progress", json=payload).status_code
        == 422
    )
    conn.fetchrow.assert_not_awaited()


@pytest.mark.parametrize("exists,status", [(None, 404), (12, 422)])
def test_out_of_range_progress_distinguishes_missing_document(reader_store, exists, status):
    _, conn = reader_store
    conn.fetchval.return_value = exists
    assert (
        TestClient(app)
        .patch(f"/api/v1/library/catalog/{DOC}/progress", json={"page": 99})
        .status_code
        == status
    )


def test_highlight_creation_preserves_fractional_geometry_and_derives_owner(reader_store):
    _, conn = reader_store
    row = {**REQUEST, "id": HIGHLIGHT, "document_id": DOC, "created_at": "2026-11-11T00:00:00Z"}
    conn.fetchrow.return_value = {**row, "rects": json.dumps([RECT])}
    response = TestClient(app).post(f"/api/v1/library/catalog/{DOC}/highlights", json=REQUEST)
    assert response.status_code == 201, response.text
    assert response.json() == row
    sql, *values = conn.fetchrow.call_args.args
    assert "$5<=GREATEST(page_count,1)" in sql and "university_id = $1" in sql
    assert values[:5] == [UNI, False, uuid.UUID(DOC), OWNER, 2]
    assert json.loads(values[-1]) == [RECT]


@pytest.mark.parametrize(
    "change",
    [
        {"page_number": True},
        {"page_number": 0},
        {"selected_text": " "},
        {"selected_text": "x" * 6001},
        {"user_id": str(OWNER)},
        {"color": "purple"},
        {"rects": []},
        {"rects": [RECT] * 101},
        {"rects": [{**RECT, "x": -0.1}]},
        {"rects": [{**RECT, "width": 0}]},
        {"rects": [{**RECT, "x": 0.9}]},
        {"rects": [{**RECT, "y": 0.99}]},
    ],
)
def test_invalid_highlights_never_reach_storage(reader_store, change):
    _, conn = reader_store
    response = TestClient(app).post(
        f"/api/v1/library/catalog/{DOC}/highlights", json={**REQUEST, **change}
    )
    assert response.status_code == 422, response.text
    conn.fetchrow.assert_not_awaited()


def test_highlight_pagination_is_owner_and_university_scoped(reader_store):
    _, conn = reader_store
    conn.fetchval.return_value = uuid.UUID(DOC)
    item = {**REQUEST, "id": HIGHLIGHT, "document_id": DOC, "created_at": "2026-11-11T00:00:00Z"}
    conn.fetch.return_value = [item, item]
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/highlights?limit=1&offset=3")
    assert response.status_code == 200, response.text
    assert response.json() == {"items": [item], "next_offset": 4}
    sql, *values = conn.fetch.call_args.args
    assert "user_id=$1 AND document_id=$2" in sql and "university_id=$3" in sql
    assert values == [OWNER, uuid.UUID(DOC), UNI, False, 2, 3]


def test_highlight_deletion_is_never_by_identifier_alone(reader_store):
    _, conn = reader_store
    conn.fetchval.return_value = uuid.UUID(HIGHLIGHT)
    response = TestClient(app).delete(f"/api/v1/library/catalog/{DOC}/highlights/{HIGHLIGHT}")
    assert response.status_code == 204
    sql, *values = conn.fetchval.call_args.args
    assert "document_id=$2 AND user_id=$3" in sql and "university_id=$4" in sql
    assert values == [uuid.UUID(HIGHLIGHT), uuid.UUID(DOC), OWNER, UNI, False]
    conn.fetchval.return_value = None
    assert (
        TestClient(app).delete(f"/api/v1/library/catalog/{DOC}/highlights/{HIGHLIGHT}").status_code
        == 404
    )


def test_reader_outage_does_not_expose_storage_details(reader_store):
    _, conn = reader_store
    conn.fetchrow.side_effect = OSError("private connection string")
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/reader")
    assert response.status_code == 503
    assert "private connection string" not in response.text


@pytest.mark.parametrize(
    "path,method,payload",
    [("reader", "GET", None), ("progress", "PATCH", {"page": 1}), ("highlights", "POST", REQUEST)],
)
def test_reader_requires_university(reader_store, path, method, payload):
    user, conn = reader_store
    user["university_id"] = None
    response = TestClient(app).request(
        method, f"/api/v1/library/catalog/{DOC}/{path}", json=payload
    )
    assert response.status_code == 403
    conn.fetchrow.assert_not_awaited()


async def test_reader_tools_cannot_escape_the_document(monkeypatch):
    search = AsyncMock(return_value={"found_chunks": 1})
    read = AsyncMock(return_value={"text": "Synthetic document"})
    web = AsyncMock()
    monkeypatch.setattr(tool_engine, "execute_rag_search", search)
    monkeypatch.setattr(tool_engine, "execute_read_document", read)
    monkeypatch.setattr(tool_engine, "execute_web_search", web)
    forged = {
        "query": "Synthetic question",
        "document_id": str(uuid.uuid4()),
        "course_code": "OTHER",
    }
    await tool_engine.dispatch_tool("rag_search", forged, university_id=str(UNI), document_id=DOC)
    assert search.call_args.kwargs["document_id"] == DOC
    assert search.call_args.kwargs["course_code"] is None
    await tool_engine.dispatch_tool(
        "read_document", forged, university_id=str(UNI), document_id=DOC
    )
    assert read.call_args.kwargs["document_id"] == DOC
    result = await tool_engine.dispatch_tool("web_search", forged, document_id=DOC)
    assert result["status"] == "error"
    web.assert_not_awaited()


async def test_bound_chat_inherits_document_when_client_omits_it(tenant_state, client):
    session_id = next(iter(tenant_state.sessions))
    document_id = next(iter(tenant_state.documents))
    tenant_state.sessions[session_id]["document_id"] = document_id
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json={"message": "Explain the synthetic passage", "enable_rag": False},
    )
    assert response.status_code == 200, response.text
    assert tenant_state.retrieval.call_args.kwargs["document_id"] == str(document_id)
    assert tenant_state.retrieval.call_args.kwargs["allow_web_search"] is False
    assert tenant_state.ai.call_args.kwargs["document_id"] == str(document_id)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json={"message": "Change document", "document_id": str(uuid.uuid4())},
    )
    assert response.status_code == 422, response.text
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json={"message": "Use an unavailable attachment", "attachment_ids": [str(uuid.uuid4())]},
    )
    assert response.status_code == 404, response.text
