import asyncio
import subprocess
import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock

import pymupdf as fitz
import pytest
from httpx import ASGITransport, AsyncClient

from app.engines import thumbnail
from app.engines.storage import storage_engine
from app.main import app
from app.routers import library
from tests.conftest import TenantTestState

OWN = uuid.UUID("018f3a30-0001-7000-8000-000000000001")
FOREIGN = uuid.UUID("018f3a40-0001-7000-8000-000000000002")


@pytest.fixture
def preview_state(tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch) -> AsyncMock:
    @asynccontextmanager
    async def database():
        yield tenant_state.connection

    monkeypatch.setattr(library, "get_db_connection", database)
    render = AsyncMock(return_value=b"\x89PNG\r\n\x1a\npreview")
    monkeypatch.setattr(library, "document_thumbnail", render)
    return render


@pytest.mark.parametrize("prefix", ["library", "documents"])
async def test_private_thumbnail_uses_converted_pdf(
    tenant_state: TenantTestState, preview_state: AsyncMock, prefix: str
):
    tenant_state.documents[OWN]["converted_key"] = "universities/owned/converted/slide.pdf"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/{prefix}/{OWN}/thumbnail")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    preview_state.assert_awaited_once_with("universities/owned/converted/slide.pdf")


@pytest.mark.parametrize("document_id", [str(FOREIGN), "not-a-uuid", str(uuid.uuid4())])
async def test_unavailable_or_foreign_document_never_reaches_storage(
    preview_state: AsyncMock, document_id: str
):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/library/{document_id}/thumbnail")
    assert response.status_code == 404
    preview_state.assert_not_awaited()


async def test_pending_document_is_not_visible_to_student(
    tenant_state: TenantTestState, preview_state: AsyncMock
):
    tenant_state.documents[OWN]["status"] = "pending_review"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/library/{OWN}/thumbnail")
    assert response.status_code == 404
    preview_state.assert_not_awaited()


async def test_office_without_conversion_does_not_render_original(
    tenant_state: TenantTestState, preview_state: AsyncMock
):
    tenant_state.documents[OWN]["storage_key"] = "universities/owned/original/slides.pptx"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/library/{OWN}/thumbnail")
    assert response.status_code == 404
    preview_state.assert_not_awaited()


@pytest.mark.parametrize(
    "failure,status", [(OSError(), 503), (TimeoutError(), 503), (ValueError(), 422)]
)
async def test_render_failure_returns_no_fake_thumbnail(
    preview_state: AsyncMock, failure: Exception, status: int
):
    preview_state.side_effect = failure
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/library/{OWN}/thumbnail")
    assert response.status_code == status
    assert response.headers["content-type"] == "application/json"


async def test_renderer_uses_first_page_and_bounds_image(monkeypatch: pytest.MonkeyPatch):
    with fitz.open() as document:
        page = document.new_page(width=1200, height=1800)
        page.draw_rect(page.rect, fill=(1, 0, 0))
        page = document.new_page()
        page.draw_rect(page.rect, fill=(0, 0, 1))
        source = document.tobytes()
    download = AsyncMock(return_value=source)
    monkeypatch.setattr(storage_engine, "download_bytes", download)
    image = await thumbnail.document_thumbnail("universities/owned/original/document.pdf")
    pixmap = fitz.Pixmap(image)
    assert pixmap.width <= 400 and pixmap.height <= 600
    assert pixmap.pixel(pixmap.width // 2, pixmap.height // 2) == (255, 0, 0)
    download.assert_awaited_once_with(
        "universities/owned/original/document.pdf", max_bytes=thumbnail.MAX_SOURCE_BYTES
    )


async def test_corrupt_pdf_is_rejected(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(storage_engine, "download_bytes", AsyncMock(return_value=b"invalid-pdf"))
    with pytest.raises(ValueError, match="preview is unavailable"):
        await thumbnail.document_thumbnail("universities/owned/original/document.pdf")


async def test_oversized_source_is_not_rendered(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        storage_engine, "download_bytes", AsyncMock(side_effect=ValueError("limit"))
    )
    process = Mock()
    monkeypatch.setattr(thumbnail.subprocess, "Popen", process)
    with pytest.raises(ValueError, match="limit"):
        await thumbnail.document_thumbnail("universities/owned/original/document.pdf")
    process.assert_not_called()


def test_real_renderer_works_on_uvicorn_reload_selector_loop(monkeypatch: pytest.MonkeyPatch):
    with fitz.open() as document:
        document.new_page().insert_text((32, 40), "Actual PDF first-page preview")
        source = document.tobytes()
    monkeypatch.setattr(storage_engine, "download_bytes", AsyncMock(return_value=source))
    with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
        image = runner.run(thumbnail.document_thumbnail("private/source.pdf"))
    assert image.startswith(b"\x89PNG\r\n\x1a\n")


async def test_timeout_kills_renderer_and_removes_temporary_files(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(storage_engine, "download_bytes", AsyncMock(return_value=b"source"))
    process = Mock()
    process.poll.return_value = None
    process.wait.side_effect = [subprocess.TimeoutExpired("renderer", 8), 0]
    launch = Mock(return_value=process)
    monkeypatch.setattr(thumbnail.subprocess, "Popen", launch)
    with pytest.raises(subprocess.TimeoutExpired):
        await thumbnail.document_thumbnail("private/source.pdf")
    process.kill.assert_called_once()
    from pathlib import Path

    assert not Path(launch.call_args.args[0][-1]).parent.exists()


@pytest.mark.parametrize(
    "declared_size,content", [(4, b"abcd"), (0, b"abcd"), (0, b"abc"), (3, b"abc")]
)
async def test_storage_download_limit_with_sdk_context_manager(
    monkeypatch: pytest.MonkeyPatch, declared_size: int, content: bytes
):
    from io import BytesIO
    from types import SimpleNamespace

    source = BytesIO(content)

    class Body:
        async def __aenter__(self):
            # The real SDK context yields an aiohttp response, not its size-aware wrapper.
            return SimpleNamespace()

        async def __aexit__(self, *args):
            return False

        async def read(self, amount=None):
            return source.read(-1 if amount is None else amount)

    client = SimpleNamespace(
        get_object=AsyncMock(return_value={"Body": Body(), "ContentLength": declared_size})
    )

    @asynccontextmanager
    async def get_client():
        yield client

    monkeypatch.setattr(storage_engine, "get_client", get_client)
    if len(content) > 3:
        with pytest.raises(ValueError, match="download limit"):
            await storage_engine.download_bytes("private/document.pdf", max_bytes=3)
    else:
        assert await storage_engine.download_bytes("private/document.pdf", max_bytes=3) == content
