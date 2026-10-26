import asyncio  # [CHAT FIX 2]
import json  # [CHAT FIX 2]
import time  # [CHAT FIX 2]
from collections.abc import AsyncIterator  # [CHAT FIX 2]
from unittest.mock import AsyncMock  # [CHAT FIX 2]

import pytest  # [CHAT FIX 2]
from fastapi.testclient import TestClient  # [CHAT FIX 2]

from app.core.config import settings  # [CHAT FIX 2]
from app.engines.llm import MultiTierLlmEngine  # [CHAT FIX 2]
from app.main import app  # [CHAT FIX 2]
from tests.conftest import TenantTestState  # [CHAT FIX 2]


async def test_thinking_without_an_answer_is_an_error(  # [CHAT FIX 2]
    stream_engine: MultiTierLlmEngine,  # [CHAT FIX 2]
    monkeypatch: pytest.MonkeyPatch,  # [CHAT FIX 2]
) -> None:  # [CHAT FIX 2]
    async def chunks() -> AsyncIterator[str]:  # [CHAT FIX 2]
        yield "<think>Only internal thoughts.</think>"  # [CHAT FIX 2]

    call = AsyncMock(return_value=([], chunks()))  # [CHAT FIX 2]
    monkeypatch.setattr(stream_engine, "_call_gemma_turn", call)  # [CHAT FIX 2]
    events = [  # [CHAT FIX 2]
        event  # [CHAT FIX 2]
        async for event in stream_engine.stream_agentic_chat(  # [CHAT FIX 2]
            "Tutor",  # [CHAT FIX 2]
            "Question",  # [CHAT FIX 2]
            enable_tools=False,  # [CHAT FIX 2]
        )  # [CHAT FIX 2]
    ]  # [CHAT FIX 2]
    assert not any(kind == "text_chunk" for kind, _, _ in events)  # [CHAT FIX 2]
    assert events[-1][0] == "error"  # [CHAT FIX 2]
    assert events[-1][1]["code"] == "PROVIDER_ERROR"  # [CHAT FIX 2]
    assert call.await_count == 1  # [CHAT FIX 2]


@pytest.fixture  # [CHAT FIX 2]
def stream_engine(monkeypatch: pytest.MonkeyPatch) -> MultiTierLlmEngine:  # [CHAT FIX 2]
    for key, value in {  # [CHAT FIX 2]
        "CHAT_FIRST_CHUNK_TIMEOUT_S": 0.025,  # [CHAT FIX 2]
        "CHAT_CHUNK_GAP_TIMEOUT_S": 0.025,  # [CHAT FIX 2]
        "CHAT_TOTAL_TIMEOUT_S": 0.2,  # [CHAT FIX 2]
    }.items():  # [CHAT FIX 2]
        monkeypatch.setitem(settings.__dict__, key, value)  # [CHAT FIX 2]
    engine = MultiTierLlmEngine()  # [CHAT FIX 2]
    engine.gemini_key = "live-fixture"  # [CHAT FIX 2]
    engine.groq_key = None  # [CHAT FIX 2]
    engine.openrouter_key = None  # [CHAT FIX 2]
    monkeypatch.setattr(engine, "_record_telemetry", AsyncMock())  # [CHAT FIX 2]
    return engine  # [CHAT FIX 2]


