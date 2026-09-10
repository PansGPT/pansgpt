// ==============================================================================
// @pansgpt/config — Shared Configuration, Constants & Protocols
// ==============================================================================

/**
 * Standard HTTP header keys used across Web, Mobile, Desktop and API.
 */
export const AUTH_HEADERS = {
  API_KEY: "x-api-key",
  CLIENT_ID: "x-client-id",
  UNIVERSITY_ID: "x-university-id",
  REQUEST_ID: "x-request-id",
} as const;

export const X_API_KEY_HEADER = AUTH_HEADERS.API_KEY;
export const X_CLIENT_ID_HEADER = AUTH_HEADERS.CLIENT_ID;

/**
 * Default development port allocation for the monorepo.
 */
export const PORTS = {
  WEB: 3000,
  API: 8000,
  SUPABASE_STUDIO: 54323,
  SUPABASE_DB: 54322,
  REDIS: 6379,
} as const;

/**
 * AI & LLM Model specifications ($0 Tier Gemma / Gemini).
 */
export const AI_MODELS = {
  PRIMARY: "gemma-4-31b-it",
  SECONDARY: "gemma-4-26b-a4b-it",
  EMBEDDING: "gemini-embedding-002",
  EMBEDDING_DIMENSIONS: 3072,
  GROQ_FALLBACK: "openai/gpt-oss-120b",
  OPENROUTER_FALLBACK: "google/gemma-2-27b-it",
} as const;

/**
 * Multi-tenant university identifiers.
 */
export const UNIVERSITIES = {
  UNIJOS: {
    id: "unijos",
    name: "University of Jos",
    shortName: "UNIJOS",
    defaultTimezone: "Africa/Lagos",
  },
} as const;

export const UNIJOS_SLUG = "unijos";
export const SUPPORTED_UNIVERSITIES = [UNIJOS_SLUG] as const;

/**
 * Cloudflare R2 bucket configurations.
 */
export const R2_BUCKETS = {
  STAGING: "pansgpt-library-staging",
  PRODUCTION: "pansgpt-library-production",
} as const;
