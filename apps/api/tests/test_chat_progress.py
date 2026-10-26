"""Only public workflow stages may reach SSE, persistence or history."""

import json
import uuid
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.engines.chat_progress import ChatProgress, public_progress_text
from app.models.chat import (
    ComplexityLevel,
    IntentType,
    QueryClassification,
    RouteType,
    SemanticDecision,
)
from app.models.progress import PublicProgressLabel, saved_public_progress
from app.routers import chat
from tests.conftest import TenantTestState


def test_public_progress_is_allowlisted_and_deduplicated():
    progress = ChatProgress()
    assert "reviewing_request" in progress.emit("reviewing_request")
    assert progress.emit("reviewing_request") is None
    assert progress.emit("untrusted model paragraph") is None
    assert "searching_sources" in progress.for_tool("web_search")
    assert "creating_presentation" in progress.for_tool("create_pptx")
    assert (
        public_progress_text(
            "```\nPRIVATE PLAN\n```\nReviewing your request.\nReviewing your request."
        )
        == "Reviewing your request."
    )


def test_model_copy_waits_for_its_actual_phase_and_invalid_copy_is_ignored() -> None:
    progress = ChatProgress()
    progress.configure(
        [
            PublicProgressLabel(code="searching_sources", label="Looking up the match report"),
            PublicProgressLabel(
                code="creating_presentation", label="Laying out your revision slides"
            ),
        ]
    )
    assert not progress.updates
    assert "public_progress" not in progress.emit("checking_materials")
    update = progress.emit("searching_sources")
    assert "Looking up the match report" in update
    assert progress.emit("searching_sources") is None
    assert progress.updates[0].source == "model"
    assert "slides" not in str(progress.updates)
    assert (
        progress.for_tool("read_document", "<think>private</think>").count("public_progress") == 0
    )
    assert progress.for_tool("read_document", "Reading the enzyme diagram")
    assert [item.label for item in progress.updates] == [
        "Looking up the match report",
        "Reading the enzyme diagram",
    ]


def test_history_public_updates_require_the_new_structured_field() -> None:
    good = {
        "code": "checking_materials",
        "label": "Checking the lecture evidence",
        "source": "model",
    }
    assert saved_public_progress("PRIVATE RAW THINKING") == []
    updates = saved_public_progress(
        {
            "public_progress": [
                good,
                good,
                {**good, "source": "private"},
                {**good, "label": "```PRIVATE```"},
                {**good, "code": "invented"},
            ]
        }
    )
    assert len(updates) == 1 and updates[0].label == good["label"]


def test_bad_status_metadata_does_not_break_a_valid_routing_answer() -> None:
    from tests.test_intent_classifier import decision

    value = SemanticDecision.model_validate_json(
        decision(public_progress=[{"code": "writing_response", "label": "```bad```"}])
    )
    assert value.answer and value.public_progress == []


async def test_dynamic_progress_streams_and_persists_without_unexecuted_phases_or_private_thoughts(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    classification = QueryClassification(
        intent=IntentType.GENERAL_ASSISTANCE,
        complexity=ComplexityLevel.COMPLEX,
        route=RouteType.COMPLEX_PATH,
        requires_rag=False,
        requires_tools=True,
        confidence=0.95,
        routing_source="model",
        public_progress=[
            PublicProgressLabel(code="checking_materials", label="UNEXECUTED ACTIVITY"),
            PublicProgressLabel(code="writing_response", label="Explaining the revision diagram"),
        ],
    )
    monkeypatch.setattr(chat.intent_classifier, "classify", AsyncMock(return_value=classification))
    monkeypatch.setattr(chat.llm_engine, "_record_telemetry", AsyncMock())

    async def inference(**kwargs: object) -> AsyncIterator[tuple[str, dict[str, object], str]]:
        yield (
            "thinking_chunk",
            {"token": "PRIVATE MODEL REASONING", "source": "model", "label": "PRIVATE"},
            "mock",
        )
        yield (
            "tool_start",
            {
                "call_id": "diagram",
                "tool_name": "read_document",
                "arguments": {},
                "public_status": "Reading the revision diagram",
            },
            "mock",
        )
        yield (
            "tool_end",
            {"call_id": "diagram", "tool_name": "read_document", "status": "success"},
            "mock",
        )
        yield "text_chunk", {"token": "Visible explanation."}, "mock"

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", inference)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Explain the diagram"},
    )
    assert response.status_code == 200
    assert "PRIVATE" not in response.text and "UNEXECUTED" not in response.text
    assert "event: public_progress" in response.text
    assert response.text.index("Reading the revision diagram") < response.text.index(
        "event: tool_start"
    )
    saves = [
        call.args
        for call in tenant_state.connection.execute.await_args_list
        if "INSERT INTO public.chat_messages" in call.args[0] and "'assistant'" in call.args[0]
    ]
    saved = json.loads(saves[-1][7])["public_progress"]
    assert [item["label"] for item in saved] == [
        "Reading the revision diagram",
        "Explaining the revision diagram",
    ]
    assert all(item["source"] == "model" for item in saved)
    tenant_state.retrieval.assert_not_awaited()


