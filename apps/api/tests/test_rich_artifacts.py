"""Public rich output validation; no live inference or storage calls."""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.engines.skills import skill_engine
from app.models.study_artifacts import ChartContent


@pytest.mark.asyncio
async def test_chart_preserves_coordinates_and_strips_executable_options() -> None:
    result = await skill_engine.execute_plot_graph(
        "scatter",
        "Synthetic curve",
        {
            "datasets": [{"label": "Series", "data": [{"x": 1, "y": 2}, {"x": 3, "y": 4}]}],
            "options": {"onClick": "not executable"},
        },
    )
    assert result.content["data"]["datasets"][0]["data"][1] == {"x": 3, "y": 4}
    assert "options" not in result.content["data"]


@pytest.mark.parametrize(
    "data",
    [
        {"labels": ["A"], "datasets": [{"label": "Mismatch", "data": [1, 2]}]},
        {"labels": ["A"], "datasets": [{"label": "Infinity", "data": [float("inf")]}]},
        {"labels": ["A"], "datasets": [{"label": "Boolean", "data": [True]}]},
        {"labels": ["A"], "datasets": [{"label": "Text", "data": ["3"]}]},
        {"datasets": [{"label": "Mixed", "data": [1, {"x": 1, "y": 2}]}]},
        {"labels": ["A"] * 201, "datasets": [{"label": "Too large", "data": [1] * 201}]},
    ],
)
def test_rejects_unrenderable_chart_values(data: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        ChartContent.model_validate({"type": "line", "title": "Synthetic", "data": data})


@pytest.mark.asyncio
async def test_flashcards_reject_empty_deck_and_preserve_hint() -> None:
    with pytest.raises(HTTPException) as exc:
        await skill_engine.execute_generate_flashcards("Synthetic", [])
    assert exc.value.status_code == 422
    output = await skill_engine.execute_generate_flashcards(
        "Synthetic", [{"front": "Question", "back": "Answer", "hint": "Hint", "private": "discard"}]
    )
    assert output.content["cards"] == [{"front": "Question", "back": "Answer", "hint": "Hint"}]


@pytest.mark.asyncio
async def test_diagram_contract_uses_bounded_code() -> None:
    output = await skill_engine.execute_plot_graph(
        "mermaid", "Synthetic", {"code": "flowchart LR\n A --> B"}
    )
    assert output.content["data"] == {"code": "flowchart LR\n A --> B"}
    with pytest.raises(HTTPException):
        await skill_engine.execute_plot_graph("mermaid", "Synthetic", {"code": "A" * 12001})
