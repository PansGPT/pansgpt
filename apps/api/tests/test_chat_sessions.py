"""Session mutation validation, ownership, busy leases and storage failures."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.chat import ChatSessionUpdateRequest
from app.routers import chat_sessions as routes


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": "   "},
        {"title": None},
        {"is_pinned": None},
        {"archived": 1},
        {"user_id": "forged"},
        {"title": "x" * 121},
    ],
)
def test_invalid_session_changes_rejected(payload):
    with pytest.raises(ValidationError):
        ChatSessionUpdateRequest(**payload)


@pytest.fixture
def session_store(monkeypatch, tenant_state):
    conn = MagicMock()
    conn.fetchrow = AsyncMock()
    conn.execute = AsyncMock()
    conn.transaction = MagicMock()
    conn.transaction.return_value.__aenter__ = AsyncMock()
    conn.transaction.return_value.__aexit__ = AsyncMock(return_value=False)

    @asynccontextmanager
    async def database():
        yield conn

    monkeypatch.setattr(routes, "get_db_connection", database)
    owned = AsyncMock()
    monkeypatch.setattr(routes, "require_owned_session", owned)
    return conn, owned, tenant_state.user


async def test_foreign_session_never_reaches_mutation(session_store):
    conn, owned, user = session_store
    owned.side_effect = HTTPException(404, "Conversation not found.")
    with pytest.raises(HTTPException) as error:
        await routes.mutate_session(str(user.id), user, ChatSessionUpdateRequest(is_pinned=True))
    assert error.value.status_code == 404
    conn.fetchrow.assert_not_awaited()


@pytest.mark.parametrize("payload", [None, ChatSessionUpdateRequest(archived=True)])
async def test_busy_conversation_cannot_be_archived_or_deleted(session_store, payload):
    conn, _, user = session_store
    conn.fetchrow.return_value = {"id": user.id, "active_run_id": user.id, "busy": True}
    with pytest.raises(HTTPException) as error:
        await routes.mutate_session(str(user.id), user, payload)
    assert error.value.status_code == 409
    conn.execute.assert_not_awaited()


async def test_delete_is_soft_and_owner_scoped(session_store):
    conn, _, user = session_store
    conn.fetchrow.return_value = {"id": user.id, "active_run_id": None, "busy": False}
    await routes.mutate_session(str(user.id), user, None)
    sql, session_id, owner = conn.execute.await_args.args
    assert "deleted_at=now()" in sql and "user_id=$2" in sql
    assert "DELETE FROM" not in sql
    assert session_id == owner == user.id


async def test_rename_values_never_become_sql(session_store):
    conn, _, user = session_store
    title = "Robert'); DROP TABLE chat_sessions; --"
    conn.fetchrow.side_effect = [
        {"id": user.id, "active_run_id": None, "busy": False},
        {
            "id": str(user.id),
            "user_id": str(user.id),
            "title": title,
            "created_at": "now",
            "updated_at": "now",
            "is_pinned": True,
        },
    ]
    result = await routes.mutate_session(
        str(user.id), user, ChatSessionUpdateRequest(title=title, is_pinned=True)
    )
    sql, *values = conn.fetchrow.await_args.args
    assert title not in sql and title in values
    assert result.title == title and result.is_pinned


async def test_metadata_fails_closed_without_database(session_store, monkeypatch):
    _, _, user = session_store

    @asynccontextmanager
    async def missing():
        yield None

    monkeypatch.setattr(routes, "get_db_connection", missing)
    with pytest.raises(HTTPException) as error:
        await routes.metadata(str(user.id), user)
    assert error.value.status_code == 503
