"""Startup outage recovery and resource isolation, with no external services."""

import asyncio
import threading
from concurrent.futures import Future
from unittest.mock import AsyncMock

import pytest
import structlog

from app.core import database
from app.core.config import settings
from app.engines.reranker import CandidateReranker


async def test_concurrent_pool_initialization_is_single_flight(monkeypatch):
    release = asyncio.Event()
    pool = object()

    async def create(*args, **kwargs):
        await release.wait()
        return pool

    connect = AsyncMock(side_effect=create)
    monkeypatch.setattr(database, "_db_pool", None)
    monkeypatch.setattr(database.asyncpg, "create_pool", connect)
    pending = [asyncio.create_task(database.init_db_pool()) for _ in range(8)]
    await asyncio.sleep(0)
    assert connect.await_count == 1
    release.set()
    assert await asyncio.gather(*pending) == [pool] * 8


async def test_independent_startup_dependencies_can_progress_in_parallel(monkeypatch):
    from unittest.mock import MagicMock

    from app import main
    from app.engines import chat_runs, provider_capacity, provider_http
    from app.engines.reranker import candidate_reranker

    names = set()
    all_started = asyncio.Event()

    async def probe(name):
        names.add(name)
        if len(names) == 4:
            all_started.set()
        await all_started.wait()
        return object()

    monkeypatch.setattr(settings, "ENABLE_AI", True)
    monkeypatch.setattr(settings, "RERANKER_PROVIDER", "flashrank")
    monkeypatch.setattr(main, "init_db_pool", lambda: probe("database"))
    monkeypatch.setattr(main, "prewarm_jwks_cache", lambda: probe("jwks"))
    monkeypatch.setattr(main, "_prewarm_flashrank", lambda: probe("model"))
    monkeypatch.setattr(main, "_prewarm_capacity", lambda: probe("redis"))
    monkeypatch.setattr(main, "close_db_pool", AsyncMock())
    monkeypatch.setattr(chat_runs.chat_runs, "shutdown", AsyncMock())
    monkeypatch.setattr(provider_capacity, "close_capacity", AsyncMock())
    monkeypatch.setattr(provider_http, "close_provider_http", AsyncMock())
    monkeypatch.setattr(candidate_reranker, "close", MagicMock())
    async with asyncio.timeout(2):
        async with main.lifespan(main.app):
            assert names == {"database", "jwks", "model", "redis"}


async def test_failed_startup_recovers_with_one_background_loop(monkeypatch):
    pool = AsyncMock()
    monkeypatch.setattr(database, "_db_pool", None)
    monkeypatch.setattr(database, "_recovery_task", None)
    connect = AsyncMock(side_effect=[TimeoutError("PRIVATE DSN"), pool])
    monkeypatch.setattr(database.asyncpg, "create_pool", connect)
    with structlog.testing.capture_logs() as logs:
        assert await database.init_db_pool() is None
        database.start_db_recovery()
        task = database._recovery_task
        database.start_db_recovery()
        assert task is database._recovery_task
        await asyncio.wait_for(asyncio.shield(task), 3)
        assert database._db_pool is pool
        await database.close_db_pool()
    assert connect.await_count == 2 and "PRIVATE" not in str(logs)
    pool.close.assert_awaited_once()


async def test_failed_startup_fallback_cannot_open_unbounded_connections(monkeypatch):
    monkeypatch.setattr(database, "_db_pool", None)
    release, entered = asyncio.Event(), asyncio.Event()
    connections = []

    async def connect(*args, **kwargs):
        connection = AsyncMock()
        connections.append(connection)
        if len(connections) == 3:
            entered.set()
        return connection

    monkeypatch.setattr(database.asyncpg, "connect", connect)

    async def occupy():
        async with database.get_db_connection(timeout=0.02) as connection:
            assert connection is not None
            await release.wait()

    tasks = [asyncio.create_task(occupy()) for _ in range(3)]
    try:
        await asyncio.wait_for(entered.wait(), 1)
        async with database.get_db_connection(timeout=0.02) as result:
            assert result is None
        assert len(connections) == 3
    finally:
        release.set()
        await asyncio.gather(*tasks)
    assert all(connection.close.await_count == 1 for connection in connections)


async def test_warmup_does_not_queue_initialization_jobs_per_request(monkeypatch):
    engine = CandidateReranker()
    release = threading.Event()
    calls = []

    def initialize():
        calls.append(threading.current_thread().name)
        release.wait(3)
        return None

    monkeypatch.setattr(engine, "_get_flashrank_client", initialize)
    first = engine.start_warmup()
    try:
        assert all(engine.start_warmup() is first for _ in range(50))
        for _ in range(20):
            with pytest.raises(RuntimeError, match="unavailable"):
                await engine._rerank_with_flashrank("synthetic", [])
        assert len(calls) == 1
        assert calls[0] == "flashrank-warmup"
    finally:
        release.set()
        await asyncio.wrap_future(first)
        engine.close()


async def test_cancelled_rerank_awaiters_do_not_free_cpu_slots_early():
    release = threading.Event()
    started = threading.Event()
    calls = []

    class Model:
        def rerank(self, request):
            calls.append(1)
            if len(calls) == 2:
                started.set()
            release.wait(3)
            return []

    engine = CandidateReranker()
    engine._warm_future = Future()
    engine._warm_future.set_result(Model())
    tasks = [asyncio.create_task(engine._rerank_with_flashrank("synthetic", [])) for _ in range(2)]
    try:
        for _ in range(100):
            if started.is_set():
                break
            await asyncio.sleep(0.01)
        assert started.is_set()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        with pytest.raises(RuntimeError, match="busy"):
            await engine._rerank_with_flashrank("synthetic", [])
        assert len(calls) == 2
    finally:
        release.set()
        await asyncio.gather(*tasks, return_exceptions=True)
        engine.close()
