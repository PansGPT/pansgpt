"""Typed results of backend-only public web retrieval."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SearchScope = Literal["general", "biomedical"]
EvidenceSource = Literal["none", "course", "web", "course_and_web"]
WebSearchStatus = Literal[
    "success",
    "empty",
    "disabled",
    "not_configured",
    "privacy_blocked",
    "sensitive_query",
    "quota_exceeded",
    "quota_unavailable",
    "timeout",
    "provider_error",
    "identity_required",
    "tools_disabled",
]


class WebReference(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=True)
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=1, max_length=2000)
    content: str = Field(min_length=1, max_length=8000)


class WebSearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=True)
    status: WebSearchStatus
    results: list[WebReference] = Field(default_factory=list, max_length=8)
    source: str = "tavily"
    cached: bool = False
    quota_used: int | None = None
    quota_limit: int | None = None
    message: str | None = None
