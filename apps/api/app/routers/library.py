# ==============================================================================
# PansGPT 2.0 Library & Ingestion API Router (Roadmap Phase 5: 5.2)
# Multi-endpoint, Dual-Mounting Alias, Complete CRUD & Segment Inspection
# ==============================================================================

import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.authorization import require_scoped_document, require_university  # [TENANT FIX]
from app.core.config import settings
from app.core.database import get_db_connection  # [TENANT FIX 2]
from app.core.dependencies import (  # [TENANT FIX]
    UserContext,  # [TENANT FIX]
    get_current_user,  # [TENANT FIX]
    require_admin_or_super_admin,  # [TENANT FIX]
)  # [TENANT FIX]
from app.engines.arq_producer import enqueue_ingestion_job
from app.engines.storage import (
    DEFAULT_UNIVERSITY_ID,
    build_document_storage_key,
    storage_engine,
)
from app.models.library import (
    ConfirmUploadResponse,
    DocumentDetailResponse,
    DocumentPatchRequest,
    DocumentSegmentResponse,
    DocumentUploadRequest,
    DocumentUploadResponse,
    PdfUrlResponse,
)

router = APIRouter(prefix="/library", tags=["Library & Ingestion"])


# ------------------------------------------------------------------------------
# 1. Initialize Document Upload (Stage 1)
# ------------------------------------------------------------------------------
@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize document upload & receive presigned R2 PUT URL",
)
async def initialize_document_upload(
    payload: DocumentUploadRequest,
    auth_user: UserContext = Depends(require_admin_or_super_admin),  # [TENANT FIX]
):
    """
    Stage 1: Generates an immutable Cloudflare R2 path and a time-limited presigned PUT URL.
    The client streams the PDF directly to R2 edge storage ($0 egress).
    """
    university_id = str(require_university(auth_user))  # [TENANT FIX]
    doc_id = str(uuid.uuid4())
    ext = payload.file_name.split(".")[-1] if "." in payload.file_name else "pdf"

    storage_key = build_document_storage_key(
        university_id=university_id,
        course_code=payload.course_code,
        document_id=doc_id,
        file_extension=ext,
    )

    if storage_engine.is_configured:
        try:
            presigned_url = await storage_engine.generate_presigned_put_url(
                key=storage_key,
                content_type=payload.mime_type,
                expires_in=900,
            )
        except Exception:
            presigned_url = f"https://mock-r2.pansgpt.com/{storage_key}?signature=mock_token"
    else:
        presigned_url = f"https://mock-r2.pansgpt.com/{storage_key}?signature=mock_dev_token"

    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            await conn.execute(
                """
                INSERT INTO public.documents (
                    id, university_id, title, course_code, course_title,
                    topic, lecturer_name, storage_key, file_size_bytes,
                    mime_type, status, target_levels, academic_session,
                    semester, embedding_status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active',
                    $11, $12, $13, 'pending'
                ) ON CONFLICT (id) DO NOTHING;
                """,
                uuid.UUID(doc_id),
                uuid.UUID(university_id),
                payload.title,
                payload.course_code.upper().strip(),
                payload.course_title.strip(),
                payload.topic,
                payload.lecturer_name,
                storage_key,
                payload.file_size_bytes,
                payload.mime_type,
                payload.target_levels,
                payload.academic_session,
                payload.semester,
            )
            await conn.close()
        except Exception:
            pass

    return DocumentUploadResponse(
        document_id=doc_id,
        storage_key=storage_key,
        presigned_upload_url=presigned_url,
        expires_in_seconds=900,
    )


