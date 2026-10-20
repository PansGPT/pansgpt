# ==============================================================================
# PansGPT 2.0 FastAPI Core Engine Entrypoint
# ==============================================================================
import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

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
    yield
    # Shutdown: cleanly close database pool
    await close_db_pool()


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


@app.get("/health/live", tags=["Health"])
async def liveness_check() -> dict[str, str]:
    """Quick endpoint for keep-alive pingers to prevent host sleep."""
    return {"status": "ok", "environment": settings.ENVIRONMENT, "service": "api"}


_readiness_cache: tuple[float, dict[str, object]] | None = None


@app.get("/health/ready", tags=["Health"])
async def readiness_check() -> JSONResponse:
    """Cache lightweight capability probes; a missing required engine is not ready."""
    import time

    from app.engines.storage import storage_engine

    global _readiness_cache
    now = time.monotonic()
    if _readiness_cache is not None and now - _readiness_cache[0] < 30:
        payload = _readiness_cache[1]
        return JSONResponse(status_code=200 if payload["status"] == "ok" else 503, content=payload)
    engines = {
        "api": "operational",
        "database": "error",
        "redis": "disabled",
        "storage": "disabled",
        "chat": "disabled",
        "embeddings": "disabled",
    }
    try:
        from app.core.database import get_db_connection

        async with get_db_connection(timeout=3) as conn:
            if conn is not None and await conn.fetchval("SELECT 1") == 1:
                engines["database"] = "ok"
    except Exception:
        pass
    if settings.ENABLE_AI:
        eligible = bool(
            (settings.GEMINI_API_KEY and settings.GOOGLE_ZDR_CONFIRMED)
            or (settings.GROQ_API_KEY and settings.GROQ_ZDR_CONFIRMED)
            or (settings.OPENROUTER_API_KEY and settings.OPENROUTER_ZDR_CONFIRMED)
        )
        engines["chat"] = "ready" if eligible else "blocked"
    if settings.ENABLE_INGESTION:
        engines.update(redis="error", storage="error", embeddings="blocked")
        if settings.GEMINI_API_KEY and settings.GOOGLE_ZDR_CONFIRMED:
            engines["embeddings"] = "ready"
        if settings.redis_connection_url:
            try:
                import redis.asyncio as aioredis

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
        if storage_engine.is_configured:
            try:
                async with asyncio.timeout(3):
                    async with storage_engine.get_client() as client:
                        await client.head_bucket(Bucket=settings.r2_bucket_name)
                engines["storage"] = "ok"
            except Exception:
                pass
    ready = all(value in {"operational", "ok", "ready", "disabled"} for value in engines.values())
    payload = {
        "status": "ok" if ready else "degraded",
        "environment": settings.ENVIRONMENT,
        "engines": engines,
    }
    _readiness_cache = (now, payload)
    return JSONResponse(status_code=200 if ready else 503, content=payload)
