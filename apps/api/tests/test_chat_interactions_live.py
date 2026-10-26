"""Real SQL + API interactions in a rolled-back synthetic staging/local transaction.

Requires CHAT_INTERACTIONS_TEST_DATABASE_URL and --allow-live-services. Staging
also requires ALLOW_STAGING_CHAT_TESTS=1. Inference, storage and credits are mocked.
"""

import json
import os
import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
from urllib.parse import urlsplit

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.core import authorization
from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7
from app.engines import chat_interactions as engine
from app.main import app
from app.models.chat import ComplexityLevel, IntentType, QueryClassification, RouteType
from app.routers import chat, chat_sessions
from app.routers import chat_interactions as routes

pytestmark = [pytest.mark.live, pytest.mark.asyncio]


@pytest.fixture
async def live_chat(monkeypatch):
    url = os.getenv("CHAT_INTERACTIONS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Explicit transactional chat test database not configured")
    parsed = urlsplit(url)
    local = parsed.hostname in ("localhost", "127.0.0.1")
    staging = parsed.hostname == "db.nrzbjhqtcxlfiyvoeanb.supabase.co" or (
        (parsed.hostname or "").endswith(".pooler.supabase.com")
        and (parsed.username or "").endswith(".nrzbjhqtcxlfiyvoeanb")
    )
    assert local or (staging and os.getenv("ALLOW_STAGING_CHAT_TESTS") == "1")
    conn = await asyncpg.connect(url, timeout=15, statement_cache_size=0)
    transaction = conn.transaction()
    await transaction.start()
    overrides = dict(app.dependency_overrides)
    try:
        university = await conn.fetchval(
            "INSERT INTO public.universities(name,slug,status) VALUES('Synthetic chat verification',$1,'active') RETURNING id",
            f"chat-verification-{uuid7()}",
        )
        user_id = uuid7()
        await conn.execute(
            "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,'{}')",
            user_id,
            f"{user_id}@example.invalid",
        )
        await conn.execute(
            "UPDATE public.users SET university_id=$2,roles=ARRAY['student']::public.user_role[] WHERE id=$1",
            user_id,
            university,
        )
        user = UserContext(
            id=user_id,
            email="synthetic@example.invalid",
            role="student",
            roles=["student"],
            university_id=university,
        )

        @asynccontextmanager
        async def connection(*args, **kwargs):
            yield conn

        for module in (chat, routes, engine, authorization, chat_sessions):
            monkeypatch.setattr(module, "get_db_connection", connection)
        app.dependency_overrides[get_current_user] = lambda: user
        monkeypatch.setattr(chat, "_deduct_user_credit", AsyncMock(return_value=100))
        monkeypatch.setattr(chat, "_finish_chat_credit", AsyncMock())
        monkeypatch.setattr(chat, "_auto_generate_session_title", AsyncMock())
        monkeypatch.setattr(
            chat.intent_classifier,
            "classify",
            AsyncMock(
                return_value=QueryClassification(
                    intent=IntentType.GREETING_CONVERSATIONAL,
                    route=RouteType.FAST_PATH,
                    complexity=ComplexityLevel.SIMPLE,
                    requires_rag=False,
                    requires_tools=False,
                    confidence=1.0,
                    routing_source="server_context",
                )
            ),
        )
        calls = []

        async def inference(**kwargs):
            calls.append(kwargs)
            yield "text_chunk", {"token": "Synthetic verified answer."}, "mock"

        monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", inference)
        monkeypatch.setattr(routes.storage_engine, "upload_bytes", AsyncMock())
        monkeypatch.setattr(routes.storage_engine, "delete_object", AsyncMock(return_value=True))
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client, conn, user, calls
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(overrides)
        await transaction.rollback()
        await conn.close()


def init_event(response):
    assert response.status_code == 200, response.text
    frames = response.text.split("\n\n")
    assert any(frame.startswith("event: done") for frame in frames), response.text
    frame = next(frame for frame in frames if frame.startswith("event: init"))
    return json.loads(frame.split("data: ", 1)[1])