# ------------------------------------------------------------------------------
# 2. Confirm Upload & Enqueue Ingestion (Stage 1 Completion)
# ------------------------------------------------------------------------------
@router.post(
    "/{document_id}/confirm-upload",
    response_model=ConfirmUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Confirm client upload completion and dispatch background ingestion worker",
)
@router.post(
    "/documents/{document_id}/complete",
    response_model=ConfirmUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Alias: Confirm client upload completion and dispatch worker",
)
async def confirm_document_upload(
    document_id: str,
    auth_user: UserContext = Depends(require_admin_or_super_admin),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    """
    Called by client immediately after successfully PUTting bytes directly to R2.
    Transitions status to 'pending' and enqueues the background ingestion job via ARQ.
    """
    storage_key = None
    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            row = await conn.fetchrow(
                "SELECT storage_key FROM public.documents WHERE id = $1 AND deleted_at IS NULL;",
                uuid.UUID(document_id),
            )
            if not row:
                await conn.close()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {document_id} not found",
                )
            storage_key = row["storage_key"]

            await conn.execute(
                """
                UPDATE public.documents
                SET embedding_status = 'pending', updated_at = now()
                WHERE id = $1;
                """,
                uuid.UUID(document_id),
            )
            await conn.close()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection error: {e!s}",
            )

    if not storage_key:
        storage_key = (
            f"universities/{DEFAULT_UNIVERSITY_ID}/courses/general/original/{document_id}.pdf"
        )

    job_id = await enqueue_ingestion_job(document_id, storage_key)
    mode = "queued" if job_id else ("sync" if settings.DATABASE_URL else "no_db")

    return ConfirmUploadResponse(
        document_id=document_id,
        job_id=job_id,
        mode=mode,
        message="Document upload confirmed. Background processing pipeline dispatched.",
    )


