"""Owned account controls; no simulated success or credential logging."""

import asyncio
from ipaddress import ip_interface
from typing import Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response

from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user, require_api_key
from app.core.rate_limit import limiter
from app.models.settings import (
    AccountSession,
    AccountSessionsResponse,
    FeedbackRequest,
    FeedbackResponse,
    PasswordConfirmationResponse,
    PasswordUpdateRequest,
    PasswordUpdateResponse,
    RevokeSessionsResponse,
)

router = APIRouter(
    prefix="/settings", tags=["Account settings"], dependencies=[Depends(require_api_key)]
)


def failure(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status, {"code": code, "message": message}, headers={"Cache-Control": "private, no-store"}
    )


def private(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"


def session_id(user: UserContext) -> UUID:
    value = user.get("session_id")
    if user.dev_bypass or not isinstance(value, UUID):
        raise failure(401, "SESSION_EXPIRED", "Sign in again to manage your account.")
    return value


async def auth_request(
    authorization: str, path: str, payload: PasswordUpdateRequest | None = None
) -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise failure(503, "UNAVAILABLE", "Something went wrong. Please try again.")
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            result = await client.request(
                # GoTrue's router and auth-js use GET for reauthentication;
                # the upstream OpenAPI document currently labels it POST.
                "PUT" if payload else "GET",
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/{path}",
                headers={"Authorization": authorization, "apikey": settings.SUPABASE_ANON_KEY},
                **({"json": payload.model_dump(exclude_none=True)} if payload else {}),
            )
    except (httpx.RequestError, TimeoutError) as exc:
        raise failure(503, "UNAVAILABLE", "Something went wrong. Please try again.") from exc
    if 200 <= result.status_code < 300:
        return
    try:
        data: object = result.json()
    except ValueError:
        data = None
    code = data.get("code") or data.get("error_code") if isinstance(data, dict) else None
    errors: dict[str, tuple[int, str, str]] = {
        "weak_password": (422, "INVALID_PASSWORD", "Choose a stronger password."),
        "same_password": (422, "SAME_PASSWORD", "Choose a different password."),
        "reauthentication_needed": (
            409,
            "REAUTHENTICATION_REQUIRED",
            "Confirm your account to change your password.",
        ),
        "reauthentication_not_valid": (
            422,
            "INVALID_CONFIRMATION",
            "That confirmation code is invalid or expired.",
        ),
        "current_password_required": (
            409,
            "CURRENT_PASSWORD_REQUIRED",
            "Enter your current password.",
        ),
        "invalid_credentials": (
            422,
            "INVALID_PASSWORD",
            "Check your current password and try again.",
        ),
        "current_password_invalid": (
            422,
            "INVALID_PASSWORD",
            "Check your current password and try again.",
        ),
        "current_password_mismatch": (
            422,
            "INVALID_CURRENT_PASSWORD",
            "Your current password is incorrect.",
        ),
    }
    if result.status_code == 429:
        raise failure(429, "RATE_LIMITED", "Please wait a moment and try again.")
    if result.status_code == 401:
        raise failure(401, "SESSION_EXPIRED", "Sign in again to continue.")
    if isinstance(code, str) and code in errors:
        raise failure(*errors[code])
    raise failure(
        503 if result.status_code >= 500 else 422,
        "UNAVAILABLE",
        "Something went wrong. Please try again.",
    )


@router.put("/password", response_model=PasswordUpdateResponse)
@limiter.limit("5/minute")
async def update_password(
    request: Request,
    response: Response,
    payload: PasswordUpdateRequest,
    authorization: str = Header(),
    user: UserContext = Depends(get_current_user),
) -> PasswordUpdateResponse:
    session_id(user)
    private(response)
    await auth_request(authorization, "user", payload)
    return PasswordUpdateResponse()


@router.post("/password/reauthenticate", response_model=PasswordConfirmationResponse)
@limiter.limit("3/minute")
async def confirm_password(
    request: Request,
    response: Response,
    authorization: str = Header(),
    user: UserContext = Depends(get_current_user),
) -> PasswordConfirmationResponse:
    session_id(user)
    private(response)
    await auth_request(authorization, "reauthenticate")
    return PasswordConfirmationResponse()


def device(agent: str | None) -> tuple[str, Literal["mobile", "desktop", "unknown"]]:
    if not agent or not agent.strip():
        return "Unknown device", "unknown"
    platform = next(
        (
            name
            for needle, name in [
                ("iPhone", "iPhone"),
                ("iPad", "iPad"),
                ("Android", "Android"),
                ("Windows", "Windows"),
                ("Macintosh", "macOS"),
                ("Linux", "Linux"),
            ]
            if needle in agent
        ),
        None,
    )
    browser = next(
        (
            name
            for needle, name in [
                ("Electron/", "PansGPT Desktop"),
                ("Edg/", "Edge"),
                ("CriOS/", "Chrome"),
                ("FxiOS/", "Firefox"),
                ("Chrome/", "Chrome"),
                ("Firefox/", "Firefox"),
                ("Safari/", "Safari"),
            ]
            if needle in agent
        ),
        "Unknown device",
    )
    return (
        f"{browser} ({platform})" if platform else browser,
        "mobile"
        if platform in {"iPhone", "iPad", "Android"}
        else "desktop"
        if platform
        else "unknown",
    )


def session_ip(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(ip_interface(value).ip)
    except ValueError:
        return None


@router.get("/sessions", response_model=AccountSessionsResponse)
async def list_sessions(
    response: Response, user: UserContext = Depends(get_current_user)
) -> AccountSessionsResponse:
    current = session_id(user)
    private(response)
    try:
        async with asyncio.timeout(12), get_db_connection(timeout=3) as conn:
            if conn is None:
                raise ConnectionError()
            rows = await conn.fetch(
                """SELECT id,created_at,coalesce(refreshed_at,updated_at,created_at) AS last_active_at,
                user_agent,ip::text AS ip_address FROM auth.sessions WHERE user_id=$1
                AND (not_after IS NULL OR not_after>now())
                ORDER BY (id=$2) DESC,coalesce(refreshed_at,updated_at,created_at) DESC NULLS LAST,id DESC LIMIT 101""",
                user.id,
                current,
            )
    except Exception as exc:
        raise failure(503, "UNAVAILABLE", "Couldn't load your devices. Please try again.") from exc
    sessions: list[AccountSession] = []
    for row in rows[:100]:
        name, kind = device(row["user_agent"])
        sessions.append(
            AccountSession(
                id=str(row["id"]),
                device=name,
                device_type=kind,
                ip_address=session_ip(row["ip_address"]),
                created_at=row["created_at"],
                last_active_at=row["last_active_at"],
                is_current=row["id"] == current,
            )
        )
    return AccountSessionsResponse(sessions=sessions, has_more=len(rows) > 100)


async def revoke(user: UserContext, target: UUID | None) -> RevokeSessionsResponse:
    current = session_id(user)
    if target == current:
        raise failure(409, "CURRENT_SESSION", "Use Log out to end your current session.")
    try:
        async with asyncio.timeout(12), get_db_connection(timeout=3) as conn:
            if conn is None:
                raise ConnectionError()
            async with conn.transaction():
                await conn.fetchrow("SELECT id FROM auth.users WHERE id=$1 FOR UPDATE", user.id)
                if not await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM auth.sessions WHERE id=$1 AND user_id=$2 AND (not_after IS NULL OR not_after>now()))",
                    current,
                    user.id,
                ):
                    raise failure(401, "SESSION_EXPIRED", "Sign in again to continue.")
                rows = await conn.fetch(
                    "DELETE FROM auth.sessions WHERE user_id=$1 AND id<>$2 AND ($3::uuid IS NULL OR id=$3) RETURNING id",
                    user.id,
                    current,
                    target,
                )
                if target and not rows:
                    raise failure(
                        404, "NOT_FOUND", "That session has already ended or is unavailable."
                    )
    except HTTPException:
        raise
    except Exception as exc:
        raise failure(
            503, "UNAVAILABLE", "Couldn't log out that device. Please try again."
        ) from exc
    return RevokeSessionsResponse(revoked_count=len(rows))


