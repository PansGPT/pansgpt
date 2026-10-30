"""Library HTTP contracts: bounded queries, owner context and real PDF access."""

import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import UserContext, get_current_user
from app.main import app
from app.routers import library_catalog as api

DOC = "01900000-0000-7000-8000-000000000001"
UNI = uuid.UUID("01900000-0000-7000-8000-000000000002")
OWNER = uuid.UUID("01900000-0000-7000-8000-000000000003")


@pytest.fixture
def catalog_state(monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[UserContext, MagicMock]]:
    user = UserContext(
        id=OWNER, email="catalog@example.test", role="student", roles=["student"], university_id=UNI
    )
    conn = MagicMock()
    conn.fetchval = AsyncMock(return_value=0)
    conn.fetch = AsyncMock(return_value=[])
    conn.fetchrow = AsyncMock(return_value=None)

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    monkeypatch.setattr(api, "get_db_connection", database)
    monkeypatch.setattr(api.storage_engine, "get_object_size", AsyncMock(return_value=1000))
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        yield user, conn
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_catalog_filters_before_pagination_and_binds_identity(
    catalog_state: tuple[UserContext, MagicMock],
) -> None:
    user, conn = catalog_state
    response = TestClient(app).get(
        "/api/v1/library/catalog",
        params={
            "q": "100%_notes",
            "course_code": "PCL 401",
            "academic_session": "2025/2026",
            "semester": "first",
            "collection": "recent",
            "offset": 48,
            "limit": 24,
            "university_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    assert response.json() == {
        "items": [],
        "total": 0,
        "offset": 48,
        "limit": 24,
        "courses": [],
        "academic_sessions": [],
    }
    args = conn.fetchval.call_args.args
    assert args[1:] == (
        UNI,
        False,
        r"%100\%\_notes%",
        "PCL 401",
        "2025/2026",
        "first",
        user.id,
        "recent",
    )
    query = conn.fetch.call_args_list[0].args
    assert query[-2:] == (24, 48)
    assert "p.user_id = $7" in query[0]
    assert "last_opened_at IS NOT NULL" in query[0]
    assert "status = 'active' OR $2" in query[0]
    assert "deleted_at IS NULL" in query[0]
    assert "LIMIT $9 OFFSET $10" in query[0]
    assert "last_opened_at DESC" in query[0]
    assert conn.transaction.call_args.kwargs == {"isolation": "repeatable_read", "readonly": True}
    # Course/session facets cannot expose a different university or another student's history.
    assert conn.fetch.call_args_list[1].args[1:] == (UNI, False, "2025/2026", "first")
    assert conn.fetch.call_args_list[2].args[1:] == (UNI, False)


@pytest.mark.parametrize(
    "role,review",
    [("student", False), ("lecturer", True), ("university_admin", True), ("super_admin", True)],
)
def test_catalog_role_scope(
    catalog_state: tuple[UserContext, MagicMock], role: str, review: bool
) -> None:
    user, conn = catalog_state
    user["role"] = role
    user["roles"] = [role]
    assert TestClient(app).get("/api/v1/library/catalog").status_code == 200
    assert conn.fetchval.call_args.args[1:3] == (UNI, review)


@pytest.mark.parametrize(
    "query",
    [
        "limit=0",
        "limit=61",
        "offset=-1",
        "semester=third",
        "sort=title;DROP TABLE documents",
        "collection=starred",
        "q=" + "x" * 201,
    ],
)
def test_invalid_catalog_queries_do_not_reach_database(
    catalog_state: tuple[UserContext, MagicMock], query: str
) -> None:
    _, conn = catalog_state
    assert TestClient(app).get("/api/v1/library/catalog?" + query).status_code == 422
    conn.fetch.assert_not_called()


def test_missing_university_rejected(catalog_state: tuple[UserContext, MagicMock]) -> None:
    user, conn = catalog_state
    user["university_id"] = None
    assert TestClient(app).get("/api/v1/library/catalog").status_code == 403
    conn.fetch.assert_not_called()


def test_catalog_outage_is_not_empty_success(catalog_state: tuple[UserContext, MagicMock]) -> None:
    _, conn = catalog_state
    conn.fetchval.side_effect = TimeoutError("private connection detail")
    response = TestClient(app).get("/api/v1/library/catalog")
    assert response.status_code == 503
    assert "private connection detail" not in response.text
    assert "items" not in response.json()


def test_catalog_dto_excludes_storage_and_processing_fields(
    catalog_state: tuple[UserContext, MagicMock],
) -> None:
    _, conn = catalog_state
    row = dict(
        id=DOC,
        title="Synthetic material",
        course_code="PCL 401",
        course_title="Clinical Pharmacy",
        topic=None,
        lecturer_name=None,
        page_count=12,
        file_size_bytes=2000,
        mime_type="application/pdf",
        status="active",
        embedding_status="completed",
        target_levels=["400"],
        academic_session=None,
        semester=None,
        created_at="2026-10-26T00:00:00+00:00",
        updated_at="2026-10-26T00:00:00+00:00",
        last_opened_at=None,
        last_page_read=None,
    )
    conn.fetch.side_effect = [
        [row],
        [{"code": "PCL 401", "title": "Clinical Pharmacy", "document_count": 1}],
        [],
    ]
    conn.fetchval.return_value = 1
    response = TestClient(app).get("/api/v1/library/catalog")
    assert response.status_code == 200
    assert response.json()["items"] == [row]
    assert "storage_key" not in conn.fetch.call_args_list[0].args[0]
    assert "embedding_progress" not in conn.fetch.call_args_list[0].args[0]


@pytest.mark.parametrize(
    "converted,mime,key",
    [
        (None, "application/pdf", "original.pdf"),
        ("converted.pdf", "application/vnd.ms-powerpoint", "converted.pdf"),
    ],
)
def test_pdf_link_is_real_scoped_and_private(
    catalog_state: tuple[UserContext, MagicMock],
    monkeypatch: pytest.MonkeyPatch,
    converted: str | None,
    mime: str,
    key: str,
) -> None:
    _, conn = catalog_state
    conn.fetchrow.return_value = {
        "storage_key": "original.pdf",
        "converted_key": converted,
        "mime_type": mime,
    }
    signer = AsyncMock(return_value="https://files.example.test/owned.pdf?signature=synthetic")
    monkeypatch.setattr(type(api.storage_engine), "is_configured", property(lambda _: True))
    monkeypatch.setattr(api.storage_engine, "generate_presigned_get_url", signer)
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/pdf-url")
    assert response.status_code == 200
    assert response.json()["expires_in_seconds"] == 900
    assert response.headers["cache-control"] == "private, no-store"
    signer.assert_awaited_once_with(key, expires_in=900)
    assert conn.fetchrow.call_args.args[1:] == (UNI, False, uuid.UUID(DOC))


@pytest.mark.parametrize(
    "case,expected",
    [
        ("foreign-or-deleted", 404),
        ("conversion-pending", 409),
        ("unconfigured", 503),
        ("signing-failed", 503),
        ("unsafe-link", 503),
        ("missing-object", 404),
    ],
)
def test_pdf_link_failures_never_return_fake_urls(
    catalog_state: tuple[UserContext, MagicMock],
    monkeypatch: pytest.MonkeyPatch,
    case: str,
    expected: int,
) -> None:
    _, conn = catalog_state
    conn.fetchrow.return_value = (
        None
        if case == "foreign-or-deleted"
        else {
            "storage_key": "source.pptx",
            "converted_key": None if case == "conversion-pending" else "converted.pdf",
            "mime_type": "application/vnd.ms-powerpoint",
        }
    )
    monkeypatch.setattr(
        type(api.storage_engine), "is_configured", property(lambda _: case != "unconfigured")
    )
    signer = AsyncMock(
        side_effect=OSError("private") if case == "signing-failed" else None,
        return_value="javascript:bad"
        if case == "unsafe-link"
        else "https://files.example.test/file",
    )
    monkeypatch.setattr(api.storage_engine, "generate_presigned_get_url", signer)
    if case == "missing-object":
        monkeypatch.setattr(api.storage_engine, "get_object_size", AsyncMock(return_value=None))
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/pdf-url")
    assert response.status_code == expected
    assert "presigned_url" not in response.json()
    assert "private" not in response.text
    if case in {"foreign-or-deleted", "conversion-pending", "unconfigured", "missing-object"}:
        signer.assert_not_awaited()


def test_record_opened_binds_owner_and_preserves_reading_position(
    catalog_state: tuple[UserContext, MagicMock],
) -> None:
    _, conn = catalog_state
    conn.fetchrow.return_value = {
        "document_id": DOC,
        "last_opened_at": "2026-10-26T12:00:00Z",
        "last_page_read": 7,
        "total_pages": 16,
    }
    response = TestClient(app).post(
        f"/api/v1/library/catalog/{DOC}/opened",
        json={"user_id": str(uuid.uuid4()), "last_page_read": 1},
    )
    assert response.status_code == 200
    assert response.json()["last_page_read"] == 7
    assert response.headers["cache-control"] == "private, no-store"
    sql, *args = conn.fetchrow.call_args.args
    assert args == [UNI, False, uuid.UUID(DOC), OWNER]
    assert "DO UPDATE SET updated_at = now()" in sql
    assert "DO UPDATE SET last_page_read" not in sql


def test_record_opened_rejects_inaccessible_document(
    catalog_state: tuple[UserContext, MagicMock],
) -> None:
    _, conn = catalog_state
    assert TestClient(app).post(f"/api/v1/library/catalog/{DOC}/opened").status_code == 404
    assert "university_id = $1" in conn.fetchrow.call_args.args[0]
