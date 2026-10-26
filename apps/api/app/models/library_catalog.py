from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LibraryDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    course_code: str
    course_title: str
    topic: str | None
    lecturer_name: str | None
    page_count: int = Field(ge=0)
    file_size_bytes: int = Field(ge=0)
    mime_type: str
    status: Literal["pending_review", "active", "rejected", "archived"]
    embedding_status: str
    target_levels: list[str]
    academic_session: str | None
    semester: Literal["first", "second"] | None
    created_at: str
    updated_at: str
    last_opened_at: str | None
    last_page_read: int | None = Field(ge=1)


class LibraryCourse(BaseModel):
    code: str
    title: str
    document_count: int = Field(ge=0)


class LibraryCatalogResponse(BaseModel):
    items: list[LibraryDocument]
    total: int = Field(ge=0)
    limit: int
    offset: int
    courses: list[LibraryCourse]
    academic_sessions: list[str]


class LibraryOpenedResponse(BaseModel):
    document_id: str
    last_opened_at: str
    last_page_read: int
    total_pages: int