# ------------------------------------------------------------------------------
# 2B. Direct Byte Streaming Artifact & Document Download
# Must be defined BEFORE /documents/{document_id} to prevent path collision
# ------------------------------------------------------------------------------
@router.get(
    "/artifacts/download",
    summary="Alias: Download artifact directly as an attachment",
)
async def download_document_or_artifact(
    key: str = Query(..., description="Cloudflare R2 storage key"),
    filename: str | None = Query(
        default=None, description="Override download filename (without extension)"
    ),
    auth_user: dict = Depends(get_current_user),
):
    """
    Streams any university asset or student artifact directly to the browser as an
    attachment download. Never redirects to a presigned URL — this prevents browsers
    from opening the file in Microsoft Office Online or other online viewers.
    """
    if ".." in key or key.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key",
        )

    ext = key.rsplit(".", 1)[-1].lower() if "." in key else "bin"
    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "md": "text/markdown",
        "json": "application/json",
    }

    # Build a clean, human-readable filename
    if filename:
        safe_name = "".join(c if c.isalnum() or c in "-_ " else "_" for c in filename).strip()
        safe_name = safe_name.replace(" ", "_")
        clean_filename = f"{safe_name}.{ext}"
    else:
        clean_filename = key.split("/")[-1]

    try:
        data = await storage_engine.download_bytes(key)
        return Response(
            content=data,
            media_type=media_types.get(ext, "application/octet-stream"),
            headers={
                "Content-Disposition": f'attachment; filename="{clean_filename}"',
                "Content-Length": str(len(data)),
                "Cache-Control": "no-cache",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Storage object not found: {str(exc)}",
        )


@router.get(  # [TENANT FIX 2]
    "/documents/download",  # [TENANT FIX 2]
    summary="Download a library document after verifying access",  # [TENANT FIX 2]
)  # [TENANT FIX 2]
async def download_library_document(  # [TENANT FIX 2]
    key: str = Query(..., description="Cloudflare R2 document storage key"),  # [TENANT FIX 2]
    filename: str | None = Query(None, description="Override download filename"),  # [TENANT FIX 2]
    current_user: UserContext = Depends(get_current_user),  # [TENANT FIX 2]
) -> Response:  # [TENANT FIX 2]
    if not key or ".." in key or key.startswith("/"):  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.")  # [TENANT FIX 2]
    document: asyncpg.Record | None = None  # [TENANT FIX 2]
    try:  # [TENANT FIX 2]
        async with get_db_connection() as conn:  # [TENANT FIX 2]
            if conn is not None:  # [TENANT FIX 2]
                document = await conn.fetchrow(  # [TENANT FIX 2]
                    "SELECT university_id, status, deleted_at FROM public.documents "  # [TENANT FIX 2]
                    "WHERE storage_key = $1 OR converted_key = $1 LIMIT 1;",  # [TENANT FIX 2]
                    key,  # [TENANT FIX 2]
                )  # [TENANT FIX 2]
    except Exception as exc:  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.") from exc  # [TENANT FIX 2]
    if document is None or document["deleted_at"] is not None:  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.")  # [TENANT FIX 2]
    roles = set(current_user.roles) | {current_user.role}  # [TENANT FIX 2]
    is_super_admin = "super_admin" in roles  # [TENANT FIX 2]
    if not is_super_admin and (  # [TENANT FIX 2]
        current_user.university_id is None  # [TENANT FIX 2]
        or document["university_id"] != current_user.university_id  # [TENANT FIX 2]
    ):  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.")  # [TENANT FIX 2]
    is_tenant_admin = bool(roles & {"university_admin", "admin"})  # [TENANT FIX 2]
    if document["status"] != "active" and not (is_super_admin or is_tenant_admin):  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.")  # [TENANT FIX 2]
    try:  # [TENANT FIX 2]
        return await download_document_or_artifact(  # [TENANT FIX 2]
            key=key,  # [TENANT FIX 2]
            filename=filename,  # [TENANT FIX 2]
            auth_user=current_user,  # [TENANT FIX 2]
        )  # [TENANT FIX 2]
    except HTTPException as exc:  # [TENANT FIX 2]
        raise HTTPException(status_code=404, detail="File not found.") from exc  # [TENANT FIX 2]


# ------------------------------------------------------------------------------
# 3. Single Document Metadata (GET /library/documents/{id})
# ------------------------------------------------------------------------------
@router.get(
    "/documents/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get detailed metadata for a single document",
)
async def get_single_document(
    document_id: str,
    auth_user: UserContext = Depends(get_current_user),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    """Fetch metadata and embedding status for a specific document."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    if not settings.DATABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not configured.",
        )

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
        row = await conn.fetchrow(
            """
            SELECT id, university_id, title, course_code, course_title,
                   topic, lecturer_name, storage_key, page_count, file_size_bytes,
                   mime_type, status, embedding_status, embedding_progress,
                   total_chunks, target_levels, academic_session, semester,
                   created_at::text
            FROM public.documents
            WHERE id = $1 AND deleted_at IS NULL;
            """,
            doc_uuid,
        )

        segments_rows = await conn.fetch(
            """
            SELECT id, document_id, title, title_source, start_page, end_page, order_index
            FROM public.document_segments
            WHERE document_id = $1
            ORDER BY order_index ASC;
            """,
            uuid.UUID(document_id),
        )
        await conn.close()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )

        segments = [
            DocumentSegmentResponse(
                id=str(s["id"]),
                document_id=str(s["document_id"]),
                title=s["title"],
                title_source=s["title_source"],
                start_page=s["start_page"],
                end_page=s["end_page"],
                order_index=s["order_index"],
            )
            for s in segments_rows
        ]

        return DocumentDetailResponse(
            id=str(row["id"]),
            university_id=str(row["university_id"]),
            title=row["title"],
            course_code=row["course_code"],
            course_title=row["course_title"],
            topic=row["topic"],
            lecturer_name=row["lecturer_name"],
            storage_key=row["storage_key"],
            page_count=row["page_count"],
            file_size_bytes=row["file_size_bytes"],
            mime_type=row["mime_type"],
            status=row["status"],
            embedding_status=row["embedding_status"],
            embedding_progress=row["embedding_progress"],
            total_chunks=row["total_chunks"],
            target_levels=row["target_levels"] or [],
            academic_session=row["academic_session"],
            semester=row["semester"],
            created_at=row["created_at"],
            segments=segments,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {e!s}",
        )


# ------------------------------------------------------------------------------
# 4. Partial Metadata Update (PATCH /library/documents/{id})
# ------------------------------------------------------------------------------
@router.patch(
    "/documents/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Update document title, course code, lecturer, or status (Admin only)",
)
async def update_document_metadata(
    document_id: str,
    payload: DocumentPatchRequest,
    auth_user: UserContext = Depends(require_admin_or_super_admin),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    """Allows university admins to partially update document metadata."""
    if not settings.DATABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not configured.",
        )

    updates = []
    values = []
    idx = 2

    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            updates.append(f"{field} = ${idx}")
            values.append(val)
            idx += 1

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No valid fields provided for update.",
        )

    updates.append("updated_at = now()")
    query = f"""
        UPDATE public.documents
        SET {", ".join(updates)}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id;
    """

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
        res = await conn.fetchrow(query, uuid.UUID(document_id), *values)
        await conn.close()
        if not res:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update error: {e!s}",
        )

    return await get_single_document(document_id, auth_user=auth_user)  # [TENANT FIX]


# ------------------------------------------------------------------------------
# 5. Soft-Delete Document (DELETE /library/documents/{id})
# ------------------------------------------------------------------------------
@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete document by setting deleted_at (Admin only)",
)
async def soft_delete_document(
    document_id: str,
    auth_user: UserContext = Depends(require_admin_or_super_admin),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    """Marks document as deleted (deleted_at = now()). Chunks remain for audit until hard purged."""
    if not settings.DATABASE_URL:
        return None

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
        await conn.execute(
            """
            UPDATE public.documents
            SET deleted_at = now(), updated_at = now()
            WHERE id = $1 AND deleted_at IS NULL;
            """,
            uuid.UUID(document_id),
        )
        await conn.close()
        return None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database deletion error: {e!s}",
        )


# ------------------------------------------------------------------------------
# 6. List Document Topic Segments (GET /library/documents/{id}/segments)
# ------------------------------------------------------------------------------
@router.get(
    "/documents/{document_id}/segments",
    response_model=list[DocumentSegmentResponse],
    summary="Get hierarchical topic segments for a document",
)
async def get_document_segments(
    document_id: str,
    auth_user: UserContext = Depends(get_current_user),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    """Returns the ordered hierarchical chapter and topic segments of a document."""
    if not settings.DATABASE_URL:
        return []

    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
        rows = await conn.fetch(
            """
            SELECT id, document_id, title, title_source, start_page, end_page, order_index
            FROM public.document_segments
            WHERE document_id = $1
            ORDER BY order_index ASC;
            """,
            uuid.UUID(document_id),
        )
        await conn.close()

        return [
            DocumentSegmentResponse(
                id=str(r["id"]),
                document_id=str(r["document_id"]),
                title=r["title"],
                title_source=r["title_source"],
                start_page=r["start_page"],
                end_page=r["end_page"],
                order_index=r["order_index"],
            )
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {e!s}",
        )


# ------------------------------------------------------------------------------
# 7. Get 15-Minute Presigned Streaming URL (GET /library/{id}/pdf-url)
# ------------------------------------------------------------------------------
@router.get(
    "/{document_id}/pdf-url",
    response_model=PdfUrlResponse,
    summary="Get 15-minute presigned GET streaming URL for PDF reader",
)
async def get_document_pdf_stream_url(
    document_id: str,
    auth_user: UserContext = Depends(get_current_user),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    storage_key = None
    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            row = await conn.fetchrow(  # [OFFICE PDF FIX]
                "SELECT storage_key, converted_key FROM public.documents WHERE id = $1 AND deleted_at IS NULL;",  # [OFFICE PDF FIX]
                uuid.UUID(document_id),  # [OFFICE PDF FIX]
            )  # [OFFICE PDF FIX]
            await conn.close()  # [OFFICE PDF FIX]
            if row:  # [OFFICE PDF FIX]
                storage_key = row["converted_key"] or row["storage_key"]  # [OFFICE PDF FIX]
        except Exception:
            pass

    if not storage_key:
        storage_key = (
            f"universities/{DEFAULT_UNIVERSITY_ID}/courses/general/original/{document_id}.pdf"
        )

    if storage_engine.is_configured:
        try:
            url = await storage_engine.generate_presigned_get_url(storage_key, expires_in=900)
        except Exception:
            url = f"https://cdn.pansgpt.com/{storage_key}?sig=mock_token"
    else:
        url = f"https://cdn.pansgpt.com/{storage_key}?sig=mock_dev_token"

    return PdfUrlResponse(
        document_id=document_id,
        presigned_url=url,
        expires_in_seconds=900,
    )


# ------------------------------------------------------------------------------
# 8. List Accessible Documents (GET /library/documents)
# ------------------------------------------------------------------------------
@router.get(
    "/documents",
    response_model=list[DocumentDetailResponse],
    summary="List course documents scoped to university and level",
)
async def list_documents(
    course_code: str | None = Query(None, description="Optional course code filter (e.g. PCL 401)"),
    auth_user: UserContext = Depends(get_current_user),  # [TENANT FIX]
):
    target_uni = str(require_university(auth_user))  # [TENANT FIX]
    results: list[DocumentDetailResponse] = []
    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            query = """
                SELECT id, university_id, title, course_code, course_title,
                       topic, lecturer_name, storage_key, page_count, file_size_bytes,
                       mime_type, status, embedding_status, embedding_progress,
                       total_chunks, target_levels, academic_session, semester,
                       created_at::text
                FROM public.documents
                WHERE university_id = $1 AND deleted_at IS NULL
            """
            params = [uuid.UUID(target_uni)]
            if course_code:
                query += " AND course_code = $2"
                params.append(course_code.upper().strip())
            query += " ORDER BY created_at DESC LIMIT 50;"

            rows = await conn.fetch(query, *params)
            await conn.close()

            for r in rows:
                results.append(
                    DocumentDetailResponse(
                        id=str(r["id"]),
                        university_id=str(r["university_id"]),
                        title=r["title"],
                        course_code=r["course_code"],
                        course_title=r["course_title"],
                        topic=r["topic"],
                        lecturer_name=r["lecturer_name"],
                        storage_key=r["storage_key"],
                        page_count=r["page_count"],
                        file_size_bytes=r["file_size_bytes"],
                        mime_type=r["mime_type"],
                        status=r["status"],
                        embedding_status=r["embedding_status"],
                        embedding_progress=r["embedding_progress"],
                        total_chunks=r["total_chunks"],
                        target_levels=r["target_levels"] or [],
                        academic_session=r["academic_session"],
                        semester=r["semester"],
                        created_at=r["created_at"],
                    )
                )
        except Exception:
            pass

    return results


# ------------------------------------------------------------------------------
# 9. Trigger Re-embedding (POST /library/{id}/reembed)
# ------------------------------------------------------------------------------
@router.post(
    "/{document_id}/reembed",
    summary="Flush existing chunks and re-run ingestion pipeline",
)
async def reembed_document(
    document_id: str,
    auth_user: UserContext = Depends(require_admin_or_super_admin),  # [TENANT FIX]
    _document_scope: str = Depends(require_scoped_document),  # [TENANT FIX]
):
    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            await conn.execute(
                "SELECT public.prepare_document_reembed($1);",
                uuid.UUID(document_id),
            )
            await conn.close()
            return {"status": "ok", "message": "Document re-embedding queued"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to queue re-embedding: {e!s}",
            )
    return {"status": "ok", "message": "Simulated re-embedding queued (no database configured)"}


# ------------------------------------------------------------------------------
# 10. Documents Alias Router (Resolves Endpoint Path Discrepancy - Roadmap 5.2)
# ------------------------------------------------------------------------------
documents_router = APIRouter(prefix="/documents", tags=["Documents"])
documents_router.add_api_route(
    "/upload",
    initialize_document_upload,
    methods=["POST"],
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
documents_router.add_api_route(
    "/{document_id}/confirm-upload",
    confirm_document_upload,
    methods=["POST"],
    response_model=ConfirmUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
documents_router.add_api_route(
    "/{document_id}/complete",
    confirm_document_upload,
    methods=["POST"],
    response_model=ConfirmUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
documents_router.add_api_route(
    "/{document_id}", get_single_document, methods=["GET"], response_model=DocumentDetailResponse
)
documents_router.add_api_route(
    "/{document_id}",
    update_document_metadata,
    methods=["PATCH"],
    response_model=DocumentDetailResponse,
)
documents_router.add_api_route(
    "/{document_id}",
    soft_delete_document,
    methods=["DELETE"],
    status_code=status.HTTP_204_NO_CONTENT,
)
documents_router.add_api_route(
    "/{document_id}/segments",
    get_document_segments,
    methods=["GET"],
    response_model=list[DocumentSegmentResponse],
)
documents_router.add_api_route(
    "/{document_id}/pdf-url",
    get_document_pdf_stream_url,
    methods=["GET"],
    response_model=PdfUrlResponse,
)
documents_router.add_api_route("/{document_id}/reembed", reembed_document, methods=["POST"])
documents_router.add_api_route(
    "", list_documents, methods=["GET"], response_model=list[DocumentDetailResponse]
)
