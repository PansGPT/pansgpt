"""A public activity summary, independently authored from private model reasoning."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ProgressCode = Literal[
    "reviewing_request",
    "checking_materials",
    "searching_sources",
    "reading_document",
    "analysing_image",
    "creating_materials",
    "using_tool",
    "writing_response",
    "planning_presentation",
    "creating_presentation",
    "presentation_ready",
]


def validate_public_label(value: str) -> str:
    if re.search(r"[\x00-\x1f\x7f<>`{}]|https?://|www\.", value, re.IGNORECASE):
        raise ValueError("Public progress must be one plain-text line without links or markup")
    label = " ".join(value.split())
    if not 3 <= len(label) <= 120 or len(label.split()) > 16:
        raise ValueError("Public progress must be a short activity summary")
    if any(len(word) > 40 for word in label.split()):
        raise ValueError("Do not include identifiers or credentials in public progress")
    return label


class PublicProgressLabel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    code: ProgressCode
    label: str = Field(min_length=3, max_length=120)

    _plain_text = field_validator("label")(validate_public_label)


class PublicProgressUpdate(PublicProgressLabel):
    source: Literal["model"] = "model"


def saved_public_progress(value: object) -> list[PublicProgressUpdate]:
    """Read the new typed field only; never reinterpret historical scratchpad text."""
    if not isinstance(value, dict) or not isinstance(value.get("public_progress"), list):
        return []
    updates: list[PublicProgressUpdate] = []
    for item in value["public_progress"][:24]:
        if not isinstance(item, dict) or item.get("source") != "model":
            continue
        try:
            update = PublicProgressUpdate.model_validate(item)
        except ValueError:
            continue
        if update not in updates:
            updates.append(update)
    return updates
