"""Account controls must confirm real operations and retain owner boundaries."""

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import MagicMock
from uuid import UUID

import httpx
import pytest
from fastapi import HTTPException

from app.core import dependencies
from app.core.config import settings
from app.routers import settings as routes
from tests.conftest import TenantTestState

CURRENT = UUID("01900000-0000-7000-8000-000000000001")
OTHER = UUID("01900000-0000-7000-8000-000000000002")
HEADERS = {"X-API-Key": "synthetic-client-key", "Authorization": "Bearer synthetic-user-token"}


@pytest.fixture
def controls(monkeypatch: pytest.MonkeyPatch, tenant_state: TenantTestState) -> TenantTestState:
    monkeypatch.setattr(routes.limiter, "enabled", False)
    monkeypatch.setattr(settings, "X_API_KEY_WEB", HEADERS["X-API-Key"])
    tenant_state.user["session_id"] = CURRENT
    tenant_state.connection.fetch.side_effect = None
    tenant_state.connection.fetchrow.side_effect = None
    tenant_state.connection.fetchrow.return_value = {"id": tenant_state.user.id}
    tenant_state.connection.fetchval.return_value = True

    @asynccontextmanager
    async def connection(**kwargs: object) -> AsyncIterator[MagicMock]:
        yield tenant_state.connection

    monkeypatch.setattr(routes, "get_db_connection", connection)
    return tenant_state


@pytest.mark.parametrize(
    "code,status,expected",
    [
        (None, 200, None),
        ("weak_password", 422, "INVALID_PASSWORD"),
        ("same_password", 422, "SAME_PASSWORD"),
        ("reauthentication_needed", 403, "REAUTHENTICATION_REQUIRED"),
        ("reauthentication_not_valid", 422, "INVALID_CONFIRMATION"),
        ("current_password_required", 400, "CURRENT_PASSWORD_REQUIRED"),
        ("current_password_invalid", 400, "INVALID_PASSWORD"),
        ("current_password_mismatch", 400, "INVALID_CURRENT_PASSWORD"),
        (None, 401, "SESSION_EXPIRED"),
        (None, 429, "RATE_LIMITED"),
        (None, 503, "UNAVAILABLE"),
    ],
)
async def test_password_provider_confirmation_and_private_errors(
    client: httpx.AsyncClient,
    controls: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    code: str | None,
    status: int,
    expected: str | None,
) -> None:
    calls: list[httpx.Request] = []

    def provider(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(status, json={"code": code, "msg": "PRIVATE PROVIDER DETAIL"})

    original = httpx.AsyncClient
    monkeypatch.setattr(
        routes.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(provider), **kwargs),
    )
    payload = {
        "password": "synthetic-new-password-123",
        "current_password": "synthetic-current-123",
        "nonce": "123456",
    }
    result = await client.put("/api/v1/settings/password", json=payload, headers=HEADERS)
    assert len(calls) == 1 and calls[0].method == "PUT"
    assert str(calls[0].url) == f"{settings.SUPABASE_URL}/auth/v1/user"
    assert calls[0].headers["authorization"] == HEADERS["Authorization"]
    assert calls[0].headers["apikey"] == settings.SUPABASE_ANON_KEY
    assert json.loads(calls[0].content) == payload
    assert "PRIVATE PROVIDER DETAIL" not in result.text and payload["password"] not in result.text
    if expected is None:
        assert result.status_code == 200 and result.json() == {"status": "updated"}
    else:
        assert result.status_code >= 400 and result.json()["detail"]["code"] == expected


async def test_confirmation_uses_captured_bearer_and_no_password(
    client: httpx.AsyncClient,
    controls: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[httpx.Request] = []

    def provider(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={})

    original = httpx.AsyncClient
    monkeypatch.setattr(
        routes.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(provider), **kwargs),
    )
    result = await client.post("/api/v1/settings/password/reauthenticate", headers=HEADERS)
    assert result.json() == {"status": "sent"}
    assert calls[0].url.path == "/auth/v1/reauthenticate" and calls[0].method == "GET"
    assert calls[0].content == b""