async def test_real_branch_feedback_attachments_and_run_release(live_chat):
    client, conn, user, calls = live_chat
    created = await client.post("/api/v1/ai/chat/sessions", json={"title": "Synthetic transaction"})
    assert created.status_code == 201
    session = created.json()["id"]
    path = f"/api/v1/ai/chat/sessions/{session}"
    first = init_event(
        await client.post(
            path + "/stream", json={"message": "Original study question", "enable_rag": False}
        )
    )
    assert (
        await conn.fetchval(
            "SELECT active_run_id FROM public.chat_sessions WHERE id=$1", created.json()["id"]
        )
        is None
    )
    second = init_event(
        await client.post(
            path + "/stream",
            json={
                "message": "Forged client replacement",
                "regenerate_message_id": first["assistant_message_id"],
            },
        )
    )
    assert first["user_message_id"] == second["user_message_id"]
    assert calls[-1]["user_message"] == "Original study question"
    history = await client.get(path + "?include_branches=true")
    assert history.status_code == 200
    assert len(history.json()["messages"]) == 3
    selected = await client.post(
        path + "/branch", json={"message_id": first["assistant_message_id"]}
    )
    assert selected.status_code == 200, selected.text
    active = (await client.get(path)).json()["messages"]
    assert [row["id"] for row in active] == [
        first["user_message_id"],
        first["assistant_message_id"],
    ]
    feedback = await client.put(
        path + f"/messages/{first['assistant_message_id']}/feedback", json={"rating": "positive"}
    )
    assert feedback.status_code == 200
    await client.put(
        path + f"/messages/{first['assistant_message_id']}/feedback", json={"rating": "negative"}
    )
    assert (await client.get(path)).json()["messages"][-1]["feedback"] == "negative"
    upload = await client.post(
        path + "/attachments",
        files={"file": ("synthetic.txt", b"Synthetic private lecture excerpt", "text/plain")},
    )
    assert upload.status_code == 201, upload.text
    attachment = upload.json()["id"]
    edited = init_event(
        await client.post(
            path + "/stream",
            json={
                "message": "Revised study question",
                "edit_message_id": first["user_message_id"],
                "attachment_ids": [attachment],
            },
        )
    )
    assert edited["user_message_id"] != first["user_message_id"]
    assert "Synthetic private lecture excerpt" in calls[-1]["system_prompt"]
    assert "chat_attachments" not in (await client.get(path)).text
    assert (await client.get(path)).json()["messages"][0]["attachment_metadata"]["attachments"][0][
        "id"
    ] == attachment
    assert (await client.delete(path + f"/attachments/{attachment}")).status_code == 404
    assert (
        await client.put(
            path + f"/messages/{edited['user_message_id']}/feedback", json={"rating": "positive"}
        )
    ).status_code == 422


async def test_real_rls_and_direct_write_boundaries(live_chat):
    _, conn, user, _ = live_chat
    assert await conn.fetchval(
        "SELECT relrowsecurity FROM pg_class WHERE oid='public.chat_attachments'::regclass"
    )
    assert await conn.fetchval(
        "SELECT relrowsecurity FROM pg_class WHERE oid='public.chat_message_feedback'::regclass"
    )
    for table in ("chat_messages", "chat_sessions", "chat_attachments", "chat_message_feedback"):
        for privilege in ("INSERT", "UPDATE", "DELETE"):
            assert not await conn.fetchval(
                "SELECT has_table_privilege('authenticated',$1,$2)", "public." + table, privilege
            )
    assert not await conn.fetchval(
        "SELECT has_table_privilege('authenticated','public.chat_attachments','SELECT')"
    )
    session = await conn.fetchval(
        "INSERT INTO public.chat_sessions(user_id,title) VALUES($1,'Synthetic RLS') RETURNING id",
        user.id,
    )
    question = await conn.fetchval(
        "INSERT INTO public.chat_messages(session_id,role,content) VALUES($1,'user','Synthetic') RETURNING id",
        session,
    )
    answer = await conn.fetchval(
        "INSERT INTO public.chat_messages(session_id,parent_message_id,role,content) VALUES($1,$2,'assistant','Synthetic') RETURNING id",
        session,
        question,
    )
    await conn.execute(
        "INSERT INTO public.chat_message_feedback(session_id,message_id,user_id,rating) VALUES($1,$2,$3,'positive')",
        session,
        answer,
        user.id,
    )
    await conn.execute("SET LOCAL ROLE authenticated")
    await conn.execute(
        "SELECT set_config('request.jwt.claims',$1,true)",
        json.dumps({"sub": str(user.id), "role": "authenticated"}),
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.chat_message_feedback WHERE message_id=$1", answer
        )
        == 1
    )
    await conn.execute(
        "SELECT set_config('request.jwt.claims',$1,true)",
        json.dumps({"sub": str(uuid7()), "role": "authenticated"}),
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.chat_message_feedback WHERE message_id=$1", answer
        )
        == 0
    )
    await conn.execute("RESET ROLE")


