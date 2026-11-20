"""Background chat lifetime, bounded subscribers and content-free diagnostics."""

import asyncio
import json
import uuid
from unittest.mock import AsyncMock

import pytest
import structlog
from fastapi import HTTPException
from httpx import AsyncClient

from app.core.diagnostics import error_fields
from app.engines.chat_runs import ChatRuns, ManagedRun
from app.models.chat_runs import ChatRunSnapshot
from tests.conftest import TenantTestState


def make_run() -> ManagedRun:
    return ManagedRun(
        "session",
        "owner",
        "university",
        ChatRunSnapshot(
            run_id="run",
            status="running",
            request_id="reference",
            user_message_id="question",
            assistant_message_id="answer",
        ),
    )


@pytest.mark.parametrize(
    "name,blocked",
    [
        ("rag_search", False),
        ("web_search", False),
        ("read_document", False),
        ("create_doc", True),
        ("future_tool", True),
    ],
)
def test_only_read_only_tools_preserve_retry(name: str, blocked: bool) -> None:
    run = make_run()
    run.emit(
        "event: tool_start\ndata: " + json.dumps({"call_id": "call", "tool_name": name}) + "\n\n"
    )
    run.emit('event: error\ndata: {"code":"PROVIDER_ERROR","retryable":true}\n\n')
    assert run.snapshot.tool_started is True
    assert run.snapshot.retry_blocked is blocked


def test_search_after_artifact_does_not_remove_replay_fence() -> None:
    run = make_run()
    run.emit(
        'event: artifact_ready\ndata: {"skill_name":"generate_flashcards","title":"Cards"}\n\n'
    )
    run.emit('event: tool_start\ndata: {"call_id":"search","tool_name":"rag_search"}\n\n')
    assert run.snapshot.retry_blocked is True


def test_snapshot_retains_only_the_allowlisted_current_stage() -> None:
    run = make_run()
    run.emit('event: thinking_chunk\ndata: {"code":"checking_materials","token":"PRIVATE"}\n\n')
    assert run.snapshot.activity == "checking_materials"
    run.emit('event: thinking_chunk\ndata: {"code":["PRIVATE"]}\n\n')
    assert run.snapshot.activity == "checking_materials"
    assert "PRIVATE" not in run.snapshot.model_dump_json()


async def test_terminal_error_detach_log_does_not_claim_generation_continues() -> None:
    runs = ChatRuns()
    run = make_run()
    release = asyncio.Event()

    async def produce(item: ManagedRun) -> None:
        item.emit('event: error\ndata: {"code":"PROVIDER_ERROR","retryable":true}\n\n')
        await release.wait()

    runs.start(run, produce, AsyncMock())
    try:
        events = run.events()
        await anext(events)
        with structlog.testing.capture_logs() as captured:
            await events.aclose()
        detached = next(item for item in captured if item["event"] == "chat_subscriber_detached")
        assert detached["generation_continues"] is False
    finally:
        release.set()
        await run.task


async def test_detached_subscriber_does_not_cancel_generation() -> None:
    runs = ChatRuns()
    run = make_run()
    release = asyncio.Event()
    finalized = AsyncMock()

    async def produce(item: ManagedRun) -> None:
        item.emit('event: text_chunk\ndata: {"token":"First "}\n\n')
        await release.wait()
        item.emit('event: done\ndata: {"full_text":"First complete answer"}\n\n')

    runs.start(run, produce, finalized)
    events = run.events()
    assert "First" in await anext(events)
    await events.aclose()
    assert not run.task.done()
    release.set()
    await run.task
    assert run.snapshot.status == "complete"
    assert run.snapshot.content == "First complete answer"
    finalized.assert_awaited_once_with(run)
    assert runs.get("session", "other-owner", "university") is None
    assert runs.get("session", "owner", "other-university") is None


async def test_explicit_stop_finalizes_exactly_once() -> None:
    runs = ChatRuns()
    run = make_run()
    finalized = AsyncMock()
    cleaned = asyncio.Event()

    async def produce(item: ManagedRun) -> None:
        try:
            await asyncio.Event().wait()
        finally:
            cleaned.set()

    runs.start(run, produce, finalized)
    await run.ready.wait()
    run.task.cancel()
    await run.task
    assert run.snapshot.status == "cancelled" and cleaned.is_set()
    finalized.assert_awaited_once()