async def test_invalid_password_validation_never_echoes_secrets(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    result = await client.put(
        "/api/v1/settings/password",
        json={
            "password": "secret",
            "current_password": "private-credential",
            "nonce": "sensitive-code",
        },
        headers=HEADERS,
    )
    assert result.status_code == 422
    assert "private-credential" not in result.text and "sensitive-code" not in result.text
    assert all("input" not in error for error in result.json()["detail"])


@pytest.mark.parametrize(
    "agent,stored_ip,display_ip",
    [
        (None, "192.0.2.1/32", "192.0.2.1"),
        ("node", "192.0.2.1/32", "192.0.2.1"),
        ("python-httpx/0.28.1", "2001:db8::1/128", "2001:db8::1"),
        (" ", None, None),
    ],
)
async def test_owned_session_list_contains_no_fake_metadata_or_secret_material(
    client: httpx.AsyncClient,
    controls: TenantTestState,
    agent: str | None,
    stored_ip: str | None,
    display_ip: str | None,
) -> None:
    now = datetime.now(UTC)
    controls.connection.fetch.return_value = [
        {
            "id": CURRENT,
            "user_agent": "Mozilla Chrome/100 Windows",
            "ip_address": stored_ip,
            "created_at": now,
            "last_active_at": now,
        },
        {
            "id": OTHER,
            "user_agent": agent,
            "ip_address": None,
            "created_at": None,
            "last_active_at": None,
        },
    ]
    result = await client.get("/api/v1/settings/sessions", headers=HEADERS)
    assert result.status_code == 200, result.text
    assert result.headers["cache-control"] == "private, no-store"
    current, other = result.json()["sessions"]
    assert current["is_current"] and current["device"] == "Chrome (Windows)"
    assert current["ip_address"] == display_ip
    assert (
        not other["is_current"]
        and other["device"] == "Unknown device"
        and other["ip_address"] is None
    )
    assert "refresh_token" not in result.text and "user_agent" not in result.text
    assert controls.connection.fetch.call_args.args[1:] == (controls.user.id, CURRENT)


@pytest.mark.parametrize("marker,browser", [("CriOS/100", "Chrome"), ("FxiOS/100", "Firefox")])
async def test_ios_browser_identity_takes_precedence_over_safari_compatibility_token(
    client: httpx.AsyncClient, controls: TenantTestState, marker: str, browser: str
) -> None:
    controls.connection.fetch.return_value = [
        {
            "id": CURRENT,
            "user_agent": f"Mozilla/5.0 (iPhone) {marker} Mobile/123 Safari/604.1",
            "ip_address": None,
            "created_at": None,
            "last_active_at": None,
        }
    ]
    response = await client.get("/api/v1/settings/sessions", headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["sessions"][0]["device"] == f"{browser} (iPhone)"
    assert response.json()["sessions"][0]["device_type"] == "mobile"


@pytest.mark.parametrize("target", [None, OTHER, CURRENT])
async def test_session_revocation_is_owned_and_keeps_current_session(
    client: httpx.AsyncClient,
    controls: TenantTestState,
    target: UUID | None,
) -> None:
    controls.connection.fetch.return_value = [{"id": OTHER}]
    result = await client.delete(
        "/api/v1/settings/sessions" + (f"/{target}" if target else ""), headers=HEADERS
    )
    if target == CURRENT:
        assert result.status_code == 409
        controls.connection.fetch.assert_not_awaited()
    else:
        assert result.status_code == 200 and result.json()["revoked_count"] == 1
        sql, owner, keep, desired = controls.connection.fetch.call_args.args
        assert "user_id=$1" in sql and "id<>$2" in sql
        assert (owner, keep, desired) == (controls.user.id, CURRENT, target)


async def test_foreign_session_never_reports_success(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    controls.connection.fetch.return_value = []
    result = await client.delete(f"/api/v1/settings/sessions/{OTHER}", headers=HEADERS)
    assert result.status_code == 404


@pytest.mark.parametrize("path", ["/sessions", "/password"])
async def test_settings_cannot_manage_an_unidentified_or_dev_session(
    client: httpx.AsyncClient, controls: TenantTestState, path: str
) -> None:
    controls.user.pop("session_id")
    result = await client.request(
        "GET" if path == "/sessions" else "PUT",
        "/api/v1/settings" + path,
        headers=HEADERS,
        **({"json": {"password": "synthetic-password-123"}} if path == "/password" else {}),
    )
    assert result.status_code == 401


async def test_feedback_commits_ticket_and_message_under_verified_owner(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    controls.connection.fetchrow.return_value = None
    controls.connection.fetchval.return_value = OTHER
    result = await client.post(
        "/api/v1/settings/feedback",
        headers=HEADERS,
        json={
            "request_id": str(OTHER),
            "category": "bug",
            "description": "  Synthetic issue report  ",
        },
    )
    assert result.status_code == 200 and result.json() == {"id": str(OTHER), "status": "received"}
    insert = controls.connection.fetchval.call_args.args
    assert insert[1:3] == (OTHER, controls.user.id)
    message = controls.connection.execute.call_args.args
    assert message[1:] == (OTHER, controls.user.id, "Synthetic issue report")
    assert "false" in message[0]


@pytest.mark.parametrize("matches", [True, False])
async def test_feedback_retry_does_not_duplicate_or_replace_content(
    client: httpx.AsyncClient, controls: TenantTestState, matches: bool
) -> None:
    controls.connection.fetchrow.return_value = {"id": OTHER, "category": "bug"}
    controls.connection.fetchval.return_value = (
        "Synthetic issue" if matches else "Different message"
    )
    result = await client.post(
        "/api/v1/settings/feedback",
        headers=HEADERS,
        json={"request_id": str(OTHER), "category": "bug", "description": "Synthetic issue"},
    )
    assert result.status_code == (200 if matches else 409)
    assert not any("INSERT" in call.args[0] for call in controls.connection.execute.call_args_list)


async def test_revoked_session_is_rejected_before_profile_or_role_cache(
    controls: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    controls.connection.fetchval.return_value = False
    controls.connection.fetchrow.reset_mock()

    @asynccontextmanager
    async def connection(**kwargs: object) -> AsyncIterator[MagicMock]:
        yield controls.connection

    monkeypatch.setattr(dependencies, "get_db_connection", connection)
    with pytest.raises(HTTPException) as error:
        await dependencies._lookup_user_profile(str(controls.user.id), {"session_id": str(CURRENT)})
    assert error.value.status_code == 401
    controls.connection.fetchrow.assert_not_awaited()


@pytest.mark.parametrize("key", [None, "not-the-client-key"])
async def test_settings_require_client_identity(
    client: httpx.AsyncClient, controls: TenantTestState, key: str | None
) -> None:
    response = await client.get(
        "/api/v1/settings/sessions", headers={"X-API-Key": key} if key else {}
    )
    assert response.status_code in {401, 403}
    controls.connection.fetch.assert_not_awaited()


@pytest.mark.parametrize(
    "payload",
    [
        {"request_id": str(OTHER), "category": "unknown", "description": "Synthetic"},
        {"request_id": str(OTHER), "category": "bug", "description": " "},
        {"request_id": str(OTHER), "category": "bug", "description": "x" * 4001},
        {
            "request_id": "00000000-0000-4000-8000-000000000001",
            "category": "bug",
            "description": "Synthetic",
        },
        {
            "request_id": str(OTHER),
            "category": "bug",
            "description": "Synthetic",
            "user_id": str(CURRENT),
        },
    ],
)
async def test_feedback_rejects_invalid_contract_before_writing(
    client: httpx.AsyncClient, controls: TenantTestState, payload: dict[str, str]
) -> None:
    response = await client.post("/api/v1/settings/feedback", headers=HEADERS, json=payload)
    assert response.status_code == 422
    controls.connection.execute.assert_not_awaited()


@pytest.mark.parametrize("operation", ["list", "revoke", "feedback"])
async def test_store_failure_never_reports_settings_success(
    client: httpx.AsyncClient, controls: TenantTestState, operation: str
) -> None:
    for method in (
        controls.connection.fetch,
        controls.connection.fetchval,
        controls.connection.execute,
    ):
        method.side_effect = ConnectionError("PRIVATE DATABASE DETAIL")
    if operation == "list":
        response = await client.get("/api/v1/settings/sessions", headers=HEADERS)
    elif operation == "revoke":
        response = await client.delete("/api/v1/settings/sessions", headers=HEADERS)
    else:
        response = await client.post(
            "/api/v1/settings/feedback",
            headers=HEADERS,
            json={
                "request_id": str(OTHER),
                "category": "other",
                "description": "Synthetic feedback",
            },
        )
    assert response.status_code == 503
    assert response.headers["cache-control"] == "private, no-store"
    assert "PRIVATE DATABASE DETAIL" not in response.text


async def test_list_feedback_history_scopes_to_owner_and_excludes_internal_notes(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    now = datetime.now(UTC)
    controls.connection.fetch.return_value = [
        {
            "id": "01900000-0000-7000-8000-000000000001",
            "category": "bug",
            "subject": "Feedback: bug",
            "status": "open",
            "created_at": now,
            "updated_at": now,
            "first_message": "User visible bug report",
        }
    ]
    response = await client.get("/api/v1/settings/feedback?limit=10&offset=0", headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    data = response.json()
    assert len(data["tickets"]) == 1
    assert data["tickets"][0]["id"] == "01900000-0000-7000-8000-000000000001"
    assert data["tickets"][0]["category"] == "bug"
    assert data["tickets"][0]["first_message"] == "User visible bug report"
    assert data["next_offset"] is None

    call_args = controls.connection.fetch.call_args[0]
    assert call_args[1] == controls.user.id


async def test_list_owned_uploads_scopes_to_user_and_university(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    now = datetime.now(UTC)
    controls.connection.fetch.return_value = [
        {
            "id": "01900000-0000-7000-8000-000000000002",
            "name": "slide.pdf",
            "content_type": "application/pdf",
            "size": 2048,
            "created_at": now,
            "session_id": "01900000-0000-7000-8000-000000000003",
            "in_use": True,
        }
    ]
    response = await client.get("/api/v1/settings/uploads?limit=10&offset=0", headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"
    data = response.json()
    assert len(data["attachments"]) == 1
    assert data["attachments"][0]["name"] == "slide.pdf"
    assert data["attachments"][0]["in_use"] is True

    call_args = controls.connection.fetch.call_args[0]
    assert call_args[1] == controls.user.id
    assert call_args[2] == controls.user.university_id


async def test_settings_get_routes_reject_invalid_pagination(
    client: httpx.AsyncClient, controls: TenantTestState
) -> None:
    res = await client.get("/api/v1/settings/feedback?limit=0", headers=HEADERS)
    assert res.status_code == 422
    res = await client.get("/api/v1/settings/uploads?limit=500", headers=HEADERS)
    assert res.status_code == 422


async def test_password_timeout_preserves_privacy_and_never_retries_ambiguous_write(
    client: httpx.AsyncClient, controls: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[httpx.Request] = []

    def provider(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        raise httpx.ReadTimeout("PRIVATE PROVIDER DETAIL", request=request)

    original = httpx.AsyncClient
    monkeypatch.setattr(
        routes.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(provider), **kwargs),
    )
    result = await client.put(
        "/api/v1/settings/password",
        headers=HEADERS,
        json={"password": "synthetic-new-password-123"},
    )
    assert result.status_code == 503 and len(calls) == 1
    assert "PRIVATE" not in result.text and "synthetic-new-password-123" not in result.text
