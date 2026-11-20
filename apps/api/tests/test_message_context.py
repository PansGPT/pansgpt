"""Selections survive replay while sources are freshly authorized."""

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.engines import chat_interactions
from app.engines.message_context import resolve_message_context, saved_message_context
from app.models.chat import StreamChatRequest

DOC = "018f3a30-0001-7000-8000-000000000001"
QUESTION = "018f3a30-0001-7000-8000-000000000011"


def context(action="create_flashcards", document=DOC):
    return {
        "message_context": {
            "action_mode": action,
            "library_document": {"id": document, "title": "Saved title"} if document else None,
        }
    }


@pytest.mark.parametrize("operation", ["retry_message_id", "regenerate_message_id"])
async def test_replay_uses_saved_tool_and_document_and_refreshes_title(tenant_state, operation):
    conn = MagicMock(
        fetchrow=AsyncMock(return_value={"id": UUID(DOC), "title": "Current library title"})
    )
    payload = StreamChatRequest(
        message="Changed client text",
        action_mode="plot_graph",
        document_id=str(UUID(int=99)),
        **{operation: QUESTION},
    )
    result = await resolve_message_context(
        conn, payload, tenant_state.user, {"image_metadata": context()}, [], None
    )
    assert result.action_mode == payload.action_mode == "create_flashcards"
    assert result.library_document.id == payload.document_id == DOC
    assert result.library_document.title == "Current library title"
    assert conn.fetchrow.call_args.args[1:] == (UUID(DOC), tenant_state.user.university_id)
    assert "university_id = $2" in conn.fetchrow.call_args.args[0]
    assert "status = 'active'" in conn.fetchrow.call_args.args[0]


async def test_edit_inherits_omitted_selections_but_explicit_null_clears_them(tenant_state):
    conn = MagicMock(fetchrow=AsyncMock(return_value={"id": UUID(DOC), "title": "Source"}))
    original = {"image_metadata": json.dumps(context())}
    inherited = StreamChatRequest(message="Edited", edit_message_id=QUESTION)
    result = await resolve_message_context(conn, inherited, tenant_state.user, original, [], None)
    assert result.action_mode == "create_flashcards" and result.library_document.id == DOC
    conn.fetchrow.reset_mock()
    cleared = StreamChatRequest(
        message="Edited", edit_message_id=QUESTION, action_mode=None, document_id=None
    )
    result = await resolve_message_context(conn, cleared, tenant_state.user, original, [], None)
    assert result.action_mode is None and result.library_document is None
    conn.fetchrow.assert_not_awaited()


async def test_followup_inherits_only_its_parent_branch_source_not_its_tool(tenant_state):
    conn = MagicMock(fetchrow=AsyncMock(return_value={"id": UUID(DOC), "title": "Source"}))
    payload = StreamChatRequest(message="Explain it further")
    result = await resolve_message_context(
        conn,
        payload,
        tenant_state.user,
        None,
        [{"role": "user", "image_metadata": context()}],
        None,
    )
    assert result.action_mode is None and result.library_document.id == DOC
    cleared = await resolve_message_context(
        conn,
        StreamChatRequest(message="New topic", document_id=None),
        tenant_state.user,
        None,
        [{"role": "user", "image_metadata": context()}],
        None,
    )
    assert cleared.library_document is None


async def test_unavailable_source_blocks_before_claiming_run(tenant_state, monkeypatch):
    conn = MagicMock()

    @asynccontextmanager
    async def transaction():
        yield

    conn.transaction = transaction
    conn.fetchrow = AsyncMock(
        side_effect=[{"id": QUESTION, "active_run_id": None, "busy": False}, None]
    )
    conn.fetch = AsyncMock(return_value=[])
    conn.execute = AsyncMock()

    @asynccontextmanager
    async def database():
        yield conn

    monkeypatch.setattr(chat_interactions, "get_db_connection", database)
    with pytest.raises(HTTPException) as failure:
        await chat_interactions.prepare_turn(
            QUESTION, StreamChatRequest(message="Explain", document_id=DOC), tenant_state.user
        )
    assert failure.value.status_code == 404
    conn.execute.assert_not_awaited()


async def test_fixed_reader_source_cannot_be_replaced_or_disabled(tenant_state):
    conn = MagicMock(fetchrow=AsyncMock(return_value={"id": UUID(DOC), "title": "Reader"}))
    result = await resolve_message_context(
        conn,
        StreamChatRequest(message="Explain", document_id=None),
        tenant_state.user,
        None,
        [],
        DOC,
    )
    assert result.library_document.id == DOC
    with pytest.raises(HTTPException):
        await resolve_message_context(
            conn,
            StreamChatRequest(message="Explain", document_id=str(UUID(int=99))),
            tenant_state.user,
            None,
            [],
            DOC,
        )


def test_legacy_or_malformed_context_is_not_invented():
    for value in (
        None,
        "broken",
        {},
        {"message_context": {"action_mode": "invented"}},
        context(document="bad-id"),
    ):
        assert saved_message_context(value) is None


async def test_api_persists_context_before_provider_failure_and_returns_it_in_init(
    client, tenant_state
):
    session = str(
        next(
            key
            for key, value in tenant_state.sessions.items()
            if value["user_id"] == tenant_state.user.id
        )
    )
    tenant_state.documents[UUID(DOC)]["title"] = "Synthetic source PDF"

    async def unavailable(**kwargs):
        yield "error", {"code": "PROVIDER_ERROR", "retryable": True}, "synthetic"

    tenant_state.ai.side_effect = unavailable
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={"message": "Make cards", "action_mode": "create_flashcards", "document_id": DOC},
    )
    assert response.status_code == 200 and "PROVIDER_ERROR" in response.text
    init = next(
        json.loads(part.split("data: ", 1)[1])
        for part in response.text.split("\n\n")
        if part.startswith("event: init")
    )
    assert init["context"]["action_mode"] == "create_flashcards"
    assert init["context"]["library_document"] == {"id": DOC, "title": "Synthetic source PDF"}
    writes = tenant_state.connection.execute.await_args_list
    saved = next(
        json.loads(call.args[5])
        for call in writes
        if "INSERT INTO public.chat_messages" in call.args[0] and "'user'" in call.args[0]
    )
    assert saved["message_context"] == init["context"]


async def test_explicit_library_source_reaches_retrieval_for_tool_generation(client, tenant_state):
    from app.models.chat import ComplexityLevel, IntentType, QueryClassification, RouteType
    from app.routers import chat

    session = str(
        next(
            key
            for key, value in tenant_state.sessions.items()
            if value["user_id"] == tenant_state.user.id
        )
    )
    chat.intent_classifier.classify.return_value = QueryClassification(
        intent=IntentType.SKILL_GENERATION,
        complexity=ComplexityLevel.COMPLEX,
        route=RouteType.COMPLEX_PATH,
        requires_rag=False,
        requires_tools=True,
        routing_source="model",
        confidence=0.97,
    )
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={
            "message": "Make cards from the selected source",
            "action_mode": "create_flashcards",
            "document_id": DOC,
        },
    )
    assert response.status_code == 200 and "event: text_chunk" in response.text
    tenant_state.retrieval.assert_awaited_once()
    assert tenant_state.retrieval.call_args.kwargs["document_id"] == DOC
    assert tenant_state.retrieval.call_args.kwargs["university_id"] == str(
        tenant_state.user.university_id
    )
    assert "University A content" in tenant_state.ai.call_args.kwargs["system_prompt"]
