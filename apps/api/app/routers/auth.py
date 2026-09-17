# ==============================================================================
# PansGPT 2.0 Auth API Router (Phase 7 / Phase 8 - Auth Backend & Onboarding)
# Provides /auth/me, /auth/universities, and /auth/onboard
# ==============================================================================

import time
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import get_db_connection
from app.core.dependencies import (
    UserContext,
    get_current_user,
    set_cached_user_profile,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

VALID_ACADEMIC_LEVELS = {"100", "200", "300", "400", "500", "600"}
DEFAULT_UNIJOS_ID = "01a07664-7a69-7ce0-ad6a-b219462cbde3"


class UniversityItem(BaseModel):
    id: str = Field(description="University UUID")
    name: str = Field(description="Official university name")
    short_name: str | None = Field(default=None, description="University short code (e.g. UNIJOS)")
    slug: str = Field(description="URL slug")


class OnboardingRequest(BaseModel):
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
async def list_universities():
    """
    Returns active universities available for student registration.
    The frontend renders this list for the student to select their institution.
    """
    universities: list[UniversityItem] = []
    async with get_db_connection() as conn:
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

    if not universities:
        # Fallback to seeded UNIJOS institution if DB is offline/in mock test mode
        universities.append(
            UniversityItem(
                id=DEFAULT_UNIJOS_ID,
                name="University of Jos",
                short_name="UNIJOS",
                slug="unijos",
            )
        )

    return universities


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get verified profile and roles for current user",
)
async def get_my_profile(
    current_user: UserContext = Depends(get_current_user),
):
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
async def complete_onboarding(
    payload: OnboardingRequest,
    current_user: UserContext = Depends(get_current_user),
):
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mandatory agreement to Terms of Service and Privacy Policy is required to activate your account.",
        )

    # 2. Academic Level validation
    if payload.current_level not in VALID_ACADEMIC_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid academic level '{payload.current_level}'. Must be one of: {', '.join(sorted(VALID_ACADEMIC_LEVELS))}.",
        )

    # 3. University UUID validation
    try:
        uni_uuid = uuid.UUID(payload.university_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid university_id format: {payload.university_id}",
        ) from exc

    terms_accepted_at_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # 4. Upsert into database
    async with get_db_connection() as conn:
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
                if row and row["terms_accepted_at"]:
                    terms_accepted_at_str = row["terms_accepted_at"]
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("onboarding_db_persist_warning", error=str(exc))

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
