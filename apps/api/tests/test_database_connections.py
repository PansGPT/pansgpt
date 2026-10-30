"""Cold authorization connections and pool pressure must not create retry storms."""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core import database, dependencies


async def test_authorization_allows_cold_connection_handshake_without_using_cached_roles(
    monkeypatch,
):
    university = uuid4()
    connection = AsyncMock()
    connection.fetchrow.return_value = {
        "roles": ["student"],
        "university_id": university,
        "first_name": None,
        "last_name": None,
        "current_level": "400",
        "terms_accepted_at": None,
        "deleted_at": None,
    }
    pool = AsyncMock()

    async def acquire(*, timeout):
        # A measured ~3-second TLS/auth handshake does not fit the old total budget.
        if timeout <= 3:
            raise TimeoutError()
        assert timeout <= 15
        return connection

    pool.acquire.side_effect = acquire
    monkeypatch.setattr(database, "_db_pool", pool)
    monkeypatch.setattr(dependencies, "_set_cached_role", AsyncMock())
    roles, role, tenant, *_ = await dependencies._lookup_user_profile(str(uuid4()), {})
    assert roles == ["student"] and role == "student" and tenant == university
    connection.fetchrow.assert_awaited_once()
    pool.release.assert_awaited_once_with(connection)


@pytest.mark.parametrize("failure", [TimeoutError(), OSError("Temporary network failure")])
async def test_exhausted_pool_never_spawns_unbounded_direct_connections(monkeypatch, failure):
    pool = AsyncMock()
    pool.acquire.side_effect = failure
    connect = AsyncMock()
    monkeypatch.setattr(database, "_db_pool", pool)
    monkeypatch.setattr(database.asyncpg, "connect", connect)
    async with database.get_db_connection(timeout=3) as connection:
        assert connection is None
    connect.assert_not_awaited()
    pool.release.assert_not_awaited()


async def test_unpooled_connection_has_bounded_handshake_and_query_timeouts(monkeypatch):
    connection = AsyncMock()
    connect = AsyncMock(return_value=connection)
    monkeypatch.setattr(database, "_db_pool", None)
    monkeypatch.setattr(database.asyncpg, "connect", connect)
    async with database.get_db_connection(timeout=3) as result:
        assert result is connection
    assert connect.await_args.kwargs["timeout"] == 10
    assert connect.await_args.kwargs["command_timeout"] == 15
    connection.close.assert_awaited_once()