async def test_slow_subscriber_is_bounded_and_snapshot_keeps_full_answer() -> None:
    runs = ChatRuns()
    run = make_run()

    async def produce(item: ManagedRun) -> None:
        item.emit('event: init\ndata: {"user_message_id":"question"}\n\n')
        for _ in range(200):
            item.emit('event: text_chunk\ndata: {"token":"x"}\n\n')
        item.emit("event: done\ndata: " + json.dumps({"full_text": "x" * 200}) + "\n\n")

    runs.start(run, produce, AsyncMock())
    await run.task
    assert run.queue.qsize() <= 64
    assert run.snapshot.content == "x" * 200 and run.snapshot.status == "complete"
    frames = [frame async for frame in run.events()]
    assert frames[0].startswith("event: init")
    assert (
        sum(
            len(json.loads(frame.split("data: ", 1)[1])["token"])
            for frame in frames
            if frame.startswith("event: text_chunk")
        )
        == 200
    )


async def test_failure_stays_failed_after_done_and_has_private_support_reference() -> None:
    runs = ChatRuns()
    run = make_run()

    async def produce(item: ManagedRun) -> None:
        item.emit('event: error\ndata: {"code":"TIMEOUT","retryable":true}\n\n')
        item.emit('event: done\ndata: {"full_text":""}\n\n')

    runs.start(run, produce, AsyncMock())
    await run.task
    frames = "".join([frame async for frame in run.events()])
    assert run.snapshot.status == "error" and '"request_id": "reference"' in frames


async def test_background_run_logs_dont_capture_prompt_answer_or_raw_exception() -> None:
    runs = ChatRuns()
    run = make_run()

    async def produce(item: ManagedRun) -> None:
        item.emit('event: text_chunk\ndata: {"token":"PRIVATE ANSWER"}\n\n')
        raise RuntimeError("PRIVATE PROVIDER BODY bearer secret")

    with structlog.testing.capture_logs() as logs:
        runs.start(run, produce, AsyncMock())
        await run.task
    rendered = json.dumps(logs)
    assert "PRIVATE" not in rendered and "bearer secret" not in rendered
    assert any(
        event["event"] == "chat_run_finished" and event["outcome"] == "error" for event in logs
    )
    assert "PRIVATE" not in json.dumps(error_fields(RuntimeError("PRIVATE")))


async def test_shutdown_cancels_and_cleans_active_runs() -> None:
    runs = ChatRuns()
    run = make_run()
    finalized = AsyncMock()

    async def produce(item: ManagedRun) -> None:
        await asyncio.Event().wait()

    runs.start(run, produce, finalized)
    await runs.shutdown()
    assert not runs.runs
    finalized.assert_awaited_once()


@pytest.mark.parametrize("operation", ["snapshot", "stop"])
async def test_run_endpoints_hide_other_owners(
    client: AsyncClient, tenant_state: TenantTestState, operation: str
) -> None:
    session = "018f3a30-0001-7000-8000-000000000001"
    tenant_state.sessions[uuid.UUID(session)]["user_id"] = uuid.uuid4()
    url = f"/api/v1/ai/chat/sessions/{session}/run"
    response = (
        await client.get(url)
        if operation == "snapshot"
        else await client.post(f"/api/v1/ai/chat/sessions/{session}/runs/{uuid.uuid4()}/cancel")
    )
    assert response.status_code == 404
    assert "content" not in response.json()


async def test_owned_run_snapshot_and_stop_are_private_and_compare_run_ids(
    client: AsyncClient, tenant_state: TenantTestState
) -> None:
    from app.engines.chat_runs import chat_runs

    session = "018f3a30-0001-7000-8000-000000000001"
    run = ManagedRun(
        session,
        str(tenant_state.user.id),
        str(tenant_state.user.university_id),
        ChatRunSnapshot(
            run_id=str(uuid.uuid4()),
            status="running",
            content="Synthetic authorized partial answer",
        ),
    )
    finalized = AsyncMock()

    async def produce(item: ManagedRun) -> None:
        await asyncio.Event().wait()

    chat_runs.start(run, produce, finalized)
    try:
        snapshot = await client.get(f"/api/v1/ai/chat/sessions/{session}/run")
        assert snapshot.status_code == 200
        assert snapshot.headers["cache-control"] == "private, no-store"
        assert snapshot.json()["content"] == run.snapshot.content
        stale = await client.post(f"/api/v1/ai/chat/sessions/{session}/runs/{uuid.uuid4()}/cancel")
        assert stale.status_code == 409 and not run.task.done()
        stopped = await client.post(
            f"/api/v1/ai/chat/sessions/{session}/runs/{run.snapshot.run_id}/cancel"
        )
        assert stopped.status_code == 200
        assert stopped.headers["cache-control"] == "private, no-store"
        assert stopped.json()["status"] == "cancelled"
        finalized.assert_awaited_once()
    finally:
        if not run.task.done():
            run.task.cancel()
            await run.task
        chat_runs.runs.pop(session, None)


