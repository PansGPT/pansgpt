"""Authenticated chat interactions. No provider credentials or attachment text reach clients."""

import asyncio
import io
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from PIL import Image

from app.core.authorization import check_document_scope, require_owned_session, require_university
from app.core.chat_limits import admit_chat_action
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7
from app.core.rate_limit import limiter
from app.engines.chat_document_worker import DOCX, PPTX
from app.engines.chat_document_worker import extract_document as extract_document
from app.engines.chat_documents import document_text
from app.engines.chat_images import image_bytes, image_pixels, owned_image
from app.engines.chat_interactions import active_path, identifier, select_path
from app.engines.reader_snips import document_snip
from app.engines.storage import storage_engine
from app.models.chat import ChatAttachmentResponse, ChatBranchRequest, ChatFeedbackRequest
from app.models.reader import ReaderSnipOrigin, ReaderSnipRequest
from app.routers.library_catalog import SCOPE, can_review

router = APIRouter(prefix="/ai/chat", tags=["Chat interactions"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


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
async def upload_attachment(
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
) -> ChatAttachmentResponse:
    require_university(user)
    await require_owned_session(session_id, user)
    content_type = (file.content_type or "").split(";")[0].lower()
    await admit_chat_action(user, "upload")
    allowed = {
        "application/pdf",
        PPTX,
        DOCX,
        "text/plain",
        "text/markdown",
        "text/csv",
        "image/png",
        "image/jpeg",
    }
    if content_type not in allowed:
        raise HTTPException(415, "Attach a PDF, PPTX, DOCX, UTF-8 text/Markdown/CSV, PNG or JPEG.")
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
            data = await asyncio.to_thread(image_pixels, data, for_storage=True)
            content_type = "image/png" if data.startswith(b"\x89PNG\r\n\x1a\n") else "image/jpeg"
            if len(data) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, "The prepared image exceeds 10 MB. Use a smaller image.")
            # Only normalized pixels reach storage; inference waits for Send.
            text = ""
        else:
            text = await document_text(data, content_type)
    except TimeoutError as exc:
        raise HTTPException(504, "The file took too long to read. Please retry.") from exc
    except (ValueError, RuntimeError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(
            422,
            "The file could not be read. Use a readable PDF/PPTX (up to 50 pages/slides), DOCX or UTF-8 text (40,000 characters), PNG or JPEG.",
        ) from exc
    filename = (file.filename or "Attachment").replace("\\", "/").split("/")[-1]
    filename = (
        "".join(character for character in filename if character.isprintable())[:160]
        or "Attachment"
    )
    if content_type.startswith("image/"):
        extension = ".png" if content_type == "image/png" else ".jpg"
        if not filename.lower().endswith(
            (".jpg", ".jpeg") if content_type == "image/jpeg" else (".png",)
        ):
            filename = f"{filename.rsplit('.', 1)[0] or 'Image'}{extension}"
    return await save_attachment(session_id, user, data, filename, content_type, text)


async def save_attachment(
    session_id: str, user: UserContext, data: bytes, filename: str, content_type: str, text: str
) -> ChatAttachmentResponse:
    await require_owned_session(session_id, user)
    attachment_id = str(uuid7())
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


@router.post(
    "/sessions/{session_id}/document-snip", response_model=ChatAttachmentResponse, status_code=201
)
@limiter.limit("10/minute")
async def create_document_snip(
    request: Request,
    session_id: str,
    payload: ReaderSnipRequest,
    user: UserContext = Depends(get_current_user),
) -> ChatAttachmentResponse:
    university = require_university(user)
    if await require_owned_session(session_id, user) != payload.document_id:
        raise HTTPException(422, "Snip the document bound to this study chat.")
    await check_document_scope(payload.document_id, user, active_only=True)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Document access is temporarily unavailable.")
        row = await conn.fetchrow(
            "SELECT storage_key,converted_key,mime_type,page_count FROM public.documents "
            f"WHERE {SCOPE} AND id=$3",
            university,
            can_review(user),
            identifier(payload.document_id),
        )
        used = await conn.fetchval(
            "SELECT count(*) FROM public.chat_attachments WHERE user_id=$1 AND created_at>now()-interval '1 hour'",
            user.id,
        )
    if row is None:
        raise HTTPException(404, "Document not found.")
    if used >= 30:
        raise HTTPException(429, "Attachment limit reached. Try again in an hour.")
    if payload.page_number > row["page_count"]:
        raise HTTPException(422, "Choose a page in this document.")
    key = row["converted_key"] or (
        row["storage_key"] if row["mime_type"] == "application/pdf" else None
    )
    if not key:
        raise HTTPException(409, "The PDF is still being prepared.")
    try:
        pixels = await document_snip(key, payload)
    except (ValueError, TimeoutError) as exc:
        raise HTTPException(
            422, "This area could not be snipped. Select it again and retry."
        ) from exc
    except Exception as exc:
        raise HTTPException(503, "Snip storage is temporarily unavailable. Please retry.") from exc
    await check_document_scope(payload.document_id, user, active_only=True)
    return await save_attachment(
        session_id,
        user,
        pixels,
        "Snippet.png",
        "image/png",
        ReaderSnipOrigin(**payload.model_dump(), source="reader_snip_v1").model_dump_json(),
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


@router.get(
    "/sessions/{session_id}/attachments/{attachment_id}/download",
    response_class=Response,
    responses={200: {"content": {"application/octet-stream": {}}}},
)
@limiter.limit("30/minute")
async def download_attachment(
    request: Request,
    session_id: str,
    attachment_id: str,
    user: UserContext = Depends(get_current_user),
) -> Response:
    require_university(user)
    await require_owned_session(session_id, user)
    try:
        async with asyncio.timeout(20):
            async with get_db_connection() as conn:
                if conn is None:
                    raise HTTPException(503, "File download is unavailable. Please retry.")
                row = await conn.fetchrow(
                    """SELECT id,object_key,filename,byte_size FROM public.chat_attachments
                       WHERE id=$1 AND session_id=$2 AND user_id=$3""",
                    identifier(attachment_id),
                    identifier(session_id),
                    user.id,
                )
            if row is None:
                raise HTTPException(404, "File not found.")
            expected = f"chat/{user.university_id}/{user.id}/{identifier(session_id)}/{identifier(attachment_id)}"
            if row["object_key"] != expected or not 0 < row["byte_size"] <= MAX_UPLOAD_BYTES:
                raise HTTPException(404, "File not found.")
            data = await storage_engine.download_bytes(expected, max_bytes=MAX_UPLOAD_BYTES)
            if len(data) != row["byte_size"]:
                raise ValueError("Stored file size mismatch")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "File download is unavailable. Please retry.") from exc
    return Response(
        data,
        media_type="application/octet-stream",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(row['filename'], safe='')}",
        },
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
