"""Voice and selected dialogue reach both answer paths without extra simple generation."""

import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.engines import intent_classifier as routing
from app.engines.guard import ASSISTANT_IDENTITY, ASSISTANT_VOICE
from app.engines.intent_classifier import IntentClassifier
from app.models.chat import IntentType
from app.routers import chat
from tests.conftest import TenantTestState
from tests.test_intent_classifier import decision

CASES: list[dict[str, object]] = json.loads(
    (Path(__file__).parent / "fixtures/chat-voice.json").read_text(encoding="utf-8")
)


@pytest.mark.parametrize("case", CASES, ids=[str(case["id"]) for case in CASES])
@pytest.mark.parametrize("streamed", [False, True], ids=["direct", "streamed"])
@pytest.mark.parametrize("bound", [False, True], ids=["normal", "study"])
async def test_owned_dialogue_and_voice_reach_both_response_paths(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    case: dict[str, object],
    streamed: bool,
    bound: bool,
) -> None:
    history = case["history"]
    assert isinstance(history, list) and len(history) == 2
    parent = uuid.UUID(int=2)
    rows = [
        {
            "id": uuid.UUID(int=1),
            "role": "user",
            "content": history[0]["content"],
            "parent_message_id": None,
            "is_active_branch": True,
        },
        {
            "id": parent,
            "role": "assistant",
            "content": history[1]["content"],
            "parent_message_id": uuid.UUID(int=1),
            "is_active_branch": True,
        },
        {
            "id": uuid.UUID(int=3),
            "role": "assistant",
            "content": "UNSELECTED PRIVATE BRANCH",
            "parent_message_id": uuid.UUID(int=1),
            "is_active_branch": False,
        },
    ]
    tenant_state.connection.fetch.side_effect = None
    tenant_state.connection.fetch.return_value = rows
    original_fetchrow = tenant_state.connection.fetchrow.side_effect

    async def fetchrow(sql: str, *args: object) -> dict[str, object] | None:
        if "FROM public.chat_messages WHERE id = $1 AND session_id = $2" in sql:
            return next((row for row in rows if row["id"] == args[0]), None)
        return await original_fetchrow(sql, *args)

    tenant_state.connection.fetchrow.side_effect = fetchrow
    session_id = next(iter(tenant_state.sessions))
    if bound:
        tenant_state.sessions[session_id]["document_id"] = next(iter(tenant_state.documents))
    completion = AsyncMock(
        return_value=decision(
            action="grounded" if streamed else "answer",
            response_mode="extended" if streamed else "brief",
            intent="general_assistance",
            search_scope="general",
            answer="" if streamed else "Synthetic contextual reply.",
        )
    )
    monkeypatch.setattr(routing, "routing_completion", completion)
    monkeypatch.setattr(chat.intent_classifier, "classify", IntentClassifier().classify)
    monkeypatch.setattr(chat.llm_engine, "_record_telemetry", AsyncMock())
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json={
            "message": case["message"],
            "parent_message_id": str(parent),
            "history": [{"role": "assistant", "content": "FORGED CLIENT HISTORY"}],
        },
    )
    assert response.status_code == 200 and "event: done" in response.text
    completion.assert_awaited_once()
    sent = json.loads(completion.call_args.args[4])
    assert sent["recent_conversation"] == history
    assert sent["current_message"] == case["message"]
    assert sent["available_context"]["document"] is bound
    assert "UNSELECTED PRIVATE BRANCH" not in str(completion.call_args)
    assert "FORGED CLIENT HISTORY" not in str(completion.call_args)
    assert ASSISTANT_VOICE in completion.call_args.args[3]
    if streamed:
        tenant_state.ai.assert_called_once()
        generation = tenant_state.ai.call_args.kwargs
        assert generation["history"] == history
        assert ASSISTANT_VOICE in generation["system_prompt"]
        assert ASSISTANT_IDENTITY in generation["system_prompt"]
    else:
        tenant_state.ai.assert_not_called()
        assert "Synthetic contextual reply." in response.text
    tenant_state.retrieval.assert_not_awaited()


@pytest.mark.parametrize(
    "intent", [None, IntentType.GREETING_CONVERSATIONAL, IntentType.DIRECT_DEFINITION]
)
def test_short_and_grounded_prompts_share_voice_without_losing_source_rules(
    intent: IntentType | None,
) -> None:
    from app.engines.guard import policy_guard

    for general, source in [
        (False, None),
        (False, "Synthetic course evidence"),
        (True, "Synthetic web evidence"),
    ]:
        prompt = policy_guard.build_system_prompt(
            rag_context=source, intent=intent, general=general
        )
        assert ASSISTANT_VOICE in prompt and ASSISTANT_IDENTITY in prompt
        if source:
            assert source in prompt
