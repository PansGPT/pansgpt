# ==============================================================================
# Phase 7.6 Verification Suite: Admin Lecturer Invites, Public Invite Validation,
# and SlowAPI Rate Limiting Enforcement
# ==============================================================================

import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import settings
from app.core.rate_limit import limiter


@pytest.fixture(scope="session")
def rsa_key_pair():
    """Generates ephemeral RSA 2048-bit key pair for testing RS256 JWTs."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture
def mock_jwks(monkeypatch, rsa_key_pair):
    """Mocks PyJWKClient to return the matching public key for cryptographic verification."""
    _, public_key = rsa_key_pair

    class MockSigningKey:
        def __init__(self, key):
            self.key = key

    class MockJWKClient:
        def __init__(self, pub):
            self.pub = pub

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
    university_id: str = "01a07664-7a69-7ce0-ad6a-b219462cbde3",
    expires_in_seconds: int = 3600,
) -> str:
    """Signs genuine RS256 JWT."""
    private_key, _ = rsa_key_pair
    now = int(time.time())
    user_id = sub or str(uuid.uuid4())
    user_email = email or f"{role}_{user_id[:8]}@unijos.edu.ng"
    payload = {
        "sub": user_id,
        "email": user_email,
        "aud": "authenticated",
        "iat": now,
        "exp": now + expires_in_seconds,
        "user_metadata": {
            "role": role,
            "roles": roles or [role],
            "university_id": university_id,
            "first_name": "Test",
            "last_name": "User",
        },
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})


# ------------------------------------------------------------------------------
# 1. Admin Lecturer Invite RBAC Enforcement
# ------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_lecturer_invite_unauthenticated_returns_401(client, monkeypatch):
    """Unauthenticated users cannot invoke POST /api/v1/admin/lecturers/invite."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    response = await client.post(
        "/api/v1/admin/lecturers/invite",
        json={"email": "prof@unijos.edu.ng", "expires_in_days": 7},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_lecturer_invite_student_role_returns_403(client, rsa_key_pair, mock_jwks):
    """Students cannot invite faculty: returns 403 Forbidden."""
    student_token = make_token(rsa_key_pair, role="student", roles=["student"])
    response = await client.post(
        "/api/v1/admin/lecturers/invite",
        json={"email": "prof@unijos.edu.ng", "expires_in_days": 7},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"] or "Privilege" in response.json()["detail"]


@pytest.mark.asyncio
async def test_lecturer_invite_lecturer_role_returns_403(client, rsa_key_pair, mock_jwks):
    """Lecturers cannot generate institutional faculty invite links: returns 403."""
    lecturer_token = make_token(rsa_key_pair, role="lecturer", roles=["lecturer"])
    response = await client.post(
        "/api/v1/admin/lecturers/invite",
        json={"email": "colleague@unijos.edu.ng", "expires_in_days": 7},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_lecturer_invite_admin_role_creates_invite(client, rsa_key_pair, mock_jwks):
    """University admin successfully creates multi-use lecturer invite."""
    admin_token = make_token(
        rsa_key_pair,
        role="university_admin",
        roles=["university_admin"],
        university_id="01a07664-7a69-7ce0-ad6a-b219462cbde3",
    )
    payload = {
        "email": "dr_danladi@unijos.edu.ng",
        "expires_in_days": 14,
        "max_uses": 0,
        "target_level": "400",
    }
    response = await client.post(
        "/api/v1/admin/lecturers/invite",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert "token" in data
    assert "invite_url" in data
    assert data["invite_url"].endswith(data["token"])
    assert data["university_id"] == "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    assert data["grant_roles"] == ["lecturer"]
    assert data["max_uses"] == 0
    assert data["is_active"] is True


# ------------------------------------------------------------------------------
# 2. Public Invite Token Validation Endpoint
# ------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_invite_details_valid(client):
    """Valid token returns institutional metadata and active validity."""
    response = await client.get("/api/v1/auth/invites/mock-valid-lecturer-pass")
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["university_name"] == "University of Jos"
    assert data["grant_roles"] == ["lecturer"]
    assert data["is_expired"] is False
    assert data["is_exhausted"] is False


@pytest.mark.asyncio
async def test_get_invite_details_expired(client):
    """Expired token returns HTTP 410 Gone."""
    response = await client.get("/api/v1/auth/invites/mock-expired-lecturer-pass")
    assert response.status_code == 410
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_invite_details_exhausted(client):
    """Exhausted multi-use token returns HTTP 410 Gone."""
    response = await client.get("/api/v1/auth/invites/mock-exhausted-lecturer-pass")
    assert response.status_code == 410
    assert "maximum uses" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_invite_details_invalid_not_found(client):
    """Non-existent token returns HTTP 404 Not Found."""
    response = await client.get("/api/v1/auth/invites/mock-invalid-fake-token")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 3. SlowAPI Rate Limiting Enforcement (10 req / min)
# ------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auth_rate_limiting_enforcement(client):
    """
    Verifies SlowAPI rate limiter triggers HTTP 429 Too Many Requests
    when exceeding the 10 req/minute quota.
    """
    # Reset limiter storage for clean state
    limiter.reset()

    # The decorated endpoint has 10/minute limit
    url = "/api/v1/auth/invites/mock-valid-rate-limit-test"

    status_codes = []
    for _ in range(12):
        resp = await client.get(url)
        status_codes.append(resp.status_code)

    # First 10 requests should succeed (200), subsequent requests should be 429
    assert 200 in status_codes
    assert 429 in status_codes
    assert status_codes[-1] == 429
