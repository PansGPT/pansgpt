import pytest


@pytest.mark.asyncio
async def test_health_live(client):
    response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "api"


@pytest.mark.asyncio
async def test_health_ready(client):
    """Readiness reflects the configured infrastructure and provider eligibility."""
    response = await client.get("/health/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "engines" in data
    assert data["engines"]["api"] == "operational"


@pytest.mark.asyncio
async def test_hosting_health_does_not_unblock_provider_readiness(client, monkeypatch):
    import time

    from app import main

    monkeypatch.setattr(
        main,
        "_readiness_cache",
        (
            time.monotonic(),
            {
                "status": "degraded",
                "environment": "staging",
                "engines": {
                    "api": "operational",
                    "database": "ok",
                    "redis": "ok",
                    "storage": "ok",
                    "chat": "blocked",
                    "embeddings": "blocked",
                },
            },
        ),
    )
    host = await client.get("/health/infrastructure")
    product = await client.get("/health/ready")
    assert host.status_code == 200
    assert product.status_code == 503
    assert product.json()["engines"]["embeddings"] == "blocked"
    assert product.json()["engines"]["chat"] == "blocked"
    assert "chat" not in host.json()["engines"]


@pytest.mark.asyncio
@pytest.mark.parametrize("failed_dependency", ["database", "redis", "storage"])
async def test_hosting_health_rejects_broken_infrastructure(client, monkeypatch, failed_dependency):
    import time

    from app import main

    engines = {
        "api": "operational",
        "database": "ok",
        "redis": "ok",
        "storage": "ok",
        "chat": "blocked",
        "embeddings": "blocked",
    }
    engines[failed_dependency] = "error"
    monkeypatch.setattr(
        main,
        "_readiness_cache",
        (time.monotonic(), {"status": "degraded", "environment": "staging", "engines": engines}),
    )
    response = await client.get("/health/infrastructure")
    assert response.status_code == 503
    assert response.json()["engines"][failed_dependency] == "error"


@pytest.mark.asyncio
async def test_infrastructure_probes_can_progress_concurrently(client, monkeypatch):
    import asyncio
    from contextlib import asynccontextmanager
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    import redis.asyncio as aioredis

    from app import main
    from app.core import database
    from app.core.config import settings
    from app.engines.storage import storage_engine

    arrived = set()
    all_started = asyncio.Event()

    async def probe(name):
        arrived.add(name)
        if len(arrived) == 3:
            all_started.set()
        await all_started.wait()
        return True

    @asynccontextmanager
    async def connection(**kwargs):
        yield SimpleNamespace(fetchval=lambda query: probe("database"))

    @asynccontextmanager
    async def storage_client():
        yield SimpleNamespace(head_bucket=lambda **kwargs: probe("storage"))

    monkeypatch.setattr(main, "_readiness_cache", None)
    monkeypatch.setattr(settings, "ENABLE_INGESTION", True)
    monkeypatch.setattr(settings, "REDIS_URL", "redis://localhost:6379")
    monkeypatch.setattr(database, "get_db_connection", connection)
    monkeypatch.setattr(type(storage_engine), "is_configured", property(lambda self: True))
    monkeypatch.setattr(storage_engine, "get_client", storage_client)
    monkeypatch.setattr(
        aioredis,
        "from_url",
        lambda *args, **kwargs: SimpleNamespace(ping=lambda: probe("redis"), aclose=AsyncMock()),
    )
    async with asyncio.timeout(5):
        response = await client.get("/health/infrastructure")
    assert response.status_code == 200
    assert arrived == {"database", "redis", "storage"}