async def test_raw_provider_scratchpad_never_streams_or_persists(client, tenant_state, monkeypatch):
    async def inference(**kwargs):
        yield "thinking_chunk", {"token": "PRIVATE PROVIDER PLAN\n    raw code block"}, "mock"
        yield "thinking_chunk", {"delta": "PRIVATE PROVIDER PLAN"}, "mock"
        yield "text_chunk", {"token": "<thi"}, "mock"
        yield "text_chunk", {"token": "nk>PRIVATE TAGGED PLAN</thi"}, "mock"
        yield "text_chunk", {"token": "nk>Visible study response."}, "mock"

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", inference)
    session_id = "018f3a30-0001-7000-8000-000000000001"
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json={"message": "Hello", "enable_rag": False},
    )
    assert response.status_code == 200
    assert "Visible study response." in response.text
    assert "PRIVATE" not in response.text
    stages = [
        json.loads(frame.split("data: ", 1)[1])
        for frame in response.text.split("\n\n")
        if frame.startswith("event: thinking_chunk")
    ]
    assert [stage["code"] for stage in stages] == [
        "reviewing_request",
        "checking_materials",
        "writing_response",
    ]
    saves = [
        call.args
        for call in tenant_state.connection.execute.await_args_list
        if "INSERT INTO public.chat_messages" in call.args[0] and "'assistant'" in call.args[0]
    ]
    assert saves and "PRIVATE" not in str(saves)
    assert (
        saves[-1][6]
        == "Reviewing your request.\nChecking your course materials.\nPreparing your response."
    )


async def test_legacy_raw_thinking_is_not_returned_in_history(client, tenant_state):
    session_id = "018f3a30-0001-7000-8000-000000000001"
    tenant_state.connection.fetch = AsyncMock(
        return_value=[
            {
                "id": uuid.uuid4(),
                "session_id": uuid.UUID(session_id),
                "role": "assistant",
                "content": "Visible answer.",
                "parent_message_id": None,
                "branch_index": 0,
                "is_active_branch": True,
                "citations": None,
                "thinking_text": "PRIVATE SAVED PLAN\n    raw code block",
                "tool_calls": json.dumps(
                    {
                        "public_progress": [
                            {
                                "code": "reading_document",
                                "label": "Reading the enzyme sketch",
                                "source": "model",
                            },
                            {
                                "code": "reading_document",
                                "label": "<think>PRIVATE</think>",
                                "source": "model",
                            },
                        ]
                    }
                ),
                "image_metadata": None,
                "created_at": "2026-10-23T00:00:00Z",
            }
        ]
    )
    response = await client.get(f"/api/v1/ai/chat/sessions/{session_id}")
    assert response.status_code == 200
    assert response.json()["messages"][0]["thinking_text"] is None
    assert response.json()["messages"][0]["public_progress"] == [
        {"code": "reading_document", "label": "Reading the enzyme sketch", "source": "model"}
    ]
    assert "PRIVATE" not in response.text


async def test_artifact_preparation_progress_precedes_private_reasoning_and_tool_dispatch(
    client, tenant_state, monkeypatch
):
    monkeypatch.setattr(
        chat.intent_classifier,
        "classify",
        AsyncMock(
            return_value=QueryClassification(
                intent=IntentType.SKILL_GENERATION,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=False,
                requires_tools=True,
                confidence=0.97,
                routing_source="model",
                routing_provider="groq",
                routing_model="synthetic-router",
            )
        ),
    )

    async def inference(**kwargs):
        yield "thinking_chunk", {"token": "PRIVATE SLIDE PLANNING"}, "google"
        yield (
            "tool_start",
            {"call_id": "synthetic-pptx", "tool_name": "create_pptx", "arguments": {}},
            "google",
        )
        yield (
            "tool_end",
            {"call_id": "synthetic-pptx", "tool_name": "create_pptx", "status": "success"},
            "google",
        )
        yield "text_chunk", {"token": "Your presentation is ready."}, "google"

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", inference)
    monkeypatch.setattr(chat.llm_engine, "_record_telemetry", AsyncMock())
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Create a presentation from our earlier explanation"},
    )
    assert "PRIVATE" not in response.text
    assert response.text.count('"code": "creating_materials"') == 1
    assert response.text.index('"code": "creating_materials"') < response.text.index(
        "event: tool_start"
    )
    tenant_state.retrieval.assert_not_awaited()
