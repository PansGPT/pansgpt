"""Completed artifacts survive a later failure without replay or false success."""

import asyncio
import json
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import BackgroundTasks, Request
from httpx import AsyncClient

from app.core.config import settings
from app.engines.chat_runs import chat_runs
from app.models.chat import ArtifactReadyPayload, StreamChatRequest
from app.routers import chat
from tests.conftest import TenantTestState

SESSION = "018f3a30-0001-7000-8000-000000000001"


def graph() -> ArtifactReadyPayload:
    return ArtifactReadyPayload(
        skill_name="plot_graph",
        title="Synthetic graph",
        mime_type="application/json",
        file_extension="json",
        content={
            "type": "line",
            "title": "Synthetic graph",
            "data": {"labels": ["A", "B"], "datasets": [{"label": "Series", "data": [1, 2]}]},
        },
    )


@pytest.fixture
def recorded_chat(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> tuple[dict[str, dict[str, object]], AsyncMock]:
    rows: dict[str, dict[str, object]] = {}
    original_fetch = tenant_state.connection.fetch.side_effect

    async def write(sql: str, *args: object) -> str:
        if "INSERT INTO public.chat_messages" in sql:
            assistant = "'assistant'" in sql
            rows[str(args[0])] = {
                "id": args[0],
                "session_id": args[1],
                "parent_message_id": args[2],
                "role": "assistant" if assistant else "user",
                "content": args[3],
                "citations": args[4] if assistant else None,
                "thinking_text": args[5] if assistant else None,
                "tool_calls": args[6] if assistant else None,
                "image_metadata": None if assistant else args[4],
                "created_at": "2026-11-20T00:00:00Z",
                "is_active_branch": True,
                "branch_index": 0,
            }
        return "INSERT 0 1"

    async def fetch(sql: str, *args: object) -> list[dict[str, object]]:
        if "FROM public.chat_messages" in sql and "WHERE session_id = $1" in sql:
            return list(rows.values())
        return await original_fetch(sql, *args)

    tenant_state.connection.execute.side_effect = write
    tenant_state.connection.fetch.side_effect = fetch
    settle = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", settle)
    return rows, settle


@pytest.mark.parametrize("failure", ["provider", "timeout", "exception"])
async def test_saved_graph_survives_later_failure_and_history_reload(
    client: AsyncClient,
    tenant_state: TenantTestState,
    recorded_chat: tuple[dict[str, dict[str, object]], AsyncMock],
    monkeypatch: pytest.MonkeyPatch,
    failure: str,
) -> None:
    rows, settle = recorded_chat
    if failure == "timeout":
        monkeypatch.setattr(settings, "CHAT_TOTAL_TIMEOUT_S", 0.15)

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, object, str], None]:
        yield "tool_start", {"call_id": "graph", "tool_name": "plot_graph"}, "mock"
        yield "artifact_ready", graph(), "mock"
        # Resuming the engine proves the API already committed the checkpoint.
        saved = next(row for row in rows.values() if row["role"] == "assistant")
        assert json.loads(str(saved["tool_calls"]))["artifacts"][0]["title"] == "Synthetic graph"
        if failure == "timeout":
            await asyncio.Event().wait()
        if failure == "exception":
            raise RuntimeError("Synthetic private follow-up failure")
        yield "error", {"code": "PROVIDER_ERROR", "retryable": True}, "mock"

    tenant_state.ai.side_effect = inference
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{SESSION}/stream", json={"message": "Plot a synthetic graph"}
    )
    assert response.status_code == 200
    assert "event: artifact_ready" in response.text
    assert "event: error" not in response.text
    assert '"completion_warning": "additional_work_incomplete"' in response.text
    assert "Synthetic private" not in response.text
    settle.assert_awaited_once()
    assert settle.call_args.kwargs["refund"] is False
    snapshot = (await client.get(f"/api/v1/ai/chat/sessions/{SESSION}/run")).json()
    assert snapshot["status"] == "complete"
    assert snapshot["completion_warning"] == "additional_work_incomplete"
    assert snapshot["retry_blocked"] is True
    history = (await client.get(f"/api/v1/ai/chat/sessions/{SESSION}")).json()
    assistant = next(item for item in history["messages"] if item["role"] == "assistant")
    assert assistant["extra_parts"]["artifacts"][0]["title"] == "Synthetic graph"
    assert assistant["completion_warning"] == "additional_work_incomplete"
    assert len([row for row in rows.values() if row["role"] == "assistant"]) == 1
    assert tenant_state.ai.call_count == 1


