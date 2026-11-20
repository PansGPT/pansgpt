"""A completed or cancelled stream must not leave a phantom active run."""

import asyncio
from collections.abc import AsyncGenerator
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from anyio import CancelScope
from fastapi import BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from httpx import AsyncClient

from app.engines import recovery
from app.models.chat import StreamChatRequest
from app.routers import chat
from tests.conftest import TenantTestState

SESSION = "018f3a30-0001-7000-8000-000000000001"


async def test_settings_session_listing_paginates_without_changing_default_history(
    client: AsyncClient, tenant_state: TenantTestState
) -> None:
    tenant_state.connection.fetch.side_effect = None
    tenant_state.connection.fetch.return_value = []
    response = await client.get("/api/v1/ai/chat/sessions?scope=all&limit=100&offset=100")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    assert response.json() == {"sessions": [], "total": 0}
    assert tenant_state.connection.fetch.call_args.args[1:] == (
        tenant_state.user.id,
        100,
        False,
        tenant_state.user.university_id,
        True,
        100,
    )
    response = await client.get("/api/v1/ai/chat/sessions")
    assert response.status_code == 200
    assert tenant_state.connection.fetch.call_args.args[1:] == (
        tenant_state.user.id,
        30,
        False,
        tenant_state.user.university_id,
        False,
        0,
    )


@pytest.mark.parametrize("query", ["scope=other", "offset=-1", "offset=100001", "limit=101"])
async def test_session_listing_rejects_unbounded_or_unknown_queries(
    client: AsyncClient, tenant_state: TenantTestState, query: str
) -> None:
    response = await client.get(f"/api/v1/ai/chat/sessions?{query}")
    assert response.status_code == 422


async def response_for(state: TenantTestState, *, disconnected: bool = False) -> StreamingResponse:
    request = MagicMock(spec=Request)
    request.is_disconnected = AsyncMock(return_value=disconnected)
    return await chat.stream_chat_session(
        request,
        SESSION,
        StreamChatRequest(message="Synthetic lifecycle question"),
        BackgroundTasks(),
        state.user,
    )


@pytest.mark.parametrize("temporary_outage", [False, True])
async def test_run_is_released_before_done_allows_an_immediate_next_send(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, temporary_outage: bool
) -> None:
    active = True

    async def release(session_id: str, run_id: str) -> None:
        nonlocal active
        await asyncio.sleep(0)
        active = False

    release_mock = AsyncMock(side_effect=[ConnectionError(), None] if temporary_outage else release)
    if temporary_outage:

        async def recovering_release(session_id: str, run_id: str) -> None:
            if release_mock.await_count == 1:
                raise ConnectionError("Synthetic connection outage")
            await release(session_id, run_id)

        release_mock.side_effect = recovering_release
    monkeypatch.setattr(chat, "release_turn", release_mock)
    monkeypatch.setattr(recovery, "backoff", lambda *args: 0)
    response = await response_for(tenant_state)
    stream = cast(AsyncGenerator[str, None], response.body_iterator)
    try:
        async for frame in stream:
            if frame.startswith("event: done\n"):
                assert not active, "Client completion must not race the stored run lease"
                break
        else:
            pytest.fail("Expected a completed response")
    finally:
        await stream.aclose()
    assert release_mock.await_count == (2 if temporary_outage else 1)
    tenant_state.credit.assert_awaited_once()
    assert tenant_state.ai.call_count == 1


