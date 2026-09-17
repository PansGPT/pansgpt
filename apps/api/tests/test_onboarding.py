# ==============================================================================
# Phase 8 Verification: Student Onboarding & Universities Endpoint Tests
# ==============================================================================

import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app

UNIJOS_UUID = "01a07664-7a69-7ce0-ad6a-b219462cbde3"


@pytest.fixture(scope="session")
def rsa_key_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture
def mock_jwks(monkeypatch, rsa_key_pair):
    _, public_key = rsa_key_pair

    class MockSigningKey:
        def __init__(self, key):
            self.key = key

    class MockJWKClient:
        def __init__(self, pub):
            self.pub = pub
            self.uri = "https://mock.supabase.co/auth/v1/.well-known/jwks.json"

        def get_signing_key_from_jwt(self, token):
            return MockSigningKey(self.pub)

        def get_jwk_set(self):
            return {"keys": []}

    mock_client = MockJWKClient(public_key)
    monkeypatch.setattr("app.core.dependencies.get_jwks_client", lambda: mock_client)
    return mock_client


def make_token(
    rsa_key_pair,
    sub: str | None = None,
    email: str | None = None,
    role: str = "student",
    roles: list[str] | None = None,
) -> str:
    private_key, _ = rsa_key_pair
    now = int(time.time())
    user_id = sub or str(uuid.uuid4())
    user_email = email or f"{role}_{user_id[:8]}@unijos.edu.ng"
    payload = {
        "sub": user_id,
        "email": user_email,
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "user_metadata": {
            "role": role,
            "roles": roles or [role],
        },
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-key-id"})


@pytest.mark.asyncio
async def test_get_universities_returns_active_institutions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/auth/universities")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        unijos = next((u for u in data if u.get("short_name") == "UNIJOS"), None)
        assert unijos is not None
        assert "id" in unijos
        assert unijos["name"] == "University of Jos"


@pytest.mark.asyncio
async def test_onboard_rejects_unaccepted_terms(mock_jwks, rsa_key_pair, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    token = make_token(rsa_key_pair)
    payload = {
        "first_name": "Elijah",
        "last_name": "Sani",
        "university_id": UNIJOS_UUID,
        "current_level": "300",
        "terms_accepted": False,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/onboard",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422
        assert "Terms of Service" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_onboard_rejects_invalid_level(mock_jwks, rsa_key_pair, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    token = make_token(rsa_key_pair)
    payload = {
        "first_name": "Elijah",
        "last_name": "Sani",
        "university_id": UNIJOS_UUID,
        "current_level": "700",
        "terms_accepted": True,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/auth/onboard",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422
        assert "Invalid academic level" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_onboard_success_and_profile_reflection(mock_jwks, rsa_key_pair, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    user_id = str(uuid.uuid4())
    token = make_token(rsa_key_pair, sub=user_id, email="student_onboard@unijos.edu.ng")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Verify before onboarding is_onboarded=False
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["is_onboarded"] is False

        # 2. Complete onboarding
        onboard_payload = {
            "first_name": "Elijah",
            "last_name": "Sani",
            "university_id": UNIJOS_UUID,
            "current_level": "400",
            "terms_accepted": True,
        }
        onboard_resp = await client.post(
            "/api/v1/auth/onboard",
            json=onboard_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert onboard_resp.status_code == 200
        data = onboard_resp.json()
        assert data["first_name"] == "Elijah"
        assert data["last_name"] == "Sani"
        assert data["current_level"] == "400"
        assert data["is_onboarded"] is True
        assert data["terms_accepted_at"] is not None

        # 3. Subsequent call returns updated profile
        me_resp2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp2.status_code == 200
        assert me_resp2.json()["is_onboarded"] is True
        assert me_resp2.json()["first_name"] == "Elijah"
