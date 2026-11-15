"""Legacy snip actions retain server-owned pixels, provenance and document scope."""

import io
import json
import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pymupdf
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from app.core.dependencies import UserContext, get_current_user
from app.engines import reader_snips as engine
from app.main import app
from app.models.reader import ReaderSnipOrigin, ReaderSnipRequest
from app.routers import chat_interactions as api

DOC = "01900000-0000-7000-8000-000000000001"
SESSION = "01900000-0000-7000-8000-000000000002"
OWNER = uuid.UUID("01900000-0000-7000-8000-000000000003")
UNI = uuid.UUID("01900000-0000-7000-8000-000000000004")
PAYLOAD = {
    "document_id": DOC,
    "page_number": 2,
    "rect": {"x": 0.1, "y": 0.2, "width": 0.4, "height": 0.3},
}
URL = f"/api/v1/ai/chat/sessions/{SESSION}/document-snip"


@pytest.fixture
def snip_store(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[tuple[MagicMock, AsyncMock, UserContext]]:
    user = UserContext(
        id=OWNER, email="snips@example.test", role="student", roles=["student"], university_id=UNI
    )
    conn = MagicMock()
    conn.fetchrow = AsyncMock(
        return_value={
            "storage_key": "source.pptx",
            "converted_key": "owned.pdf",
            "mime_type": "other",
            "page_count": 7,
        }
    )
    conn.fetchval = AsyncMock(return_value=0)
    conn.execute = AsyncMock()
    conn.fetch = AsyncMock(return_value=[])

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    renderer = AsyncMock(return_value=b"synthetic-server-rendered-png")
    monkeypatch.setattr(api, "get_db_connection", database)
    monkeypatch.setattr(engine, "get_db_connection", database)
    monkeypatch.setattr(api, "require_owned_session", AsyncMock(return_value=DOC))
    monkeypatch.setattr(api, "check_document_scope", AsyncMock())
    monkeypatch.setattr(api, "document_snip", renderer)
    monkeypatch.setattr(api.storage_engine, "upload_bytes", AsyncMock())
    monkeypatch.setattr(api.storage_engine, "delete_object", AsyncMock())
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        yield conn, renderer, user
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)


def test_snip_is_rendered_from_authorized_pdf_and_saved_with_server_only_origin(
    snip_store: tuple[MagicMock, AsyncMock, UserContext],
) -> None:
    conn, renderer, _ = snip_store
    response = TestClient(app).post(URL, json=PAYLOAD)
    assert response.status_code == 201, response.text
    renderer.assert_awaited_once_with("owned.pdf", ReaderSnipRequest.model_validate(PAYLOAD))
    sql, *values = conn.fetchrow.call_args.args
    assert "university_id = $1" in sql and "deleted_at IS NULL" in sql
    assert values == [UNI, False, uuid.UUID(DOC)]
    insert = conn.execute.call_args.args
    assert insert[2:4] == (uuid.UUID(SESSION), OWNER)
    assert insert[4] == f"chat/{UNI}/{OWNER}/{SESSION}/{response.json()['id']}"
    assert insert[6] == "image/png"
    assert json.loads(insert[8]) == {**PAYLOAD, "source": "reader_snip_v1"}
    api.storage_engine.upload_bytes.assert_awaited_once_with(
        insert[4], b"synthetic-server-rendered-png", "image/png"
    )
    assert "source" not in response.json() and "object_key" not in response.json()


@pytest.mark.parametrize(
    "changes",
    [
        {"page_number": 0},
        {"document_id": "x" * 36},
        {"image": "data:image/png;base64,untrusted"},
        {"rect": {"x": 0.9, "y": 0, "width": 0.2, "height": 1}},
        {"rect": {"x": 0, "y": 0, "width": 0, "height": 1}},
    ],
)
def test_snip_payload_does_not_accept_image_urls_pixels_or_invalid_geometry(
    snip_store: tuple[MagicMock, AsyncMock, UserContext], changes: dict[str, object]
) -> None:
    conn, renderer, _ = snip_store
    assert TestClient(app).post(URL, json={**PAYLOAD, **changes}).status_code == 422
    conn.fetchrow.assert_not_awaited()
    renderer.assert_not_awaited()


@pytest.mark.parametrize("bound", [None, str(uuid.uuid4())])
def test_general_or_different_document_chat_cannot_create_snip(
    snip_store: tuple[MagicMock, AsyncMock, UserContext],
    monkeypatch: pytest.MonkeyPatch,
    bound: str | None,
) -> None:
    _, renderer, _ = snip_store
    monkeypatch.setattr(api, "require_owned_session", AsyncMock(return_value=bound))
    assert TestClient(app).post(URL, json=PAYLOAD).status_code == 422
    renderer.assert_not_awaited()