async def test_empty_completion_refunds_without_saving_a_fake_answer(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.routers import chat

    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)

    async def empty(**kwargs: object):
        if False:
            yield "text_chunk", {}, "mock"

    tenant_state.ai.side_effect = empty
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Synthetic empty provider answer"},
    )
    assert "EMPTY_RESPONSE" in response.text
    assert finish.await_args.kwargs["refund"] is True
    assert not any(
        "'assistant'" in call.args[0] and "INSERT INTO public.chat_messages" in call.args[0]
        for call in tenant_state.connection.execute.await_args_list
    )


@pytest.mark.parametrize(
    "name,blocked",
    [("rag_search", False), ("web_search", False), ("read_document", False), ("create_doc", True)],
)
async def test_stream_durably_fences_only_unsafe_tools_before_execution(
    client: AsyncClient,
    tenant_state: TenantTestState,
    name: str,
    blocked: bool,
) -> None:
    from app.models.chat import ToolCallPayload, ToolResultPayload

    async def tool_then_failure(**kwargs: object):
        yield (
            "tool_start",
            ToolCallPayload(call_id="synthetic", tool_name=name, arguments={}),
            "mock",
        )
        yield (
            "tool_end",
            ToolResultPayload(call_id="synthetic", tool_name=name, status="success", result={}),
            "mock",
        )
        yield "error", {"code": "PROVIDER_ERROR", "retryable": True}, "mock"

    tenant_state.ai.side_effect = tool_then_failure
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Create synthetic flashcards"},
    )
    assert "PROVIDER_ERROR" in response.text
    writes = tenant_state.connection.execute.await_args_list
    assert any("'{retry_blocked}'" in item.args[0] for item in writes) is blocked
    saved = [json.loads(item.args[3]) for item in writes if "'{chat_run}'" in item.args[0]]
    assert saved and saved[-1]["retry_blocked"] is blocked
    assert saved[-1]["tool_started"] is True


def test_diagnostics_excludes_arbitrary_exception_reason() -> None:
    error = RuntimeError("PRIVATE")
    error.reason = "PRIVATE PATIENT DATA"
    assert "PRIVATE" not in json.dumps(error_fields(error))


@pytest.mark.parametrize("reason", ["length", "MAX_TOKENS", "FinishReason.MAX_TOKENS"])
def test_provider_output_limit_is_a_failure_not_a_success(reason: str) -> None:
    from app.engines.provider_adapters import IncompleteProviderOutput, check_finish_reason

    with pytest.raises(IncompleteProviderOutput):
        check_finish_reason(reason)
    check_finish_reason("stop")


def test_public_tool_snapshot_rejects_and_strips_private_arguments() -> None:
    from pydantic import ValidationError

    from app.models.chat_runs import RunToolSnapshot

    with pytest.raises(ValidationError):
        RunToolSnapshot.model_validate(
            {
                "call_id": "tool",
                "tool_name": "read_document",
                "status": "running",
                "arguments": {"private": "secret"},
            }
        )
    run = make_run()
    run.emit(
        'event: tool_start\ndata: {"call_id":"tool","tool_name":"read_document","arguments":{"private":"secret"}}\n\n'
    )
    assert run.snapshot.tools[0].status == "running"
    assert "secret" not in run.snapshot.model_dump_json()


async def test_start_rechecks_owner_capacity_without_a_check_start_race() -> None:
    runs = ChatRuns()

    async def produce(item: ManagedRun) -> None:
        await asyncio.Event().wait()

    try:
        for index in range(4):
            run = make_run()
            run.session_id = f"session-{index}"
            runs.start(run, produce, AsyncMock())
        with pytest.raises(HTTPException) as error:
            runs.start(make_run(), produce, AsyncMock())
        assert error.value.status_code == 429
        assert len(runs.runs) == 4
    finally:
        await runs.shutdown()


async def test_capacity_race_releases_prepared_lease_before_rejection(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.routers import chat

    release = AsyncMock()
    refund = AsyncMock()
    monkeypatch.setattr(chat, "release_turn", release)
    monkeypatch.setattr(chat, "_finish_chat_credit", refund)

    def saturated(*args: object) -> None:
        raise HTTPException(429, "Synthetic admission race")

    monkeypatch.setattr(chat.chat_runs, "start", saturated)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Synthetic request"},
    )
    assert response.status_code == 429
    release.assert_awaited_once()
    tenant_state.credit.assert_awaited_once()
    refund.assert_awaited_once()
    assert refund.call_args.kwargs["refund"] is True
