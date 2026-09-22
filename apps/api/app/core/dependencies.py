# ==============================================================================
# PansGPT 2.0 Auth & RBAC Dependencies (Phase 7 - Auth Backend)
# Genuine JWKS RS256 token verification, Redis role cache, x-api-key validation
# ==============================================================================

import asyncio
import hashlib
import hmac
import json
import time
import uuid
from collections.abc import Callable

import jwt
import structlog
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWKClientError

from app.core.config import settings
from app.core.database import get_db_connection

logger = structlog.get_logger(__name__)

# ------------------------------------------------------------------------------
# 1. JWKS Client Singleton
# ------------------------------------------------------------------------------
_jwks_client: PyJWKClient | None = None


def get_jwks_client() -> PyJWKClient | None:
    """Lazy-initializes or returns singleton PyJWKClient with in-memory caching."""
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_URL:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            jwks_url,
            cache_keys=True,
            max_cached_keys=16,
            cache_jwk_set=True,
            lifespan=float(settings.JWKS_CACHE_TTL_SECONDS),
        )
    return _jwks_client


async def prewarm_jwks_cache() -> None:
    """Pre-warms the JWKS signing key cache on application startup."""
    client = get_jwks_client()
    if client:
        try:
            await asyncio.to_thread(client.get_jwk_set)
            logger.info("jwks_cache_prewarmed", jwks_url=client.uri)
        except Exception as exc:
            logger.warning("jwks_cache_prewarm_failed", error=str(exc))


# ------------------------------------------------------------------------------
# 2. UserContext Data Structure
# ------------------------------------------------------------------------------
class UserContext(dict):
    """
    Resolved User Identity & Tenancy Context.
    Subclasses dict for backward compatibility with existing auth_user['role'] usage
    while exposing clean typed properties.
    """

    def __init__(
        self,
        id: str | uuid.UUID,
        email: str,
        role: str,
        roles: list[str],
        university_id: str | uuid.UUID | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        current_level: str | None = None,
        terms_accepted_at: str | None = None,
        client_type: str = "web",
        dev_bypass: bool = False,
        **kwargs,
    ):
        u_id = uuid.UUID(str(id)) if isinstance(id, (str, uuid.UUID)) else id
        uni_uuid = (
            uuid.UUID(str(university_id))
            if university_id and isinstance(university_id, (str, uuid.UUID))
            else None
        )
        data = {
            "id": u_id,
            "email": email,
            "role": role,
            "roles": roles,
            "university_id": uni_uuid,
            "first_name": first_name,
            "last_name": last_name,
            "current_level": current_level,
            "terms_accepted_at": terms_accepted_at,
            "client_type": client_type,
            "dev_bypass": dev_bypass,
            **kwargs,
        }
        super().__init__(data)

    @property
    def id(self) -> uuid.UUID:
        return self["id"]

    @property
    def email(self) -> str:
        return self["email"]

    @property
    def role(self) -> str:
        return self["role"]

    @property
    def roles(self) -> list[str]:
        return self["roles"]

    @property
    def university_id(self) -> uuid.UUID | None:
        return self["university_id"]

    @property
    def first_name(self) -> str | None:
        return self.get("first_name")

    @property
    def last_name(self) -> str | None:
        return self.get("last_name")

    @property
    def current_level(self) -> str | None:
        return self.get("current_level")

    @property
    def terms_accepted_at(self) -> str | None:
        return self.get("terms_accepted_at")

    @property
    def is_onboarded(self) -> bool:
        return bool(self.first_name and self.university_id and self.terms_accepted_at)

    @property
    def client_type(self) -> str:
        return self.get("client_type", "web")

    @property
    def dev_bypass(self) -> bool:
        return self.get("dev_bypass", False)


# ------------------------------------------------------------------------------
# 3. Role and University Lookup Caching (Redis + In-Memory Fallback)
# ------------------------------------------------------------------------------
_IN_MEMORY_ROLE_CACHE: dict[str, tuple[dict, float]] = {}


