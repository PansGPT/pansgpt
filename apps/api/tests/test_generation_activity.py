"""Real generation metadata may signal liveness; duplicate counters may not."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.engines.provider_adapters import google_turn


async def test_usage_only_google_packets_signal_actual_advancement(monkeypatch):
    chunks = [
        SimpleNamespace(
            candidates=[],
            usage_metadata=SimpleNamespace(
                prompt_token_count=50, candidates_token_count=None, thoughts_token_count=count
            ),
        )
        for count in (None, 14, 14, 20, 20)
    ]

    async def packets(**kwargs):
        async def stream():
            for chunk in chunks:
                yield chunk

        return stream()

    closed = AsyncMock()
    client = SimpleNamespace(
        aio=SimpleNamespace(models=SimpleNamespace(generate_content_stream=packets), aclose=closed)
    )
    monkeypatch.setattr("google.genai.Client", lambda **kwargs: client)
    calls, stream = await google_turn(
        "synthetic", "synthetic", [{"role": "user", "content": "test"}], None
    )
    values = [item async for item in stream]
    assert values == ["", ""] and calls == []
    closed.assert_awaited_once()
