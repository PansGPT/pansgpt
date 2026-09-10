# ==============================================================================
# PansGPT 2.0 Library & Ingestion Pydantic Models (Phase 5)
# ==============================================================================

from typing import Literal

from pydantic import BaseModel, Field


class DocumentUploadRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255, description="Document title")
    course_code: str = Field(..., min_length=2, max_length=20, description="e.g. PCL 401")
    course_title: str = Field(..., min_length=2, max_length=255, description="Full course title")
    topic: str | None = Field(None, max_length=255, description="Optional monograph/slide topic")
    lecturer_name: str | None = Field(None, max_length=150, description="Optional lecturer name")
    academic_session: str | None = Field(None, description="e.g. 2024/2025")
    semester: Literal["first", "second"] | None = None
    target_levels: list[str] = Field(
        default_factory=lambda: ["400"], description="Target academic levels: 100-600"
    )
    file_name: str = Field(
        ..., min_length=1, description="Original filename (e.g. pharmacology_lecture_1.pdf)"
    )
    mime_type: str = Field(default="application/pdf", description="application/pdf or office docs")
    file_size_bytes: int = Field(default=0, ge=0, description="File size in bytes")


class DocumentUploadResponse(BaseModel):
    document_id: str
    storage_key: str
    presigned_upload_url: str
    expires_in_seconds: int = 900


class PdfUrlResponse(BaseModel):
    document_id: str
    presigned_url: str
    expires_in_seconds: int = 900


class DocumentSegmentResponse(BaseModel):
    id: str
    document_id: str
    title: str
    title_source: Literal["explicit", "synthesized", "inherited"]
    start_page: int
    end_page: int
    order_index: int


class DocumentDetailResponse(BaseModel):
    id: str
    university_id: str
    title: str
    course_code: str
    course_title: str
    topic: str | None = None
    lecturer_name: str | None = None
    storage_key: str
    page_count: int
    file_size_bytes: int
    mime_type: str
    status: str
    embedding_status: str
    embedding_progress: int
    total_chunks: int
    target_levels: list[str]
    academic_session: str | None = None
    semester: str | None = None
    created_at: str
    segments: list[DocumentSegmentResponse] | None = None
