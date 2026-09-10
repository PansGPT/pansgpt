# ==============================================================================
# PansGPT 2.0 Chat & RAG Pydantic Models (Phase 6)
# ==============================================================================


from pydantic import BaseModel, Field


class CitationItem(BaseModel):
    """Verifiable clinical citation referencing course monograph chunk."""

    chunk_id: str
    document_id: str
    title: str = "Course Material"
    course_code: str | None = None
    page_start: int = 1
    page_end: int = 1
    similarity: float = Field(..., ge=0.0, le=1.0)
    snippet: str


class ChatSessionCreateRequest(BaseModel):
    """Payload to create a new chat conversation thread."""

    title: str | None = Field(default="New Chat", max_length=120)
    document_id: str | None = None


class ChatSessionResponse(BaseModel):
    """Chat session metadata."""

    id: str
    user_id: str
    title: str
    document_id: str | None = None
    summary: str | None = None
    created_at: str
    updated_at: str


class ChatSessionListResponse(BaseModel):
    """List of chat sessions for a user."""

    sessions: list[ChatSessionResponse]
    total: int


class ChatMessageCreateRequest(BaseModel):
    """Direct message creation payload."""

    content: str = Field(..., min_length=1)
    parent_message_id: str | None = None
    image_keys: list[str] | None = None


class ChatMessageResponse(BaseModel):
    """Individual chat message with optional citations and thinking."""

    id: str
    session_id: str
    role: str
    content: str
    parent_message_id: str | None = None
    branch_index: int = 0
    is_active_branch: bool = True
    citations: list[CitationItem] | None = None
    thinking_text: str | None = None
    created_at: str


class StreamChatRequest(BaseModel):
    """Payload for POST /api/v1/ai/chat/sessions/{id}/stream."""

    message: str = Field(..., min_length=1, max_length=10000)
    parent_message_id: str | None = None
    document_id: str | None = None
    course_code: str | None = None
    enable_rag: bool = True