async def invalidate_user_role_cache(user_id: str | uuid.UUID) -> None:
    """Invalidates the cached role/profile for a user (e.g. after onboarding)."""
    uid_str = str(user_id)
    if uid_str in _IN_MEMORY_ROLE_CACHE:
        del _IN_MEMORY_ROLE_CACHE[uid_str]
    if settings.redis_connection_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_connection_url, socket_timeout=1.0)
            await r.delete(f"auth:role:{uid_str}")
            await r.aclose()
        except Exception:
            pass


async def _get_cached_role(user_id: str) -> dict | None:
    now = time.time()
    # 1. Check in-memory cache
    if user_id in _IN_MEMORY_ROLE_CACHE:
        data, exp = _IN_MEMORY_ROLE_CACHE[user_id]
        if now < exp:
            return data
        del _IN_MEMORY_ROLE_CACHE[user_id]

    # 2. Check Redis if configured
    if settings.redis_connection_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_connection_url, socket_timeout=1.0)
            raw = await r.get(f"auth:role:{user_id}")
            await r.aclose()
            if raw:
                data = json.loads(raw)
                _IN_MEMORY_ROLE_CACHE[user_id] = (data, now + settings.ROLE_CACHE_TTL_SECONDS)
                return data
        except Exception:
            pass

    return None


async def _set_cached_role(user_id: str, data: dict) -> None:
    now = time.time()
    _IN_MEMORY_ROLE_CACHE[user_id] = (data, now + settings.ROLE_CACHE_TTL_SECONDS)
    if settings.redis_connection_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_connection_url, socket_timeout=1.0)
            await r.set(
                f"auth:role:{user_id}",
                json.dumps(data),
                ex=settings.ROLE_CACHE_TTL_SECONDS,
            )
            await r.aclose()
        except Exception:
            pass


set_cached_user_profile = _set_cached_role


async def _lookup_user_profile(
    user_id: str, claims: dict
) -> tuple[list[str], str, uuid.UUID | None, str | None, str | None, str | None, str | None]:
    """
    Resolves roles and university_id for a verified JWT subject.
    Performs cached lookup (5 min TTL) against DB public.users with claims fallback.
    Returns: (roles, role, university_id, first_name, last_name, current_level, terms_accepted_at)
    """
    cached = await _get_cached_role(user_id)
    if cached:
        uni_id = uuid.UUID(cached["university_id"]) if cached.get("university_id") else None
        return (
            cached.get("roles", ["student"]),
            cached.get("role", "student"),
            uni_id,
            cached.get("first_name"),
            cached.get("last_name"),
            cached.get("current_level"),
            cached.get("terms_accepted_at"),
        )

    # Fallback to claims metadata if DB is offline/unreachable
    metadata = claims.get("user_metadata", {}) or {}
    roles = metadata.get("roles")
    if not roles:
        single_role = metadata.get("role") or claims.get("role") or "student"
        roles = [single_role]
    primary_role = roles[0] if roles else "student"
    uni_str = metadata.get("university_id")
    uni_id = uuid.UUID(uni_str) if uni_str else None
    first_name = metadata.get("first_name")
    last_name = metadata.get("last_name")
    current_level = metadata.get("current_level")
    terms_accepted_at = metadata.get("terms_accepted_at")

    if settings.DATABASE_URL:
        try:
            async with get_db_connection(timeout=3.0) as conn:
                if conn:
                    row = await conn.fetchrow(
                        """
                        SELECT roles, university_id, first_name, last_name, current_level, terms_accepted_at::text, deleted_at
                        FROM public.users
                        WHERE id = $1;
                        """,
                        uuid.UUID(user_id),
                    )
                    if row:
                        if row["deleted_at"] is not None:
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="User account has been deactivated.",
                            )
                        db_roles = [str(r) for r in row["roles"]] if row["roles"] else ["student"]
                        roles = db_roles
                        for hr in ["super_admin", "university_admin", "lecturer", "student"]:
                            if hr in roles:
                                primary_role = hr
                                break
                        uni_id = row["university_id"]
                        first_name = row["first_name"]
                        last_name = row["last_name"]
                        current_level = row["current_level"]
                        terms_accepted_at = row["terms_accepted_at"]
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("auth_db_profile_lookup_failed", error=str(exc))

    profile_data = {
        "roles": roles,
        "role": primary_role,
        "university_id": str(uni_id) if uni_id else None,
        "first_name": first_name,
        "last_name": last_name,
        "current_level": current_level,
        "terms_accepted_at": terms_accepted_at,
    }
    await _set_cached_role(user_id, profile_data)
    return roles, primary_role, uni_id, first_name, last_name, current_level, terms_accepted_at


