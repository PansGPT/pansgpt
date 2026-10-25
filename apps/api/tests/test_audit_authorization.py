"""Regressions for phase audit findings 1, 3, 11 and 12."""

import time
import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import jwt
import pytest
from fastapi import HTTPException

from app.core import database, dependencies
from app.core.config import settings

SECRET = "offline-audit-secret-at-least-32-bytes-long"


def token(**changes: object) -> str:
    claims = {
        "sub": str(uuid.uuid4()),
        "iss": f"{settings.SUPABASE_URL}/auth/v1",
        "aud": "authenticated",
        "exp": time.time() + 60,
    }
    claims.update(changes)
    return jwt.encode(claims, SECRET, algorithm="HS256")


def test_verification_never_caches_an_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", SECRET)
    value = token()
    dependencies._verify_token(value)
    from jwt.api_jwt import datetime as original_datetime

    class FutureDatetime(original_datetime):
        @classmethod
        def now(cls, tz=None):
            return original_datetime.fromtimestamp(time.time() + 120, tz)

    monkeypatch.setattr("jwt.api_jwt.datetime", FutureDatetime)
    with pytest.raises(HTTPException) as error:
        dependencies._verify_token(value)
    assert error.value.status_code == 401


@pytest.mark.parametrize(
    "changes", [{"exp": None}, {"aud": "wrong"}, {"iss": "wrong"}, {"sub": "invalid"}]
)
def test_required_claims(changes: dict[str, object], monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", SECRET)
    with pytest.raises(HTTPException) as error:
        dependencies._verify_token(token(**changes))
    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_editable_metadata_never_grants_privileges(monkeypatch: pytest.MonkeyPatch) -> None:
    @asynccontextmanager
    async def missing_profile(**kwargs):
        conn = AsyncMock()
        conn.fetchrow.return_value = None
        yield conn

    monkeypatch.setattr(dependencies, "get_db_connection", missing_profile)
    roles, role, university, *_ = await dependencies._lookup_user_profile(
        str(uuid.uuid4()),
        {"user_metadata": {"roles": ["super_admin"], "university_id": str(uuid.uuid4())}},
    )
    assert roles == ["student"] and role == "student" and university is None


@pytest.mark.asyncio
async def test_authorization_outage_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    @asynccontextmanager
    async def offline(**kwargs):
        yield None

    monkeypatch.setattr(dependencies, "get_db_connection", offline)
    with pytest.raises(HTTPException) as error:
        await dependencies._lookup_user_profile(
            str(uuid.uuid4()), {"user_metadata": {"roles": ["super_admin"]}}
        )
    assert error.value.status_code == 503


@pytest.mark.asyncio
@pytest.mark.parametrize("pooled", [False, True])
async def test_connection_preserves_caller_exception(
    pooled: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    conn = AsyncMock()
    pool = AsyncMock() if pooled else None
    if pool:
        pool.acquire.return_value = conn
    monkeypatch.setattr(database, "_db_pool", pool)
    monkeypatch.setattr(database.asyncpg, "connect", AsyncMock(return_value=conn))
    with pytest.raises(HTTPException) as error:
        async with database.get_db_connection():
            raise HTTPException(status_code=403, detail="original")
    assert error.value.status_code == 403
