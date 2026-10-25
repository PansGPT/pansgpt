"""Authenticated chat interactions. No provider credentials or attachment text reach clients."""

import asyncio
import io
from typing import Literal

import pymupdf
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from PIL import Image

from app.core.authorization import require_owned_session, require_university
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7
from app.core.rate_limit import limiter
from app.engines.chat_images import image_bytes, image_pixels, owned_image
from app.engines.chat_interactions import active_path, identifier, select_path
from app.engines.storage import storage_engine
from app.models.chat import ChatAttachmentResponse, ChatBranchRequest, ChatFeedbackRequest

router = APIRouter(prefix="/ai/chat", tags=["Chat interactions"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def extract_document(data: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("The file is not a PDF.")
        with pymupdf.open(stream=data, filetype="pdf") as document:
            if document.is_encrypted or len(document) > 50:
                raise ValueError("Use an unlocked PDF with at most 50 pages.")
            text = "\n".join(page.get_text() for page in document)
        if not text.strip():
            raise ValueError("This PDF has no readable text. Attach its pages as images instead.")
    elif content_type in ("text/plain", "text/markdown", "text/csv"):
        text = data.decode("utf-8-sig")
        if "\x00" in text:
            raise ValueError("The file is not a text document.")
    else:
        raise ValueError("Unsupported document type.")
    if not text.strip() or len(text) > 40000:
        raise ValueError("Use a non-empty document with at most 40,000 characters.")
    return text


@router.post("/sessions/{session_id}/branch")
async def switch_branch(
    session_id: str,
    payload: ChatBranchRequest,
    user: UserContext = Depends(get_current_user),
) -> dict[str, str]:
    require_university(user)
    await require_owned_session(session_id, user, payload.message_id)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Conversation storage is unavailable.")
        async with conn.transaction():
            row = await conn.fetchrow(
                """SELECT active_run_id FROM public.chat_sessions WHERE id=$1 AND user_id=$2
                AND deleted_at IS NULL FOR UPDATE""",
                identifier(session_id),
                user.id,
            )
            if row is None:
                raise HTTPException(404, "Conversation not found.")
            busy = await conn.fetchval(
                """SELECT active_run_id IS NOT NULL AND active_run_started_at > now()-($2 * interval '1 second')
                FROM public.chat_sessions WHERE id=$1""",
                identifier(session_id),
                settings.CHAT_TOTAL_TIMEOUT_S + 30,
            )
            if busy:
                raise HTTPException(409, "Stop the current response before switching branches.")
            rows = [
                dict(item)
                for item in await conn.fetch(
                    "SELECT id, parent_message_id FROM public.chat_messages WHERE session_id=$1",
                    identifier(session_id),
                )
            ]
            active_path(rows, payload.message_id)
            await select_path(conn, session_id, payload.message_id)
    return {"message_id": payload.message_id}


@router.put("/sessions/{session_id}/messages/{message_id}/feedback")
async def submit_feedback(
    session_id: str,
    message_id: str,
    payload: ChatFeedbackRequest,
    user: UserContext = Depends(get_current_user),
) -> dict[str, str]:
    require_university(user)
    await require_owned_session(session_id, user, message_id)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Feedback storage is unavailable.")
        role = await conn.fetchval(
            "SELECT role::text FROM public.chat_messages WHERE id=$1 AND session_id=$2",
            identifier(message_id),
            identifier(session_id),
        )
        if role != "assistant":
            raise HTTPException(422, "Feedback is available for assistant responses only.")
        await conn.execute(
            """INSERT INTO public.chat_message_feedback(session_id,message_id,user_id,rating,comment)
            VALUES($1,$2,$3,$4,$5) ON CONFLICT(message_id,user_id)
            DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment,updated_at=now()""",
            identifier(session_id),
            identifier(message_id),
            user.id,
            payload.rating,
            payload.comment,
        )
    return {"rating": payload.rating}


@router.post(
    "/sessions/{session_id}/attachments", response_model=ChatAttachmentResponse, status_code=201
)
@limiter.limit("10/minute")
async def upload_attachment(
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
) -> ChatAttachmentResponse:
    require_university(user)
    await require_owned_session(session_id, user)
    content_type = (file.content_type or "").split(";")[0].lower()
    allowed = {
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
        "image/png",
        "image/jpeg",
    }
    if content_type not in allowed:
        raise HTTPException(415, "Attach a PDF, UTF-8 text/Markdown/CSV, PNG or JPEG.")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if not data or len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Attachments must contain 1 byte to 10 MB.")
    # Reject exhausted accounts before any external image analysis. The transaction
    # below repeats this check under a lock before committing another attachment.
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Attachment storage is unavailable.")
        used = await conn.fetchval(
            "SELECT count(*) FROM public.chat_attachments WHERE user_id=$1 AND created_at>now()-interval '1 hour'",
            user.id,
        )
        if used >= 30:
            raise HTTPException(429, "Attachment limit reached. Try again in an hour.")
    try:
        if content_type.startswith("image/"):

            def verify_image() -> None:
                with Image.open(io.BytesIO(data)) as image:
                    expected = "PNG" if content_type == "image/png" else "JPEG"
                    if image.format != expected or image.width * image.height > 16_000_000:
                        raise ValueError("Use a valid image with at most 16 megapixels.")
                    image.verify()

            await asyncio.to_thread(verify_image)
            # Store validated pixels now; vision uses the actual question at Send.
            text = ""
        else:
            text = await asyncio.to_thread(extract_document, data, content_type)
    except (ValueError, RuntimeError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(
            422,
            "The file could not be read. Use an unlocked PDF (50 pages/40,000 characters), UTF-8 text, PNG or JPEG.",
        ) from exc
    except TimeoutError as exc:
        raise HTTPException(504, "Image analysis timed out. Please retry.") from exc
    attachment_id = str(uuid7())
    filename = (file.filename or "Attachment").replace("\\", "/").split("/")[-1]
    filename = (
        "".join(character for character in filename if character.isprintable())[:160]
        or "Attachment"
    )
    key = f"chat/{user.university_id}/{user.id}/{session_id}/{attachment_id}"
    uploaded = False
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Attachment storage is unavailable.")
            async with conn.transaction():
                # Serialize upload quota checks per account, including across conversations/instances.
                await conn.execute(
                    "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", str(user.id)
                )
                count = await conn.fetchval(
                    "SELECT count(*) FROM public.chat_attachments WHERE user_id=$1 AND created_at>now()-interval '1 hour'",
                    user.id,
                )
                if count >= 30:
                    raise HTTPException(429, "Attachment limit reached. Try again in an hour.")
                await storage_engine.upload_bytes(key, data, content_type)
                uploaded = True
                await conn.execute(
                    """INSERT INTO public.chat_attachments(id,session_id,user_id,object_key,filename,content_type,byte_size,extracted_text)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8)""",
                    identifier(attachment_id),
                    identifier(session_id),
                    user.id,
                    key,
                    filename,
                    content_type,
                    len(data),
                    text,
                )
    except BaseException:
        if uploaded:
            await asyncio.shield(storage_engine.delete_object(key))
        raise
    return ChatAttachmentResponse(
        id=attachment_id, name=filename, content_type=content_type, size=len(data)
    )


@router.get("/sessions/{session_id}/attachments/{attachment_id}/preview")
async def attachment_preview(
    session_id: str,
    attachment_id: str,
    size: Literal["thumbnail", "large"] = "thumbnail",
    user: UserContext = Depends(get_current_user),
) -> Response:
    require_university(user)
    try:
        async with asyncio.timeout(15):
            attachment = await owned_image(
                attachment_id, session_id, str(user.id), str(user.university_id)
            )
            data = await image_bytes(attachment, session_id, str(user.id), str(user.university_id))
            preview = await asyncio.to_thread(
                image_pixels, data, preview=True, expanded=size == "large"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Image preview is unavailable.") from exc
    return Response(
        preview,
        media_type="image/png",
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.delete("/sessions/{session_id}/attachments/{attachment_id}", status_code=204)
async def remove_attachment(
    session_id: str,
    attachment_id: str,
    user: UserContext = Depends(get_current_user),
) -> None:
    require_university(user)
    await require_owned_session(session_id, user)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Attachment storage is unavailable.")
        row = await conn.fetchrow(
            """DELETE FROM public.chat_attachments WHERE id=$1 AND session_id=$2 AND user_id=$3
            AND message_id IS NULL RETURNING id""",
            identifier(attachment_id),
            identifier(session_id),
            user.id,
        )
        if row is None:
            raise HTTPException(404, "Unused attachment not found.")