# ------------------------------------------------------------------------------
# 4. Token & API Key Verification
# ------------------------------------------------------------------------------
_VERIFIED_TOKEN_CACHE: dict[str, tuple[dict, float]] = {}


def _verify_token(token: str) -> dict:
    """Verifies RS256/HS256/ES256 JWT signature using Supabase secret, JWKS, or Auth API gateway."""
    now = time.time()
    if token in _VERIFIED_TOKEN_CACHE:
        cached_claims, exp = _VERIFIED_TOKEN_CACHE[token]
        if now < exp:
            return cached_claims

    try:
        header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {exc}",
        ) from exc

    alg = header.get("alg", "HS256")

    # 1. HS256 local verification if SUPABASE_JWT_SECRET is configured
    if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
        try:
            claims = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            _VERIFIED_TOKEN_CACHE[token] = (claims, now + 300)
            return claims
        except ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
            ) from exc
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token signature: {exc}",
            ) from exc

    # 2. RS256 / ES256 verification via JWKS
    client = get_jwks_client()
    if client and alg in ("RS256", "ES256"):
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                options={"verify_aud": False},
            )
            _VERIFIED_TOKEN_CACHE[token] = (claims, now + 300)
            return claims
        except ExpiredSignatureError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired.",
            ) from exc
        except (InvalidTokenError, PyJWKClientError):
            pass

    # 3. Supabase Auth API Fallback (Verifies tokens with the project gateway)
    if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
        try:
            import httpx

            auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
            with httpx.Client(timeout=4.0) as http_client:
                resp = http_client.get(
                    auth_url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": settings.SUPABASE_ANON_KEY,
                    },
                )
            if resp.status_code == 200:
                user_data = resp.json()
                claims = {
                    "sub": user_data["id"],
                    "id": user_data["id"],
                    "email": user_data.get("email", ""),
                    "user_metadata": user_data.get("user_metadata", {}),
                    "role": user_data.get("role", "authenticated"),
                }
                _VERIFIED_TOKEN_CACHE[token] = (claims, now + 300)
                return claims
            elif resp.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token rejected by Supabase Auth (expired or invalid).",
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("supabase_auth_gateway_verification_failed", error=str(exc))

    if alg == "HS256" and not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="HS256 token verification failed. Please configure SUPABASE_JWT_SECRET in .env.",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token verification failed.",
    )


def _verify_api_key(api_key: str | None) -> str | None:
    """
    Validates client identification key (x-api-key) against SHA-256 / plaintext configs.
    Returns client_type ('web', 'mobile', 'desktop') or None.
    """
    if not api_key or not isinstance(api_key, str):
        return None

    raw_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()

    pairs = [
        ("web", settings.X_API_KEY_WEB),
        ("mobile", settings.X_API_KEY_MOBILE),
        ("desktop", settings.X_API_KEY_DESKTOP),
    ]

    for client_type, configured_key in pairs:
        if configured_key:
            if hmac.compare_digest(api_key, configured_key) or hmac.compare_digest(
                raw_hash, configured_key
            ):
                return client_type
            conf_hash = hashlib.sha256(configured_key.encode("utf-8")).hexdigest()
            if hmac.compare_digest(raw_hash, conf_hash):
                return client_type

    return None


