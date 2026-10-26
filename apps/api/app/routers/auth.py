# ==============================================================================
# PansGPT 2.0 Auth API Router (Phase 7 / Phase 8 - Auth Backend & Onboarding)
# Provides /auth/me, /auth/universities, and /auth/onboard
# ==============================================================================

import time
import uuid
from datetime import UTC, datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.database import get_db_connection
from app.core.dependencies import (
    UserContext,
    get_current_user,
    set_cached_user_profile,
)
from app.core.rate_limit import limiter
from app.core.schemas import StrictRequest

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

VALID_ACADEMIC_LEVELS = {"100", "200", "300", "400", "500", "600"}
DEFAULT_UNIJOS_ID = "01a07664-7a69-7ce0-ad6a-b219462cbde3"


class InviteValidationResponse(BaseModel):
    token: str = Field(description="Invitation security token")
    university_id: str = Field(description="Associated university institution UUID")
    university_name: str = Field(description="Associated university institution name")
    university_short_name: str | None = Field(default=None, description="Short code (e.g. UNIJOS)")
    university_slug: str = Field(description="University URL slug")
    grant_roles: list[str] = Field(description="Roles granted upon signup (e.g. ['lecturer'])")
    target_level: str | None = Field(default=None, description="Target academic level")
    is_valid: bool = Field(description="Whether invite is currently redeemable")
    expires_at: str | None = Field(default=None, description="Expiration ISO timestamp")
    is_expired: bool = Field(default=False, description="Whether invite has expired")
    is_exhausted: bool = Field(default=False, description="Whether max_uses has been reached")


class UniversityItem(BaseModel):
    id: str = Field(description="University UUID")
    name: str = Field(description="Official university name")
    short_name: str | None = Field(default=None, description="University short code (e.g. UNIJOS)")
    slug: str = Field(description="URL slug")


class OnboardingRequest(StrictRequest):
    first_name: str = Field(min_length=1, max_length=100, description="Student first name")
    last_name: str | None = Field(default=None, max_length=100, description="Student last name")
    university_id: str = Field(description="Selected institution UUID")
    current_level: str = Field(description="Academic study level (100 - 600)")
    terms_accepted: bool = Field(
        description="Explicit agreement to Terms of Service & Privacy Policy"
    )


class UserProfileResponse(BaseModel):
    id: str = Field(description="Unique User UUID")
    email: str = Field(description="User primary email address")
    role: str = Field(description="Active/Highest RBAC role")
    roles: list[str] = Field(description="All assigned RBAC roles")
    university_id: str | None = Field(default=None, description="University tenant ID")
    first_name: str | None = Field(default=None, description="User first name")
    last_name: str | None = Field(default=None, description="User last name")
    current_level: str | None = Field(default=None, description="Academic level (100 - 600)")
    terms_accepted_at: str | None = Field(
        default=None, description="Timestamp when terms were agreed"
    )
    is_onboarded: bool = Field(
        default=False, description="Whether student profile setup is complete"
    )
    client_type: str = Field(default="web", description="Client application type")
    dev_bypass: bool = Field(default=False, description="Whether dev bypass was used")