async def test_real_session_organization_and_soft_delete(live_chat):
    client, conn, user, _ = live_chat
    created = await client.post(
        "/api/v1/ai/chat/sessions", json={"title": "Synthetic organization"}
    )
    assert created.status_code == 201
    session = created.json()["id"]
    path = f"/api/v1/ai/chat/sessions/{session}"
    saved = await client.patch(path, json={"title": "  Revised   study title  ", "is_pinned": True})
    assert saved.status_code == 200, saved.text
    assert saved.json()["title"] == "Revised study title" and saved.json()["is_pinned"]
    assert (await client.get(path + "/metadata")).json()["title"] == "Revised study title"
    visible = (await client.get("/api/v1/ai/chat/sessions")).json()["sessions"]
    assert visible[0]["id"] == session
    archived = await client.patch(path, json={"archived": True})
    assert archived.status_code == 200 and archived.json()["archived_at"] is not None
    assert session not in [
        row["id"] for row in (await client.get("/api/v1/ai/chat/sessions")).json()["sessions"]
    ]
    assert session in [
        row["id"]
        for row in (await client.get("/api/v1/ai/chat/sessions?archived=true")).json()["sessions"]
    ]
    restored = await client.patch(path, json={"archived": False})
    assert restored.status_code == 200 and restored.json()["archived_at"] is None
    assert (await client.delete(path)).status_code == 204
    assert await conn.fetchval(
        "SELECT deleted_at IS NOT NULL FROM public.chat_sessions WHERE id=$1", uuid.UUID(session)
    )
    assert (await client.get(path)).status_code == 404
    assert (await client.patch(path, json={"title": "Hidden"})).status_code == 404


async def test_real_session_controls_reject_foreign_owner_and_invalid_updates(live_chat):
    client, _, user, _ = live_chat
    session = (await client.post("/api/v1/ai/chat/sessions", json={})).json()["id"]
    path = f"/api/v1/ai/chat/sessions/{session}"
    for invalid in (
        {},
        {"title": "  "},
        {"title": None},
        {"is_pinned": 1},
        {"user_id": str(user.id)},
    ):
        assert (await client.patch(path, json=invalid)).status_code == 422
    foreign = UserContext(
        id=uuid7(),
        email="foreign@example.invalid",
        role="student",
        roles=["student"],
        university_id=user.university_id,
    )
    app.dependency_overrides[get_current_user] = lambda: foreign
    try:
        assert (await client.get(path + "/metadata")).status_code == 404
        assert (await client.patch(path, json={"is_pinned": True})).status_code == 404
        assert (await client.delete(path)).status_code == 404
    finally:
        app.dependency_overrides[get_current_user] = lambda: user


async def test_real_session_busy_lease_and_resume_archived(live_chat):
    client, conn, _, _ = live_chat
    session = (await client.post("/api/v1/ai/chat/sessions", json={})).json()["id"]
    path = f"/api/v1/ai/chat/sessions/{session}"
    await conn.execute(
        "UPDATE public.chat_sessions SET active_run_id=$2,active_run_started_at=now() WHERE id=$1",
        uuid.UUID(session),
        uuid7(),
    )
    assert (await client.patch(path, json={"archived": True})).status_code == 409
    assert (await client.delete(path)).status_code == 409
    assert (await client.patch(path, json={"title": "Rename during response"})).status_code == 200
    await conn.execute(
        "UPDATE public.chat_sessions SET active_run_started_at=now()-interval '1 day' WHERE id=$1",
        uuid.UUID(session),
    )
    assert (await client.patch(path, json={"archived": True})).status_code == 200
    init_event(
        await client.post(
            path + "/stream",
            json={"message": "Resume this synthetic conversation", "enable_rag": False},
        )
    )
    assert (await client.get(path + "/metadata")).json()["archived_at"] is None