@pytest.mark.parametrize("allowed", [True, False])
async def test_public_tool_status_is_request_local_and_never_enters_tool_arguments(
    stream_engine: MultiTierLlmEngine, monkeypatch: pytest.MonkeyPatch, allowed: bool
) -> None:
    from app.engines import skill_registry
    from app.engines.llm import tool_engine

    definition = {
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read synthetic evidence",
            "parameters": {
                "type": "object",
                "properties": {"document_id": {"type": "string"}},
                "required": ["document_id"],
            },
        },
    }
    monkeypatch.setattr(skill_registry, "available_tools", AsyncMock(return_value=[definition]))

    async def chunks() -> AsyncIterator[str]:
        yield "Synthetic explanation."

    call = AsyncMock(
        side_effect=[
            (
                [
                    {
                        "id": "read-1",
                        "name": "read_document" if allowed else "unavailable_tool",
                        "arguments": {
                            "document_id": "owned-fixture",
                            "_public_status": "Reading the enzyme sketch",
                        },
                    }
                ],
                None,
            ),
            ([], chunks()),
        ]
    )
    dispatch = AsyncMock(return_value={"status": "success", "content": "Synthetic evidence"})
    monkeypatch.setattr(stream_engine, "_call_gemma_turn", call)
    monkeypatch.setattr(tool_engine, "dispatch_tool", dispatch)
    events = [
        event
        async for event in stream_engine.stream_agentic_chat(
            "Tutor", "Explain this sketch", enable_tools=True
        )
    ]
    if allowed:
        start = next(payload for kind, payload, _ in events if kind == "tool_start")
        assert start.public_status == "Reading the enzyme sketch"
        assert start.arguments == {"document_id": "owned-fixture"}
        assert dispatch.call_args.args[1] == {"document_id": "owned-fixture"}
    else:
        assert not any(kind == "tool_start" for kind, _, _ in events)
        dispatch.assert_not_awaited()
    assert "_public_status" not in definition["function"]["parameters"]["properties"]
    assert (
        "_public_status"
        in call.await_args_list[0].args[2][0]["function"]["parameters"]["properties"]
    )


async def test_chunks_arrive_before_the_model_finishes(  # [CHAT FIX 2]
    stream_engine: MultiTierLlmEngine,  # [CHAT FIX 2]
    monkeypatch: pytest.MonkeyPatch,  # [CHAT FIX 2]
) -> None:  # [CHAT FIX 2]
    release = asyncio.Event()  # [CHAT FIX 2]

    async def chunks() -> AsyncIterator[str]:  # [CHAT FIX 2]
        yield "First chunk. "  # [CHAT FIX 2]
        await release.wait()  # [CHAT FIX 2]
        yield "Second chunk."  # [CHAT FIX 2]

    call = AsyncMock(return_value=([], chunks()))  # [CHAT FIX 2]
    monkeypatch.setattr(stream_engine, "_call_gemma_turn", call)  # [CHAT FIX 2]
    stream = stream_engine.stream_agentic_chat(  # [CHAT FIX 2]
        "Tutor",  # [CHAT FIX 2]
        "Question",  # [CHAT FIX 2]
        enable_tools=False,  # [CHAT FIX 2]
    )  # [CHAT FIX 2]
    try:  # [CHAT FIX 2]
        kind, data, provider = await asyncio.wait_for(anext(stream), timeout=0.1)  # [CHAT FIX 2]
        assert kind == "text_chunk" and data["token"] == "First chunk. "  # [CHAT FIX 2]
        assert not release.is_set()  # [CHAT FIX 2]
        release.set()  # [CHAT FIX 2]
        rest = [event async for event in stream]  # [CHAT FIX 2]
        assert (  # [CHAT FIX 2]
            "".join(data["token"] for kind, data, _ in rest if kind == "text_chunk")  # [CHAT FIX 2]
            == "Second chunk."  # [CHAT FIX 2]
        )  # [CHAT FIX 2]
        assert call.await_count == 1  # [CHAT FIX 2]
    finally:  # [CHAT FIX 2]
        release.set()  # [CHAT FIX 2]
        await stream.aclose()  # [CHAT FIX 2]


