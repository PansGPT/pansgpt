"""Synthetic rolled-back SQL/API checks; never live inference or storage calls."""

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import pytest

from app.core.ids import uuid7
from app.engines import chat_titles
from app.routers import chat_discovery
from tests.test_chat_interactions_live import live_chat  # noqa: F401

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.fixture
async def discovery(live_chat, monkeypatch):  # noqa: F811 - imported pytest fixture dependency
    client, conn, user, _ = live_chat

    @asynccontextmanager
    async def connection(*args, **kwargs):
        yield conn

    monkeypatch.setattr(chat_discovery, "get_db_connection", connection)
    monkeypatch.setattr(chat_titles, "get_db_connection", connection)
    return client, conn, user


async def create(client, title=None):
    response = await client.post(
        "/api/v1/ai/chat/sessions", json={} if title is None else {"title": title}
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def test_search_selected_history_archives_pagination_and_owner_isolation(discovery):
    client, conn, user = discovery
    session = await create(client, "Synthetic notebook")
    message = uuid7()
    await conn.execute(
        "INSERT INTO public.chat_messages(id,session_id,role,content,thinking_text) VALUES($1,$2,'user','We discussed warfarin metabolism','private_reasoning_needle')",
        message,
        session,
    )
    await conn.execute(
        "INSERT INTO public.chat_messages(session_id,role,content,is_active_branch) VALUES($1,'assistant','hidden_branch_needle',false)",
        session,
    )
    titled = await create(client, "Warfarin Revision")
    archived = await create(client, "Warfarin Archived")
    assert (
        await client.patch(f"/api/v1/ai/chat/sessions/{archived}", json={"archived": True})
    ).status_code == 200
    foreign = uuid7()
    await conn.execute(
        "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",
        foreign,
        f"{foreign}@example.invalid",
    )
    await conn.execute(
        "UPDATE public.users SET university_id=$2 WHERE id=$1", foreign, user.university_id
    )
    await conn.execute(
        "INSERT INTO public.chat_sessions(user_id,title) VALUES($1,'Warfarin Foreign')", foreign
    )
    response = await client.get("/api/v1/ai/chat/search", params={"q": "warfarin", "limit": 1})
    assert response.status_code == 200, response.text
    assert response.json()["next_offset"] == 1
    second = await client.get(
        "/api/v1/ai/chat/search", params={"q": "warfarin", "limit": 1, "offset": 1}
    )
    results = response.json()["results"] + second.json()["results"]
    assert {row["session_id"] for row in results} == {session, titled}
    hit = next(row for row in results if row["session_id"] == session)
    assert hit["message_id"] == str(message) and "warfarin" in hit["snippet"]
    assert second.json()["next_offset"] is None
    included = await client.get(
        "/api/v1/ai/chat/search", params={"q": "warfarin", "include_archived": True}
    )
    assert {row["session_id"] for row in included.json()["results"]} == {session, titled, archived}
    for query in ("hidden_branch_needle", "private_reasoning_needle", "%_"):
        assert (await client.get("/api/v1/ai/chat/search", params={"q": query})).json()[
            "results"
        ] == []
    assert (
        await client.get("/api/v1/ai/chat/search", params={"q": " ", "limit": 999})
    ).status_code == 422


async def test_soft_delete_recovery_expiry_and_activity_order(discovery):
    client, conn, user = discovery
    session = await create(client, "Recovery study")
    await conn.execute(
        "INSERT INTO public.chat_messages(session_id,role,content) VALUES($1,'user','Recovery note')",
        session,
    )
    activity = await conn.fetchval(
        "SELECT last_message_at FROM public.chat_sessions WHERE id=$1", session
    )
    response = await client.patch(
        f"/api/v1/ai/chat/sessions/{session}",
        json={"title": "Manual name", "is_pinned": True, "archived": True},
    )
    assert response.status_code == 200 and response.json()["title_source"] == "manual"
    assert (
        await conn.fetchval("SELECT last_message_at FROM public.chat_sessions WHERE id=$1", session)
        == activity
    )
    assert (await client.delete(f"/api/v1/ai/chat/sessions/{session}")).status_code == 204
    assert (
        await client.get(
            "/api/v1/ai/chat/search", params={"q": "Recovery", "include_archived": True}
        )
    ).json()["results"] == []
    trash = await client.get("/api/v1/ai/chat/trash")
    assert trash.status_code == 200 and trash.json()["sessions"][0]["id"] == session
    restored = await client.post(f"/api/v1/ai/chat/sessions/{session}/restore")
    assert (
        restored.status_code == 200
        and restored.json()["is_pinned"]
        and restored.json()["archived_at"]
    )
    assert (await client.get("/api/v1/ai/chat/trash")).json()["sessions"] == []
    await conn.execute(
        "UPDATE public.chat_sessions SET deleted_at=now()-interval '31 days' WHERE id=$1", session
    )
    assert (await client.post(f"/api/v1/ai/chat/sessions/{session}/restore")).status_code == 404
    assert (await client.post(f"/api/v1/ai/chat/sessions/{uuid7()}/restore")).status_code == 404
    assert (await client.get("/api/v1/ai/chat/trash")).json()["sessions"] == []


async def test_semantic_title_null_generated_and_manual_race(discovery, monkeypatch):
    client, conn, user = discovery
    session = await create(client)
    await conn.execute(
        "INSERT INTO public.chat_messages(session_id,role,content) VALUES($1,'user','Please explain clearance')",
        session,
    )
    monkeypatch.setattr(
        type(chat_titles.settings),
        "provider_privacy_allowed",
        lambda self, provider: provider == "groq",
    )
    monkeypatch.setitem(chat_titles.settings.__dict__, "GROQ_API_KEY", "synthetic-title-key")
    provider = AsyncMock(return_value='{"title":null,"provisional":true}')
    monkeypatch.setattr(chat_titles, "routing_completion", provider)
    await chat_titles.generate_title(session, str(user.id))
    assert (
        await conn.fetchval("SELECT title_source FROM public.chat_sessions WHERE id=$1", session)
        == "pending"
    )
    provider.return_value = '{"title":"Drug Clearance Explained","provisional":false}'
    await chat_titles.generate_title(session, str(user.id))
    assert (
        await conn.fetchval("SELECT title FROM public.chat_sessions WHERE id=$1", session)
        == "Drug Clearance Explained"
    )
    race = await create(client)

    async def rename_during_generation(*args, **kwargs):
        assert (
            await client.patch(f"/api/v1/ai/chat/sessions/{race}", json={"title": "New Chat"})
        ).status_code == 200
        return '{"title":"Do Not Replace Manual","provisional":false}'

    provider.side_effect = rename_during_generation
    await chat_titles.generate_title(race, str(user.id))
    assert (
        await conn.fetchval("SELECT title FROM public.chat_sessions WHERE id=$1", race)
        == "New Chat"
    )
    provider.reset_mock()
    await chat_titles.generate_title(race, str(user.id))
    provider.assert_not_awaited()


async def test_purge_enqueues_owned_artifacts_only_after_last_chat_reference(discovery):
    client, conn, user = discovery
    first, second = await create(client), await create(client)
    key = f"artifacts/{user.university_id}/{user.id}/pptx/{uuid7()}.pptx"
    parts = json.dumps(
        {"artifacts": [{"storage_key": key}, {"storage_key": "artifacts/foreign/private.pptx"}]}
    )
    for session in (first, second):
        await conn.execute(
            "INSERT INTO public.chat_messages(session_id,role,content,tool_calls) VALUES($1,'assistant','Synthetic deck',$2::jsonb)",
            session,
            parts,
        )
    await conn.execute("DELETE FROM public.chat_sessions WHERE id=$1", first)
    assert not await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM public.storage_cleanup_jobs WHERE object_key=$1)", key
    )
    await conn.execute("DELETE FROM public.chat_sessions WHERE id=$1", second)
    assert await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM public.storage_cleanup_jobs WHERE object_key=$1)", key
    )
    assert not await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM public.storage_cleanup_jobs WHERE object_key='artifacts/foreign/private.pptx')"
    )
