# ==============================================================================
# PansGPT 2.0 FastAPI Core Settings & Configuration (Phase 2 & 3)
# Validated with Pydantic v2 BaseSettings
# ==============================================================================

from typing import List, Literal, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Mode
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    PROJECT_NAME: str = "PansGPT 2.0 Core Engine"
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://pansgpt.com",
        "https://staging.pansgpt.com",
        "https://app.pansgpt.com",
    ]
    
    # Database (Supabase PostgreSQL Session/Transaction Pooler)
    DATABASE_URL: str = Field(
        default="postgresql://postgres.nrzbjhqtcxlfiyvoeanb:Panstech%402026@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
        description="PostgreSQL Connection URL"
    )
    
    # Supabase Gateway & Authentication
    SUPABASE_URL: str = Field(
        default="https://nrzbjhqtcxlfiyvoeanb.supabase.co",
        description="Supabase Project API Gateway URL"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="placeholder_anon_key",
        description="Supabase Anonymous Public Key"
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default="placeholder_service_role_key",
        description="Supabase Service Role Secret Key"
    )
    SUPABASE_JWT_SECRET: Optional[str] = Field(
        default=None,
        description="Supabase JWT Verification Secret"
    )
    
    # Cloudflare R2 Document Storage (S3-Compatible)
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "pansgpt-documents-staging"
    R2_PUBLIC_DOMAIN: Optional[str] = None
    
    # AI / LLM Providers ($0 Budget Tier)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_PRIMARY_MODEL: str = "gemma-4-31b-it"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-002"
    GEMINI_EMBEDDING_DIMENSIONS: int = 1536
    
    GROQ_API_KEY: Optional[str] = None
    GROQ_FALLBACK_MODEL: str = "llama-3.3-70b-versatile"
    
    OPENROUTER_API_KEY: Optional[str] = None
    
    # Cache & Background Workers (Upstash Redis)
    REDIS_URL: Optional[str] = None
    UPSTASH_REDIS_REST_URL: Optional[str] = None
    UPSTASH_REDIS_REST_TOKEN: Optional[str] = None
    
    # Transactional Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "PansGPT <support@pansgpt.com>"
    
    # Payments (Paystack & Flutterwave)
    PAYSTACK_SECRET_KEY: Optional[str] = None
    FLUTTERWAVE_SECRET_KEY: Optional[str] = None
    
    # Observability
    SENTRY_DSN: Optional[str] = None

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )


settings = Settings()
