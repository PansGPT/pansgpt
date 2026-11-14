"""Public governance contracts. No raw profile, storage key or private study data."""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.schemas import StrictRequest

Resource = Literal[
    "invitations",
    "universities",
    "students",
    "lecturers",
    "administrators",
    "materials",
    "timetable",
    "exams",
    "restrictions",
    "knowledge",
    "terms",
    "support",
    "audit",
    "settings",
]
Action = Literal[
    "create",
    "update",
    "approve",
    "reject",
    "suspend",
    "activate",
    "archive",
    "cancel",
    "delete",
    "restore",
    "retry",
    "resubmit",
    "reply",
]
Role = Literal["super_admin", "senior", "standard", "lecturer"]


class Identity(BaseModel):
    user_id: str
    name: str
    role: Role
    university_id: str | None
    university_name: str
    resources: list[Resource]


class Record(BaseModel):
    id: str
    title: str
    subtitle: str
    status: str
    updated_at: str
    fields: dict[str, str]
    actions: list[Action]


class Page(BaseModel):
    items: list[Record]
    total: int
    page: int
    page_size: int


class Command(StrictRequest):
    action: Action
    id: UUID | None = Field(default=None, strict=False)
    expected_version: str | None = Field(default=None, max_length=100)
    reason: str = Field(min_length=3, max_length=1000)
    fields: dict[str, str] = Field(default_factory=dict, max_length=20)

    @field_validator("reason")
    @classmethod
    def meaningful_reason(cls, value: str) -> str:
        if len(value.strip()) < 3:
            raise ValueError("Explain the reason for this change.")
        return value.strip()

    @field_validator("fields")
    @classmethod
    def bounded_fields(cls, values: dict[str, str]) -> dict[str, str]:
        if any(len(k) > 64 or len(v) > 16000 for k, v in values.items()):
            raise ValueError("Field exceeds the allowed size.")
        return {k: v.strip() for k, v in values.items()}


class Mutation(BaseModel):
    id: str
    message: str
    invite_url: str | None = None


class BatchCommand(StrictRequest):
    commands: list[Command] = Field(min_length=1, max_length=100)


class BatchItem(BaseModel):
    id: str
    success: bool
    message: str


class BatchResult(BaseModel):
    items: list[BatchItem]


class Metric(BaseModel):
    label: str
    value: float
    unit: str


class Daily(BaseModel):
    date: str
    requests: int
    tokens: int


class Provider(BaseModel):
    provider: str
    requests: int
    tokens: int
    latency_ms: float
    failures: int


class Analytics(BaseModel):
    metrics: list[Metric]
    daily: list[Daily]
    providers: list[Provider]
