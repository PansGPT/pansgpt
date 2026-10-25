"""Owned chat images: private storage resolution and question-specific vision context."""

import base64
import io
import uuid
from collections.abc import Mapping

from fastapi import HTTPException
from PIL import Image, ImageOps

from app.core.database import get_db_connection
from app.engines.storage import storage_engine
from app.engines.vision import sniff_image_mime_type, vision_engine

MAX_IMAGE_BYTES = 10 * 1024 * 1024


def image_pixels(data: bytes, *, preview: bool = False, expanded: bool = False) -> bytes:
    """Normalize orientation and drop embedded metadata without trusting MIME headers."""
    with Image.open(io.BytesIO(data)) as source:
        if source.format not in {"PNG", "JPEG"} or source.width * source.height > 16_000_000:
            raise ValueError("Use a PNG or JPEG with at most 16 megapixels.")
        source.load()
        image = ImageOps.exif_transpose(source)
        edge = (1536 if expanded else 384) if preview else 3072
        image.thumbnail((edge, edge))
        rgba = image.convert("RGBA")
        clean = Image.new("RGB", image.size, "white")
        clean.paste(rgba, mask=rgba.getchannel("A"))
        out = io.BytesIO()
        clean.save(out, format="PNG")
        if not preview and out.tell() > MAX_IMAGE_BYTES:
            out = io.BytesIO()
            clean.save(out, format="JPEG", quality=92)
        return out.getvalue()


async def owned_image(
    attachment_id: str, session_id: str, user_id: str, university_id: str
) -> dict[str, object]:
    try:
        attachment, session, owner, university = map(
            uuid.UUID, (attachment_id, session_id, user_id, university_id)
        )
    except ValueError as exc:
        raise HTTPException(404, "Image attachment not found.") from exc
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Image storage is unavailable.")
        row = await conn.fetchrow(
            """SELECT a.id,a.object_key,a.filename,a.content_type,a.byte_size FROM public.chat_attachments a
            JOIN public.chat_sessions s ON s.id=a.session_id AND s.user_id=a.user_id
            JOIN public.users u ON u.id=a.user_id
            WHERE a.id=$1 AND a.session_id=$2 AND a.user_id=$3 AND u.university_id=$4
              AND s.deleted_at IS NULL AND u.deleted_at IS NULL AND a.content_type IN ('image/png','image/jpeg')""",
            attachment,
            session,
            owner,
            university,
        )
    if row is None:
        raise HTTPException(404, "Image attachment not found.")
    return dict(row)


async def image_bytes(
    attachment: Mapping[str, object], session_id: str, user_id: str, university_id: str
) -> bytes:
    expected = f"chat/{uuid.UUID(university_id)}/{uuid.UUID(user_id)}/{uuid.UUID(session_id)}/{uuid.UUID(str(attachment['id']))}"
    if attachment.get("object_key") != expected or attachment.get("content_type") not in {
        "image/png",
        "image/jpeg",
    }:
        raise HTTPException(404, "Image attachment not found.")
    return await storage_engine.download_bytes(expected, max_bytes=MAX_IMAGE_BYTES)


async def analyze_image(
    attachment: Mapping[str, object],
    question: str,
    session_id: str,
    user_id: str,
    university_id: str,
) -> str:
    import asyncio

    data = await image_bytes(attachment, session_id, user_id, university_id)
    normalized = await asyncio.to_thread(image_pixels, data)
    mime = sniff_image_mime_type(normalized) or "image/png"
    uri = f"data:{mime};base64," + base64.b64encode(normalized).decode("ascii")
    result = await vision_engine.analyze(uri, question, user_id, university_id=university_id)
    text = result.get("analysis")
    if (
        result.get("status") != "success"
        or result.get("provider") == "deterministic_fallback"
        or not isinstance(text, str)
        or not text.strip()
    ):
        raise HTTPException(
            503, "The image could not be analysed. Please retry or attach a clearer image."
        )
    return text[:40000]
