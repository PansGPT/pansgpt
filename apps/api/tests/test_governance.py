"""Governance request validation and authorization regressions (offline)."""

from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.core import dependencies
from app.core.config import settings
from app.core.dependencies import UserContext, get_current_user, require_api_key
from app.core.governance_access import check_ai_access
from app.engines import governance as service
from app.models.governance import Command, Identity
from app.routers.governance import router


async def test_generation_settings_reset_between_events_and_cross_task_close():
    import asyncio

    from app.engines.governance_policy import configured_generation, temperature

    observed = []

    async def events():
        try:
            observed.append(temperature.get())
            yield "first"
            observed.append(temperature.get())
            yield "second"
        finally:
            observed.append(temperature.get())

    baseline = temperature.get()
    stream = configured_generation(events(), 0.7)
    assert await anext(stream) == "first"
    assert temperature.get() == baseline
    assert await asyncio.create_task(anext(stream)) == "second"
    assert temperature.get() == baseline
    await asyncio.create_task(stream.aclose())
    assert observed == [0.7, 0.7, 0.7]
    assert temperature.get() == baseline


@pytest.fixture(autouse=True)
def enable_governance(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_GOVERNANCE", True)


def account(role="university_admin"):
    return UserContext(
        id=uuid4(),
        email="synthetic@example.invalid",
        role=role,
        roles=[role],
        university_id=uuid4(),
        current_level="400",
    )


def actor(user, role="standard"):
    return Identity(
        user_id=str(user.id),
        name="Synthetic administrator",
        role=role,
        university_id=str(user.university_id),
        university_name="Example University",
        resources=service.RESOURCES[role],
    )


@pytest.fixture
def conn():
    db = MagicMock()
    db.fetchval = AsyncMock(return_value=False)
    db.fetchrow = AsyncMock(return_value=None)
    db.fetch = AsyncMock(return_value=[])
    db.execute = AsyncMock()
    db.transaction.return_value = MagicMock(
        __aenter__=AsyncMock(), __aexit__=AsyncMock(return_value=False)
    )
    return db


@pytest.mark.parametrize(
    "fields",
    [
        {"university_id": str(uuid4())},
        {"roles": "super_admin"},
        {"current_level": "700"},
        {"subscription_tier": "enterprise"},
    ],
)
def test_student_fields_cannot_override_authority(fields):
    with pytest.raises(HTTPException) as error:
        service.validate_fields(
            "students", Command(action="update", reason="Test change", fields=fields)
        )
    assert error.value.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"action": "create", "reason": "   "},
        {"action": "create", "reason": "Test", "unexpected": True},
        {"action": "erase", "reason": "Test"},
        {"action": "create", "reason": "Test", "fields": {"max_storage_bytes": 42}},
    ],
)
def test_strict_wire_requests(payload):
    with pytest.raises(ValidationError):
        Command.model_validate(payload)


def test_uuid_json_command_is_accepted():
    identifier = uuid4()
    assert (
        Command.model_validate(
            {"action": "approve", "id": str(identifier), "reason": "Reviewed source", "fields": {}}
        ).id
        == identifier
    )


@pytest.mark.parametrize(
    "resource", ["students", "lecturers", "administrators", "universities", "terms", "settings"]
)
async def test_standard_admin_cannot_enter_senior_resources(conn, resource):
    user = account()
    with pytest.raises(HTTPException) as error:
        await service.listing(conn, user, actor(user), resource, user.university_id, "", "", 1)
    assert error.value.status_code == 403
    conn.fetch.assert_not_called()


def test_foreign_tenant_query_is_rejected():
    user = account()
    with pytest.raises(HTTPException) as error:
        service.tenant(user, actor(user), uuid4())
    assert error.value.status_code == 403


async def test_existing_admin_defaults_to_standard_without_membership(conn):
    user = account()
    conn.fetchval.side_effect = [None, "Example University"]
    result = await service.identity(conn, user)
    assert result.role == "standard" and "administrators" not in result.resources


async def test_student_has_no_administrative_identity(conn):
    with pytest.raises(HTTPException) as error:
        await service.identity(conn, account("student"))
    assert error.value.status_code == 403


async def test_stale_update_is_rejected_before_writes(conn):
    user = account()
    current = datetime.now(UTC)
    conn.fetchrow.side_effect = [
        {"status": "active"},
        {"id": uuid4(), "updated_at": current, "snapshot": "{}"},
    ]
    with pytest.raises(HTTPException) as error:
        await service.mutate(
            conn,
            user,
            actor(user),
            "knowledge",
            user.university_id,
            Command(
                action="update",
                id=uuid4(),
                expected_version="old",
                reason="Updated curriculum",
                fields={"level": "400", "knowledge_text": "Synthetic curriculum"},
            ),
        )
    assert error.value.status_code == 409
    conn.execute.assert_not_called()


async def test_lecturer_cannot_restrict_unassigned_courses(conn):
    user = account("lecturer")
    start = datetime.now(UTC) + timedelta(hours=1)
    command = Command(
        action="create",
        reason="Scheduled assessment",
        fields={
            "title": "Test assessment",
            "course_code": "PCL 401",
            "level": "400",
            "start_time": start.isoformat(),
            "end_time": (start + timedelta(hours=1)).isoformat(),
        },
    )
    with pytest.raises(HTTPException) as error:
        await service.mutate_academic(
            conn, user, uuid4(), user.university_id, "restrictions", command, None
        )
    assert error.value.status_code == 403
    conn.execute.assert_not_called()


async def test_four_eyes_prevents_self_approval(conn):
    user = account("super_admin")
    with pytest.raises(HTTPException) as error:
        await service.mutate_settings(
            conn,
            user,
            uuid4(),
            Command(action="approve", reason="Independent review"),
            {"proposed_by": user.id},
        )
    assert error.value.status_code == 403
    conn.execute.assert_not_called()


@pytest.mark.parametrize(
    "maintenance,blocked,expected", [(True, False, 503), (False, True, 423), (False, False, None)]
)
async def test_server_side_ai_gates(conn, maintenance, blocked, expected):
    conn.fetchval.side_effect = [maintenance, blocked, False]
    if expected:
        with pytest.raises(HTTPException) as error:
            await check_ai_access(conn, account("student"), "PCL 401")
        assert error.value.status_code == expected
    else:
        await check_ai_access(conn, account("student"), "PCL 401")


@pytest.mark.parametrize("status", ["suspended", "banned", "rejected"])
async def test_restricted_accounts_fail_authoritative_lookup(monkeypatch, conn, status):
    conn.fetchrow.return_value = {
        "deleted_at": None,
        "account_status": status,
        "roles": ["student"],
    }

    @asynccontextmanager
    async def database(**kwargs):
        yield conn

    monkeypatch.setattr(dependencies, "get_db_connection", database)
    with pytest.raises(HTTPException) as error:
        await dependencies._lookup_user_profile(str(uuid4()), {})
    assert error.value.status_code == 403


async def test_api_requires_client_identity_even_with_authenticated_user():
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: account()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/governance/identity")
    assert response.status_code == 401


async def test_api_resource_and_pagination_validation(monkeypatch, conn):
    user = account()
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_api_key] = lambda: "web"

    @asynccontextmanager
    async def database():
        yield conn

    monkeypatch.setattr(service, "database", database)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for path in [
            "private_messages",
            "materials?page=0",
            "materials?page=10001",
            "materials?search=" + ("a" * 151),
        ]:
            assert (await client.get("/api/v1/governance/" + path)).status_code == 422
        response = await client.get("/api/v1/governance/administrators")
        assert response.status_code == 403
