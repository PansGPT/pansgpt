import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health_live(client):
    response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "api"


@pytest.mark.asyncio
async def test_health_ready_mocked(client):
    with patch("asyncpg.connect") as mock_connect:
        mock_conn = mock_connect.return_value
        mock_conn.fetchval.return_value = 1
        response = await client.get("/health/ready")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert "engines" in data
        assert data["engines"]["api"] == "operational"
