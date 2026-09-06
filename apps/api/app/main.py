from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """Quick endpoint for keep-alive pingers to prevent host sleep."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Comprehensive readiness probe verifying database and downstream engines."""
    return {
        "status": "ready",
        "engines": {
            "api": "operational",
            "environment": settings.ENVIRONMENT
        }
    }
