# ==============================================================================
# PansGPT 2.0 FastAPI Core Engine Entrypoint
# ==============================================================================

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import close_db_pool, init_db_pool
from app.routers.chat import router as chat_router
from app.routers.library import documents_router
from app.routers.library import router as library_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database pool
    await init_db_pool()
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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(library_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)


@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """Quick endpoint for keep-alive pingers to prevent host sleep."""
    return {"status": "ok", "environment": settings.ENVIRONMENT, "service": "api"}


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Comprehensive readiness probe verifying database and downstream engines."""
    db_status = "unconfigured"
    db_details = None

    if settings.DATABASE_URL:
        try:
            import asyncpg

            # Clean connection with statement_cache_size=0 for Supabase pooler compatibility
            conn = await asyncio.wait_for(
                asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0),
                timeout=5.0,
            )
            val = await conn.fetchval("SELECT 1;")
            await conn.close()
            db_status = "ok" if val == 1 else "unexpected_result"
        except Exception as e:
            db_status = "error"
            db_details = str(e)

    redis_status = "unconfigured"
    if settings.redis_connection_url:
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_connection_url, socket_timeout=3.0)
            pong = await r.ping()
            await r.aclose()
            redis_status = "ok" if pong else "error"
        except Exception:
            redis_status = "error"

    is_ready = db_status in ["ok", "unconfigured"]
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ok" if is_ready else "degraded",
            "environment": settings.ENVIRONMENT,
            "engines": {
                "api": "operational",
                "database": db_status,
                "redis": redis_status,
            },
            **({"db_error": db_details} if db_details else {}),
        },
    )