@router.delete("/sessions", response_model=RevokeSessionsResponse)
async def revoke_other_sessions(
    response: Response, user: UserContext = Depends(get_current_user)
) -> RevokeSessionsResponse:
    private(response)
    return await revoke(user, None)


@router.delete("/sessions/{target}", response_model=RevokeSessionsResponse)
async def revoke_session(
    target: UUID, response: Response, user: UserContext = Depends(get_current_user)
) -> RevokeSessionsResponse:
    private(response)
    return await revoke(user, target)


@router.post("/feedback", response_model=FeedbackResponse)
@limiter.limit("5/minute")
async def submit_feedback(
    request: Request,
    response: Response,
    payload: FeedbackRequest,
    user: UserContext = Depends(get_current_user),
) -> FeedbackResponse:
    private(response)
    try:
        async with asyncio.timeout(12), get_db_connection(timeout=3) as conn:
            if conn is None:
                raise ConnectionError()
            async with conn.transaction():
                await conn.execute(
                    "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
                    f"feedback:{user.id}:{payload.request_id}",
                )
                row = await conn.fetchrow(
                    "SELECT id,category FROM public.support_tickets WHERE id=$1 AND user_id=$2 FOR UPDATE",
                    payload.request_id,
                    user.id,
                )
                if row:
                    message = await conn.fetchval(
                        "SELECT message FROM public.support_ticket_replies WHERE ticket_id=$1 AND sender_id=$2 AND NOT is_internal_note ORDER BY created_at,id LIMIT 1",
                        payload.request_id,
                        user.id,
                    )
                    if message != payload.description or row["category"] != payload.category:
                        raise failure(
                            409,
                            "CONFLICT",
                            "This message changed. Close the form and submit it again.",
                        )
                else:
                    saved = await conn.fetchval(
                        "INSERT INTO public.support_tickets(id,user_id,subject,category) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
                        payload.request_id,
                        user.id,
                        f"Feedback: {payload.category}",
                        payload.category,
                    )
                    if saved is None:
                        raise failure(
                            409,
                            "CONFLICT",
                            "Couldn't submit this message. Close the form and try again.",
                        )
                    await conn.execute(
                        "INSERT INTO public.support_ticket_replies(ticket_id,sender_id,message,is_internal_note) VALUES($1,$2,$3,false)",
                        payload.request_id,
                        user.id,
                        payload.description,
                    )
    except HTTPException:
        raise
    except Exception as exc:
        raise failure(503, "UNAVAILABLE", "Couldn't send your feedback. Please try again.") from exc
    return FeedbackResponse(id=str(payload.request_id))
