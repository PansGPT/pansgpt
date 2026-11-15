"""Private PDF transport, range responses and cleanup without exposing storage URLs."""

import io
import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import UserContext, get_current_user
from app.main import app
from app.routers import reader as api

DOC = "01900000-0000-7000-8000-000000000001"
UNI = uuid.UUID("01900000-0000-7000-8000-000000000002")
PDF = b"%PDF-synthetic-bytes"
PdfStore = tuple[MagicMock, MagicMock, MagicMock]


@pytest.fixture
def pdf_store(monkeypatch: pytest.MonkeyPatch) -> Iterator[PdfStore]:
    conn = MagicMock(
        fetchrow=AsyncMock(
            return_value={
                "storage_key": "original.pdf",
                "converted_key": "converted.pdf",
                "mime_type": "application/pdf",
            }
        )
    )
    client = MagicMock(get_object=AsyncMock())
    body = MagicMock()
    # Real aiobotocore returns the raw HTTP response from __aenter__, not the wrapper.
    body.__aenter__.return_value = object()

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    @asynccontextmanager
    async def storage() -> AsyncIterator[MagicMock]:
        try:
            yield client
        finally:
            client.closed()

    monkeypatch.setattr(api, "get_db_connection", database)
    monkeypatch.setattr(type(api.storage_engine), "is_configured", property(lambda _: True))
    monkeypatch.setattr(api.storage_engine, "get_client", storage)
    monkeypatch.setattr(api.storage_engine, "get_object_size", AsyncMock(return_value=len(PDF)))
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: UserContext(
        id=uuid.UUID("01900000-0000-7000-8000-000000000003"),
        email="reader@example.test",
        role="student",
        roles=["student"],
        university_id=UNI,
    )
    try:
        yield conn, client, body
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


@pytest.mark.parametrize(
    "header,expected,selected",
    [
        (None, PDF, None),
        ("bytes=0-3", b"%PDF", (0, 3)),
        ("bytes=5-", PDF[5:], (5, len(PDF) - 1)),
        ("bytes=-5", PDF[-5:], (len(PDF) - 5, len(PDF) - 1)),
        ("bytes=4-9999", PDF[4:], (4, len(PDF) - 1)),
    ],
)
def test_pdf_bytes_are_authorized_ranged_and_streamed_with_cleanup(
    pdf_store: PdfStore, header: str | None, expected: bytes, selected: tuple[int, int] | None
) -> None:
    conn, client, body = pdf_store
    buffer = io.BytesIO(expected)
    body.read = AsyncMock(side_effect=buffer.read)
    client.get_object.return_value = {
        "Body": body,
        "ContentLength": len(expected),
        "ContentRange": f"bytes {selected[0]}-{selected[1]}/{len(PDF)}" if selected else None,
    }
    response = TestClient(app).get(
        f"/api/v1/library/catalog/{DOC}/pdf",
        headers={"Range": header} if header else {},
    )
    assert response.status_code == (206 if selected else 200)
    assert response.content == expected
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["accept-ranges"] == "bytes"
    assert int(response.headers["content-length"]) == len(expected)
    assert "Content-Range" in response.headers["access-control-expose-headers"]
    sql, *values = conn.fetchrow.call_args.args
    assert (
        "university_id = $1" in sql
        and "deleted_at IS NULL" in sql
        and "status = 'active' OR $2" in sql
    )
    assert values == [UNI, False, uuid.UUID(DOC)]
    call = client.get_object.call_args.kwargs
    assert call["Key"] == "converted.pdf"
    if selected:
        assert call["Range"] == f"bytes={selected[0]}-{selected[1]}"
        assert response.headers["content-range"] == f"bytes {selected[0]}-{selected[1]}/{len(PDF)}"
    else:
        assert "Range" not in call
    body.__aexit__.assert_awaited_once()
    client.closed.assert_called_once()


@pytest.mark.parametrize(
    "header",
    [
        "bytes=999-",
        "bytes=9-2",
        "bytes=-0",
        "bytes=-",
        "bytes=0-1,4-5",
        "items=0-1",
        "bytes=" + "9" * 30 + "-",
    ],
)
def test_invalid_pdf_ranges_do_not_fetch_storage_bytes(pdf_store: PdfStore, header: str) -> None:
    _, client, _ = pdf_store
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/pdf", headers={"Range": header})
    assert response.status_code == 416
    assert response.headers["content-range"] == f"bytes */{len(PDF)}"
    client.get_object.assert_not_awaited()


@pytest.mark.parametrize(
    "case,status", [("foreign", 404), ("pending", 409), ("missing", 404), ("unavailable", 503)]
)
def test_pdf_access_failures_never_stream_or_leak_keys(
    pdf_store: PdfStore, monkeypatch: pytest.MonkeyPatch, case: str, status: int
) -> None:
    conn, client, _ = pdf_store
    if case == "foreign":
        conn.fetchrow.return_value = None
    if case == "pending":
        conn.fetchrow.return_value = {
            "storage_key": "source.pptx",
            "converted_key": None,
            "mime_type": "other",
        }
    if case == "missing":
        monkeypatch.setattr(api.storage_engine, "get_object_size", AsyncMock(return_value=None))
    if case == "unavailable":
        conn.fetchrow.side_effect = OSError("private signed URL and key")
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/pdf")
    assert response.status_code == status
    assert "signed" not in response.text and "source.pptx" not in response.text
    client.get_object.assert_not_awaited()


def test_upstream_failure_closes_client_before_sanitized_503(pdf_store: PdfStore) -> None:
    _, client, _ = pdf_store
    client.get_object.side_effect = OSError("secret storage details")
    response = TestClient(app).get(f"/api/v1/library/catalog/{DOC}/pdf")
    assert response.status_code == 503
    assert "secret" not in response.text
    client.closed.assert_called_once()
