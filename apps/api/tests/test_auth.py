# ==============================================================================
# Phase 7 Auth Backend Verification Suite (Roadmap 7.5 Gate)
# Tests JWKS RS256 token verification, RBAC role guards, API key validation
# ==============================================================================

import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.dependencies import (
    _IN_MEMORY_ROLE_CACHE,
    UserContext,
    get_current_user,
    require_api_key,
    require_lecturer,
    require_student,
    require_super_admin,
    require_university_admin,
)
from app.main import app

# ------------------------------------------------------------------------------
# Test Routes for Direct Role Guard Verification
# ------------------------------------------------------------------------------
auth_verification_router = APIRouter(prefix="/test-auth", tags=["Auth Tests"])


@auth_verification_router.get("/student")
async def _test_student_endpoint(user: UserContext = Depends(require_student)):
    return {"access": "granted", "role": user.role}


@auth_verification_router.get("/lecturer")
async def _test_lecturer_endpoint(user: UserContext = Depends(require_lecturer)):
    return {"access": "granted", "role": user.role}


@auth_verification_router.get("/university-admin")
async def _test_uni_admin_endpoint(user: UserContext = Depends(require_university_admin)):
    return {"access": "granted", "role": user.role}


@auth_verification_router.get("/super-admin")
async def _test_super_admin_endpoint(user: UserContext = Depends(require_super_admin)):
    return {"access": "granted", "role": user.role}


@auth_verification_router.get("/api-key-required")
async def _test_api_key_endpoint(client_type: str = Depends(require_api_key)):
    return {"access": "granted", "client_type": client_type}


# Register test routes once on app
if not any(getattr(r, "path", None) == "/test-auth/student" for r in app.routes):
    app.include_router(auth_verification_router)


# ------------------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------------------
@pytest.fixture(scope="session")
def rsa_key_pair():
    """Generates an ephemeral RSA 2048-bit key pair for testing genuine RS256 JWTs."""
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
    university_id: str = "01a07664-7a69-7ce0-ad6a-b219462cbde3",
    expires_in_seconds: int = 3600,
) -> str:
    """Signs a genuine RS256 JWT using the test private key."""
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
            "last_name": "Student",
        },
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})


# ------------------------------------------------------------------------------
# 1. Unauthenticated and Malformed Token Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_auth_me_unauthenticated_on_staging_returns_401(client, monkeypatch):
    """Verify GET /api/v1/auth/me with no token in staging environment returns 401 Unauthorized."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authentication credentials were not provided" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_invalid_bearer_token_returns_401(client, mock_jwks):
    """Verify GET /api/v1/auth/me with a malformed Bearer token returns 401 Unauthorized."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token-string"},
    )
    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_expired_token_returns_401(client, rsa_key_pair, mock_jwks):
    """Verify GET /api/v1/auth/me with an expired JWT returns 401 with expiration notice."""
    expired_token = make_token(rsa_key_pair, expires_in_seconds=-100)
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 2. Valid Token and Profile Inspection
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_auth_me_valid_jwt_returns_profile(client, rsa_key_pair, mock_jwks):
    """Verify GET /api/v1/auth/me with valid RS256 token returns verified user context."""
    user_id = str(uuid.uuid4())
    token = make_token(
        rsa_key_pair,
        sub=user_id,
        email="pharm_student@unijos.edu.ng",
        role="student",
        roles=["student"],
        university_id="01a07664-7a69-7ce0-ad6a-b219462cbde3",
    )
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["email"] == "pharm_student@unijos.edu.ng"
    assert data["role"] == "student"
    assert "student" in data["roles"]
    assert data["university_id"] == "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    assert data["dev_bypass"] is False