# ------------------------------------------------------------------------------
# 5. FastAPI Authentication & Authorization Dependencies
# ------------------------------------------------------------------------------
async def get_current_user(
    authorization: str | None = Header(None),
    x_user_role: str | None = Header(None),
    x_user_id: str | None = Header(None, alias="x-user-id"),
    x_api_key: str | None = Header(None, alias="x-api-key"),
) -> UserContext:
    """
    Resolves verified user identity:
    1. Validates Bearer JWT with Supabase JWKS (RS256).
    2. Queries user roles and university tenant context from Postgres.
    3. Supports test role header overrides in test suites.
    4. Falls back to dev bypass when ENVIRONMENT == 'development' and unauthenticated.
    """
    auth_str = authorization if isinstance(authorization, str) else None
    role_str = x_user_role if isinstance(x_user_role, str) else None
    uid_str = x_user_id if isinstance(x_user_id, str) else None
    key_str = x_api_key if isinstance(x_api_key, str) else None

    client_type = _verify_api_key(key_str) if key_str else "web"

    # 1. Bearer JWT validation
    if auth_str and auth_str.startswith("Bearer "):
        token = auth_str.split(" ", 1)[1].strip()
        claims = _verify_token(token)
        sub = claims.get("sub") or claims.get("id")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject (sub) claim.",
            )
        roles, role, uni_id, fname, lname, clevel, terms_at = await _lookup_user_profile(
            sub, claims
        )
        return UserContext(
            id=sub,
            email=claims.get("email", ""),
            role=role,
            roles=roles,
            university_id=uni_id,
            first_name=fname,
            last_name=lname,
            current_level=clevel,
            terms_accepted_at=terms_at,
            client_type=client_type or "web",
            dev_bypass=False,
        )

    # 2. Direct role header (for automated pytest test suites & internal dev mocks)
    if role_str:
        uid = uid_str or "018f3a10-0001-7000-8000-000000000001"
        return UserContext(
            id=uid,
            email="dev-role-override@pansgpt.com",
            role=role_str,
            roles=[role_str],
            university_id=uuid.UUID("01a07664-7a69-7ce0-ad6a-b219462cbde3"),
            first_name="Test",
            last_name="User",
            current_level="300",
            terms_accepted_at="2026-01-01T00:00:00Z",
            client_type=client_type or "web",
            dev_bypass=True,
        )

    # 3. Dev bypass for development environment without auth headers
    if settings.ENVIRONMENT == "development" and not auth_str and not role_str:
        return UserContext(
            id="018f3a10-0001-7000-8000-000000000001",
            email="dev-admin@unijos.edu.ng",
            role="super_admin",
            roles=["super_admin", "university_admin", "student"],
            university_id=uuid.UUID("01a07664-7a69-7ce0-ad6a-b219462cbde3"),
            first_name="Dev",
            last_name="SuperAdmin",
            current_level="500",
            terms_accepted_at="2026-01-01T00:00:00Z",
            client_type=client_type or "web",
            dev_bypass=True,
        )

    # 4. In production/staging or invalid auth
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication credentials were not provided or invalid.",
    )


def require_role(allowed_roles: list[str]) -> Callable:
    """Dependency factory enforcing RBAC role checks against verified UserContext."""
    allowed_set = {r.lower() for r in allowed_roles}

    async def role_checker(
        user: UserContext = Depends(get_current_user),
    ) -> UserContext:
        user_roles_set = {r.lower() for r in user.roles}
        user_roles_set.add(user.role.lower())

        if user_roles_set.intersection(allowed_set):
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Insufficient permissions. Requires one of {allowed_roles}, got '{user.role}'.",
        )

    return role_checker


async def require_api_key(
    x_api_key: str | None = Header(None, alias="x-api-key"),
) -> str:
    """Dependency enforcing a valid x-api-key header, returning client_type."""
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required x-api-key header.",
        )
    client_type = _verify_api_key(x_api_key)
    if not client_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client API key.",
        )
    return client_type


# ------------------------------------------------------------------------------
# 6. Pre-configured Role Dependencies
# ------------------------------------------------------------------------------
require_student = require_role(["student"])
require_lecturer = require_role(["lecturer", "university_admin", "super_admin"])
require_university_admin = require_role(["university_admin", "super_admin", "admin"])
require_super_admin = require_role(["super_admin"])
require_admin_or_super_admin = require_role(["university_admin", "super_admin", "admin"])
