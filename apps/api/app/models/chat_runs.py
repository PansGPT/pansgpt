"""Public, owner-authorized snapshots of an already accepted chat run."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.chat import ArtifactReadyPayload, CitationItem
from app.models.progress import ProgressCode, PublicProgressUpdate


class RunToolSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    call_id: str
    tool_name: str
    status: Literal["running", "success", "error"]


class ChatRunSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str | None = None
    status: Literal["idle", "running", "complete", "error", "cancelled", "interrupted"] = "idle"
    request_id: str | None = None
    user_message_id: str | None = None
    assistant_message_id: str | None = None
    content: str = ""
    citations: list[CitationItem] = Field(default_factory=list)
    tools: list[RunToolSnapshot] = Field(default_factory=list)
    artifacts: list[ArtifactReadyPayload] = Field(default_factory=list)
    public_progress: list[PublicProgressUpdate] = Field(default_factory=list)
    error_code: str | None = None
    completion_warning: Literal["additional_work_incomplete"] | None = None
    retryable: bool = True
    tool_started: bool = False
    retry_blocked: bool = False
    activity: ProgressCode | None = None
    elapsed_ms: int = Field(default=0, ge=0)