@pytest.mark.parametrize(
    "case,status",
    [("foreign", 404), ("page", 422), ("quota", 429), ("render", 422), ("storage", 503)],
)
def test_snip_failures_are_visible_without_uploading_fake_images(
    snip_store: tuple[MagicMock, AsyncMock, UserContext], case: str, status: int
) -> None:
    conn, renderer, _ = snip_store
    if case == "foreign":
        conn.fetchrow.return_value = None
    if case == "page":
        conn.fetchrow.return_value["page_count"] = 1
    if case == "quota":
        conn.fetchval.return_value = 30
    if case == "render":
        renderer.side_effect = ValueError("private render details")
    if case == "storage":
        renderer.side_effect = OSError("private storage details")
    response = TestClient(app).post(URL, json=PAYLOAD)
    assert response.status_code == status
    assert "private" not in response.text
    api.storage_engine.upload_bytes.assert_not_awaited()


def test_bound_chat_general_upload_cannot_forge_image_provenance(
    snip_store: tuple[MagicMock, AsyncMock, UserContext],
) -> None:
    response = TestClient(app).post(
        f"/api/v1/ai/chat/sessions/{SESSION}/attachments",
        files={"file": ("fake.png", b"fake", "image/png")},
    )
    assert response.status_code == 422
    api.storage_engine.upload_bytes.assert_not_awaited()


def test_snip_commit_failure_removes_uploaded_object(
    snip_store: tuple[MagicMock, AsyncMock, UserContext],
) -> None:
    conn, _, _ = snip_store
    conn.execute.side_effect = [None, OSError("commit failed")]
    with pytest.raises(OSError):
        TestClient(app).post(URL, json=PAYLOAD)
    api.storage_engine.delete_object.assert_awaited_once()


@pytest.mark.parametrize(
    "row",
    [
        {"content_type": "image/png", "extracted_text": ""},
        {
            "content_type": "text/plain",
            "extracted_text": json.dumps({**PAYLOAD, "source": "reader_snip_v1"}),
        },
        {
            "content_type": "image/png",
            "extracted_text": json.dumps(
                {**PAYLOAD, "document_id": str(uuid.uuid4()), "source": "reader_snip_v1"}
            ),
        },
        {"content_type": "image/png", "extracted_text": json.dumps(PAYLOAD)},
    ],
)
def test_only_server_marked_same_document_image_is_allowed(row: dict[str, object]) -> None:
    with pytest.raises(HTTPException) as failure:
        engine.validate_snip_origins([row], DOC)
    assert failure.value.status_code == 422


async def test_snip_id_resolution_is_session_and_owner_bound(
    snip_store: tuple[MagicMock, AsyncMock, UserContext],
) -> None:
    conn, _, user = snip_store
    attachment = str(uuid.uuid4())
    conn.fetch.return_value = [
        {
            "content_type": "image/png",
            "extracted_text": ReaderSnipOrigin(
                **PAYLOAD, source="reader_snip_v1"
            ).model_dump_json(),
        }
    ]
    await engine.require_reader_attachments(SESSION, DOC, [attachment], user)
    query, *values = conn.fetch.call_args.args
    assert "session_id=$1 AND user_id=$2" in query
    assert values == [uuid.UUID(SESSION), OWNER, [uuid.UUID(attachment)]]
    conn.fetch.return_value = []
    with pytest.raises(HTTPException):
        await engine.require_reader_attachments(SESSION, DOC, [attachment], user)


@pytest.mark.parametrize(
    "rotation,rect",
    [
        (0, {"x": 0, "y": 0, "width": 0.5, "height": 1}),
        (90, {"x": 0, "y": 0, "width": 1, "height": 0.5}),
    ],
)
def test_renderer_crops_displayed_page_coordinates_including_rotation(
    tmp_path: Path, rotation: int, rect: dict[str, float]
) -> None:
    source, target = tmp_path / "source.pdf", tmp_path / "snip.png"
    with pymupdf.open() as pdf:
        page = pdf.new_page(width=200, height=100)
        page.draw_rect(pymupdf.Rect(0, 0, 100, 100), fill=(1, 0, 0), color=(1, 0, 0))
        page.draw_rect(pymupdf.Rect(100, 0, 200, 100), fill=(0, 0, 1), color=(0, 0, 1))
        page.set_rotation(rotation)
        pdf.save(source)
    engine.render(source, target, ReaderSnipRequest(document_id=DOC, page_number=1, rect=rect))
    with Image.open(target) as image:
        assert image.getpixel((image.width // 2, image.height // 2)) == (255, 0, 0)


async def test_real_subprocess_produces_png_without_external_inference(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = Path(__file__).resolve().parents[2] / "web/tests/chat/fixtures/synthetic-reader.pdf"
    monkeypatch.setattr(
        api.storage_engine, "download_bytes", AsyncMock(return_value=fixture.read_bytes())
    )
    data = await engine.document_snip(
        "authorized-source.pdf", ReaderSnipRequest.model_validate(PAYLOAD)
    )
    with Image.open(io.BytesIO(data)) as image:
        assert image.format == "PNG" and min(image.size) > 50 and max(image.size) <= 2048
