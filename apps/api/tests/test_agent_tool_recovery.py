"""Regression journeys for search-to-artifact orchestration and quota recovery."""

import asyncio
import json
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest

from app.core.config import settings
from app.engines import llm, skill_registry
from app.engines.llm import ALL_TOOL_DEFINITIONS, MultiTierLlmEngine
from app.engines.provider_capacity import CapacityDeferred
from app.models.chat import ArtifactReadyPayload


@pytest.fixture
def engine(monkeypatch):
    monkeypatch.setattr(settings, "CHAT_TOTAL_TIMEOUT_S", 60)
    monkeypatch.setattr(settings, "CHAT_FIRST_CHUNK_TIMEOUT_S", 1)
    monkeypatch.setattr(settings, "CHAT_CHUNK_GAP_TIMEOUT_S", 1)
    instance = MultiTierLlmEngine()
    instance.gemini_key = "live-synthetic-fixture"
    instance.groq_key = None
    instance.openrouter_key = None
    monkeypatch.setattr(instance, "_record_telemetry", AsyncMock())
    monkeypatch.setattr(
        skill_registry, "available_tools", AsyncMock(return_value=ALL_TOOL_DEFINITIONS)
    )
    return instance


async def empty() -> AsyncIterator[str]:
    if False:
        yield ""


async def answer() -> AsyncIterator[str]:
    yield "Your flashcards are ready."


async def collect(engine, *, enable_tools=True):
    return [
        event
        async for event in engine.stream_agentic_chat(
            "Senior study colleague", "Create flashcards on surfactants.", enable_tools=enable_tools
        )
    ]


async def test_two_searches_then_flashcards_complete_without_another_model_call(
    engine, monkeypatch
):
    names = ["web_search", "rag_search", "generate_flashcards"]
    seen = []

    async def turn(model, messages, tools):
        index = len(seen)
        seen.append(messages)
        if index < len(names):
            assert names[index] in {item["function"]["name"] for item in tools or []}
            return [{"id": f"call-{index}", "name": names[index], "arguments": {}}], empty()
        return [], answer()

    searches = AsyncMock(return_value={"status": "success", "content": "Synthetic source"})
    artifact = ArtifactReadyPayload(
        skill_name="generate_flashcards",
        title="Surfactants",
        mime_type="application/json",
        file_extension="json",
        content={"cards": [{"front": "What?", "back": "Synthetic"}]},
    )
    generate = AsyncMock(return_value=artifact)
    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.tool_engine, "dispatch_tool", searches)
    monkeypatch.setattr(llm.skill_engine, "dispatch_skill", generate)
    events = await collect(engine)
    assert [payload.tool_name for kind, payload, _ in events if kind == "tool_start"] == names
    assert searches.await_count == 2 and generate.await_count == 1
    assert sum(kind == "artifact_ready" for kind, _, _ in events) == 1
    assert not any(kind == "error" for kind, _, _ in events)
    assert any(kind == "text_chunk" for kind, _, _ in events)
    assert len(seen) == 3
    assert len([item for item in seen[-1] if item["role"] == "tool"]) == 2


@pytest.mark.parametrize(
    "skill,content",
    [
        ("plot_graph", {"type": "line"}),
        ("plot_graph", {"type": "mermaid"}),
        ("generate_mnemonics", {"concept": "Synthetic"}),
        ("draw_chemical_structure", {"compound_name": "Synthetic"}),
    ],
)
async def test_rich_results_finish_with_public_explanation_without_another_model_call(
    engine, monkeypatch, skill, content
):
    explanation = "The synthetic series increases over time."
    transport = AsyncMock(
        return_value=(
            [
                {
                    "id": "rich-result",
                    "name": skill,
                    "arguments": {"_completion_summary": "<think>PRIVATE</think>" + explanation},
                }
            ],
            empty(),
        )
    )
    artifact = ArtifactReadyPayload(
        skill_name=skill,
        title="Synthetic",
        mime_type="application/json",
        file_extension="json",
        content=content,
    )
    generate = AsyncMock(return_value=artifact)
    monkeypatch.setattr(engine, "_call_gemma_turn", transport)
    monkeypatch.setattr(llm.skill_engine, "dispatch_skill", generate)
    events = await collect(engine)
    transport.assert_awaited_once()
    generate.assert_awaited_once()
    assert "_completion_summary" not in generate.call_args.args[1]
    assert sum(kind == "artifact_ready" for kind, _, _ in events) == 1
    text = "".join(data.get("token", "") for kind, data, _ in events if kind == "text_chunk")
    assert text == explanation and "PRIVATE" not in text
    assert not any(kind == "error" for kind, _, _ in events)


