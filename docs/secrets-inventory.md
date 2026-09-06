# PansGPT 2.0 — Secrets & Configuration Inventory

> **Source of Truth**: [`docs/build_roadmap.md`](build_roadmap.md) (Phase 2) & [`docs/implementation_plan.md`](implementation_plan.md) (Section 2 & 24).
> **Security Policy**: Zero real secrets in version control. All production and staging keys are injected via host environment managers (Vercel, Render, Supabase, Cloudflare).

---

## 1. Secrets Master Matrix

| Secret Variable | Used By | Environment Target | Purpose & Scope | Free-Tier Provider |
|---|---|---|---|---|
| `ENVIRONMENT` | All Apps | Dev / Staging / Prod | `development` | `staging` | `production` | System runtime |
| `API_BASE_URL` | Web, Mobile, Desktop | Dev / Staging / Prod | FastAPI endpoint URL | Local / Render |
| `NEXT_PUBLIC_APP_URL` | Web | Dev / Staging / Prod | Public frontend domain | Local / Vercel |
| `SUPABASE_URL` | All Apps | Dev / Staging / Prod | Supabase API gateway URL | Supabase Free Tier |
| `SUPABASE_ANON_KEY` | Web, Mobile, Desktop | Dev / Staging / Prod | Client-side public read / auth token | Supabase Free Tier |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api` only | Staging / Prod | Server-side admin bypass for background ingestion | Supabase Free Tier |
| `SUPABASE_JWT_SECRET` | `apps/api` only | Staging / Prod | RS256/HS256 JWT signature verification | Supabase Free Tier |
| `DATABASE_URL` | `apps/api` only | Dev / Staging / Prod | PostgreSQL connection string (pooler port 5432/6543) | Supabase Free Tier |
| `GOOGLE_AI_API_KEY` | `apps/api` only | Staging / Prod | Primary LLM (Gemma 4) & `gemini-embedding-002` (1536d) | Google AI Studio ($0) |
| `GROQ_API_KEY` | `apps/api` only | Staging / Prod | Fallback LLM (`llama-3.3-70b-versatile`) | Groq Free Tier ($0) |
| `OPENROUTER_API_KEY` | `apps/api` only | Staging / Prod | Safety-net LLM fallback endpoint | OpenRouter Free Tier ($0) |
| `R2_ACCOUNT_ID` | `apps/api` only | Staging / Prod | Cloudflare account ID for R2 storage | Cloudflare R2 (10GB $0) |
| `R2_ACCESS_KEY_ID` | `apps/api` only | Staging / Prod | S3-compatible API access key | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | `apps/api` only | Staging / Prod | S3-compatible API secret key | Cloudflare R2 |
| `R2_BUCKET_NAME` | `apps/api` only | Staging / Prod | `pansgpt-documents-staging` / `prod` | Cloudflare R2 |
| `R2_PUBLIC_DOMAIN` | `apps/api` only | Staging / Prod | Custom/CDN domain for fast PDF streaming | Cloudflare R2 |
| `REDIS_URL` | `apps/api` only | Dev / Staging / Prod | Upstash Serverless Redis for ARQ job queue | Upstash Redis ($0) |
| `UPSTASH_REDIS_REST_URL` | `apps/api`, Web | Staging / Prod | Serverless Redis REST API endpoint | Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN`| `apps/api`, Web | Staging / Prod | Serverless Redis REST API token | Upstash Redis |
| `RESEND_API_KEY` | `apps/api` only | Staging / Prod | Transactional emails (3,000/mo) | Resend ($0) |
| `EMAIL_FROM` | `apps/api` only | Staging / Prod | Default sender: `PansGPT <support@pansgpt.com>` | Resend |
| `PAYSTACK_SECRET_KEY` | `apps/api` only | Staging / Prod | Nigerian debit/credit card billing engine | Paystack Test/Live |
| `NEXT_PUBLIC_PAYSTACK_KEY`| Web, Mobile | Staging / Prod | Public key for client inline checkout | Paystack Test/Live |
| `FLUTTERWAVE_SECRET_KEY` | `apps/api` only | Staging / Prod | Nigerian bank transfer/USSD fallback engine | Flutterwave Test/Live |
| `NEXT_PUBLIC_FLUTTERWAVE_KEY`| Web, Mobile | Staging / Prod | Public key for Flutterwave inline checkout | Flutterwave Test/Live |
| `SENTRY_DSN` | All Apps | Staging / Prod | Full-stack error tracking and performance tracing | Sentry Free Tier |
| `NEXT_PUBLIC_POSTHOG_KEY` | Web, Mobile | Staging / Prod | Product analytics, feature flags & session replay | PostHog (1M events $0)|
| `X_API_KEY_WEB` | Web -> `apps/api` | Staging / Prod | Client identification SHA-256 header | Internal secret |
| `X_API_KEY_MOBILE` | Mobile -> `apps/api` | Staging / Prod | Client identification SHA-256 header | Internal secret |
| `X_API_KEY_DESKTOP` | Desktop -> `apps/api`| Staging / Prod | Client identification SHA-256 header | Internal secret |

---

## 2. Secrets Location per Environment

| Environment | Managed By | Where to Configure |
|---|---|---|
| **Local Dev** | Developer Workstation | `.env` or `.env.local` files (strictly in `.gitignore`) |
| **Staging Web** | Vercel | Vercel Dashboard -> Project Settings -> **Environment Variables (Preview)** |
| **Staging API** | Render | Render Dashboard -> `pansgpt-api-staging` -> **Environment Group** |
| **Staging DB** | Supabase | Supabase Project #1 (`pansgpt-staging`) |
| **Production Web**| Vercel | Vercel Dashboard -> Project Settings -> **Environment Variables (Production)**|
| **Production API**| Render | Render Dashboard -> `pansgpt-api-production` -> **Environment Group** |
| **Production DB** | Supabase | Supabase Project #2 (`pansgpt-production`) |

---

## 3. Secret Rotation & Security Rules

1. **Client Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `R2_SECRET_ACCESS_KEY`, `PAYSTACK_SECRET_KEY`, and `FLUTTERWAVE_SECRET_KEY` must **NEVER** be prefixed with `NEXT_PUBLIC_` or bundled into client bundles.
2. **Automated Secret Scanning**:
   - GitHub Secret Scanning and pre-commit secret detection are active on all commits.
3. **Rotation Procedure**:
   - If any API key is suspected to be exposed, immediately rotate in the provider dashboard and update Render/Vercel environment variables without requiring code redeployment.
