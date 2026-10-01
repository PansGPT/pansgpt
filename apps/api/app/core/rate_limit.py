# ==============================================================================
# PansGPT 2.0 Rate Limiting Middleware (SlowAPI)
# Enforces IP-based and user-based request throttling (Phase 7.6 / Roadmap 7.6)
# ==============================================================================

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


def get_real_client_ip(request: Request) -> str:
    """
    Extracts client IP, respecting reverse proxies (Cloudflare, Render, Vercel).
    Falls back to direct client host.
    """
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


# Singleton limiter instance
limiter = Limiter(key_func=get_real_client_ip, default_limits=["60/minute"])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom structured response for rate limit violations (HTTP 429)."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
            "retry_after": getattr(exc, "retry_after", None),
        },
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))},
    )