async def test_mixed_artifact_batch_completes_every_call_before_finishing(engine, monkeypatch):
    calls = [
        {"id": "slides", "name": "create_pptx", "arguments": {}},
        {"id": "graph", "name": "plot_graph", "arguments": {}},
    ]
    transport = AsyncMock(return_value=(calls, empty()))
    generated = [
        ArtifactReadyPayload(
            skill_name=name,
            title="Synthetic",
            mime_type="application/json",
            file_extension="json",
            content={"type": "line"},
        )
        for name in ("create_pptx", "plot_graph")
    ]
    dispatch = AsyncMock(side_effect=generated)
    monkeypatch.setattr(engine, "_call_gemma_turn", transport)
    monkeypatch.setattr(llm.skill_engine, "dispatch_skill", dispatch)
    events = await collect(engine)
    assert dispatch.await_count == 2
    assert sum(kind == "artifact_ready" for kind, _, _ in events) == 2
    assert sum(kind == "tool_end" for kind, _, _ in events) == 2
    assert not any(kind == "error" for kind, _, _ in events)
    transport.assert_awaited_once()


async def test_short_capacity_reset_retries_model_without_replaying_search(engine, monkeypatch):
    calls = 0
    waits = []

    async def turn(model, messages, tools):
        nonlocal calls
        calls += 1
        if calls == 1:
            return [{"id": "search", "name": "rag_search", "arguments": {}}], empty()
        if calls in {2, 3}:
            raise CapacityDeferred(5)
        assert any(item["role"] == "tool" for item in messages)
        return [], answer()

    async def wait(seconds):
        waits.append(seconds)

    searches = AsyncMock(return_value={"status": "success"})
    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.tool_engine, "dispatch_tool", searches)
    monkeypatch.setattr(llm.asyncio, "sleep", wait)
    events = await collect(engine)
    assert searches.await_count == 1 and calls == 4
    assert len(waits) == 1 and 5 <= waits[0] <= 5.25
    assert not any(kind == "error" for kind, _, _ in events)


@pytest.mark.parametrize(
    "seconds,reason", [(120, "provider_capacity"), (1, "capacity_store_unavailable")]
)
async def test_long_reset_or_store_failure_does_not_wait_forever(
    engine, monkeypatch, seconds, reason
):
    turn = AsyncMock(side_effect=CapacityDeferred(seconds, reason))
    sleep = AsyncMock()
    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.asyncio, "sleep", sleep)
    events = await collect(engine, enable_tools=False)
    sleep.assert_not_awaited()
    assert events[-1][0] == "error"
    assert turn.await_count == (1 if reason == "capacity_store_unavailable" else 2)


async def test_repeated_capacity_denials_are_bounded(engine, monkeypatch):
    turn = AsyncMock(side_effect=CapacityDeferred(1))
    sleep = AsyncMock()
    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.asyncio, "sleep", sleep)
    events = await collect(engine, enable_tools=False)
    assert sleep.await_count == llm.MAX_CAPACITY_RETRIES
    assert turn.await_count == 2 * (llm.MAX_CAPACITY_RETRIES + 1)
    assert events[-1][0] == "error"


async def test_wait_can_be_cancelled(engine, monkeypatch):
    turn = AsyncMock(side_effect=CapacityDeferred(1))
    entered = asyncio.Event()

    async def wait(seconds):
        entered.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.asyncio, "sleep", wait)
    task = asyncio.create_task(collect(engine, enable_tools=False))
    await entered.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert turn.await_count == 2


async def test_ineligible_provider_is_skipped_before_transport(engine, monkeypatch):
    engine.gemini_key = None
    engine.openrouter_key = "live-synthetic-fixture"
    monkeypatch.setattr(settings, "OPENROUTER_ZDR_CONFIRMED", False)
    transport = AsyncMock()
    monkeypatch.setattr(engine, "_openrouter_turn", transport)
    events = await collect(engine, enable_tools=False)
    transport.assert_not_awaited()
    assert events[-1][0] == "error"


def unavailable():
    from google.genai.errors import ServerError

    cause = ServerError(503, {"error": {"status": "UNAVAILABLE", "message": "High demand"}})
    error = CapacityDeferred(120, "provider_unavailable")
    error.__cause__ = cause
    return error


async def test_unknown_midstream_provider_failure_offers_manual_retry(engine, monkeypatch):
    async def broken():
        yield "A partial response. "
        raise RuntimeError("Synthetic provider stream failure")

    transport = AsyncMock(return_value=([], broken()))
    monkeypatch.setattr(engine, "_call_gemma_turn", transport)
    events = await collect(engine, enable_tools=False)
    error = next(data for kind, data, _ in events if kind == "error")
    assert error["code"] == "PROVIDER_ERROR" and error["retryable"] is True
    transport.assert_awaited_once()


@pytest.mark.parametrize("packets", [[""], ["<think>Private thought</think>", ""]])
async def test_private_stream_failure_falls_back_before_answer(engine, monkeypatch, packets):
    attempts = []
    closed = []

    async def broken():
        try:
            for packet in packets:
                yield packet
            raise unavailable()
        finally:
            closed.append(True)

    async def turn(model, messages, tools):
        attempts.append(model)
        return [], broken() if len(attempts) == 1 else answer()

    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    events = await collect(engine, enable_tools=False)
    assert attempts == [engine.primary_model, engine.secondary_model]
    assert closed == [True]
    assert not any(kind == "error" for kind, _, _ in events)
    assert any(kind == "text_chunk" for kind, _, _ in events)


