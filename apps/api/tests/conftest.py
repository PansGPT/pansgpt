import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings  # [EMBED FIX]
from app.engines.llm import llm_engine
from app.main import app


@pytest.fixture(autouse=True)
def mock_offline_llm_defaults(monkeypatch):
    """Ensure all test cases run fast and offline by default without network calls."""
    monkeypatch.setattr(settings, "EMBEDDER_FAKE_MODE", True)  # [EMBED FIX]
    monkeypatch.setattr(llm_engine, "gemini_key", "test-mock-key")
    monkeypatch.setattr(llm_engine, "groq_key", "test-mock-key")
    monkeypatch.setattr(llm_engine, "openrouter_key", "test-mock-key")


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
