"""Question-aware image handling with explicit synthetic pixels and scoped storage."""

import asyncio
import base64
import io
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from PIL import Image, PngImagePlugin

from app.core.config import settings
from app.engines import chat_images as images
from app.engines import vision
from app.engines.chat_interactions import ChatTurn
from app.engines.tools import tool_engine
from app.routers import chat
from app.routers import chat_interactions as routes
from tests.conftest import TenantTestState


def png(size: tuple[int, int] = (80, 40)) -> bytes:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    image.putpixel((20, 20), (0, 0, 0, 255))
    output = io.BytesIO()
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Private metadata", "Do not send this field")
    image.save(output, format="PNG", pnginfo=metadata)
    return output.getvalue()


def image_record(state: TenantTestState) -> tuple[str, dict[str, object]]:
    session = str(next(k for k, row in state.sessions.items() if row["user_id"] == state.user.id))
    attachment = str(uuid.uuid4())
    return session, {
        "id": attachment,
        "object_key": f"chat/{state.user.university_id}/{state.user.id}/{session}/{attachment}",
        "filename": "synthetic.png",
        "content_type": "image/png",
        "byte_size": len(png()),
        "extracted_text": "",
    }


def fake_storage(
    monkeypatch: pytest.MonkeyPatch, row: dict[str, object] | None = None
) -> MagicMock:
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value=row)
    conn.fetchval = AsyncMock(return_value=0)
    conn.execute = AsyncMock()

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    monkeypatch.setattr(images, "get_db_connection", database)
    monkeypatch.setattr(routes, "get_db_connection", database)
    return conn


def test_image_normalization_strips_metadata_and_flattens_transparency() -> None:
    with Image.open(io.BytesIO(images.image_pixels(png()))) as result:
        assert result.getpixel((0, 0)) == (255, 255, 255)
        assert result.getpixel((20, 20)) == (0, 0, 0)
        assert not result.info
    with Image.open(io.BytesIO(images.image_pixels(png(), preview=True))) as preview:
        assert max(preview.size) <= 384