async def test_partial_answer_failure_keeps_retry_without_splicing_models(engine, monkeypatch):
    async def broken():
        yield "A visible partial answer. "
        raise unavailable()

    transport = AsyncMock(return_value=([], broken()))
    monkeypatch.setattr(engine, "_call_gemma_turn", transport)
    events = await collect(engine, enable_tools=False)
    assert transport.await_count == 1
    error = next(data for kind, data, _ in events if kind == "error")
    assert error["code"] == "503" and error["retryable"] is True


async def test_all_private_streams_fail_with_retryable_error(engine, monkeypatch):
    async def broken():
        yield ""
        raise unavailable()

    async def turn(*args):
        return [], broken()

    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    events = await collect(engine, enable_tools=False)
    error = next(data for kind, data, _ in events if kind == "error")
    assert error["code"] == "503" and error["retryable"] is True


async def test_failover_keeps_completed_tool_results_and_discards_failed_calls(engine, monkeypatch):
    attempts = 0
    calls = []

    async def broken():
        calls.append({"id": "discard", "name": "create_doc", "arguments": {}})
        yield ""
        raise unavailable()

    async def turn(model, messages, tools):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return [{"id": "search", "name": "rag_search", "arguments": {}}], empty()
        assert any(item["role"] == "tool" for item in messages)
        if attempts == 2:
            return calls, broken()
        return [], answer()

    search = AsyncMock(return_value={"status": "success"})
    create = AsyncMock()
    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    monkeypatch.setattr(llm.tool_engine, "dispatch_tool", search)
    monkeypatch.setattr(llm.skill_engine, "dispatch_skill", create)
    events = await collect(engine)
    search.assert_awaited_once()
    create.assert_not_awaited()
    assert attempts == 3 and not any(kind == "error" for kind, _, _ in events)


async def test_private_stream_can_still_be_stopped(engine, monkeypatch):
    entered = asyncio.Event()
    closed = asyncio.Event()

    async def pending():
        try:
            yield ""
            entered.set()
            await asyncio.Event().wait()
        finally:
            closed.set()

    transport = AsyncMock(return_value=([], pending()))
    monkeypatch.setattr(engine, "_call_gemma_turn", transport)
    task = asyncio.create_task(collect(engine, enable_tools=False))
    await entered.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert closed.is_set() and transport.await_count == 1


async def test_google_private_failures_can_reach_groq(engine, monkeypatch):
    engine.groq_key = "live-synthetic-fixture"
    attempted = []

    async def broken():
        yield ""
        raise unavailable()

    async def google(model, *args):
        attempted.append(model)
        return [], broken()

    fallback = AsyncMock(return_value=([], answer()))
    monkeypatch.setattr(engine, "_call_gemma_turn", google)
    monkeypatch.setattr(engine, "_call_groq_turn", fallback)
    events = await collect(engine, enable_tools=False)
    assert attempted == [engine.primary_model, engine.secondary_model]
    fallback.assert_awaited_once()
    assert not any(kind == "error" for kind, _, _ in events)


@pytest.mark.parametrize(
    "reason,code",
    [
        ("provider_unavailable", "503"),
        ("provider_rate_limit", "503"),
        ("provider_capacity", "503"),
        ("capacity_store_unavailable", "503"),
        ("request_exceeds_budget", "CONTEXT_TOO_LARGE"),
    ],
)
def test_deferred_error_codes_remain_actionable(reason, code):
    assert MultiTierLlmEngine._stream_error_code(CapacityDeferred(120, reason)) == code


async def test_exhausted_outage_reaches_api_and_owned_snapshot_as_retryable(
    engine, monkeypatch, client, tenant_state
):
    async def broken():
        yield ""
        raise unavailable()

    async def turn(*args):
        return [], broken()

    monkeypatch.setattr(engine, "_call_gemma_turn", turn)
    tenant_state.ai.side_effect = engine.stream_agentic_chat
    session = next(
        str(key)
        for key, row in tenant_state.sessions.items()
        if row["user_id"] == tenant_state.user.id
    )
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={"message": "Create a history document", "enable_tools": False},
    )
    errors = [
        json.loads(frame.split("data: ", 1)[1])
        for frame in response.text.split("\n\n")
        if frame.startswith("event: error")
    ]
    assert response.status_code == 200 and errors[-1]["code"] == "503"
    assert errors[-1]["retryable"] is True
    snapshot = (await client.get(f"/api/v1/ai/chat/sessions/{session}/run")).json()
    assert snapshot["status"] == "error" and snapshot["retryable"] is True
    assert snapshot["retry_blocked"] is False