# ------------------------------------------------------------------------------
# 3. RBAC Upload Restriction: Students Have Zero Upload Capability (Roadmap 7.2)
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_upload_endpoint_with_student_role_returns_403(client, rsa_key_pair, mock_jwks):
    """Verify POST /api/v1/library/upload rejects students with HTTP 403 Forbidden."""
    student_token = make_token(rsa_key_pair, role="student", roles=["student"])
    payload = {
        "title": "Chemotherapy & Antimicrobial Agents",
        "file_name": "pharmacology_lecture.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 1048576,
        "course_code": "PCL 401",
        "course_title": "Chemotherapy & Antimicrobials",
        "target_levels": ["400"],
    }
    response = await client.post(
        "/api/v1/library/upload",
        json=payload,
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 403
    assert "Insufficient permissions" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_endpoint_with_admin_role_succeeds(client, rsa_key_pair, mock_jwks):
    """Verify POST /api/v1/library/upload allows university_admin and super_admin."""
    admin_token = make_token(
        rsa_key_pair,
        role="university_admin",
        roles=["university_admin"],
        email="admin@unijos.edu.ng",
    )
    payload = {
        "title": "Autonomic Pharmacology and Adrenoceptors",
        "file_name": "adrenoceptors.pdf",
        "mime_type": "application/pdf",
        "file_size_bytes": 2048,
        "course_code": "PCL 301",
        "course_title": "Autonomic Pharmacology",
        "target_levels": ["300"],
    }
    response = await client.post(
        "/api/v1/library/upload",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    assert "presigned_upload_url" in response.json()


# ------------------------------------------------------------------------------
# 4. Role Guards Combinations (require_student, require_lecturer, require_super_admin)
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_role_guard_require_student(client, rsa_key_pair, mock_jwks):
    """Verify require_student accepts students and rejects lecturers."""
    student_token = make_token(rsa_key_pair, role="student", roles=["student"])
    resp_student = await client.get(
        "/test-auth/student",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert resp_student.status_code == 200
    assert resp_student.json()["role"] == "student"

    lecturer_token = make_token(rsa_key_pair, role="lecturer", roles=["lecturer"])
    resp_lecturer = await client.get(
        "/test-auth/student",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert resp_lecturer.status_code == 403


@pytest.mark.asyncio
async def test_role_guard_require_lecturer(client, rsa_key_pair, mock_jwks):
    """Verify require_lecturer accepts lecturers and rejects students."""
    lecturer_token = make_token(rsa_key_pair, role="lecturer", roles=["lecturer"])
    resp_lecturer = await client.get(
        "/test-auth/lecturer",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert resp_lecturer.status_code == 200

    student_token = make_token(rsa_key_pair, role="student", roles=["student"])
    resp_student = await client.get(
        "/test-auth/lecturer",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert resp_student.status_code == 403


@pytest.mark.asyncio
async def test_role_guard_require_super_admin(client, rsa_key_pair, mock_jwks):
    """Verify require_super_admin rejects university_admin and student."""
    uni_admin_token = make_token(rsa_key_pair, role="university_admin", roles=["university_admin"])
    resp_uni_admin = await client.get(
        "/test-auth/super-admin",
        headers={"Authorization": f"Bearer {uni_admin_token}"},
    )
    assert resp_uni_admin.status_code == 403

    super_admin_token = make_token(rsa_key_pair, role="super_admin", roles=["super_admin"])
    resp_super = await client.get(
        "/test-auth/super-admin",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert resp_super.status_code == 200
    assert resp_super.json()["role"] == "super_admin"


# ------------------------------------------------------------------------------
# 5. Client Identification & API Key Validation (x-api-key)
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_api_key_validation(client, monkeypatch):
    """Verify require_api_key validates configured client keys and identifies client type."""
    test_key = "pansgpt-web-secret-key-999"
    monkeypatch.setattr(settings, "X_API_KEY_WEB", test_key)

    # Valid key -> returns client_type 'web'
    resp_valid = await client.get(
        "/test-auth/api-key-required",
        headers={"x-api-key": test_key},
    )
    assert resp_valid.status_code == 200
    assert resp_valid.json()["client_type"] == "web"

    # Invalid key -> 401
    resp_invalid = await client.get(
        "/test-auth/api-key-required",
        headers={"x-api-key": "invalid-wrong-key"},
    )
    assert resp_invalid.status_code == 401
    assert "Invalid client API key" in resp_invalid.json()["detail"]

    # Missing header -> 401
    resp_missing = await client.get("/test-auth/api-key-required")
    assert resp_missing.status_code == 401


# ------------------------------------------------------------------------------
# 6. Dev Bypass & Role Cache Invariants
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_dev_bypass_in_development_returns_super_admin(client, monkeypatch):
    """Verify development mode without auth headers returns dev super_admin."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["dev_bypass"] is True
    assert data["role"] == "super_admin"


@pytest.mark.asyncio
async def test_role_cache_stores_and_retrieves_profile(rsa_key_pair, mock_jwks):
    """Verify user role and profile are cached in memory for 5 minutes."""
    user_id = str(uuid.uuid4())
    token = make_token(
        rsa_key_pair,
        sub=user_id,
        email="cached_user@unijos.edu.ng",
        role="lecturer",
        roles=["lecturer"],
    )

    # Initial call populates cache
    user_ctx = await get_current_user(authorization=f"Bearer {token}")
    assert user_ctx.role == "lecturer"
    assert user_id in _IN_MEMORY_ROLE_CACHE

    cached_data, expire_time = _IN_MEMORY_ROLE_CACHE[user_id]
    assert cached_data["role"] == "lecturer"
    assert expire_time > time.time()
