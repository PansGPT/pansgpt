"""Semantic social titles remain replaceable; final/manual titles stay protected."""

import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.engines import chat_titles

SESSION = "018f3a30-0001-7000-8000-000000000001"
USER = "018f3a30-0001-7000-8000-000000000002"


@pytest.fixture
def title_store(monkeypatch):
    state = {"title": "New Chat", "title_source": "pending"}
    rows = [{"role": "user", "content": "Good morning chat, how are you doing?"}]
    conn = MagicMock()
    conn.fetchrow = AsyncMock(side_effect=lambda *args: state.copy())
    conn.fetch = AsyncMock(side_effect=lambda *args: list(reversed(rows)))

    async def write(sql, session_id, owner, title, source):
        if state["title_source"] == "pending":
            state.update(title=title, title_source=source)
            return "UPDATE 1"
        return "UPDATE 0"

    conn.execute = AsyncMock(side_effect=write)

    @asynccontextmanager
    async def database(**kwargs):
        yield conn

    monkeypatch.setattr(chat_titles, "get_db_connection", database)
    monkeypatch.setattr(
        type(chat_titles.settings),
        "provider_privacy_allowed",
        lambda self, provider: provider == "groq",
    )
    monkeypatch.setitem(chat_titles.settings.__dict__, "GROQ_API_KEY", "synthetic-title-key")
    completion = AsyncMock()
    monkeypatch.setattr(chat_titles, "routing_completion", completion)
    return state, rows, conn, completion


async def test_social_name_is_published_then_replaced_by_the_substantive_topic(title_store):
    state, rows, conn, completion = title_store
    completion.return_value = '{"title":"Morning check-in","provisional":true}'
    await chat_titles.generate_title(SESSION, USER)
    assert state == {"title": "Morning check-in", "title_source": "pending"}
    rows.append({"role": "user", "content": "What is warfarin?"})
    completion.return_value = '{"title":"Warfarin Medication Overview","provisional":false}'
    await chat_titles.generate_title(SESSION, USER)
    assert state == {"title": "Warfarin Medication Overview", "title_source": "generated"}
    assert json.loads(completion.call_args.args[4]) == rows
    await chat_titles.generate_title(SESSION, USER)
    assert completion.await_count == conn.execute.await_count == 2


async def test_social_classifier_uses_the_entire_selected_context(title_store):
    state, rows, _, completion = title_store
    rows[:] = [
        {"role": "user", "content": "Explain warfarin"},
        {"role": "assistant", "content": "Synthetic educational explanation."},
        {"role": "user", "content": "Thanks, good morning!"},
    ]
    completion.return_value = '{"title":"Understanding Warfarin Therapy","provisional":false}'
    await chat_titles.generate_title(SESSION, USER)
    assert state["title_source"] == "generated"
    assert json.loads(completion.call_args.args[4]) == rows


async def test_manual_rename_during_generation_wins(title_store):
    state, _, conn, completion = title_store

    async def rename(*args, **kwargs):
        state.update(title="My chosen name", title_source="manual")
        return '{"title":"Morning check-in","provisional":true}'

    completion.side_effect = rename
    await chat_titles.generate_title(SESSION, USER)
    assert state == {"title": "My chosen name", "title_source": "manual"}
    assert "title_source='pending'" in conn.execute.call_args.args[0]
    await chat_titles.generate_title(SESSION, USER)
    completion.assert_awaited_once()


@pytest.mark.parametrize(
    "output", ['{"title":"Morning check-in"}', '{"title":null,"provisional":true}']
)
async def test_incomplete_or_unnamable_results_leave_the_title_pending(title_store, output):
    state, _, conn, completion = title_store
    completion.return_value = output
    await chat_titles.generate_title(SESSION, USER)
    assert state == {"title": "New Chat", "title_source": "pending"}
    conn.execute.assert_not_awaited()
