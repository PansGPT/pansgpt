# ==============================================================================
# PansGPT 2.0 Chat & RAG Pydantic Models (Phase 6)
# ==============================================================================

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class IntentType(StrEnum):
    """Categorized student query intent."""

    GREETING_CONVERSATIONAL = "greeting_conversational"
    DIRECT_DEFINITION = "direct_definition"
    COURSE_RETRIEVAL = "course_retrieval"
    SKILL_GENERATION = "skill_generation"
    CLINICAL_REASONING = "clinical_reasoning"
    UNCERTAIN = "uncertain"


class ComplexityLevel(StrEnum):
    """Execution complexity classification."""

    SIMPLE = "simple"
    COMPLEX = "complex"


class RouteType(StrEnum):
    """Execution pipeline routing decision."""

    FAST_PATH = "fast_path"
    COMPLEX_PATH = "complex_path"


class QueryClassification(BaseModel):
    """Result of intent and complexity classification."""

    intent: IntentType
    complexity: ComplexityLevel
    route: RouteType
    requires_rag: bool
    requires_tools: bool
    confidence: float = Field(ge=0.0, le=1.0, description="Classification confidence score")
    suggested_skills: list[str] = Field(default_factory=list, description="Target skill tool names")
    extracted_topic: str | None = None
    bypass_reason: str | None = None


class BoundingBoxCoordinates(BaseModel):
    """Normalized page coordinate geometry for PDF deep linking and canvas highlighting."""

    page: int
    page_width: float | None = None
    page_height: float | None = None
    bbox: list[float] | None = None  # Tight union [x0, y0, x1, y1] normalized to [0.0, 1.0]
    rects: list[list[float]] | None = None  # Array of line-level rectangles normalized


class CitationItem(BaseModel):
    """Verifiable clinical citation referencing course monograph chunk."""

    chunk_id: str
    document_id: str
    title: str = "Course Material"
    course_code: str | None = None
    page_start: int = 1
    page_end: int = 1
    similarity: float = Field(default=0.5, ge=0.0, le=1.0)
    snippet: str
    dense_score: float | None = None
    fts_score: float | None = None
    trgm_score: float | None = None
    rrf_score: float | None = None
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    bounding_box: BoundingBoxCoordinates | dict[str, Any] | None = None


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
    expand_full_segment: bool = False
    enable_tools: bool = True
    history: list[dict[str, Any]] | None = None


class ToolCallPayload(BaseModel):
    """SSE payload for tool_start event."""

    call_id: str
    tool_name: str
    arguments: dict[str, Any]


class ToolResultPayload(BaseModel):
    """SSE payload for tool_end event."""

    call_id: str
    tool_name: str
    status: str  # 'success' | 'error'
    result: Any
    duration_ms: int = 0


class ArtifactReadyPayload(BaseModel):
    """SSE payload for artifact_ready event."""

    skill_name: str
    title: str
    mime_type: str
    file_extension: str
    storage_key: str | None = None
    download_url: str | None = None
    content: Any = None


class VoiceTranscribeResponse(BaseModel):
    """Payload returned by POST /api/v1/ai/chat/transcribe."""

    text: str
    language: str = "en"
    duration: float | None = None
    latency_ms: float | None = None
    model: str = "whisper-large-v3-turbo"
    provider: str = "groq-whisper"
    word_count: int = 0
    is_silent: bool = False
