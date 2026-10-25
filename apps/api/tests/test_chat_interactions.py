"""Owned branching, durable feedback, private upload and run-fencing contracts."""

import io
import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pymupdf
import pytest
from fastapi import HTTPException

from app.engines import chat_interactions as engine
from app.models.chat import StreamChatRequest
from app.routers import chat_interactions as routes


def uid(number: int) -> str:
    return str(uuid.UUID(int=number))


def turn(number, role, parent=None, active=True, **extra):
    return {
        "id": uid(number),
        "role": role,
        "parent_message_id": uid(parent) if parent else None,
        "is_active_branch": active,
        "content": f"Question/answer {number}",
        **extra,
    }


@pytest.fixture
def tree_store(monkeypatch, tenant_state):
    rows = [
        turn(1, "user"),
        turn(2, "assistant", 1),
        turn(3, "user", 2),
        turn(4, "assistant", 3),
        turn(5, "assistant", 3, active=False),
    ]
    conn = MagicMock()
    conn.fetchrow = AsyncMock(return_value={"id": uid(80), "active_run_id": None, "busy": False})
    conn.fetch = AsyncMock(return_value=rows)
    conn.execute = AsyncMock()

    @asynccontextmanager
    async def database(*args, **kwargs):
        yield conn

    monkeypatch.setattr(engine, "get_db_connection", database)
    return conn, rows, tenant_state.user


@pytest.mark.parametrize("kind", ["missing", "cycle"])
def test_invalid_tree_is_rejected(kind):
    rows = [turn(1, "user", 2)]
    if kind == "cycle":
        rows.append(turn(2, "assistant", 1))
    with pytest.raises(HTTPException) as error:
        engine.active_path(rows, uid(1))
    assert error.value.status_code == 409


async def test_edit_branches_before_original_question_and_excludes_future_history(tree_store):
    conn, rows, user = tree_store
    result = await engine.prepare_turn(
        uid(80),
        StreamChatRequest(
            message="Revised question",
            edit_message_id=uid(3),
            history=[{"role": "system", "content": "UNTRUSTED CLIENT OVERRIDE"}],
        ),
        user,
    )
    assert result.parent_id == uid(2)
    assert [item["content"] for item in result.history] == [rows[0]["content"], rows[1]["content"]]
    assert "UNTRUSTED" not in str(result.history)
    assert not result.regenerate
    assert result.prompt == "Revised question"
    conn.execute.assert_awaited_once()


async def test_regeneration_reuses_saved_question_instead_of_supplied_prompt(tree_store):
    _, rows, user = tree_store
    result = await engine.prepare_turn(
        uid(80),
        StreamChatRequest(
            message="Forged replacement question",
            regenerate_message_id=uid(4),
        ),
        user,
    )
    assert result.user_id == uid(3)
    assert result.prompt == rows[2]["content"]
    assert result.parent_id == uid(2)
    assert result.regenerate
    assert len(result.history) == 2


@pytest.mark.parametrize(
    "payload,status",
    [
        ({"edit_message_id": uid(99)}, 404),
        ({"regenerate_message_id": uid(99)}, 404),
        ({"edit_message_id": uid(4)}, 422),
        ({"regenerate_message_id": uid(3)}, 422),
        ({"parent_message_id": uid(99)}, 404),
        ({"parent_message_id": uid(3)}, 422),
        ({"edit_message_id": uid(3), "regenerate_message_id": uid(4)}, 422),
    ],
)
async def test_invalid_cross_session_or_wrong_role_actions_never_acquire_run(
    tree_store, payload, status
):
    conn, _, user = tree_store
    with pytest.raises(HTTPException) as error:
        await engine.prepare_turn(
            uid(80), StreamChatRequest(message="Study question", **payload), user
        )
    assert error.value.status_code == status
    conn.execute.assert_not_awaited()


async def test_active_run_prevents_parallel_inference(tree_store):
    conn, _, user = tree_store
    conn.fetchrow.return_value = {"id": uid(80), "active_run_id": uid(90), "busy": True}
    with pytest.raises(HTTPException) as error:
        await engine.prepare_turn(uid(80), StreamChatRequest(message="Study"), user)
    assert error.value.status_code == 409
    conn.execute.assert_not_awaited()


async def test_attachment_ids_must_belong_to_the_owned_conversation(tree_store):
    conn, rows, user = tree_store
    conn.fetch.side_effect = [rows, []]
    with pytest.raises(HTTPException) as error:
        await engine.prepare_turn(
            uid(80), StreamChatRequest(message="Explain", attachment_ids=[uid(99)]), user
        )
    assert error.value.status_code == 404
    conn.execute.assert_not_awaited()