async def test_final_save_updates_checkpoint_and_clears_its_warning(
    client: AsyncClient,
    tenant_state: TenantTestState,
    recorded_chat: tuple[dict[str, dict[str, object]], AsyncMock],
) -> None:
    rows, settle = recorded_chat

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, object, str], None]:
        yield "artifact_ready", graph(), "mock"
        yield "text_chunk", {"token": "Your graph is ready."}, "mock"

    tenant_state.ai.side_effect = inference
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{SESSION}/stream", json={"message": "Plot a synthetic graph"}
    )
    assert "event: error" not in response.text
    saved = [row for row in rows.values() if row["role"] == "assistant"]
    assert len(saved) == 1 and saved[0]["content"] == "Your graph is ready."
    assert json.loads(str(saved[0]["tool_calls"]))["completion_warning"] is None
    settle.assert_awaited_once()
    assert settle.call_args.kwargs["refund"] is False


async def test_unsaved_artifact_is_never_announced_ready(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def reject_checkpoint(sql: str, *args: object) -> str:
        if "INSERT INTO public.chat_messages" in sql and "'assistant'" in sql:
            raise RuntimeError("Synthetic checkpoint failure")
        return "UPDATE 1"

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, object, str], None]:
        yield "artifact_ready", graph(), "mock"

    tenant_state.connection.execute.side_effect = reject_checkpoint
    tenant_state.ai.side_effect = inference
    settle = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", settle)
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{SESSION}/stream", json={"message": "Plot a synthetic graph"}
    )
    assert "event: error" in response.text
    assert "event: artifact_ready" not in response.text
    assert "completion_warning" not in response.text
    settle.assert_awaited_once()
    assert settle.call_args.kwargs["refund"] is True


async def test_later_storage_outage_keeps_the_committed_artifact(
    client: AsyncClient,
    tenant_state: TenantTestState,
    recorded_chat: tuple[dict[str, dict[str, object]], AsyncMock],
) -> None:
    rows, settle = recorded_chat
    write = tenant_state.connection.execute.side_effect
    assistant_writes = 0

    async def outage(sql: str, *args: object) -> str:
        nonlocal assistant_writes
        if "INSERT INTO public.chat_messages" in sql and "'assistant'" in sql:
            assistant_writes += 1
            if assistant_writes > 1:
                raise RuntimeError("Synthetic storage outage after checkpoint")
        return await write(sql, *args)

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, object, str], None]:
        yield "artifact_ready", graph(), "mock"
        yield "text_chunk", {"token": "Your graph is ready."}, "mock"

    tenant_state.connection.execute.side_effect = outage
    tenant_state.ai.side_effect = inference
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{SESSION}/stream", json={"message": "Plot a synthetic graph"}
    )
    assert "event: error" not in response.text
    assert '"completion_warning": "additional_work_incomplete"' in response.text
    saved = next(row for row in rows.values() if row["role"] == "assistant")
    parts = json.loads(str(saved["tool_calls"]))
    assert parts["artifacts"][0]["title"] == "Synthetic graph"
    assert parts["completion_warning"] == "additional_work_incomplete"
    settle.assert_awaited_once()
    assert settle.call_args.kwargs["refund"] is False


async def test_stop_after_checkpoint_keeps_material_and_settles_once(
    tenant_state: TenantTestState,
    recorded_chat: tuple[dict[str, dict[str, object]], AsyncMock],
) -> None:
    rows, settle = recorded_chat

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, object, str], None]:
        yield "artifact_ready", graph(), "mock"
        await asyncio.Event().wait()

    tenant_state.ai.side_effect = inference
    response = await chat.stream_chat_session(
        MagicMock(spec=Request),
        SESSION,
        StreamChatRequest(message="Synthetic graph"),
        BackgroundTasks(),
        tenant_state.user,
    )
    async for frame in response.body_iterator:
        if frame.startswith("event: artifact_ready"):
            break
    await response.body_iterator.aclose()
    run = chat_runs.get(SESSION, str(tenant_state.user.id), str(tenant_state.user.university_id))
    assert run is not None and run.task is not None and not run.task.done()
    run.task.cancel()
    await run.task
    assert run.snapshot.status == "cancelled"
    assert any(row["role"] == "assistant" for row in rows.values())
    settle.assert_awaited_once()
    assert settle.call_args.kwargs["refund"] is False
