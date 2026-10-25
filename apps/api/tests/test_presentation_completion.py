"""Public summaries retain actual backend references, never model-invented ones."""

import io
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pptx import Presentation

from app.engines.llm import MultiTierLlmEngine
from app.engines.presentation_completion import (
    merge_presentation_sources,
    presentation_confirmation,
)
from app.engines.skills import SKILL_TOOL_DEFINITIONS, skill_engine
from app.engines.tools import CORE_TOOL_DEFINITIONS, tool_engine
from app.models.presentation import PresentationSource
from tests.test_artifact_security import OWNER, UNI


def test_legacy_summary_describes_topics_without_claiming_sources() -> None:
    text = presentation_confirmation(
        {"slides_count": 3, "slide_titles": ["Cover", "Basics", "Review"]}
    )
    assert "3-slide" in text and "It covers Basics, Review." in text
    assert "No source references were attached" in text
    assert "**References" not in text


def test_references_deduplicate_and_escape_document_names_and_unsafe_links() -> None:
    sources = [
        PresentationSource(title="Course [notes]", url=None),
        PresentationSource(title="Course [notes]", url=None),
        PresentationSource(title="Reference", url="https://example.test/a(b)"),
        PresentationSource(title="Untrusted", url="javascript:alert(1)"),
        PresentationSource(title="Embedded credential", url="https://user:password@example.test"),
    ]
    text = presentation_confirmation({"sources": [source.model_dump() for source in sources]})
    assert text.count(r"Course \[notes\]") == 1
    assert "[Reference](<https://example.test/a%28b%29>)" in text
    assert "javascript:" not in text and "password@" not in text
    assert "page" not in text


@pytest.mark.parametrize("tool_name", ["web_search", "rag_search", "read_document"])
def test_backend_tool_reference_shapes_are_retained(tool_name: str) -> None:
    row = {"title": "Retrieved source", "url": "https://example.test/source"}
    result = {
        "web_search": {"status": "success", "results": [row]},
        "rag_search": {"citations": [row]},
        "read_document": {"title": "Retrieved source", "total_pages": 4, "content": "Excerpt"},
    }[tool_name]
    sources = merge_presentation_sources([], tool_name, result)
    assert [source.title for source in sources] == ["Retrieved source"]
    assert sources[0].url == (None if tool_name == "read_document" else row["url"])
    assert not merge_presentation_sources([], tool_name, {**result, "error": "unavailable"})
    assert not merge_presentation_sources([], "create_pptx", result)


def test_completion_bounds_reference_list_and_keeps_overview_plain_text() -> None:
    sources = [PresentationSource(title=f"Reference {i}") for i in range(20)]
    text = presentation_confirmation(
        {
            "overview": "A summary with [an injected link](https://untrusted.test).",
            "sources": [source.model_dump() for source in sources],
        }
    )
    assert r"\[an injected link\]\(https://untrusted.test\)" in text
    assert text.count("- Reference") == 8
    assert "8 more references" in text


@pytest.mark.parametrize("overview", ["short", " " * 40, "x" * 601, 123])
async def test_invalid_overview_fails_before_upload(
    overview: object, monkeypatch: pytest.MonkeyPatch
) -> None:
    upload = AsyncMock()
    monkeypatch.setattr(skill_engine, "_safe_r2_upload", upload)
    with pytest.raises(HTTPException) as error:
        await skill_engine.dispatch_skill(
            "create_pptx",
            {"title": "Synthetic deck", "slides": [], "slide_count": 1, "overview": overview},
            user_id=OWNER,
            university_id=UNI,
        )
    assert error.value.status_code == 422
    upload.assert_not_awaited()


async def test_tool_search_references_reach_deck_notes_metadata_and_completion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = MultiTierLlmEngine()
    engine.gemini_key = "fixture-provider"
    engine.groq_key = engine.openrouter_key = ""
    monkeypatch.setattr(engine, "_record_telemetry", AsyncMock())
    monkeypatch.setattr(
        "app.engines.skill_registry.available_tools",
        AsyncMock(return_value=CORE_TOOL_DEFINITIONS + SKILL_TOOL_DEFINITIONS),
    )
    monkeypatch.setattr(
        skill_engine, "_safe_r2_upload", AsyncMock(return_value=("fixture.pptx", "/fixture"))
    )
    monkeypatch.setattr(
        tool_engine,
        "dispatch_tool",
        AsyncMock(
            return_value={
                "status": "success",
                "results": [
                    {
                        "title": "Retrieved study reference",
                        "url": "https://example.test/study",
                        "content": "A study excerpt",
                    }
                ],
            }
        ),
    )

    async def empty_text() -> AsyncIterator[str]:
        if False:
            yield ""

    call = AsyncMock(
        side_effect=[
            (
                [{"id": "search", "name": "web_search", "arguments": {"query": "study"}}],
                empty_text(),
            ),
            (
                [
                    {
                        "id": "deck",
                        "name": "create_pptx",
                        "arguments": {
                            "title": "Synthetic study deck",
                            "slide_count": 2,
                            "overview": "The deck introduces a synthetic study topic. It closes with a focused revision outline.",
                            "slides": [
                                {"title": "Study outline", "bullet_points": ["A concise point"]}
                            ],
                            "sources": [{"title": "Invented", "url": "https://invented.test"}],
                        },
                    }
                ],
                empty_text(),
            ),
        ]
    )
    monkeypatch.setattr(engine, "_call_gemma_turn", call)
    events = [
        event
        async for event in engine.stream_agentic_chat(
            "Study tutor", "Make a presentation", user_id=OWNER, university_id=UNI
        )
    ]
    artifact = next(payload for kind, payload, _ in events if kind == "artifact_ready")
    assert artifact.content["sources"] == [
        {"title": "Retrieved study reference", "url": "https://example.test/study"}
    ]
    text = "".join(payload["token"] for kind, payload, _ in events if kind == "text_chunk")
    assert artifact.content["overview"] in text
    assert "[Retrieved study reference](<https://example.test/study>)" in text
    assert "Invented" not in text
    assert call.await_count == 2
    saved = skill_engine._safe_r2_upload.call_args.args[1]
    notes = Presentation(io.BytesIO(saved)).slides[0].notes_slide.notes_text_frame.text
    assert "https://example.test/study" in notes and "Invented" not in notes
