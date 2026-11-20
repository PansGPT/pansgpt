"""Auxiliary chat inference must obey quota before SDK requests and close clients."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from app.engines import provider_capacity as capacity
from app.engines.embedder import EmbeddingError, GeminiEmbeddingEngine
from app.engines.query_expansion import QueryExpansionEngine
from app.engines.vision import VisionAnalysisEngine


@pytest.fixture
def denied(monkeypatch):
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = SimpleNamespace(eval=AsyncMock(return_value=[0, 12, 1]))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    return store


async def test_query_expansion_denial_never_calls_provider_and_closes_client(monkeypatch, denied):
    import groq

    sdk = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=AsyncMock())), close=AsyncMock()
    )
    constructor = MagicMock(return_value=sdk)
    monkeypatch.setattr(groq, "AsyncGroq", constructor)
    engine = QueryExpansionEngine()
    engine.groq_key = "fixture-live"
    assert await engine._call_groq_json("PRIVATE SYNTHETIC QUERY") is None
    sdk.chat.completions.create.assert_not_awaited()
    sdk.close.assert_awaited_once()
    assert constructor.call_args.kwargs["max_retries"] == 0
    assert "PRIVATE" not in str(denied.eval.call_args)


async def test_query_embedding_denial_is_immediate_and_closes_client(monkeypatch, denied):
    from google import genai

    monkeypatch.setattr(settings, "EMBEDDER_FAKE_MODE", False)
    sdk = SimpleNamespace(
        aio=SimpleNamespace(models=SimpleNamespace(embed_content=AsyncMock()), aclose=AsyncMock())
    )
    monkeypatch.setattr(genai, "Client", lambda **kwargs: sdk)
    engine = GeminiEmbeddingEngine()
    with pytest.raises(EmbeddingError, match="capacity"):
        await engine.embed_batch(["PRIVATE SYNTHETIC QUERY"], kind="query")
    sdk.aio.models.embed_content.assert_not_awaited()
    sdk.aio.aclose.assert_awaited_once()
    denied.eval.assert_awaited_once()


async def test_vision_reserves_nontext_capacity_without_sending_pixels_to_redis(
    monkeypatch, denied
):
    import groq

    sdk = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=AsyncMock())), close=AsyncMock()
    )
    monkeypatch.setattr(groq, "AsyncGroq", lambda **kwargs: sdk)
    engine = VisionAnalysisEngine()
    with pytest.raises(capacity.CapacityDeferred):
        await engine._call_groq_vision(
            b"PRIVATE IMAGE PIXELS", "image/png", "PRIVATE QUESTION", "system"
        )
    sdk.chat.completions.create.assert_not_awaited()
    sdk.close.assert_awaited_once()
    args = denied.eval.call_args.args
    assert int(args[3 + args[1]]) >= settings.VISION_INPUT_TOKEN_RESERVE
    assert "PRIVATE" not in str(denied.eval.call_args)
