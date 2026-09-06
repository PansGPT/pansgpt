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
    """Readiness check: accepts 200 (DB reachable) or 503 (no DB in CI) — both are valid."""
    response = await client.get("/health/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "engines" in data
    assert data["engines"]["api"] == "operational"