async def test_run_release_is_fenced_by_run_id(tree_store):
    conn, _, _ = tree_store
    await engine.release_turn(uid(80), uid(90))
    sql, session, run = conn.execute.await_args.args
    assert "active_run_id=$2" in sql
    assert session == uuid.UUID(uid(80)) and run == uuid.UUID(uid(90))


async def test_combined_attachments_are_rejected_instead_of_silently_truncated(tree_store):
    conn, rows, user = tree_store
    conn.fetch.side_effect = [
        rows,
        [
            {"id": uid(98), "extracted_text": "a" * 30000},
            {"id": uid(99), "extracted_text": "b" * 30000},
        ],
    ]
    with pytest.raises(HTTPException) as error:
        await engine.prepare_turn(
            uid(80), StreamChatRequest(message="Explain", attachment_ids=[uid(98), uid(99)]), user
        )
    assert error.value.status_code == 413
    conn.execute.assert_not_awaited()


@pytest.mark.parametrize("action", ["branch", "feedback", "attachment"])
async def test_foreign_session_actions_are_denied_before_storage_or_ai(
    client, tenant_state, monkeypatch, action
):
    foreign = next(iter(tenant_state.sessions))
    tenant_state.sessions[foreign]["user_id"] = uuid.UUID(uid(999))
    storage = AsyncMock(side_effect=AssertionError("Foreign attachment must not reach storage"))
    monkeypatch.setattr(routes.storage_engine, "upload_bytes", storage)
    if action == "branch":
        response = await client.post(
            f"/api/v1/ai/chat/sessions/{foreign}/branch", json={"message_id": uid(1)}
        )
    elif action == "feedback":
        response = await client.put(
            f"/api/v1/ai/chat/sessions/{foreign}/messages/{uid(1)}/feedback",
            json={"rating": "positive"},
        )
    else:
        response = await client.post(
            f"/api/v1/ai/chat/sessions/{foreign}/attachments",
            files={"file": ("study.txt", b"Synthetic text", "text/plain")},
        )
    assert response.status_code == 404
    storage.assert_not_awaited()
    tenant_state.ai.assert_not_called()


@pytest.mark.parametrize(
    "data,kind",
    [
        (b"MZbinary", "application/pdf"),
        (b"a\x00b", "text/plain"),
        (b"\xff\xfe", "text/plain"),
        (b"", "text/plain"),
        (b"a" * 40001, "text/plain"),
        (b"hello", "text/html"),
    ],
    ids=["spoofed-pdf", "binary-text", "invalid-utf8", "empty", "too-long", "unsupported"],
)
def test_attachment_validation_rejects_spoofed_binary_empty_and_oversized_text(data, kind):
    with pytest.raises((ValueError, UnicodeError)):
        routes.extract_document(data, kind)


def test_pdf_attachment_extracts_real_page_text():
    with pymupdf.open() as document:
        page = document.new_page()
        page.insert_text((72, 72), "Synthetic pharmacy study material")
        pdf = document.tobytes()
    assert "Synthetic pharmacy study material" in routes.extract_document(pdf, "application/pdf")


async def test_upload_failure_does_not_leave_orphaned_r2_objects(client, tenant_state, monkeypatch):
    owned = next(
        key for key, row in tenant_state.sessions.items() if row["user_id"] == tenant_state.user.id
    )
    conn = MagicMock()
    conn.fetchval = AsyncMock(return_value=0)
    conn.execute = AsyncMock(side_effect=[None, RuntimeError("Simulated persistence failure")])

    @asynccontextmanager
    async def database():
        yield conn

    upload = AsyncMock()
    remove = AsyncMock(return_value=True)
    monkeypatch.setattr(routes, "get_db_connection", database)
    monkeypatch.setattr(routes.storage_engine, "upload_bytes", upload)
    monkeypatch.setattr(routes.storage_engine, "delete_object", remove)
    with pytest.raises(RuntimeError, match="Simulated persistence failure"):
        await client.post(
            f"/api/v1/ai/chat/sessions/{owned}/attachments",
            files={"file": ("study.txt", io.BytesIO(b"Synthetic text"), "text/plain")},
        )
    upload.assert_awaited_once()
    remove.assert_awaited_once_with(upload.await_args.args[0])
