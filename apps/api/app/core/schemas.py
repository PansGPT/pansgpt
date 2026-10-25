"""Strict public request boundaries; outputs retain explicit compatibility schemas."""

from pydantic import BaseModel, ConfigDict


class StrictRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
