"""Rollback-only SQL checks on an explicitly selected disposable local database.

The minimal Auth tables model session/refresh foreign keys, not hosted GoTrue.
No hosted URL or user credentials are accepted by this fixture.
"""

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlsplit
from uuid import UUID

import asyncpg
import pytest
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.core import dependencies
from app.core.config import settings
from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7
from app.main import app
from app.routers import settings as routes

pytestmark = [pytest.mark.live, pytest.mark.asyncio]
HEADERS = {"X-API-Key": "synthetic-settings-key"}
SettingsStore = tuple[
    AsyncClient, asyncpg.Connection, UserContext, tuple[UUID, UUID, UUID, UUID], UUID
]


@pytest.fixture
async def stored_settings(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[SettingsStore]:
    url = os.getenv("SETTINGS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Disposable settings database not selected")
    parsed = urlsplit(url)
    assert parsed.hostname in {"127.0.0.1", "localhost"}
    assert parsed.path == "/pansgpt_governance_test" and parsed.port == 55434
    conn = await asyncpg.connect(url, timeout=10)
    transaction = conn.transaction()
    await transaction.start()
    overrides = dict(app.dependency_overrides)
    try:
        # Auth-managed IDs are provider IDs. Application records still use UUIDv7.
        await conn.execute("""
            CREATE TABLE auth.sessions(
              id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),
              created_at timestamptz,updated_at timestamptz,
              refreshed_at timestamp,not_after timestamptz,user_agent text,ip inet);
            ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
            CREATE TABLE auth.refresh_tokens(id uuid PRIMARY KEY,
              session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE);
            ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;
        """)
        university = await conn.fetchval(
            "INSERT INTO public.universities(name,slug) VALUES($1,$1) RETURNING id",
            f"Synthetic-settings-{uuid7()}",
        )
        owner, foreign = uuid7(), uuid7()
        for identity in (owner, foreign):
            await conn.execute("INSERT INTO auth.users(id) VALUES($1)", identity)
            await conn.execute(
                "INSERT INTO public.users(id,email,first_name,university_id) VALUES($1,$2,'Synthetic',$3)",
                identity,
                f"{identity}@example.invalid",
                university,
            )
        current, other, third, outsider, expired = (uuid7() for _ in range(5))
        for identity, session in (
            (owner, current),
            (owner, other),
            (owner, third),
            (foreign, outsider),
            (owner, expired),
        ):
            await conn.execute(
                "INSERT INTO auth.sessions(id,user_id,created_at,updated_at,not_after,user_agent,ip) VALUES($1,$2,now(),now(),CASE WHEN $3 THEN now()-interval '1 day' ELSE NULL END,$4,'192.0.2.10')",
                session,
                identity,
                session == expired,
                "Mozilla/5.0 Chrome/100 Windows" if session == current else None,
            )
            await conn.execute("INSERT INTO auth.refresh_tokens VALUES($1,$2)", uuid7(), session)
        user = UserContext(
            id=owner,
            email="synthetic@example.invalid",
            role="student",
            roles=["student"],
            university_id=university,
            session_id=current,
        )

        @asynccontextmanager
        async def connection(**kwargs: object) -> AsyncIterator[asyncpg.Connection]:
            yield conn

        monkeypatch.setattr(routes, "get_db_connection", connection)
        monkeypatch.setattr(dependencies, "get_db_connection", connection)
        monkeypatch.setattr(settings, "ENABLE_GOVERNANCE", False)
        monkeypatch.setattr(settings, "X_API_KEY_WEB", HEADERS["X-API-Key"])
        monkeypatch.setattr(routes.limiter, "enabled", False)
        app.dependency_overrides[get_current_user] = lambda: user
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", headers=HEADERS
        ) as client:
            yield client, conn, user, (other, third, outsider, expired), foreign
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(overrides)
        await transaction.rollback()
        await conn.close()


async def test_sql_owned_sessions_revocation_and_access_rejection(
    stored_settings: SettingsStore,
) -> None:
    client, conn, user, (other, third, outsider, expired), _ = stored_settings
    listed = await client.get("/api/v1/settings/sessions")
    assert listed.status_code == 200, listed.text
    sessions = listed.json()["sessions"]
    assert {row["id"] for row in sessions} == {str(user["session_id"]), str(other), str(third)}
    assert sessions[0]["is_current"] and sessions[0]["device"] == "Chrome (Windows)"
    assert (await client.delete(f"/api/v1/settings/sessions/{outsider}")).status_code == 404
    assert (
        await client.delete(f"/api/v1/settings/sessions/{user['session_id']}")
    ).status_code == 409
    assert (await client.delete(f"/api/v1/settings/sessions/{other}")).status_code == 200
    assert not await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM auth.refresh_tokens WHERE session_id=$1)", other
    )
    with pytest.raises(HTTPException) as rejected:
        await dependencies._lookup_user_profile(str(user.id), {"session_id": str(other)})
    assert rejected.value.status_code == 401
    allowed = await dependencies._lookup_user_profile(
        str(user.id), {"session_id": str(user["session_id"])}
    )
    assert allowed[0] == ["student"]
    result = await client.delete("/api/v1/settings/sessions")
    assert result.status_code == 200 and result.json()["revoked_count"] == 2
    remaining = await conn.fetch("SELECT id FROM auth.sessions")
    assert {row["id"] for row in remaining} == {user["session_id"], outsider}
    assert await conn.fetchval("SELECT count(*) FROM auth.refresh_tokens") == 2


async def test_sql_feedback_persistence_idempotency_and_foreign_collision(
    stored_settings: SettingsStore,
) -> None:
    client, conn, user, _, foreign = stored_settings
    identity = uuid7()
    payload = {"request_id": str(identity), "category": "bug", "description": "Synthetic feedback"}
    for _ in range(2):
        response = await client.post("/api/v1/settings/feedback", json=payload)
        assert response.status_code == 200, response.text
    assert (
        await conn.fetchval("SELECT user_id FROM public.support_tickets WHERE id=$1", identity)
        == user.id
    )
    assert (
        await conn.fetchval(
            "SELECT count(*) FROM public.support_ticket_replies WHERE ticket_id=$1", identity
        )
        == 1
    )
    changed = await client.post(
        "/api/v1/settings/feedback", json={**payload, "description": "Changed"}
    )
    assert changed.status_code == 409
    foreign_id = await conn.fetchval(
        "INSERT INTO public.support_tickets(user_id,subject,category) VALUES($1,'Synthetic','other') RETURNING id",
        foreign,
    )
    collision = await client.post(
        "/api/v1/settings/feedback", json={**payload, "request_id": str(foreign_id)}
    )
    assert collision.status_code == 409
    assert (
        await conn.fetchval("SELECT user_id FROM public.support_tickets WHERE id=$1", foreign_id)
        == foreign
    )


async def test_sql_feedback_rolls_back_when_first_reply_fails(
    stored_settings: SettingsStore,
) -> None:
    client, conn, _, _, _ = stored_settings
    identity = uuid7()
    await conn.execute(
        "ALTER TABLE public.support_ticket_replies ADD CONSTRAINT settings_test_failure CHECK(message<>'Synthetic rejected reply')"
    )
    result = await client.post(
        "/api/v1/settings/feedback",
        json={
            "request_id": str(identity),
            "category": "other",
            "description": "Synthetic rejected reply",
        },
    )
    assert result.status_code == 503
    assert not await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM public.support_tickets WHERE id=$1)", identity
    )
