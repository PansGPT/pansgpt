# ==============================================================================
# PansGPT 2.0 Auth API Router (Phase 7 - Auth Backend)
# Provides /auth/me and token/identity verification
# ==============================================================================

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import UserContext, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


class UserProfileResponse(BaseModel):
    id: str = Field(description="Unique User UUID")
    email: str = Field(description="User primary email address")
    role: str = Field(description="Active/Highest RBAC role")
    roles: list[str] = Field(description="All assigned RBAC roles")
    university_id: str | None = Field(default=None, description="University tenant ID")
    first_name: str | None = Field(default=None, description="User first name")
    last_name: str | None = Field(default=None, description="User last name")
    client_type: str = Field(default="web", description="Client application type")
    dev_bypass: bool = Field(default=False, description="Whether dev bypass was used")


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
        client_type=current_user.client_type,
        dev_bypass=current_user.dev_bypass,
    )
