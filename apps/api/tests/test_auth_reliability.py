"""Actual browser-origin and model-startup regressions from the deployed login."""

import asyncio
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from app import main
from app.core.config import Settings, settings
from app.engines.reranker import CandidateReranker

INITIALIZE_MODEL = CandidateReranker._get_flashrank_client


def test_default_cors_explicitly_contains_the_deployed_web_origin() -> None:
    assert "https://pansgpt-web.vercel.app" in Settings.model_fields["ALLOWED_ORIGINS"].default
    assert "*" not in Settings.model_fields["ALLOWED_ORIGINS"].default


async def test_deployed_web_origin_can_preflight_and_read_auth_errors(client: AsyncClient) -> None:
    origin = "https://pansgpt-web.vercel.app"
    preflight = await client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin
    assert "authorization" in preflight.headers["access-control-allow-headers"].lower()
    response = await client.get("/api/v1/auth/me", headers={"Origin": origin})
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == origin


async def test_unrelated_vercel_origin_is_not_allowed(client: AsyncClient) -> None:
    response = await client.options(
        "/api/v1/auth/me",
        headers={"Origin": "https://unrelated.vercel.app", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_concurrent_model_initialization_loads_once(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    import flashrank

    calls: list[dict[str, str]] = []
    model = object()

    def create(**kwargs: str) -> object:
        calls.append(kwargs)
        time.sleep(0.02)
        return model

    monkeypatch.setattr(flashrank, "Ranker", create)
    monkeypatch.setattr(settings, "RERANKER_CACHE_DIR", str(tmp_path))
    engine = CandidateReranker()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: INITIALIZE_MODEL(engine), range(4)))
    assert results == [model] * 4
    assert calls == [{"model_name": settings.RERANKER_MODEL, "cache_dir": str(tmp_path)}]


def test_writable_model_download_caches_are_isolated(monkeypatch: pytest.MonkeyPatch) -> None:
    import flashrank

    paths: list[str] = []
    monkeypatch.setattr(settings, "RERANKER_CACHE_DIR", None)
    monkeypatch.setattr(
        flashrank, "Ranker", lambda **kwargs: paths.append(kwargs["cache_dir"]) or object()
    )
    engines = [CandidateReranker(), CandidateReranker()]
    for engine in engines:
        assert INITIALIZE_MODEL(engine) is not None
    assert paths[0] != paths[1]


async def test_failed_model_initialization_is_not_logged_as_prewarmed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.engines.reranker import candidate_reranker

    log = MagicMock()
    monkeypatch.setattr(main, "logger", log)
    monkeypatch.setattr(candidate_reranker, "_get_flashrank_client", lambda: None)
    await main._prewarm_flashrank()
    log.info.assert_not_called()
    log.warning.assert_called_once_with("flashrank_prewarm_unavailable", fallback="heuristic")


async def test_cold_model_initialization_never_runs_on_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Model:
        def rerank(self, request: object) -> list[dict[str, object]]:
            return []

    def create() -> Model:
        assert threading.current_thread() is not threading.main_thread()
        return Model()

    engine = CandidateReranker()
    monkeypatch.setattr(engine, "_get_flashrank_client", create)
    assert await asyncio.wait_for(engine._rerank_with_flashrank("synthetic", []), timeout=1) == []
