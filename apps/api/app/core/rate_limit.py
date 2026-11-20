# ==============================================================================
# PansGPT 2.0 Rate Limiting Middleware (SlowAPI)
# Enforces IP-based and user-based request throttling (Phase 7.6 / Roadmap 7.6)
# ==============================================================================

import math
import time

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = structlog.get_logger(__name__)


def get_real_client_ip(request: Request) -> str:
    """
    Use ASGI's peer identity after the server's trusted-proxy processing.
    Arbitrary HTTP headers are not proof that the sender is a trusted proxy.
    """
    return get_remote_address(request)


# Singleton limiter instance
limiter = Limiter(key_func=get_real_client_ip, default_limits=["60/minute"])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom structured response for rate limit violations (HTTP 429)."""
    retry_after = 60
    view = getattr(request.state, "view_rate_limit", None)
    if view:
        try:
            active_limiter = request.app.state.limiter
            window = active_limiter.limiter.get_window_stats(view[0], *view[1])
            retry_after = max(1, math.ceil(window.reset_time - time.time()))
        except Exception:
            pass
    logger.info("api_rate_limited", retry_after_s=retry_after)
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": "Too many requests. Please try again shortly.",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after), "Cache-Control": "private, no-store"},
    )
