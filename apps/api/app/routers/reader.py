"""Private reading state over the existing library, progress and highlight tables."""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.core.authorization import require_university
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.core.http_range import pdf_byte_range
from app.engines.storage import storage_engine
from app.models.chat import ChatSessionResponse
from app.models.library_catalog import LibraryDocument, LibraryOpenedResponse
from app.models.reader import (
    ReaderConversationsResponse,
    ReaderHighlight,
    ReaderHighlightRequest,
    ReaderHighlightsResponse,
    ReaderProgressRequest,
    ReaderResponse,
)
from app.routers.library_catalog import FIELDS, SCOPE, can_review

router = APIRouter(prefix="/catalog")
logger = logging.getLogger(__name__)
HIGHLIGHT_FIELDS = (
    "id::text,document_id::text,page_number,color,selected_text,rects,created_at::text"
)


def private(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"


def highlight(row: dict[str, object]) -> ReaderHighlight:
    # asyncpg's default JSONB codec returns a string; accept configured JSON codecs as well.
    if isinstance(row["rects"], str):
        row["rects"] = json.loads(row["rects"])
    return ReaderHighlight.model_validate(row)


@router.get("/{document_id}/conversations", response_model=ReaderConversationsResponse)
async def document_conversations(
    document_id: uuid.UUID,
    response: Response,
    offset: int = Query(0, ge=0, le=100_000),
    limit: int = Query(30, ge=1, le=100),
    q: str | None = Query(None, min_length=2, max_length=200),
    user: UserContext = Depends(get_current_user),
) -> ReaderConversationsResponse:
    university = require_university(user)
    term = q.strip() if q else None
    if term is not None and len(term) < 2:
        raise HTTPException(422, "Enter at least two characters to search.")
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Study chat history is temporarily unavailable.")
            accessible = await conn.fetchval(
                f"SELECT id FROM public.documents WHERE {SCOPE} AND id=$3",
                university,
                can_review(user),
                document_id,
            )
            if accessible is None:
                raise HTTPException(404, "Document not found.")
            search = (
                (
                    "AND (position(lower($5) in lower(title))>0 OR EXISTS ("
                    "SELECT 1 FROM public.chat_messages m WHERE m.session_id=chat_sessions.id "
                    "AND m.role IN ('user','assistant') AND m.is_active_branch "
                    "AND position(lower($5) in lower(m.content))>0)) "
                )
                if term
                else ""
            )
            args: list[object] = [user.id, document_id, limit + 1, offset]
            if term:
                args.append(term)
            rows = await conn.fetch(
                "SELECT id::text,user_id::text,document_id::text,title,summary,created_at::text,updated_at::text,is_pinned,archived_at::text,title_source,last_message_at::text "
                "FROM public.chat_sessions WHERE user_id=$1 AND document_id=$2 AND deleted_at IS NULL AND archived_at IS NULL "
                + search
                + "ORDER BY is_pinned DESC,coalesce(last_message_at,created_at) DESC,id DESC LIMIT $3 OFFSET $4",
                *args,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_history_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(
            503, "Study chat history is temporarily unavailable. Please retry."
        ) from exc
    private(response)
    return ReaderConversationsResponse(
        sessions=[ChatSessionResponse.model_validate(dict(row)) for row in rows[:limit]],
        next_offset=offset + limit if len(rows) > limit else None,
    )


@router.get("/{document_id}/pdf", response_class=StreamingResponse)
async def pdf_bytes(
    document_id: uuid.UUID,
    byte_range: str | None = Header(default=None, alias="Range", max_length=128),
    user: UserContext = Depends(get_current_user),
) -> StreamingResponse:
    """Deliver only an authorized document; clients cannot supply a URL or storage key."""
    university = require_university(user)
    resources = AsyncExitStack()
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Document access is temporarily unavailable.")
            row = await conn.fetchrow(
                "SELECT storage_key, converted_key, mime_type FROM public.documents "
                f"WHERE {SCOPE} AND id=$3",
                university,
                can_review(user),
                document_id,
            )
        if row is None:
            raise HTTPException(404, "Document not found.")
        key = row["converted_key"] or (
            row["storage_key"] if row["mime_type"] == "application/pdf" else None
        )
        if not key:
            raise HTTPException(409, "The PDF is still being prepared. Please try again shortly.")
        if not storage_engine.is_configured:
            raise HTTPException(503, "Document storage is temporarily unavailable.")
        size = await storage_engine.get_object_size(key)
        if size is None:
            raise HTTPException(404, "This document's file is no longer available.")
        selected = pdf_byte_range(byte_range, size)
        client = await resources.enter_async_context(storage_engine.get_client())
        result = await client.get_object(
            Bucket=settings.r2_bucket_name,
            Key=key,
            **({"Range": f"bytes={selected[0]}-{selected[1]}"} if selected else {}),
        )
        # aiobotocore's context returns its raw HTTP response; retain the streaming
        # wrapper because read(size) is the bounded API used below.
        body = result["Body"]
        await resources.enter_async_context(body)
        length = selected[1] - selected[0] + 1 if selected else size
        if int(result["ContentLength"]) != length:
            raise OSError("Unexpected PDF byte count")
        if selected and result.get("ContentRange") != f"bytes {selected[0]}-{selected[1]}/{size}":
            raise OSError("Unexpected PDF byte range")
    except BaseException as exc:
        await resources.aclose()
        if isinstance(exc, HTTPException):
            raise
        if not isinstance(exc, Exception):
            raise
        logger.warning("reader_pdf_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "The PDF file is temporarily unavailable. Please retry.") from exc

    async def stream() -> AsyncIterator[bytes]:
        try:
            remaining = length
            while remaining:
                chunk = await body.read(min(64 * 1024, remaining))
                if not chunk:
                    raise OSError("Incomplete PDF transfer")
                remaining -= len(chunk)
                yield chunk
        finally:
            await resources.aclose()

    headers = {
        "Cache-Control": "private, no-store",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length",
    }
    if selected:
        headers["Content-Range"] = f"bytes {selected[0]}-{selected[1]}/{size}"
    return StreamingResponse(
        stream(),
        status_code=206 if selected else 200,
        media_type="application/pdf",
        headers=headers,
    )


@router.get("/{document_id}/reader", response_model=ReaderResponse)
async def reader(
    document_id: uuid.UUID,
    response: Response,
    user: UserContext = Depends(get_current_user),
) -> ReaderResponse:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your document is temporarily unavailable.")
            async with conn.transaction(isolation="repeatable_read", readonly=True):
                row = await conn.fetchrow(
                    f"SELECT {FIELDS} FROM (SELECT d.*, p.updated_at AS last_opened_at, "
                    "p.last_page_read FROM public.documents d LEFT JOIN public.study_progress p "
                    "ON p.document_id=d.id AND p.user_id=$4) AS library "
                    f"WHERE {SCOPE} AND id=$3",
                    university,
                    can_review(user),
                    document_id,
                    user.id,
                )
                if row is None:
                    raise HTTPException(404, "Document not found.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your document is temporarily unavailable. Please retry.") from exc
    private(response)
    return ReaderResponse(document=LibraryDocument.model_validate(dict(row)), chat_session_id=None)


@router.patch("/{document_id}/progress", response_model=LibraryOpenedResponse)
async def save_progress(
    document_id: uuid.UUID,
    payload: ReaderProgressRequest,
    response: Response,
    user: UserContext = Depends(get_current_user),
) -> LibraryOpenedResponse:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your reading position could not be saved.")
            row = await conn.fetchrow(
                "INSERT INTO public.study_progress(user_id,document_id,last_page_read,total_pages) "
                "SELECT $4,id,$5,page_count FROM public.documents "
                f"WHERE {SCOPE} AND id=$3 AND $5<=GREATEST(page_count,1) "
                "ON CONFLICT (user_id,document_id) DO UPDATE SET last_page_read=EXCLUDED.last_page_read, "
                "total_pages=EXCLUDED.total_pages, updated_at=now() "
                "RETURNING document_id::text, updated_at::text AS last_opened_at, last_page_read, total_pages",
                university,
                can_review(user),
                document_id,
                user.id,
                payload.page,
            )
            if row is None:
                exists = await conn.fetchval(
                    f"SELECT page_count FROM public.documents WHERE {SCOPE} AND id=$3",
                    university,
                    can_review(user),
                    document_id,
                )
                if exists is None:
                    raise HTTPException(404, "Document not found.")
                raise HTTPException(422, "The reading page is outside this document.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_progress_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your reading position could not be saved. Please retry.") from exc
    private(response)
    return LibraryOpenedResponse.model_validate(dict(row))


@router.get("/{document_id}/highlights", response_model=ReaderHighlightsResponse)
async def list_highlights(
    document_id: uuid.UUID,
    response: Response,
    offset: int = Query(0, ge=0, le=1_000_000),
    limit: int = Query(200, ge=1, le=200),
    user: UserContext = Depends(get_current_user),
) -> ReaderHighlightsResponse:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your highlights could not be loaded.")
            doc = await conn.fetchval(
                f"SELECT id FROM public.documents WHERE {SCOPE} AND id=$3",
                university,
                can_review(user),
                document_id,
            )
            if doc is None:
                raise HTTPException(404, "Document not found.")
            rows = await conn.fetch(
                f"SELECT {HIGHLIGHT_FIELDS} FROM public.document_highlights "
                "WHERE user_id=$1 AND document_id=$2 AND EXISTS "
                "(SELECT 1 FROM public.documents WHERE id=$2 AND university_id=$3 AND deleted_at IS NULL "
                "AND (status='active' OR $4)) ORDER BY page_number,created_at,id LIMIT $5 OFFSET $6",
                user.id,
                document_id,
                university,
                can_review(user),
                limit + 1,
                offset,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_highlights_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your highlights could not be loaded. Please retry.") from exc
    private(response)
    return ReaderHighlightsResponse(
        items=[highlight(dict(row)) for row in rows[:limit]],
        next_offset=offset + limit if len(rows) > limit else None,
    )


@router.post("/{document_id}/highlights", response_model=ReaderHighlight, status_code=201)
async def create_highlight(
    document_id: uuid.UUID,
    payload: ReaderHighlightRequest,
    response: Response,
    user: UserContext = Depends(get_current_user),
) -> ReaderHighlight:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your highlight could not be saved.")
            row = await conn.fetchrow(
                "INSERT INTO public.document_highlights(user_id,document_id,page_number,color,selected_text,rects) "
                "SELECT $4,id,$5,$6,$7,$8::jsonb FROM public.documents "
                f"WHERE {SCOPE} AND id=$3 AND $5<=GREATEST(page_count,1) RETURNING {HIGHLIGHT_FIELDS}",
                university,
                can_review(user),
                document_id,
                user.id,
                payload.page_number,
                payload.color,
                payload.selected_text,
                json.dumps([rect.model_dump() for rect in payload.rects]),
            )
            if row is None:
                exists = await conn.fetchval(
                    f"SELECT id FROM public.documents WHERE {SCOPE} AND id=$3",
                    university,
                    can_review(user),
                    document_id,
                )
                if exists is None:
                    raise HTTPException(404, "Document not found.")
                raise HTTPException(422, "The highlight page is outside this document.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_highlight_save_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your highlight could not be saved. Please retry.") from exc
    private(response)
    return highlight(dict(row))


@router.delete("/{document_id}/highlights/{highlight_id}", status_code=204)
async def delete_highlight(
    document_id: uuid.UUID,
    highlight_id: uuid.UUID,
    user: UserContext = Depends(get_current_user),
) -> Response:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your highlight could not be removed.")
            deleted = await conn.fetchval(
                "DELETE FROM public.document_highlights WHERE id=$1 AND document_id=$2 AND user_id=$3 "
                "AND EXISTS(SELECT 1 FROM public.documents WHERE id=$2 AND university_id=$4 "
                "AND deleted_at IS NULL AND (status='active' OR $5)) RETURNING id",
                highlight_id,
                document_id,
                user.id,
                university,
                can_review(user),
            )
            if deleted is None:
                raise HTTPException(404, "Highlight not found.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("reader_highlight_remove_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your highlight could not be removed. Please retry.") from exc
    return Response(status_code=204, headers={"Cache-Control": "private, no-store"})
