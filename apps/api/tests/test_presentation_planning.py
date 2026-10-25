"""Context bypass preserves slide requirements without phrase matching or fabricated counts."""

import json
from unittest.mock import AsyncMock

import pytest

from app.engines import presentation_planning as planning


@pytest.fixture
def planner(monkeypatch):
    monkeypatch.setattr(
        type(planning.settings), "provider_privacy_allowed", lambda self, name: name == "groq"
    )
    monkeypatch.setitem(planning.settings.__dict__, "GROQ_API_KEY", "synthetic-plan-key")
    completion = AsyncMock()
    monkeypatch.setattr(planning, "routing_completion", completion)
    return completion


@pytest.mark.parametrize("count", [5, None])
async def test_semantic_count_or_unspecified_is_preserved(planner, count):
    planner.return_value = json.dumps({"slide_count": count})
    history = [
        {"role": "user", "content": "An earlier study discussion", "thinking_text": "PRIVATE"},
        {"role": "system", "content": "PRIVATE"},
    ]
    result = await planning.resolve_presentation_plan(
        "Turn the attached document into five slides", history
    )
    assert result.slide_count == count
    payload = planner.call_args.args[4]
    assert "PRIVATE" not in payload and "five slides" in payload


@pytest.mark.parametrize("output", ['{"slide_count":"five"}', "{}"])
async def test_unverified_constraints_fail_instead_of_silently_inventing_a_count(planner, output):
    planner.return_value = output
    with pytest.raises(RuntimeError):
        await planning.resolve_presentation_plan("Make a deck", [])