async def test_no_first_chunk_uses_the_next_model(  # [CHAT FIX 2]
    stream_engine: MultiTierLlmEngine,  # [CHAT FIX 2]
    monkeypatch: pytest.MonkeyPatch,  # [CHAT FIX 2]
) -> None:  # [CHAT FIX 2]
    async def stalled() -> AsyncIterator[str]:  # [CHAT FIX 2]
        await asyncio.Event().wait()  # [CHAT FIX 2]
        yield "unreachable"  # [CHAT FIX 2]

    async def answer() -> AsyncIterator[str]:  # [CHAT FIX 2]
        yield "Fallback answer."  # [CHAT FIX 2]

    async def create(  # [CHAT FIX 2]
        model: str,  # [CHAT FIX 2]
        *args: object,  # [CHAT FIX 2]
    ) -> tuple[list[dict[str, object]], AsyncIterator[str]]:  # [CHAT FIX 2]
        return [], stalled() if model == stream_engine.primary_model else answer()  # [CHAT FIX 2]

    call = AsyncMock(side_effect=create)  # [CHAT FIX 2]
    monkeypatch.setattr(stream_engine, "_call_gemma_turn", call)  # [CHAT FIX 2]
    events = [  # [CHAT FIX 2]
        event  # [CHAT FIX 2]
        async for event in stream_engine.stream_agentic_chat(  # [CHAT FIX 2]
            "Tutor",  # [CHAT FIX 2]
            "Question",  # [CHAT FIX 2]
            enable_tools=False,  # [CHAT FIX 2]
        )  # [CHAT FIX 2]
    ]  # [CHAT FIX 2]
    assert (  # [CHAT FIX 2]
        "".join(data["token"] for kind, data, _ in events if kind == "text_chunk")  # [CHAT FIX 2]
        == "Fallback answer."  # [CHAT FIX 2]
    )  # [CHAT FIX 2]
    assert [call.args[0] for call in call.await_args_list] == [  # [CHAT FIX 2]
        stream_engine.primary_model,  # [CHAT FIX 2]
        stream_engine.secondary_model,  # [CHAT FIX 2]
    ]  # [CHAT FIX 2]


@pytest.mark.parametrize("scenario", ["mid_answer", "all_hang"])  # [CHAT FIX 2]
def test_stream_errors_finish_with_done_without_switching_after_text(  # [CHAT FIX 2]
    stream_engine: MultiTierLlmEngine,  # [CHAT FIX 2]
    tenant_state: TenantTestState,  # [CHAT FIX 2]
    monkeypatch: pytest.MonkeyPatch,  # [CHAT FIX 2]
    scenario: str,  # [CHAT FIX 2]
) -> None:  # [CHAT FIX 2]
    if scenario == "all_hang":  # [CHAT FIX 2]
        monkeypatch.setitem(settings.__dict__, "CHAT_TOTAL_TIMEOUT_S", 0.04)  # [CHAT FIX 2]

    async def chunks() -> AsyncIterator[str]:  # [CHAT FIX 2]
        if scenario == "mid_answer":  # [CHAT FIX 2]
            yield "Already delivered."  # [CHAT FIX 2]
        await asyncio.Event().wait()  # [CHAT FIX 2]
        yield "unreachable"  # [CHAT FIX 2]

    call = AsyncMock(side_effect=lambda *args: ([], chunks()))  # [CHAT FIX 2]
    monkeypatch.setattr(stream_engine, "_call_gemma_turn", call)  # [CHAT FIX 2]
    tenant_state.ai.side_effect = stream_engine.stream_agentic_chat  # [CHAT FIX 2]
    started = time.monotonic()  # [CHAT FIX 2]
    response = TestClient(app).post(  # [CHAT FIX 2]
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",  # [CHAT FIX 2]
        json={"message": "Offline question", "enable_tools": False},  # [CHAT FIX 2]
    )  # [CHAT FIX 2]
    events = [  # [CHAT FIX 2]
        (block.splitlines()[0][7:], json.loads(block.splitlines()[1][6:]))  # [CHAT FIX 2]
        for block in response.text.strip().split("\n\n")  # [CHAT FIX 2]
        if block.startswith("event:")  # [CHAT FIX 2]
    ]  # [CHAT FIX 2]
    kinds = [kind for kind, _ in events]  # [CHAT FIX 2]
    assert kinds[-2:] == ["error", "done"]  # [CHAT FIX 2]
    assert events[-2][1]["code"] == "TIMEOUT" and events[-2][1]["retryable"] is True  # [CHAT FIX 2]
    assert time.monotonic() - started < 0.4  # [CHAT FIX 2]
    if scenario == "mid_answer":  # [CHAT FIX 2]
        assert call.await_count == 1  # [CHAT FIX 2]
        assert "Already delivered." in response.text  # [CHAT FIX 2]
        assert kinds.count("text_chunk") == 1  # [CHAT FIX 2]
    else:  # [CHAT FIX 2]
        assert "text_chunk" not in kinds  # [CHAT FIX 2]