async def test_real_progress_excludes_provider_scratchpad(live_chat, monkeypatch):
    client, conn, _, _ = live_chat

    async def inference(**kwargs):
        yield "thinking_chunk", {"delta": "PRIVATE PROVIDER SCRATCHPAD\n    raw code"}, "mock"
        yield (
            "text_chunk",
            {"token": "<think>PRIVATE TAGGED SCRATCHPAD</think>Public verified response."},
            "mock",
        )

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", inference)
    session = (await client.post("/api/v1/ai/chat/sessions", json={})).json()["id"]
    path = f"/api/v1/ai/chat/sessions/{session}"
    response = await client.post(
        path + "/stream", json={"message": "Synthetic progress verification", "enable_rag": False}
    )
    identifiers = init_event(response)
    assert "PRIVATE" not in response.text
    row = await conn.fetchrow(
        "SELECT content,thinking_text FROM public.chat_messages WHERE id=$1",
        uuid.UUID(identifiers["assistant_message_id"]),
    )
    assert row["content"] == "Public verified response."
    assert row["thinking_text"] == "Reviewing your request.\nPreparing your response."
    assert "PRIVATE" not in (await client.get(path)).text


async def test_semantic_direct_reply_persists_in_owned_branch_without_second_model(
    live_chat: tuple[AsyncClient, asyncpg.Connection, UserContext, list[dict[str, object]]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.core.config import settings
    from app.engines import intent_classifier as routing
    from app.engines.intent_classifier import IntentClassifier
    from tests.test_intent_classifier import decision

    client, conn, user, calls = live_chat
    monkeypatch.setitem(settings.__dict__, "GROQ_API_KEY", "synthetic-fixture")
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)
    completion = AsyncMock(return_value=decision(answer="Synthetic direct study reply."))
    monkeypatch.setattr(routing, "routing_completion", completion)
    monkeypatch.setattr(chat.intent_classifier, "classify", IntentClassifier().classify)
    monkeypatch.setattr(chat.llm_engine, "_record_telemetry", AsyncMock())
    created = await client.post(
        "/api/v1/ai/chat/sessions", json={"title": "Synthetic semantic route"}
    )
    assert created.status_code == 201
    path = f"/api/v1/ai/chat/sessions/{created.json()['id']}"
    response = await client.post(path + "/stream", json={"message": "hello chat"})
    event = init_event(response)
    assert "Synthetic direct study reply." in response.text
    assert calls == []
    completion.assert_awaited_once()
    history = (await client.get(path)).json()["messages"]
    assistant = next(row for row in history if row["id"] == event["assistant_message_id"])
    assert assistant["content"] == "Synthetic direct study reply."
    assert assistant["parent_message_id"] == event["user_message_id"]
    assert (
        await conn.fetchval(
            "SELECT active_run_id FROM public.chat_sessions WHERE id=$1", created.json()["id"]
        )
        is None
    )


async def test_routing_outage_leaves_no_false_answer_and_releases_owned_run(
    live_chat: tuple[AsyncClient, asyncpg.Connection, UserContext, list[dict[str, object]]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, conn, user, calls = live_chat
    monkeypatch.setattr(
        chat.intent_classifier,
        "classify",
        AsyncMock(
            return_value=QueryClassification(
                intent=IntentType.UNCERTAIN,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=False,
                requires_tools=False,
                confidence=0,
                routing_source="fallback",
            )
        ),
    )
    retrieval = AsyncMock()
    finish = AsyncMock()
    monkeypatch.setattr(chat.rag_engine, "retrieve_context", retrieval)
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)
    created = await client.post(
        "/api/v1/ai/chat/sessions", json={"title": "Synthetic routing outage"}
    )
    assert created.status_code == 201
    path = f"/api/v1/ai/chat/sessions/{created.json()['id']}"
    response = await client.post(path + "/stream", json={"message": "Hello"})
    assert '"code": "AI_ROUTING_UNAVAILABLE"' in response.text
    assert "event: done" in response.text
    assert calls == []
    retrieval.assert_not_awaited()
    assert finish.call_args.kwargs["refund"] is True
    # Failed attempts do not advance the selected successful branch.
    assert (await client.get(path)).json()["messages"] == []
    messages = (await client.get(path + "?include_branches=true")).json()["messages"]
    assert [message["role"] for message in messages] == ["user"]
    assert (
        await conn.fetchval(
            "SELECT active_run_id FROM public.chat_sessions WHERE id=$1", created.json()["id"]
        )
        is None
    )
