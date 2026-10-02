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
    JWKS_CACHE_TTL_SECONDS: int = 3600
    ROLE_CACHE_TTL_SECONDS: int = 300

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
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2"  # 3072d, Google AI Studio
    GEMINI_EMBEDDING_DIMENSIONS: int = 3072  # [EMBED FIX]
    HYDE_GENERATION_MODEL: str = "gemma-4-31b-it"  # Model used for HyDE passage generation during RAG
    EMBEDDER_FAKE_MODE: bool = False  # [EMBED FIX]

    GROQ_API_KEY: str | None = None
    GROQ_FALLBACK_MODEL: str = "openai/gpt-oss-120b"
    GROQ_SECONDARY_MODEL: str = "qwen/qwen3.6-27b"
    WHISPER_PRIMARY_MODEL: str = "whisper-large-v3-turbo"
    WHISPER_SECONDARY_MODEL: str = "whisper-large-v3"
    OPENAI_API_KEY: str | None = None
    WHISPER_FALLBACK_MODEL: str = "whisper-1"
    WHISPER_MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024
    WHISPER_ALLOWED_MIME_TYPES: list[str] = [
        "audio/webm",
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mpeg",
        "audio/mp3",
        "audio/ogg",
        "audio/opus",
        "video/webm",
    ]
    WHISPER_PHARMACY_PROMPT: str = (
        "Pharmacy, pharmacology, pharmacokinetics, pharmacodynamics, dosage, bioavailability, "
        "posology, contraindications, adverse drug reactions, monograph, clinical biochemistry, "
        "pathophysiology, medicinal chemistry, therapeutics, BNF, haloperidol, ciprofloxacin, "
        "metformin, gentamicin, hydrochlorothiazide, amlodipine, salbutamol, omeprazole."
    )

    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_FALLBACK_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    OPENROUTER_FAST_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"

    # Purpose-Driven Token Ceilings (Section 6.5.3)
    TEXT_CHAT_MAX_TOKENS: int = 4096
    VISION_REPLY_MAX_TOKENS: int = 2048
    VISION_EXTRACTION_MAX_TOKENS: int = 768

    # Query Expansion & HyDE Configuration (Section 6B.6)
    ENABLE_QUERY_EXPANSION: bool = True
    QUERY_EXPANSION_GROQ_TIMEOUT_SECONDS: float = 5.0
    QUERY_EXPANSION_HYDE_TIMEOUT_SECONDS: float = 10.0
    QUERY_EXPANSION_TIMEOUT_SECONDS: float = 5.0
    HYDE_TIMEOUT_SECONDS: float = 10.0

    # Re-ranking Engine Configuration (Section 6B.7)
    RERANKER_PROVIDER: Literal["flashrank", "cohere", "heuristic"] = "flashrank"
    RERANKER_MODEL: str = "ms-marco-TinyBERT-L-2-v2"
    COHERE_API_KEY: str | None = None
    COHERE_RERANK_MODEL: str = "rerank-v3.5"
    RERANKER_TIMEOUT_SECONDS: float = 0.30
    RERANKER_MIN_SCORE_THRESHOLD: float = 0.38
    RERANKER_DEFAULT_TOP_K: int = 6

    # Multimodal Vision Settings (Roadmap 6B.14 & Section 7)
    GEMINI_VISION_MODEL: str = "gemini-1.5-flash"
    OPENROUTER_VISION_MODEL: str = "nvidia/nemotron-nano-12b-v2-vl:free"
    GROQ_VISION_MODEL: str = "llama-3.2-11b-vision-preview"
    VISION_MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB maximum payload
    VISION_PER_TIER_TIMEOUT_SECONDS: float = 10.0  # 10s per provider tier
    VISION_OVERALL_TIMEOUT_SECONDS: float = 25.0  # 25s global pipeline timeout

    # Web Search Quotas & Caching (Roadmap 6B.13 & Section 8)
    WEB_SEARCH_DAILY_LIMIT_STUDENT: int = 5
    WEB_SEARCH_DAILY_LIMIT_PRO: int = 25
    WEB_SEARCH_DAILY_LIMIT_STAFF: int = 50
    WEB_SEARCH_CACHE_TTL_SECONDS: int = 3600  # 1 hour TTL
    WEB_SEARCH_TIMEOUT_SECONDS: float = 8.0

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
