"""Bounded generation and read-only preview contracts for owned presentations."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class PresentationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class PresentationPlan(PresentationModel):
    slide_count: int | None = Field(ge=1, le=30)


class PresentationContentSlide(PresentationModel):
    title: str = Field(min_length=1, max_length=100)
    bullet_points: list[Annotated[str, Field(min_length=1, max_length=240)]] = Field(
        min_length=1, max_length=5
    )
    notes: str = Field(default="", max_length=4000)


class PresentationSource(PresentationModel):
    title: str = Field(min_length=1, max_length=200)
    url: str | None = Field(default=None, max_length=1000)


PresentationOverview = Annotated[str, Field(min_length=20, max_length=600, strict=True)]
Color = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]
Coordinate = Annotated[float, Field(ge=-2000, le=4000)]


class PresentationShape(PresentationModel):
    kind: Literal["rect", "ellipse"]
    x: Coordinate
    y: Coordinate
    width: float = Field(ge=0, le=4000)
    height: float = Field(ge=0, le=4000)
    fill: Color | None
    stroke: Color | None
    stroke_width: float = Field(ge=0, le=20)
    radius: float = Field(ge=0, le=100)


class PresentationText(PresentationModel):
    kind: Literal["text"] = "text"
    x: Coordinate
    y: Coordinate
    text: str = Field(max_length=1000)
    font_size: float = Field(gt=0, le=160)
    bold: bool
    italic: bool
    color: Color
    align: Literal["start", "middle", "end"]


class PresentationSlide(PresentationModel):
    number: int = Field(ge=1, le=30)
    title: str = Field(max_length=500)
    notes: str = Field(max_length=8000)
    background: Color
    elements: list[Annotated[PresentationShape | PresentationText, Field(discriminator="kind")]] = (
        Field(max_length=500)
    )


class PresentationPreviewResponse(PresentationModel):
    title: str = Field(max_length=500)
    width: float = Field(gt=0, le=2000)
    height: float = Field(gt=0, le=2000)
    slides_count: int = Field(ge=1, le=30)
    slides: list[PresentationSlide] = Field(min_length=1, max_length=30)
    warnings: list[str] = Field(max_length=8)
