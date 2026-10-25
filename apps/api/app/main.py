# ==============================================================================
# PansGPT 2.0 FastAPI Core Engine Entrypoint
# ==============================================================================
import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TypedDict

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.database import close_db_pool, init_db_pool
from app.core.dependencies import prewarm_jwks_cache
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.chat_discovery import router as chat_discovery_router
from app.routers.chat_interactions import router as chat_interactions_router
from app.routers.chat_sessions import router as chat_sessions_router
from app.routers.library import documents_router
from app.routers.library import router as library_router

# Suppress SDK-level AFC deprecation warnings from google.genai.models
logging.getLogger("google.genai.models").setLevel(logging.ERROR)

logger = structlog.get_logger(__name__)

# Initialize Sentry if configured
if settings.SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1,
        )
        logger.info("sentry_initialized", environment=settings.ENVIRONMENT)
    except Exception as exc:
        logger.warning("sentry_init_failed", error=str(exc))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings.validate_local_dev_mode()  # [PRELAUNCH FIX]
    # Startup: initialize database pool & prewarm JWKS cache
    await init_db_pool()
    await prewarm_jwks_cache()
    # Pre-warm FlashRank ONNX reranker in a background thread so the first
    # real user request does not pay the 5-10s cold-start model load penalty.
    await _prewarm_flashrank()
    yield
    # Shutdown: cleanly close database pool
    await close_db_pool()


async def _prewarm_flashrank() -> None:
    """Load the FlashRank ONNX cross-encoder at startup, not on first request."""
    try:
        from app.engines.reranker import candidate_reranker

        await asyncio.to_thread(candidate_reranker._get_flashrank_client)
        logger.info("flashrank_prewarmed")
    except Exception as exc:
        # Non-fatal: reranker heuristic fallback will cover any load failure.
        logger.warning("flashrank_prewarm_failed", error=str(exc))


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure Rate Limiting (SlowAPI)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(library_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_interactions_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_sessions_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_discovery_router, prefix=settings.API_V1_PREFIX)


@app.get("/health/live", tags=["Health"])
async def liveness_check() -> dict[str, str]:
    """Quick endpoint for keep-alive pingers to prevent host sleep."""
    return {"status": "ok", "environment": settings.ENVIRONMENT, "service": "api"}


class ReadinessPayload(TypedDict):
    status: str
    environment: str
    engines: dict[str, str]


_readiness_cache: tuple[float, ReadinessPayload] | None = None


async def _readiness_payload() -> ReadinessPayload:
    """Cache dependency probes independently of which readiness view consumes them."""
    import time

    from app.engines.storage import storage_engine

    global _readiness_cache
    now = time.monotonic()
    if _readiness_cache is not None and now - _readiness_cache[0] < 30:
        return _readiness_cache[1]
    engines = {
        "api": "operational",
        "database": "error",
        "redis": "disabled",
        "storage": "disabled",
        "chat": "disabled",
        "embeddings": "disabled",
    }
    if settings.ENABLE_AI:
        eligible = bool(
            (settings.GEMINI_API_KEY and settings.provider_privacy_allowed("google"))
            or (settings.GROQ_API_KEY and settings.provider_privacy_allowed("groq"))
            or (settings.OPENROUTER_API_KEY and settings.provider_privacy_allowed("openrouter"))
        )
        engines["chat"] = "ready" if eligible else "blocked"
    if settings.ENABLE_INGESTION:
        engines.update(redis="error", storage="error", embeddings="blocked")
        if settings.GEMINI_API_KEY and settings.provider_privacy_allowed("google"):
            engines["embeddings"] = "ready"

    async def probe_database() -> None:
        from app.core.database import get_db_connection

        try:
            async with asyncio.timeout(4):
                async with get_db_connection(timeout=3) as conn:
                    if conn is not None and await conn.fetchval("SELECT 1") == 1:
                        engines["database"] = "ok"
        except Exception:
            pass

    async def probe_redis() -> None:
        if not settings.ENABLE_INGESTION or not settings.redis_connection_url:
            return
        try:
            import redis.asyncio as aioredis

            async with asyncio.timeout(4):
                redis = aioredis.from_url(
                    settings.redis_connection_url, socket_connect_timeout=2, socket_timeout=2
                )
                try:
                    if await redis.ping():
                        engines["redis"] = "ok"
                finally:
                    await redis.aclose()
        except Exception:
            pass

    async def probe_storage() -> None:
        if not settings.ENABLE_INGESTION or not storage_engine.is_configured:
            return
        try:
            async with asyncio.timeout(4):
                async with storage_engine.get_client() as client:
                    await client.head_bucket(Bucket=settings.r2_bucket_name)
            engines["storage"] = "ok"
        except Exception:
            pass

    # Render expects health responses within five seconds. Bound the probes and
    # run independent dependencies concurrently rather than adding their waits.
    await asyncio.gather(probe_database(), probe_redis(), probe_storage())
    ready = all(value in {"operational", "ok", "ready", "disabled"} for value in engines.values())
    payload: ReadinessPayload = {
        "status": "ok" if ready else "degraded",
        "environment": settings.ENVIRONMENT,
        "engines": engines,
    }
    _readiness_cache = (now, payload)
    return payload


@app.get("/health/ready", tags=["Health"])
async def readiness_check() -> JSONResponse:
    """Full product readiness includes required provider privacy eligibility."""
    payload = await _readiness_payload()
    return JSONResponse(status_code=200 if payload["status"] == "ok" else 503, content=payload)


@app.get("/health/infrastructure", tags=["Health"])
async def infrastructure_check() -> JSONResponse:
    """Hosting health requires dependencies; provider eligibility stays in full readiness."""
    capabilities = await _readiness_payload()
    engines = {
        name: capabilities["engines"][name] for name in ("api", "database", "redis", "storage")
    }
    ready = all(value in {"operational", "ok", "disabled"} for value in engines.values())
    payload: ReadinessPayload = {
        "status": "ok" if ready else "degraded",
        "environment": capabilities["environment"],
        "engines": engines,
    }
    return JSONResponse(status_code=200 if ready else 503, content=payload)