@router.get(
    "/universities",
    response_model=list[UniversityItem],
    summary="List active universities for student enrollment",
)
async def list_universities() -> list[UniversityItem]:
    """
    Returns active universities available for student registration.
    The frontend renders this list for the student to select their institution.
    """
    universities: list[UniversityItem] = []
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(status_code=503, detail="University storage is unavailable.")
        if conn:
            try:
                rows = await conn.fetch(
                    """
                    SELECT id, name, short_name, slug
                    FROM public.universities
                    WHERE status = 'active'
                    ORDER BY name ASC;
                    """
                )
                for r in rows:
                    universities.append(
                        UniversityItem(
                            id=str(r["id"]),
                            name=r["name"],
                            short_name=r["short_name"],
                            slug=r["slug"],
                        )
                    )
            except Exception as exc:
                logger.warning("fetch_universities_failed", error=str(exc))
                raise HTTPException(
                    status_code=503, detail="Universities could not be loaded."
                ) from exc

    return universities


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get verified profile and roles for current user",
)
async def get_my_profile(
    current_user: UserContext = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Returns verified user context, university tenancy, and RBAC roles.
    Requires valid Bearer JWT signed by Supabase.
    """
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        roles=current_user.roles,
        university_id=str(current_user.university_id) if current_user.university_id else None,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        current_level=current_user.current_level,
        terms_accepted_at=current_user.terms_accepted_at,
        is_onboarded=current_user.is_onboarded,
        client_type=current_user.client_type,
        dev_bypass=current_user.dev_bypass,
    )


@router.post(
    "/onboard",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete student onboarding and profile setup",
)
@limiter.limit("10/minute")
async def complete_onboarding(
    request: Request,
    payload: OnboardingRequest,
    current_user: UserContext = Depends(get_current_user),
) -> UserProfileResponse:
    """
    Completes student onboarding:
    1. Validates mandatory Terms & Privacy Policy acceptance (cannot be False).
    2. Validates academic study level (100 - 600).
    3. Verifies selected institution is active in public.universities.
    4. Upserts profile in public.users and sets terms_accepted_at timestamp.
    5. Invalidates role cache to immediately activate authenticated session.
    """
    # 1. Mandatory Terms check
    if not payload.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,  # [LEFTOVER FIX]
            detail="Mandatory agreement to Terms of Service and Privacy Policy is required to activate your account.",
        )

    # 2. Academic Level validation
    if payload.current_level not in VALID_ACADEMIC_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,  # [LEFTOVER FIX]
            detail=f"Invalid academic level '{payload.current_level}'. Must be one of: {', '.join(sorted(VALID_ACADEMIC_LEVELS))}.",
        )

    # 3. University UUID validation
    try:
        uni_uuid = uuid.UUID(payload.university_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,  # [LEFTOVER FIX]
            detail=f"Invalid university_id format: {payload.university_id}",
        ) from exc

    if current_user.university_id is not None and current_user.university_id != uni_uuid:
        raise HTTPException(
            status_code=403, detail="Institution changes require administrator approval."
        )
    terms_accepted_at_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # 4. Upsert into database
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(status_code=503, detail="Profile storage is unavailable.")
        if conn:
            try:
                # Verify university exists
                uni_check = await conn.fetchval(
                    "SELECT 1 FROM public.universities WHERE id = $1 AND status = 'active';",
                    uni_uuid,
                )
                if not uni_check:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="The selected university does not exist or is currently inactive.",
                    )

                # Upsert into public.users
                sql = """
                    INSERT INTO public.users (
                        id, email, first_name, last_name, university_id, current_level, terms_accepted_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6::university_level, now(), now()
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        university_id = EXCLUDED.university_id,
                        current_level = EXCLUDED.current_level,
                        terms_accepted_at = COALESCE(public.users.terms_accepted_at, EXCLUDED.terms_accepted_at),
                        updated_at = now()
                    WHERE public.users.university_id IS NULL OR public.users.university_id=EXCLUDED.university_id
                    RETURNING terms_accepted_at::text;
                """
                row = await conn.fetchrow(
                    sql,
                    current_user.id,
                    current_user.email,
                    payload.first_name.strip(),
                    payload.last_name.strip() if payload.last_name else None,
                    uni_uuid,
                    payload.current_level,
                )
                if not row:
                    raise HTTPException(status_code=503, detail="Profile could not be saved.")
                if row and row["terms_accepted_at"]:
                    terms_accepted_at_str = row["terms_accepted_at"]
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("onboarding_db_persist_warning", error_type=type(exc).__name__)
                raise HTTPException(status_code=503, detail="Profile could not be saved.") from exc

    # 5. Populate updated user profile into cache so subsequent /auth/me returns fresh data
    profile_data = {
        "roles": current_user.roles,
        "role": current_user.role,
        "university_id": str(uni_uuid),
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip() if payload.last_name else None,
        "current_level": payload.current_level,
        "terms_accepted_at": terms_accepted_at_str,
    }
    await set_cached_user_profile(str(current_user.id), profile_data)

    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        roles=current_user.roles,
        university_id=str(uni_uuid),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip() if payload.last_name else None,
        current_level=payload.current_level,
        terms_accepted_at=terms_accepted_at_str,
        is_onboarded=True,
        client_type=current_user.client_type,
        dev_bypass=current_user.dev_bypass,
    )


@router.get(
    "/invites/{token}",
    response_model=InviteValidationResponse,
    summary="Validate invite token and fetch institutional details",
)
@limiter.limit("10/minute")
async def get_invite_details(request: Request, token: str) -> InviteValidationResponse:
    """
    Validates institutional invite token:
    1. Looks up token in public.invitations.
    2. Verifies is_active is true.
    3. Verifies expires_at is in the future.
    4. Verifies current_uses < max_uses (unless max_uses == 0).
    5. Returns associated university details.
    """
    clean_token = token.strip()
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token cannot be empty.",
        )

    async with get_db_connection() as conn:
        if conn:
            try:
                row = await conn.fetchrow(
                    """
                    SELECT
                        i.id, i.token, i.university_id, i.grant_roles, i.target_level,
                        i.max_uses, i.current_uses, i.is_active, i.expires_at,
                        u.name AS uni_name, u.short_name AS uni_short_name, u.slug AS uni_slug
                    FROM public.invitations i
                    JOIN public.universities u ON u.id = i.university_id
                    WHERE i.token = $1;
                    """,
                    clean_token,
                )
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Invitation token not found or invalid.",
                    )

                is_active = bool(row["is_active"])
                now = datetime.now(UTC)
                expires_at = row["expires_at"]
                is_expired = bool(expires_at and expires_at < now)
                max_uses = int(row["max_uses"])
                current_uses = int(row["current_uses"])
                is_exhausted = bool(max_uses > 0 and current_uses >= max_uses)

                if not is_active or is_expired or is_exhausted:
                    detail = (
                        "Invitation has expired."
                        if is_expired
                        else (
                            "Invitation maximum uses reached."
                            if is_exhausted
                            else "Invitation has been deactivated."
                        )
                    )
                    raise HTTPException(
                        status_code=status.HTTP_410_GONE,
                        detail=detail,
                    )

                return InviteValidationResponse(
                    token=clean_token,
                    university_id=str(row["university_id"]),
                    university_name=row["uni_name"],
                    university_short_name=row["uni_short_name"],
                    university_slug=row["uni_slug"],
                    grant_roles=list(row["grant_roles"]) if row["grant_roles"] else ["lecturer"],
                    target_level=row["target_level"],
                    is_valid=True,
                    expires_at=expires_at.isoformat() if expires_at else None,
                    is_expired=False,
                    is_exhausted=False,
                )
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("invite_lookup_error", error=str(exc))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database error during invite token validation.",
                )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Database unavailable for invite verification.",
    )


@router.post("/invites/{token}/redeem")
@limiter.limit("10/minute")
async def redeem_invite(
    request: Request, token: str, current_user: UserContext = Depends(get_current_user)
) -> dict[str, object]:
    from app.core.dependencies import invalidate_user_role_cache

    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(status_code=503, detail="Invitation storage is unavailable.")
        async with conn.transaction():
            invite = await conn.fetchrow(
                "SELECT i.* FROM public.invitations i JOIN public.universities u ON u.id=i.university_id WHERE i.token=$1 AND u.status='active' FOR UPDATE OF i;",
                token,
            )
            if not invite:
                raise HTTPException(status_code=404, detail="Invitation was not found.")
            redeemed = await conn.fetchval(
                "SELECT 1 FROM public.invitation_redemptions WHERE invitation_id=$1 AND user_id=$2;",
                invite["id"],
                current_user.id,
            )
            if not redeemed:
                if (
                    not invite["is_active"]
                    or (invite["expires_at"] and invite["expires_at"] <= datetime.now(UTC))
                    or (invite["max_uses"] > 0 and invite["current_uses"] >= invite["max_uses"])
                ):
                    raise HTTPException(
                        status_code=410, detail="Invitation is no longer available."
                    )
                if set(invite["grant_roles"]) != {"lecturer"}:
                    raise HTTPException(
                        status_code=403, detail="This invitation cannot grant the requested role."
                    )
                # Lock the actor too: concurrent invitations cannot move one user across tenants.
                actor = await conn.fetchrow(
                    "SELECT university_id FROM public.users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE;",
                    current_user.id,
                )
                if actor is None:
                    raise HTTPException(status_code=403, detail="An active profile is required.")
                if (
                    actor["university_id"] is not None
                    and actor["university_id"] != invite["university_id"]
                ):
                    raise HTTPException(
                        status_code=403, detail="Invitation belongs to another university."
                    )
                await conn.execute(
                    "UPDATE public.users SET university_id=$2, roles=ARRAY(SELECT DISTINCT unnest(roles || ARRAY['lecturer']::public.user_role[])), current_level=COALESCE(current_level,$3), updated_at=now() WHERE id=$1;",
                    current_user.id,
                    invite["university_id"],
                    invite["target_level"],
                )
                await conn.execute(
                    "INSERT INTO public.invitation_redemptions(invitation_id,user_id) VALUES($1,$2);",
                    invite["id"],
                    current_user.id,
                )
                await conn.execute(
                    "UPDATE public.invitations SET current_uses=current_uses+1 WHERE id=$1;",
                    invite["id"],
                )
    await invalidate_user_role_cache(current_user.id)
    return {"redeemed": True, "university_id": str(invite["university_id"])}
