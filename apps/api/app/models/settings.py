from datetime import datetime
from typing import Literal

from pydantic import UUID7, BaseModel, ConfigDict, Field, field_validator

from app.core.schemas import StrictRequest


class PasswordUpdateRequest(StrictRequest):
    password: str = Field(min_length=8, max_length=128, repr=False)
    current_password: str | None = Field(default=None, min_length=1, max_length=128, repr=False)
    nonce: str | None = Field(default=None, pattern=r"^[0-9]{6,10}$", repr=False)


class PasswordUpdateResponse(BaseModel):
    status: Literal["updated"] = "updated"


class PasswordConfirmationResponse(BaseModel):
    status: Literal["sent"] = "sent"


class AccountSession(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    device: str
    device_type: Literal["mobile", "desktop", "unknown"]
    ip_address: str | None
    created_at: datetime | None
    last_active_at: datetime | None
    is_current: bool


class AccountSessionsResponse(BaseModel):
    sessions: list[AccountSession]
    has_more: bool


class RevokeSessionsResponse(BaseModel):
    status: Literal["revoked"] = "revoked"
    revoked_count: int = Field(ge=0)


class FeedbackRequest(StrictRequest):
    request_id: UUID7 = Field(strict=False)
    category: Literal["bug", "account", "content", "billing", "other"]
    description: str = Field(min_length=1, max_length=4000)

    @field_validator("description")
    @classmethod
    def meaningful(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Enter a message.")
        return value.strip()


class FeedbackResponse(BaseModel):
    id: str
    status: Literal["received"] = "received"
