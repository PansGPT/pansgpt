"""Bounded public rich-output contracts, paired with packages/types/study-artifacts.ts."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Text = Annotated[str, Field(min_length=1, max_length=12000)]
Number = Annotated[float, Field(ge=-1e12, le=1e12, allow_inf_nan=False, strict=True)]


class PublicContent(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class StudyFlashcard(PublicContent):
    front: Text
    back: Text
    hint: Text | None = None
    difficulty: Literal["easy", "medium", "hard"] | None = None


class FlashcardContent(PublicContent):
    topic: Text
    cards: list[StudyFlashcard] = Field(min_length=1, max_length=100)
    total: int = Field(ge=1, le=100)

    @model_validator(mode="after")
    def check_total(self) -> "FlashcardContent":
        if self.total != len(self.cards):
            raise ValueError("Card count must match the deck")
        return self


class MnemonicContent(PublicContent):
    concept: Text
    mnemonic: Text
    breakdown: list[Text] = Field(min_length=1, max_length=100)
    clinical_notes: Text | None = None


class ChemicalContent(PublicContent):
    compound_name: Text
    smiles: str = Field(min_length=1, max_length=2000)
    formula: Text | None = None
    notes: Text | None = None


class ChartPoint(PublicContent):
    x: Number
    y: Number


class ChartDataset(PublicContent):
    label: str = Field(max_length=160)
    data: list[Number | ChartPoint] = Field(min_length=1, max_length=200)


class ChartData(PublicContent):
    labels: list[Annotated[str, Field(max_length=160)]] | None = Field(default=None, max_length=200)
    datasets: list[ChartDataset] = Field(min_length=1, max_length=8)
    x_label: str | None = Field(default=None, max_length=160)
    y_label: str | None = Field(default=None, max_length=160)


class ChartContent(PublicContent):
    type: Literal["line", "bar", "scatter"]
    title: Text
    data: ChartData

    @model_validator(mode="after")
    def check_coordinates(self) -> "ChartContent":
        for dataset in self.data.datasets:
            numeric = all(isinstance(point, float) for point in dataset.data)
            points = all(isinstance(point, ChartPoint) for point in dataset.data)
            if numeric:
                if self.type == "scatter" or len(self.data.labels or []) != len(dataset.data):
                    raise ValueError("Numeric charts require matching labels")
            elif not points or self.type == "bar":
                raise ValueError("Use coordinates for scatter/line, labelled values for bar")
        return self


class DiagramData(PublicContent):
    code: Text


class DiagramContent(PublicContent):
    type: Literal["mermaid"]
    title: Text
    data: DiagramData
