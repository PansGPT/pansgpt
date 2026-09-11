# ==============================================================================
# PansGPT 2.0 FastAPI Core Settings & Configuration (Phase 2 & 3)
# Validated with Pydantic v2 BaseSettings
# ==============================================================================

from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Mode
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    PROJECT_NAME: str = "PansGPT 2.0 Core Engine"
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://pansgpt.com",
        "https://staging.pansgpt.com",
        "https://app.pansgpt.com",
    ]

    # Database (Supabase PostgreSQL Session/Transaction Pooler)
    DATABASE_URL: str | None = Field(
        default=None,
        description="PostgreSQL Connection URL",
    )

    # Supabase Gateway & Authentication
    SUPABASE_URL: str | None = Field(
        default=None,
        description="Supabase Project API Gateway URL",
    )
    SUPABASE_ANON_KEY: str | None = Field(default=None, description="Supabase Anonymous Public Key")
    SUPABASE_SERVICE_ROLE_KEY: str | None = Field(
        default=None, description="Supabase Service Role Secret Key"
    )
    SUPABASE_JWT_SECRET: str | None = Field(
        default=None, description="Supabase JWT Verification Secret"
    )

    # Cloudflare R2 Document Storage (S3-Compatible)
    CLOUDFLARE_R2_ACCOUNT_ID: str | None = None
    CLOUDFLARE_R2_ACCESS_KEY_ID: str | None = None
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str | None = None
    CLOUDFLARE_R2_ENDPOINT: str | None = None
    CLOUDFLARE_R2_BUCKET_STAGING: str = "pansgpt-library-staging"
    CLOUDFLARE_R2_BUCKET_PRODUCTION: str = "pansgpt-library-production"
    R2_PUBLIC_DOMAIN: str | None = None

    # Backward compatibility aliases
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str = "pansgpt-library-staging"

    @property
    def r2_bucket_name(self) -> str:
        if self.ENVIRONMENT == "production":
            return self.CLOUDFLARE_R2_BUCKET_PRODUCTION
        return self.CLOUDFLARE_R2_BUCKET_STAGING

    @property
    def r2_access_key(self) -> str | None:
        return self.CLOUDFLARE_R2_ACCESS_KEY_ID or self.R2_ACCESS_KEY_ID

    @property
    def r2_secret_key(self) -> str | None:
        return self.CLOUDFLARE_R2_SECRET_ACCESS_KEY or self.R2_SECRET_ACCESS_KEY

    @property
    def r2_endpoint_url(self) -> str | None:
        if self.CLOUDFLARE_R2_ENDPOINT:
            return self.CLOUDFLARE_R2_ENDPOINT
        acc_id = self.CLOUDFLARE_R2_ACCOUNT_ID or self.R2_ACCOUNT_ID
        if acc_id:
            return f"https://{acc_id}.r2.cloudflarestorage.com"
        return None

    # Client Application Secret Headers (x-api-key)
    X_API_KEY_WEB: str | None = None
    X_API_KEY_MOBILE: str | None = None
    X_API_KEY_DESKTOP: str | None = None

    # AI / LLM Providers ($0 Budget Tier) - Strictly Gemma for generation, Gemini only for 3072d embedding
    GEMINI_API_KEY: str | None = None
    GEMINI_PRIMARY_MODEL: str = "gemma-4-31b-it"
    GEMINI_SECONDARY_MODEL: str = "gemma-4-26b-a4b-it"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-002"
    GEMINI_EMBEDDING_DIMENSIONS: int = 3072

    GROQ_API_KEY: str | None = None
    GROQ_FALLBACK_MODEL: str = "openai/gpt-oss-120b"
    GROQ_SECONDARY_MODEL: str = "qwen/qwen3.6-27b"
    WHISPER_PRIMARY_MODEL: str = "whisper-large-v3-turbo"
    WHISPER_SECONDARY_MODEL: str = "whisper-large-v3"

    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_FALLBACK_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    OPENROUTER_FAST_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"

    # Purpose-Driven Token Ceilings (Section 6.5.3)
    TEXT_CHAT_MAX_TOKENS: int = 4096
    VISION_REPLY_MAX_TOKENS: int = 2048
    VISION_EXTRACTION_MAX_TOKENS: int = 768

    # Search Tool Integration
    TAVILY_API_KEY: str | None = None

    # Cache & Background Workers (Upstash Redis)
    UPSTASH_REDIS_URL: str | None = None
    REDIS_URL: str | None = None
    UPSTASH_REDIS_REST_URL: str | None = None
    UPSTASH_REDIS_REST_TOKEN: str | None = None

    @property
    def redis_connection_url(self) -> str | None:
        return self.UPSTASH_REDIS_URL or self.REDIS_URL

    # Transactional Email (Resend)
    RESEND_API_KEY: str | None = None
    EMAIL_FROM: str = "PansGPT <support@pansgpt.com>"

    # Payments (Paystack & Flutterwave)
    PAYSTACK_SECRET_KEY: str | None = None
    PAYSTACK_WEBHOOK_SECRET: str | None = None
    FLUTTERWAVE_SECRET_KEY: str | None = None
    FLUTTERWAVE_WEBHOOK_SECRET: str | None = None

    # Observability
    SENTRY_DSN: str | None = None

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @model_validator(mode="after")
    def validate_environment_requirements(self) -> "Settings":
        """Fail-fast validation enforcing mandatory secrets on staging and production."""
        if self.ENVIRONMENT in ("staging", "production"):
            missing = []
            for field_name in (
                "DATABASE_URL",
                "SUPABASE_URL",
                "SUPABASE_ANON_KEY",
                "SUPABASE_SERVICE_ROLE_KEY",
            ):
                val = getattr(self, field_name)
                if not val or "placeholder" in str(val).lower() or "example" in str(val).lower():
                    missing.append(field_name)
            if missing:
                raise ValueError(
                    f"CRITICAL: Missing or invalid required environment variables for {self.ENVIRONMENT}: {', '.join(missing)}"
                )
        elif self.ENVIRONMENT == "development" and not self.DATABASE_URL:
            # Safe default to local Docker Postgres if none provided in development
            object.__setattr__(
                self,
                "DATABASE_URL",
                "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
            )
        return self

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=True
    )


settings = Settings()
