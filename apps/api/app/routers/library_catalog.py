"""Paginated, university-authorized library browsing without storage-key exposure."""

import logging
import uuid
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.core.authorization import require_university
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.engines.storage import storage_engine
from app.models.library import PdfUrlResponse
from app.models.library_catalog import LibraryCatalogResponse, LibraryCourse, LibraryDocument

router = APIRouter()
logger = logging.getLogger(__name__)

SCOPE = "university_id = $1 AND deleted_at IS NULL AND (status = 'active' OR $2)"
FIELDS = """id::text, title, course_code, course_title, topic, lecturer_name,
    page_count, file_size_bytes, mime_type, status::text, embedding_status::text,
    target_levels, academic_session, semester::text, created_at::text, updated_at::text"""
ORDER = {
    "newest": "created_at DESC, id DESC",
    "oldest": "created_at ASC, id ASC",
    "title": "lower(title) ASC, id ASC",
}


def can_review(user: UserContext) -> bool:
    return bool((set(user.roles) | {user.role}) & {"lecturer", "university_admin", "super_admin"})


@router.get("/catalog", response_model=LibraryCatalogResponse)
async def catalog(
    response: Response,
    q: str = Query("", max_length=200),
    course_code: str | None = Query(None, max_length=20),
    academic_session: str | None = Query(None, max_length=40),
    semester: Literal["first", "second"] | None = None,
    sort: Literal["newest", "oldest", "title"] = "newest",
    limit: int = Query(24, ge=1, le=60),
    offset: int = Query(0, ge=0, le=1_000_000),
    user: UserContext = Depends(get_current_user),
) -> LibraryCatalogResponse:
    university = require_university(user)
    # Escape LIKE metacharacters: student input is a literal search, never SQL syntax.
    literal = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    search = f"%{literal}%" if literal else None
    where = (
        SCOPE
        + """
        AND ($3::text IS NULL OR concat_ws(' ',title,course_code,course_title,topic,lecturer_name)
             ILIKE $3)
        AND ($4::text IS NULL OR course_code = $4)
        AND ($5::text IS NULL OR academic_session = $5)
        AND ($6::text IS NULL OR semester::text = $6)
    """
    )
    params = (university, can_review(user), search, course_code, academic_session, semester)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(
                    503, "Your library is temporarily unavailable. Please try again."
                )
            # One read snapshot keeps page, count and facets consistent during concurrent uploads.
            async with conn.transaction(isolation="repeatable_read", readonly=True):
                total = await conn.fetchval(
                    f"SELECT count(*) FROM public.documents WHERE {where}", *params
                )
                rows = await conn.fetch(
                    f"SELECT {FIELDS} FROM public.documents WHERE {where} "
                    f"ORDER BY {ORDER[sort]} LIMIT $7 OFFSET $8",
                    *params,
                    limit,
                    offset,
                )
                # Facets describe the accessible catalog, not just the current 24-row page.
                courses = await conn.fetch(
                    "SELECT course_code AS code, max(course_title) AS title, "
                    "count(*)::int AS document_count FROM public.documents "
                    f"WHERE {SCOPE} GROUP BY course_code ORDER BY course_code",
                    university,
                    can_review(user),
                )
                sessions = await conn.fetch(
                    "SELECT DISTINCT academic_session FROM public.documents "
                    f"WHERE {SCOPE} AND academic_session IS NOT NULL "
                    "ORDER BY academic_session DESC",
                    university,
                    can_review(user),
                )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("library_catalog_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(
            503, "Your library is temporarily unavailable. Please try again."
        ) from exc
    response.headers["Cache-Control"] = "private, no-store"
    return LibraryCatalogResponse(
        items=[LibraryDocument.model_validate(dict(row)) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
        courses=[LibraryCourse.model_validate(dict(row)) for row in courses],
        academic_sessions=[row["academic_session"] for row in sessions],
    )


@router.get("/catalog/{document_id}/pdf-url", response_model=PdfUrlResponse)
async def catalog_pdf(
    document_id: uuid.UUID,
    response: Response,
    user: UserContext = Depends(get_current_user),
) -> PdfUrlResponse:
    university = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Document access is temporarily unavailable.")
            row = await conn.fetchrow(
                "SELECT storage_key, converted_key, mime_type FROM public.documents "
                f"WHERE {SCOPE} AND id = $3",
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
        url = await storage_engine.generate_presigned_get_url(key, expires_in=900)
        parsed = urlsplit(url or "")
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise OSError("Storage did not return a secure file link")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("library_pdf_link_unavailable", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Document storage is temporarily unavailable.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return PdfUrlResponse(document_id=str(document_id), presigned_url=url, expires_in_seconds=900)
