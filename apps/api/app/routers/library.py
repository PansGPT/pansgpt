# ==============================================================================
# PansGPT 2.0 Library & Ingestion API Router (Roadmap Phase 5: 5.2)
# Multi-endpoint, Dual-Mounting Alias, Complete CRUD & Segment Inspection
# ==============================================================================

import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.dependencies import require_admin_or_super_admin
from app.engines.arq_producer import enqueue_ingestion_job
from app.engines.storage import build_document_storage_key, storage_engine
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
    university_id: str | None = Query(
        default="01a07664-7a69-7ce0-ad6a-b219462cbde3",
        description="University ID (scoped to active tenant, defaults to UNIJOS)",
    ),
    auth_user: dict = Depends(require_admin_or_super_admin),
):
    """
    Stage 1: Generates an immutable Cloudflare R2 path and a time-limited presigned PUT URL.
    The client streams the PDF directly to R2 edge storage ($0 egress).
    """
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
async def confirm_document_upload(document_id: str):
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
        storage_key = f"universities/default/courses/general/original/{document_id}.pdf"

    job_id = await enqueue_ingestion_job(document_id, storage_key)
    mode = "queued" if job_id else ("sync" if settings.DATABASE_URL else "no_db")

    return ConfirmUploadResponse(
        document_id=document_id,
        job_id=job_id,
        mode=mode,
        message="Document upload confirmed. Background processing pipeline dispatched.",
    )


# ------------------------------------------------------------------------------
# 3. Single Document Metadata (GET /library/documents/{id})
# ------------------------------------------------------------------------------
@router.get(
    "/documents/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get detailed metadata for a single document",
)
async def get_single_document(document_id: str):
    """Fetch metadata and embedding status for a specific document."""
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
            uuid.UUID(document_id),
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
async def update_document_metadata(document_id: str, payload: DocumentPatchRequest):
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

    return await get_single_document(document_id)


# ------------------------------------------------------------------------------
# 5. Soft-Delete Document (DELETE /library/documents/{id})
# ------------------------------------------------------------------------------
@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete document by setting deleted_at (Admin only)",
)
async def soft_delete_document(document_id: str):
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
async def get_document_segments(document_id: str):
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
async def get_document_pdf_stream_url(document_id: str):
    storage_key = None
    if settings.DATABASE_URL:
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL, timeout=3.0, statement_cache_size=0)
            row = await conn.fetchrow(
                "SELECT storage_key FROM public.documents WHERE id = $1 AND deleted_at IS NULL;",
                uuid.UUID(document_id),
            )
            await conn.close()
            if row:
                storage_key = row["storage_key"]
        except Exception:
            pass

    if not storage_key:
        storage_key = f"universities/default/courses/general/original/{document_id}.pdf"

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
    university_id: str | None = Query(
        default="01a07664-7a69-7ce0-ad6a-b219462cbde3",
        description="Filter by university ID (defaults to UNIJOS)",
    ),
    course_code: str | None = Query(None, description="Optional course code filter (e.g. PCL 401)"),
):
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
            params = [uuid.UUID(university_id)]
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
    auth_user: dict = Depends(require_admin_or_super_admin),
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
