"""Contract and integration tests for PATCH /api/v1/auth/profile and /me."""

import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from tests.auth_support import auth_connection, register_profile

pytestmark = pytest.mark.usefixtures("authoritative_auth_store")


@pytest.fixture(scope="session")
def rsa_key_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


@pytest.fixture
def mock_jwks(monkeypatch, rsa_key_pair, authoritative_auth_store):
    _, public_key = rsa_key_pair

    class MockSigningKey:
        def __init__(self, key):
            self.key = key

    class MockJWKClient:
        def __init__(self, pub):
            self.pub = pub

        def get_signing_key_from_jwt(self, token):
            return MockSigningKey(self.pub)

    mock_client = MockJWKClient(public_key)
    monkeypatch.setattr("app.core.dependencies.get_jwks_client", lambda: mock_client)
    return mock_client


def make_token(
    rsa_key_pair,
    sub: str | None = None,
    email: str | None = None,
    role: str = "student",
    university_id: str = "01a07664-7a69-7ce0-ad6a-b219462cbde3",
) -> str:
    private_key, _ = rsa_key_pair
    now = int(time.time())
    user_id = sub or str(uuid.uuid4())
    user_email = email or f"{role}_{user_id[:8]}@unijos.edu.ng"
    register_profile(user_id, [role], university_id)

    payload = {
        "iss": f"{settings.SUPABASE_URL}/auth/v1",
        "sub": user_id,
        "email": user_email,
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
        "user_metadata": {
            "role": role,
            "roles": [role],
            "university_id": university_id,
            "first_name": "Test",
            "last_name": "Student",
        },
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-kid-1"})


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_update_profile_name_success(
    monkeypatch: pytest.MonkeyPatch, mock_jwks, rsa_key_pair
) -> None:
    user_id = str(uuid.uuid4())
    uni_id = "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    register_profile(user_id, ["student"], uni_id)

    monkeypatch.setattr("app.core.database.get_db_connection", auth_connection)
    token = make_token(rsa_key_pair, sub=user_id, email="student@unijos.edu.ng")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"first_name": "Elijah", "last_name": "Sani"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["first_name"] == "Elijah"
        assert data["last_name"] == "Sani"


@pytest.mark.anyio
async def test_update_profile_level_success(
    monkeypatch: pytest.MonkeyPatch, mock_jwks, rsa_key_pair
) -> None:
    user_id = str(uuid.uuid4())
    uni_id = "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    register_profile(user_id, ["student"], uni_id)

    monkeypatch.setattr("app.core.database.get_db_connection", auth_connection)
    token = make_token(rsa_key_pair, sub=user_id, email="student@unijos.edu.ng")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_level": "400"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["current_level"] == "400"


@pytest.mark.anyio
async def test_update_profile_me_alias(
    monkeypatch: pytest.MonkeyPatch, mock_jwks, rsa_key_pair
) -> None:
    user_id = str(uuid.uuid4())
    uni_id = "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    register_profile(user_id, ["student"], uni_id)

    monkeypatch.setattr("app.core.database.get_db_connection", auth_connection)
    token = make_token(rsa_key_pair, sub=user_id, email="student@unijos.edu.ng")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"first_name": "NewName"},
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["first_name"] == "NewName"


@pytest.mark.anyio
async def test_update_profile_invalid_level_rejected(
    monkeypatch: pytest.MonkeyPatch, mock_jwks, rsa_key_pair
) -> None:
    user_id = str(uuid.uuid4())
    register_profile(user_id, ["student"])

    monkeypatch.setattr("app.core.database.get_db_connection", auth_connection)
    token = make_token(rsa_key_pair, sub=user_id, email="student@unijos.edu.ng")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"current_level": "700"},
        )
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_update_profile_empty_first_name_rejected(
    monkeypatch: pytest.MonkeyPatch, mock_jwks, rsa_key_pair
) -> None:
    user_id = str(uuid.uuid4())
    register_profile(user_id, ["student"])

    monkeypatch.setattr("app.core.database.get_db_connection", auth_connection)
    token = make_token(rsa_key_pair, sub=user_id, email="student@unijos.edu.ng")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"first_name": "   "},
        )
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_update_profile_unauthenticated() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            "/api/v1/auth/profile",
            json={"first_name": "Unauth"},
        )
        assert resp.status_code == 401
