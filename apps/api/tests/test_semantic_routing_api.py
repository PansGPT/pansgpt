"""Real semantic routing boundary with synthetic provider output and tenant storage."""

import json
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.engines import intent_classifier as routing
from app.engines.intent_classifier import IntentClassifier
from app.routers import chat
from tests.conftest import TenantTestState
from tests.test_intent_classifier import decision


def semantic_router(monkeypatch: pytest.MonkeyPatch, output: str) -> AsyncMock:
    monkeypatch.setitem(settings.__dict__, "GROQ_API_KEY", "fixture")
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)
    completion = AsyncMock(return_value=output)
    monkeypatch.setattr(routing, "routing_completion", completion)
    monkeypatch.setattr(chat.llm_engine, "_record_telemetry", AsyncMock())
    engine = IntentClassifier()
    monkeypatch.setattr(chat.intent_classifier, "classify", engine.classify)
    return completion


async def test_simple_reply_is_one_completion_no_retrieval_or_second_generation(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    completion = semantic_router(
        monkeypatch, decision(answer="<think>PRIVATE PLAN</think>Hello! Ready to study?")
    )
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "hello chat"},
    )
    assert response.status_code == 200
    assert "Hello! Ready to study?" in response.text
    assert "PRIVATE" not in response.text and "greeting_conversational" not in response.text
    assert "event: done" in response.text
    completion.assert_awaited_once()
    chat.llm_engine._record_telemetry.assert_awaited_once()
    telemetry = chat.llm_engine._record_telemetry.call_args.args
    assert telemetry[0] == "groq" and telemetry[3] > 0 and telemetry[4] > 0
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_not_called()
    chat._auto_generate_session_title.assert_awaited_once()
    finish.assert_awaited_once()
    assert finish.call_args.kwargs["refund"] is False
    saves = [
        c.args
        for c in tenant_state.connection.execute.await_args_list
        if "INSERT INTO public.chat_messages" in c.args[0] and "'assistant'" in c.args[0]
    ]
    assert saves and saves[-1][4] == "Hello! Ready to study?"


async def test_clinical_handoff_discards_speculative_answer_and_uses_retrieval(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    completion = semantic_router(
        monkeypatch,
        decision(
            intent="clinical_reasoning",
            clinical_risk=True,
            answer="UNVERIFIED CLINICAL ADVICE",
            retrieval_query="Medicine safety during pregnancy",
        ),
    )
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Can I take it while pregnant?"},
    )
    assert response.status_code == 200 and "UNVERIFIED" not in response.text
    assert "Scoped test answer." in response.text
    completion.assert_awaited_once()
    tenant_state.retrieval.assert_awaited_once()
    assert tenant_state.retrieval.call_args.kwargs["query"] == "Medicine safety during pregnancy"
    assert tenant_state.ai.call_args.kwargs["fast_path"] is False


async def test_essay_emits_model_status_before_streamed_generation_without_retrieval(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    completion = semantic_router(
        monkeypatch,
        decision(
            action="grounded",
            response_mode="extended",
            intent="general_assistance",
            answer="",
            public_progress=[
                {"code": "writing_response", "label": "Connecting surfactants to household uses"}
            ],
        ),
    )
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={
            "message": "write an essay on the benefits of surfactants in the household management"
        },
    )
    assert response.status_code == 200
    assert "Connecting surfactants to household uses" in response.text
    assert response.text.index("event: public_progress") < response.text.index("event: text_chunk")
    assert "Scoped test answer." in response.text and "event: done" in response.text
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_called_once()
    assert tenant_state.ai.call_args.kwargs["enable_tools"] is False
    completion.assert_awaited_once()


async def test_follow_up_tool_request_can_use_history_without_forcing_a_new_search(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    completion = semantic_router(
        monkeypatch,
        decision(action="grounded", intent="skill_generation", requires_tools=True, answer=""),
    )
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Turn that into a presentation"},
    )
    assert response.status_code == 200
    tenant_state.retrieval.assert_not_awaited()
    assert tenant_state.ai.call_args.kwargs["enable_tools"] is True
    assert "event: artifact_ready" in response.text
    sent = json.loads(completion.call_args.args[4])
    assert "recent_conversation" in sent


async def test_routing_outage_finishes_with_retry_error_refund_and_no_retrieval(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    completion = semantic_router(monkeypatch, "unused")
    completion.side_effect = TimeoutError("synthetic provider outage")
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "hello"},
    )
    assert response.status_code == 200
    assert "query_classified" not in capsys.readouterr().out
    assert '"code": "AI_ROUTING_UNAVAILABLE"' in response.text
    assert '"retryable": true' in response.text and "event: done" in response.text
    assert "not found in your course materials" not in response.text
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_not_called()
    finish.assert_awaited_once()
    assert finish.call_args.kwargs["refund"] is True
    assert not [
        c
        for c in tenant_state.connection.execute.await_args_list
        if "INSERT INTO public.chat_messages" in c.args[0] and "'assistant'" in c.args[0]
    ]


@pytest.mark.parametrize("failure", ["timeout", "unavailable"])
async def test_retrieval_failure_is_retryable_not_false_source_absence(
    client: AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    failure: str,
) -> None:
    import asyncio

    monkeypatch.setitem(settings.__dict__, "CHAT_RETRIEVAL_TIMEOUT_S", 0.02)
    if failure == "timeout":

        async def hang(**kwargs: object) -> None:
            await asyncio.Event().wait()

        tenant_state.retrieval.side_effect = hang
    else:
        tenant_state.retrieval.side_effect = RuntimeError("synthetic database outage")
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)
    response = await asyncio.wait_for(
        client.post(
            "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
            json={"message": "Explain this clinical topic"},
        ),
        timeout=1,
    )
    assert (
        "RETRIEVAL_TIMEOUT" in response.text
        if failure == "timeout"
        else "RETRIEVAL_UNAVAILABLE" in response.text
    )
    assert '"retryable": true' in response.text and "event: done" in response.text
    assert "not found in your course materials" not in response.text
    tenant_state.ai.assert_not_called()
    assert finish.call_args.kwargs["refund"] is True
