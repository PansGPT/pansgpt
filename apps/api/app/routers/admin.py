# ==============================================================================
# PansGPT 2.0 Admin API Router (Phase 7.6 / Phase 15 - Admin & Institutional Control)
# Provides /admin/lecturers/invite for multi-use institutional onboarding
# ==============================================================================

import secrets
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import (
    UserContext,
    require_admin_or_super_admin,
)
from app.core.rate_limit import limiter

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["Institutional & Platform Admin"])

DEFAULT_UNIJOS_ID = "01a07664-7a69-7ce0-ad6a-b219462cbde3"


class LecturerInviteRequest(BaseModel):
    email: str | None = Field(
        default=None,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="Optional target lecturer email for direct dispatch",
    )
    expires_in_days: int = Field(
        default=7, ge=1, le=90, description="Invite token validity period in days"
    )
    max_uses: int = Field(
        default=0, ge=0, description="0 = multi-use unlimited, >0 = exact use cap"
    )
    target_level: str | None = Field(default=None, description="Optional target level (e.g. 300)")
    university_id: str | None = Field(
        default=None, description="Optional target university UUID for super_admin"
    )


class LecturerInviteResponse(BaseModel):
    id: str = Field(description="Unique Invitation UUID")
    token: str = Field(description="Opaque invitation security token")
    invite_url: str = Field(description="Full signup registration URL for lecturer")
    university_id: str = Field(description="Associated university institution UUID")
    grant_roles: list[str] = Field(description="Roles granted upon onboarding")
    max_uses: int = Field(description="0 = multi-use, >0 = max allowed redemptions")
    current_uses: int = Field(description="Times this token has been redeemed")
    expires_at: str = Field(description="ISO 8601 expiration timestamp")
    is_active: bool = Field(description="Whether invite link is currently usable")
    created_at: str = Field(description="ISO 8601 creation timestamp")
    email_sent: bool = Field(default=False, description="Whether email was dispatched via Resend")


async def _dispatch_resend_invite_email(
    to_email: str, invite_url: str, university_name: str
) -> bool:
    """Dispatches lecturer invitation email via Resend if API key is present."""
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith(
        ("placeholder", "test", "re_YOUR")
    ):
        logger.info("resend_email_skipped_in_dev", to_email=to_email, invite_url=invite_url)
        return False

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.EMAIL_FROM or "PansGPT <onboarding@pansgpt.com>",
                    "to": [to_email],
                    "subject": f"Faculty Invitation: Join {university_name} on PansGPT",
                    "html": f"""
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #15803d;">You're Invited to PansGPT Faculty</h2>
                        <p>You have been invited to join the academic faculty for <strong>{university_name}</strong> on PansGPT.</p>
                        <p>Click the link below to accept your invitation and activate your lecturer privileges:</p>
                        <p style="margin: 24px 0;">
                            <a href="{invite_url}" style="background-color: #15803d; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                Accept Faculty Invitation
                            </a>
                        </p>
                        <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in accordance with institutional policy.</p>
                    </div>
                    """,
                },
            )
            if resp.status_code in (200, 201):
                logger.info("resend_invite_dispatched", to_email=to_email)
                return True
            logger.warning("resend_invite_failed", status=resp.status_code, body=resp.text)
            return False
    except Exception as exc:
        logger.warning("resend_dispatch_error", error=str(exc))
        return False


@router.post(
    "/lecturers/invite",
    response_model=LecturerInviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multi-use lecturer invitation link",
)
@limiter.limit("10/minute")
async def create_lecturer_invite(
    request: Request,
    payload: LecturerInviteRequest,
    current_user: UserContext = Depends(require_admin_or_super_admin),
):
    """
    Creates a lecturer invitation record in public.invitations.
    - Restricted to institutional admins and platform super admins.
    - Generates multi-use, expiring token.
    - Optionally dispatches invite email via Resend if email is provided.
    """
    # Determine target university
    target_uni_id = payload.university_id or (
        str(current_user.university_id) if current_user.university_id else DEFAULT_UNIJOS_ID
    )
    try:
        uni_uuid = uuid.UUID(target_uni_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid target university UUID format: {target_uni_id}",
        ) from exc

    # Enforce institutional boundary: university_admin cannot invite to other institutions
    if (
        current_user.role != "super_admin"
        and current_user.university_id
        and str(current_user.university_id) != str(uni_uuid)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate lecturer invitations for your own university institution.",
        )

    now = datetime.now(UTC)
    expires_at = now + timedelta(days=payload.expires_in_days)
    invite_token = secrets.token_hex(24)
    invite_id = uuid.uuid4()
    app_base_url = "https://pansgpt.com"
    invite_url = f"{app_base_url}/signup?invite={invite_token}"

    university_name = "University of Jos"
    async with get_db_connection() as conn:
        if conn:
            try:
                # Fetch uni name
                name_row = await conn.fetchval(
                    "SELECT name FROM public.universities WHERE id = $1;",
                    uni_uuid,
                )
                if name_row:
                    university_name = name_row

                # Insert invitation
                sql = """
                    INSERT INTO public.invitations (
                        id, token, university_id, issued_by, grant_roles, target_level, max_uses, current_uses, is_active, expires_at, created_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, 0, true, $8, $9
                    )
                    RETURNING id, token, university_id, max_uses, current_uses, is_active, expires_at, created_at;
                """
                await conn.execute(
                    sql,
                    invite_id,
                    invite_token,
                    uni_uuid,
                    current_user.id,
                    ["lecturer"],
                    payload.target_level,
                    payload.max_uses,
                    expires_at,
                    now,
                )
            except Exception as exc:
                logger.warning("persist_invite_db_warning", error=str(exc))

    email_sent = False
    if payload.email:
        email_sent = await _dispatch_resend_invite_email(payload.email, invite_url, university_name)

    return LecturerInviteResponse(
        id=str(invite_id),
        token=invite_token,
        invite_url=invite_url,
        university_id=str(uni_uuid),
        grant_roles=["lecturer"],
        max_uses=payload.max_uses,
        current_uses=0,
        expires_at=expires_at.isoformat(),
        is_active=True,
        created_at=now.isoformat(),
        email_sent=email_sent,
    )