async def test_image_upload_stores_pixels_without_calling_vision(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, row = image_record(tenant_state)
    conn = fake_storage(monkeypatch)
    analyse = AsyncMock(side_effect=AssertionError("Do not analyse an upload without the question"))
    monkeypatch.setattr(images.vision_engine, "analyze", analyse)
    upload = AsyncMock()
    monkeypatch.setattr(routes.storage_engine, "upload_bytes", upload)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/attachments",
        files={"file": ("synthetic.png", png(), "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["content_type"] == "image/png"
    analyse.assert_not_awaited()
    assert upload.call_args.args[1] == png()
    insert = next(
        call
        for call in conn.execute.call_args_list
        if "INSERT INTO public.chat_attachments" in call.args[0]
    )
    assert insert.args[-1] == ""


@pytest.mark.parametrize("size, edge", [("thumbnail", 384), ("large", 1536)])
async def test_preview_is_authenticated_private_and_uses_scoped_lookup(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    size: str,
    edge: int,
) -> None:
    session, row = image_record(tenant_state)
    conn = fake_storage(monkeypatch, row)
    download = AsyncMock(return_value=png((2048, 1024)))
    monkeypatch.setattr(images.storage_engine, "download_bytes", download)
    response = await client.get(
        f"/api/v1/ai/chat/sessions/{session}/attachments/{row['id']}/preview?size={size}"
    )
    assert response.status_code == 200 and response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "private, no-store"
    sql, *params = conn.fetchrow.call_args.args
    assert "a.session_id=$2" in sql and "a.user_id=$3" in sql and "u.university_id=$4" in sql
    assert params[-1] == tenant_state.user.university_id
    download.assert_awaited_once_with(row["object_key"], max_bytes=10 * 1024 * 1024)
    assert b"Private metadata" not in response.content
    with Image.open(io.BytesIO(response.content)) as result:
        assert result.size == (edge, edge // 2)


@pytest.mark.parametrize("foreign_row", [False, True])
@pytest.mark.parametrize("size", ["thumbnail", "large"])
async def test_missing_or_foreign_namespace_image_never_reaches_storage(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    foreign_row: bool,
    size: str,
) -> None:
    session, row = image_record(tenant_state)
    row["object_key"] = "chat/another-account/private-image"
    fake_storage(monkeypatch, row if foreign_row else None)
    download = AsyncMock()
    monkeypatch.setattr(images.storage_engine, "download_bytes", download)
    response = await client.get(
        f"/api/v1/ai/chat/sessions/{session}/attachments/{row['id']}/preview?size={size}"
    )
    assert response.status_code == 404
    download.assert_not_awaited()


async def test_owned_original_pixels_and_question_reach_vision(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, row = image_record(tenant_state)
    monkeypatch.setattr(images.storage_engine, "download_bytes", AsyncMock(return_value=png()))
    inference = AsyncMock(
        return_value={
            "status": "success",
            "provider": "google_gemini",
            "analysis": "The arrow is labelled Sample B.",
        }
    )
    monkeypatch.setattr(images.vision_engine, "analyze", inference)
    text = await images.analyze_image(
        row,
        "What is the arrow label?",
        session,
        str(tenant_state.user.id),
        str(tenant_state.user.university_id),
    )
    assert text == "The arrow is labelled Sample B."
    assert inference.call_args.args[1] == "What is the arrow label?"
    decoded = base64.b64decode(inference.call_args.args[0].split(",", 1)[1])
    assert b"Private metadata" not in decoded
    assert inference.call_args.kwargs["university_id"] == str(tenant_state.user.university_id)


async def test_question_aware_image_context_is_used_at_send_without_forced_rag(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, row = image_record(tenant_state)
    turn = ChatTurn(
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        None,
        "What is the arrow label?",
        [],
        [row],
        False,
    )
    monkeypatch.setattr(chat, "prepare_turn", AsyncMock(return_value=turn))
    monkeypatch.setattr(chat, "release_turn", AsyncMock())
    inference = AsyncMock(return_value="The arrow is labelled Sample B.")
    monkeypatch.setattr(chat, "analyze_image", inference)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={"message": turn.prompt, "attachment_ids": [row["id"]]},
    )
    assert response.status_code == 200 and "analysing_image" in response.text
    assert inference.call_args.args[1] == turn.prompt
    tenant_state.retrieval.assert_not_awaited()
    assert "Sample B" in tenant_state.ai.call_args.kwargs["system_prompt"]
    assert tenant_state.ai.call_args.kwargs["session_id"] == session


async def test_failed_vision_does_not_continue_without_image(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, row = image_record(tenant_state)
    turn = ChatTurn(
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        None,
        "Explain this image",
        [],
        [row],
        False,
    )
    monkeypatch.setattr(chat, "prepare_turn", AsyncMock(return_value=turn))
    monkeypatch.setattr(chat, "release_turn", AsyncMock())
    monkeypatch.setattr(
        chat, "analyze_image", AsyncMock(side_effect=HTTPException(503, "Unavailable"))
    )
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={"message": turn.prompt, "attachment_ids": [row["id"]]},
    )
    assert "IMAGE_ANALYSIS_UNAVAILABLE" in response.text and '"retryable": true' in response.text
    tenant_state.ai.assert_not_called()
    tenant_state.retrieval.assert_not_awaited()


@pytest.mark.parametrize(
    "target",
    [
        "http://127.0.0.1/private",
        "https://example.test/image.png",
        "universities/foreign/image.png",
    ],
)
async def test_vision_resolver_never_fetches_model_supplied_locations(target: str) -> None:
    with pytest.raises(ValueError, match="uploaded"):
        await vision.resolve_image_bytes(target)


async def test_vision_cache_is_tenant_question_scoped_and_failure_is_not_faked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = vision.VisionAnalysisEngine()
    engine.gemini_key = "unit-vision"
    engine.groq_key = engine.openrouter_key = None
    monkeypatch.setitem(settings.__dict__, "VISION_FAKE_MODE", False)
    provider = AsyncMock(return_value="Visible label is Sample B.")
    monkeypatch.setattr(engine, "_call_google_vision", provider)
    uri = "data:image/png;base64," + base64.b64encode(png()).decode()
    first = await engine.analyze(uri, "Read label", "owner", "university-a")
    assert (await engine.analyze(uri, "Read label", "owner", "university-a"))["cached"] is True
    await engine.analyze(uri, "Read label", "owner", "university-b")
    await engine.analyze(uri, "Read value", "owner", "university-a")
    assert provider.await_count == 3
    provider.side_effect = RuntimeError("Provider down")
    result = await engine.analyze(uri, "New question", "owner", "university-a")
    assert result["status"] == "error" and "analysis" not in result
    assert first["analysis"] == "Visible label is Sample B."


async def test_vision_overall_deadline_is_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = vision.VisionAnalysisEngine()
    engine.gemini_key = "unit-vision"
    engine.groq_key = engine.openrouter_key = None
    monkeypatch.setitem(settings.__dict__, "VISION_OVERALL_TIMEOUT_SECONDS", 0.03)

    async def hang(*args: object) -> str:
        await asyncio.Event().wait()
        return ""

    monkeypatch.setattr(engine, "_call_google_vision", hang)
    uri = "data:image/png;base64," + base64.b64encode(png()).decode()
    result = await asyncio.wait_for(engine.analyze(uri, "Explain", "owner"), timeout=0.5)
    assert result["code"] == "VISION_TIMEOUT"


@pytest.mark.parametrize("exists", [False, True])
async def test_image_tool_enforces_conversation_scope(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, exists: bool
) -> None:
    session, row = image_record(tenant_state)
    conn = fake_storage(monkeypatch, row if exists else None)
    inference = AsyncMock(return_value="Sample B")
    monkeypatch.setattr(images, "analyze_image", inference)
    result = await tool_engine.dispatch_tool(
        "vision_analyze",
        {"attachment_id": row["id"], "prompt": "Read label"},
        user_id=str(tenant_state.user.id),
        university_id=str(tenant_state.user.university_id),
        session_id=session,
    )
    assert result["status"] == ("success" if exists else "error")
    assert conn.fetchrow.call_args.args[2] == uuid.UUID(session)
    if exists:
        assert inference.call_args.args[1:] == (
            "Read label",
            session,
            str(tenant_state.user.id),
            str(tenant_state.user.university_id),
        )
    else:
        inference.assert_not_awaited()


async def test_unverified_vision_providers_are_never_dispatched(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = vision.VisionAnalysisEngine()
    engine.gemini_key = engine.groq_key = engine.openrouter_key = "unit-vision"
    monkeypatch.setitem(settings.__dict__, "VISION_FAKE_MODE", False)
    monkeypatch.setattr(
        type(settings), "provider_privacy_allowed", lambda self, provider: provider == "google"
    )
    google = AsyncMock(side_effect=RuntimeError("Unavailable"))
    groq, openrouter = AsyncMock(), AsyncMock()
    monkeypatch.setattr(engine, "_call_google_vision", google)
    monkeypatch.setattr(engine, "_call_groq_vision", groq)
    monkeypatch.setattr(engine, "_call_openrouter_vision", openrouter)
    result = await engine.analyze(
        "data:image/png;base64," + base64.b64encode(png()).decode(), "Read label", "owner"
    )
    assert result["status"] == "error"
    google.assert_awaited_once()
    groq.assert_not_awaited()
    openrouter.assert_not_awaited()


def test_image_orientation_is_applied_before_metadata_is_removed() -> None:
    image = Image.new("RGB", (80, 40), "white")
    exif = Image.Exif()
    exif[274] = 6
    data = io.BytesIO()
    image.save(data, format="JPEG", exif=exif)
    with Image.open(io.BytesIO(images.image_pixels(data.getvalue()))) as result:
        assert result.size == (40, 80)
        assert not result.getexif()


@pytest.mark.parametrize("payload", [b"not an image", b"\x89PNG\r\n\x1a\ntruncated"])
async def test_invalid_image_never_reaches_storage(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    payload: bytes,
) -> None:
    session, _ = image_record(tenant_state)
    fake_storage(monkeypatch)
    upload = AsyncMock()
    monkeypatch.setattr(routes.storage_engine, "upload_bytes", upload)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/attachments",
        files={"file": ("invalid.png", payload, "image/png")},
    )
    assert response.status_code in {415, 422}
    upload.assert_not_awaited()


async def test_compressed_large_pixel_image_is_rejected_before_storage(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    session, _ = image_record(tenant_state)
    fake_storage(monkeypatch)
    pixels = Image.new("1", (5000, 4000))
    output = io.BytesIO()
    pixels.save(output, "PNG")
    assert len(output.getvalue()) < 10 * 1024 * 1024
    upload = AsyncMock()
    monkeypatch.setattr(routes.storage_engine, "upload_bytes", upload)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/attachments",
        files={"file": ("large-pixels.png", output.getvalue(), "image/png")},
    )
    assert response.status_code == 422
    upload.assert_not_awaited()


async def test_cancelled_vision_does_not_try_another_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = vision.VisionAnalysisEngine()
    engine.gemini_key = engine.groq_key = "unit-vision"
    engine.openrouter_key = None
    monkeypatch.setattr(type(settings), "provider_privacy_allowed", lambda self, provider: True)
    started = asyncio.Event()

    async def hang(*args: object) -> str:
        started.set()
        await asyncio.Event().wait()
        return ""

    fallback = AsyncMock(return_value="Should not run")
    monkeypatch.setattr(engine, "_call_google_vision", hang)
    monkeypatch.setattr(engine, "_call_groq_vision", fallback)
    task = asyncio.create_task(
        engine.analyze(
            "data:image/png;base64," + base64.b64encode(png()).decode(), "Explain", "owner"
        )
    )
    await asyncio.wait_for(started.wait(), timeout=1)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    fallback.assert_not_awaited()