async def test_explicit_stop_waits_for_protected_refund_and_release(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    provider_started = asyncio.Event()
    cleanup_started = asyncio.Event()
    allow_release = asyncio.Event()
    released = False

    async def inference(**kwargs: object) -> AsyncGenerator[tuple[str, dict[str, str], str], None]:
        provider_started.set()
        await asyncio.Event().wait()
        yield "text_chunk", {"token": "unreachable"}, "mock"

    async def release(session_id: str, run_id: str) -> None:
        nonlocal released
        cleanup_started.set()
        await allow_release.wait()
        released = True

    tenant_state.ai.side_effect = inference
    finish_credit = AsyncMock()
    release_mock = AsyncMock(side_effect=release)
    monkeypatch.setattr(chat, "_finish_chat_credit", finish_credit)
    monkeypatch.setattr(chat, "release_turn", release_mock)
    response = await response_for(tenant_state)
    scopes: list[CancelScope] = []

    async def consume() -> None:
        with CancelScope() as scope:
            scopes.append(scope)
            async for _ in response.body_iterator:
                pass

    task = asyncio.create_task(consume())
    await asyncio.wait_for(provider_started.wait(), 3)
    scopes[0].cancel()
    await asyncio.wait_for(task, 3)
    from app.engines.chat_runs import chat_runs

    run = chat_runs.get(SESSION, str(tenant_state.user.id), str(tenant_state.user.university_id))
    assert run is not None and not run.task.done()
    run.task.cancel()
    await asyncio.wait_for(cleanup_started.wait(), 3)
    assert not run.task.done() and not released
    allow_release.set()
    await asyncio.wait_for(run.task, 3)
    assert released
    release_mock.assert_awaited_once()
    finish_credit.assert_awaited_once()
    assert finish_credit.call_args.kwargs["refund"] is True


async def test_disconnected_browser_does_not_cancel_an_accepted_run(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    release = AsyncMock()
    finish_credit = AsyncMock()
    monkeypatch.setattr(chat, "release_turn", release)
    monkeypatch.setattr(chat, "_finish_chat_credit", finish_credit)
    response = await response_for(tenant_state, disconnected=True)
    frames = [frame async for frame in response.body_iterator]
    assert any(frame.startswith("event: done") for frame in frames)
    release.assert_awaited_once()
    assert finish_credit.call_args.kwargs["refund"] is False


async def test_title_starts_before_the_answer_finishes(
    tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    title_started = asyncio.Event()
    generation_started = asyncio.Event()
    allow_generation = asyncio.Event()

    async def name_question(*args: object) -> None:
        title_started.set()

    async def inference(
        **kwargs: object,
    ) -> AsyncGenerator[tuple[str, dict[str, object], str], None]:
        generation_started.set()
        await allow_generation.wait()
        yield "error", {"code": "PROVIDER_ERROR", "retryable": True}, "mock"

    naming = AsyncMock(side_effect=name_question)
    monkeypatch.setattr(chat, "_auto_generate_session_title", naming)
    tenant_state.ai.side_effect = inference
    response = await response_for(tenant_state)
    try:
        await asyncio.wait_for(generation_started.wait(), 1)
        await asyncio.wait_for(title_started.wait(), 1)
        naming.assert_awaited_once_with(
            SESSION, "Synthetic lifecycle question", str(tenant_state.user.id)
        )
    finally:
        allow_generation.set()
        frames = [frame async for frame in response.body_iterator]
    assert any("event: error" in frame for frame in frames)


async def test_failed_reply_still_schedules_a_title_from_the_saved_question(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        chat.intent_classifier,
        "classify",
        AsyncMock(side_effect=RuntimeError("Synthetic unavailable router")),
    )
    prompt = "Create a document about synthetic surfactants"
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{SESSION}/stream", json={"message": prompt}
    )
    assert response.status_code == 200 and "event: error" in response.text
    chat._auto_generate_session_title.assert_awaited_once_with(
        SESSION, prompt, str(tenant_state.user.id)
    )
    writes = tenant_state.connection.execute.await_args_list
    question = next(
        call.args
        for call in writes
        if "INSERT INTO public.chat_messages" in call.args[0] and "'user'" in call.args[0]
    )
    assert question[4] == prompt
    assert any(
        "WITH RECURSIVE path" in call.args[0] and call.args[2] == question[1] for call in writes
    )
    assert not any(
        "INSERT INTO public.chat_messages" in call.args[0] and "'assistant'" in call.args[0]
        for call in writes
    )
