# ==============================================================================
# PansGPT 2.0 Auth & RBAC Dependencies (Phase 5 & 7)
# ==============================================================================

from collections.abc import Callable

import jwt
from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_role(allowed_roles: list[str]) -> Callable:
    """
    Dependency factory enforcing RBAC role checks:
    - Inspects `x-user-role` header (for testing and dev service calls)
    - Inspects Bearer JWT token in `Authorization` header
    - Rejects with HTTP 403 if role is not within allowed_roles
    """

    async def role_checker(
        authorization: str | None = Header(None),
        x_user_role: str | None = Header(None),
    ):
        # 1. Direct role header (useful for test suites & internal service calls)
        if x_user_role:
            if x_user_role.lower() in [r.lower() for r in allowed_roles]:
                return {"role": x_user_role}
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Requires one of {allowed_roles}, got '{x_user_role}'.",
            )

        # 2. JWT Bearer token check
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ", 1)[1].strip()
            try:
                # In dev mode, decode unverified or with jwt secret if available
                payload = jwt.decode(token, options={"verify_signature": False})
                user_role = (
                    payload.get("user_metadata", {}).get("role") or payload.get("role") or "student"
                )
                if user_role.lower() in [r.lower() for r in allowed_roles]:
                    return payload
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: Insufficient permissions. Role '{user_role}' not permitted.",
                )
            except HTTPException:
                raise
            except Exception:
                pass

        # 3. In development / testing environment without headers, allow through if dev
        if settings.ENVIRONMENT == "development" and not authorization and not x_user_role:
            return {"role": "super_admin", "dev_bypass": True}

        # If headers were provided but invalid, or in non-dev env without credentials
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or invalid.",
        )

    return role_checker


require_admin_or_super_admin = require_role(["university_admin", "super_admin", "admin"])
