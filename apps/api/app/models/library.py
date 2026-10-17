# ==============================================================================
# PansGPT 2.0 Library & Ingestion Pydantic Models (Phase 5)
# ==============================================================================

from typing import Literal

from pydantic import BaseModel, Field

UPLOAD_MIME_TYPES: dict[str, str] = {  # [PRELAUNCH FIX]
    "pdf": "application/pdf",  # [PRELAUNCH FIX]
    "doc": "application/msword",  # [PRELAUNCH FIX]
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # [PRELAUNCH FIX]
    "ppt": "application/vnd.ms-powerpoint",  # [PRELAUNCH FIX]
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # [PRELAUNCH FIX]
}  # [PRELAUNCH FIX]


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
    mime_type: str = Field(  # [PRELAUNCH FIX]
        default="application/pdf",  # [PRELAUNCH FIX]
        description="Matching PDF, DOC, DOCX, PPT or PPTX MIME type",  # [PRELAUNCH FIX]
    )  # [PRELAUNCH FIX]
    file_size_bytes: int = Field(default=0, ge=0, description="File size in bytes")

    def upload_extension(self) -> str:  # [PRELAUNCH FIX]
        extension = (  # [PRELAUNCH FIX]
            self.file_name.rsplit(".", 1)[-1].lower()  # [PRELAUNCH FIX]
            if "." in self.file_name  # [PRELAUNCH FIX]
            else ""  # [PRELAUNCH FIX]
        )  # [PRELAUNCH FIX]
        if extension not in UPLOAD_MIME_TYPES:  # [PRELAUNCH FIX]
            raise ValueError(  # [PRELAUNCH FIX]
                "Allowed file types are pdf, doc, docx, ppt and pptx."  # [PRELAUNCH FIX]
            )  # [PRELAUNCH FIX]
        if self.mime_type != UPLOAD_MIME_TYPES[extension]:  # [PRELAUNCH FIX]
            raise ValueError("The MIME type must match the file extension.")  # [PRELAUNCH FIX]
        return extension  # [PRELAUNCH FIX]


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


class ConfirmUploadResponse(BaseModel):
    document_id: str
    job_id: str | None = None
    mode: Literal["queued", "sync", "no_db"]
    message: str


class DocumentPatchRequest(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=255)
    course_code: str | None = Field(None, min_length=2, max_length=20)
    course_title: str | None = Field(None, min_length=2, max_length=255)
    topic: str | None = Field(None, max_length=255)
    lecturer_name: str | None = Field(None, max_length=150)
    target_levels: list[str] | None = None
    academic_session: str | None = None
    semester: Literal["first", "second"] | None = None
    status: str | None = None
