import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.chat import ChatSessionResponse
from app.models.library_catalog import LibraryDocument


class ReaderResponse(BaseModel):
    document: LibraryDocument
    chat_session_id: str | None


class ReaderConversationsResponse(BaseModel):
    sessions: list[ChatSessionResponse]
    next_offset: int | None


class ReaderProgressRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    page: int = Field(ge=1, le=100_000)


class ReaderRect(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def fits_page(self) -> "ReaderRect":
        if self.x + self.width > 1.00001 or self.y + self.height > 1.00001:
            raise ValueError("Highlight rectangles must fit inside the page.")
        return self


class ReaderHighlightRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    page_number: int = Field(ge=1, le=100_000)
    color: Literal["yellow", "green", "blue", "pink"]
    selected_text: str = Field(min_length=1, max_length=6000)
    rects: list[ReaderRect] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def has_text(self) -> "ReaderHighlightRequest":
        if not self.selected_text.strip():
            raise ValueError("Select some text to highlight.")
        return self


class ReaderHighlight(ReaderHighlightRequest):
    id: str
    document_id: str
    created_at: str


class ReaderHighlightsResponse(BaseModel):
    items: list[ReaderHighlight]
    next_offset: int | None


class ReaderSnipRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    document_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    page_number: int = Field(ge=1, le=100_000)
    rect: ReaderRect

    @field_validator("document_id")
    @classmethod
    def document_uuid(cls, value: str) -> str:
        return str(uuid.UUID(value))


class ReaderSnipOrigin(ReaderSnipRequest):
    source: Literal["reader_snip_v1"]
