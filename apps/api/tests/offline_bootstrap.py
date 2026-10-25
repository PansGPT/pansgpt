"""Neutralize .env services before importing application singletons. [CHAT FIX 2]"""

import os
import sys

# [CHAT FIX 2] Environment values override dotenv values for Pydantic settings.
# Live tests use a dedicated RLS URL and may opt in to the embedding provider.
SERVICE_ENV: dict[str, str] = {
    "ENVIRONMENT": "development",
    "LOCAL_DEV_MODE": "false",
    "DATABASE_URL": "offline-unit-test",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "test-mock-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-mock-key",
    "SUPABASE_JWT_SECRET": "test-mock-key",
    "UPSTASH_REDIS_URL": "",
    "REDIS_URL": "",
    "UPSTASH_REDIS_REST_URL": "",
    "UPSTASH_REDIS_REST_TOKEN": "",
    "CLOUDFLARE_R2_ACCOUNT_ID": "",
    "CLOUDFLARE_R2_ACCESS_KEY_ID": "",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY": "",
    "CLOUDFLARE_R2_ENDPOINT": "",
    "R2_ACCOUNT_ID": "",
    "R2_ACCESS_KEY_ID": "",
    "R2_SECRET_ACCESS_KEY": "",
    "R2_PUBLIC_DOMAIN": "",
    "COHERE_API_KEY": "",
    "TAVILY_API_KEY": "",
    "TAVILY_PUBLIC_SEARCH_ALLOWED": "false",
    "RESEND_API_KEY": "",
    "PAYSTACK_SECRET_KEY": "",
    "PAYSTACK_WEBHOOK_SECRET": "",
    "FLUTTERWAVE_SECRET_KEY": "",
    "FLUTTERWAVE_WEBHOOK_SECRET": "",
    "SENTRY_DSN": "",
    "X_API_KEY_WEB": "",
    "X_API_KEY_MOBILE": "",
    "X_API_KEY_DESKTOP": "",
}

if "--allow-live-services" not in sys.argv:
    SERVICE_ENV.update(
        {
            "GEMINI_API_KEY": "test-mock-key",
            "GROQ_API_KEY": "test-mock-key",
            "OPENROUTER_API_KEY": "test-mock-key",
            "OPENAI_API_KEY": "test-mock-key",
        }
    )

os.environ.update(SERVICE_ENV)
