# ==============================================================================
# PansGPT 2.0 Chat & RAG Pydantic Models (Phase 6)
# ==============================================================================

from enum import StrEnum
from typing import Any, Literal  # [CHAT FIX 2]

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.schemas import StrictRequest
from app.models.presentation import PresentationPlan
from app.models.web_search import EvidenceSource, SearchScope


class IntentType(StrEnum):
    """Categorized student query intent."""

    GREETING_CONVERSATIONAL = "greeting_conversational"
    DIRECT_DEFINITION = "direct_definition"
    GENERAL_ASSISTANCE = "general_assistance"
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
    requires_web: bool = False
    search_scope: SearchScope = "biomedical"
    current_information: bool = False
    public_search_query: bool = False
    clinical_risk: bool = False
    confidence: float = Field(ge=0.0, le=1.0, description="Classification confidence score")
    suggested_skills: list[str] = Field(default_factory=list, description="Target skill tool names")
    extracted_topic: str | None = None
    bypass_reason: str | None = None
    # Internal routing metadata; never forwarded as public reasoning.
    direct_answer: str | None = None
    retrieval_query: str | None = None
    presentation: PresentationPlan | None = None
    routing_provider: str | None = None
    routing_model: str | None = None
    routing_latency_ms: int = Field(default=0, ge=0)
    routing_prompt_tokens: int = Field(default=0, ge=0)
    routing_completion_tokens: int = Field(default=0, ge=0)
    routing_source: Literal["model", "server_context", "fallback"] = "fallback"


class SemanticDecision(BaseModel):
    """Private provider decision. Backend validation derives the executable route."""

    model_config = ConfigDict(extra="forbid", strict=True)
    action: Literal["answer", "clarify", "grounded"]
    intent: IntentType
    evidence_source: EvidenceSource
    requires_tools: bool
    clinical_risk: bool
    search_scope: SearchScope
    current_information: bool
    public_search_query: bool
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    answer: str = Field(max_length=4000)
    retrieval_query: str | None = Field(max_length=1000)
    presentation: PresentationPlan | None


class BoundingBoxCoordinates(BaseModel):
    """Normalized page coordinate geometry for PDF deep linking and canvas highlighting."""

    page: int
    page_width: float | None = None
    page_height: float | None = None
    bbox: list[float] | None = None  # Tight union [x0, y0, x1, y1] normalized to [0.0, 1.0]
    rects: list[list[float]] | None = None  # Array of line-level rectangles normalized


class CitationItem(BaseModel):
    """Verifiable clinical citation referencing course monograph chunk."""

    chunk_id: str | None = None  # [CHAT FIX 2]
    document_id: str | None = None  # [CHAT FIX 2]
    source_type: Literal["document", "web"] = "document"  # [CHAT FIX 2]
    url: str | None = None  # [CHAT FIX 2]
    title: str = "Course Material"
    course_code: str | None = None
    page_start: int | None = 1  # [CHAT FIX 2]
    page_end: int | None = 1  # [CHAT FIX 2]
    similarity: float = Field(default=0.5, ge=0.0, le=1.0)
    snippet: str
    dense_score: float | None = None
    fts_score: float | None = None
    trgm_score: float | None = None
    rrf_score: float | None = None
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    bounding_box: BoundingBoxCoordinates | dict[str, Any] | None = None


class ChatSessionCreateRequest(StrictRequest):
    """Payload to create a new chat conversation thread."""

    title: str | None = Field(default="New Chat", max_length=120)
    document_id: str | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        if value is not None:
            value = " ".join(value.split())
            if not value:
                raise ValueError("Enter a conversation title.")
        return value


class ChatSessionResponse(BaseModel):
    """Chat session metadata."""

    id: str
    user_id: str
    title: str
    document_id: str | None = None
    summary: str | None = None
    created_at: str
    updated_at: str
    is_pinned: bool = False
    archived_at: str | None = None
    title_source: Literal["pending", "generated", "manual"] = "pending"
    last_message_at: str | None = None


class ChatSearchResult(BaseModel):
    session_id: str
    title: str
    message_id: str | None = None
    snippet: str
    is_archived: bool
    last_message_at: str | None = None


class ChatSearchResponse(BaseModel):
    results: list[ChatSearchResult]
    next_offset: int | None = None


class DeletedChatSession(ChatSessionResponse):
    deleted_at: str


class ChatTrashResponse(BaseModel):
    sessions: list[DeletedChatSession]
    next_offset: int | None = None


class ChatSessionUpdateRequest(StrictRequest):
    title: str | None = Field(default=None, max_length=120)
    is_pinned: bool | None = None
    archived: bool | None = None

    @field_validator("title", "is_pinned", "archived", mode="before")
    @classmethod
    def reject_null(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Provide a value, not null.")
        return value

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        if value is not None:
            value = " ".join(value.split())
            if not value:
                raise ValueError("Enter a conversation title.")
        return value

    @model_validator(mode="after")
    def require_change(self) -> "ChatSessionUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Provide at least one change.")
        return self


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
    """Individual chat message with citations and optional public workflow progress."""

    id: str
    session_id: str
    role: str
    content: str
    parent_message_id: str | None = None
    branch_index: int = 0
    is_active_branch: bool = True
    citations: list[CitationItem] | None = None
    thinking_text: str | None = None
    extra_parts: dict[str, Any] | None = None
    attachment_metadata: dict[str, Any] | None = None
    feedback: Literal["positive", "negative"] | None = None
    created_at: str


class StreamChatRequest(StrictRequest):
    """Payload for POST /api/v1/ai/chat/sessions/{id}/stream."""

    message: str = Field(..., min_length=1, max_length=10000)
    parent_message_id: str | None = None
    document_id: str | None = None
    course_code: str | None = None
    enable_rag: bool = True
    expand_full_segment: bool = False
    enable_tools: bool = True
    history: list[dict[str, Any]] | None = None
    edit_message_id: str | None = None
    regenerate_message_id: str | None = None
    attachment_ids: list[str] = Field(default_factory=list, max_length=4)


class ChatBranchRequest(StrictRequest):
    message_id: str


class ChatFeedbackRequest(StrictRequest):
    rating: Literal["positive", "negative"]
    comment: str | None = Field(default=None, max_length=1000)


class ChatAttachmentResponse(BaseModel):
    id: str
    name: str
    content_type: str
    size: int


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
