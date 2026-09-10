# PansGPT 2.0 — Environments & Deployment Setup Guide

> **Source of Truth**: [`docs/build_roadmap.md`](build_roadmap.md) (Phase 3: Environments Wired).  
> **Repository Architecture**: Turborepo Monorepo (`apps/web`, `apps/api`, `apps/mobile`, `apps/desktop`, `packages/*`).

---

## 1. Environments Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PansGPT 2.0 Topology                            │
├────────────────────────────────┬────────────────────────────────────────────┤
│ STAGING (Pre-release)          │ PRODUCTION (Live Students)                 │
├────────────────────────────────┼────────────────────────────────────────────┤
│ Web: staging.pansgpt.com       │ Web: pansgpt.com / app.pansgpt.com         │
│ Vercel Preview Deployments     │ Vercel Production Deployment               │
├────────────────────────────────┼────────────────────────────────────────────┤
│ API: api.staging.pansgpt.com   │ API: api.pansgpt.com                       │
│ Render Web: pansgpt-api-staging│ Render Web: pansgpt-api-production        │
│ Render Worker: pansgpt-worker-stg│ Render Worker: pansgpt-worker-prod       │
├────────────────────────────────┼────────────────────────────────────────────┤
│ DB: Supabase Project #1        │ DB: Supabase Project #2                    │
│ Ref: nrzbjhqtcxlfiyvoeanb      │ Ref: (To be provisioned before Phase 28)  │
├────────────────────────────────┼────────────────────────────────────────────┤
│ Storage: Cloudflare R2 Staging │ Storage: Cloudflare R2 Production          │
│ Bucket: pansgpt-library-staging│ Bucket: pansgpt-library-production         │
└────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 2. Render Deployment (`apps/api`)

The backend is configured via [`render.yaml`](../render.yaml) using multi-stage Docker builds.

### 2.1 Initial Blueprint Setup

1. Log into the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect the `pansgpt` GitHub repository.
4. Render will parse `render.yaml` and discover 4 services:
   - `pansgpt-api-staging` (FastAPI Web Service)
   - `pansgpt-worker-staging` (ARQ Background Worker)
   - `pansgpt-api-production` (FastAPI Web Service — autoDeploy: false)
   - `pansgpt-worker-production` (ARQ Worker — autoDeploy: false)
5. Fill in the required environment variables (marked `sync: false` in `render.yaml`) from [`docs/secrets-inventory.md`](secrets-inventory.md).
6. Click **Apply**.

### 2.2 Free Tier Operational Guidelines

- Render free instances sleep after **15 minutes of inactivity** (cold start delay ~45–60 seconds).
- The free plan provides **750 instance hours/month**. Running both API and Worker continuously will consume 1,440 hours/month, exceeding the free quota after ~15 days.
- **Recommended Free-Tier Setup**:
  - In staging, keep `pansgpt-api-staging` active.
  - Run `pansgpt-worker-staging` only when processing batch document ingestions, or upgrade to a $7/month Starter instance when running continuous background workloads.
  - Keep-alive pings (see Section 5) keep `pansgpt-api-staging` warm 24/7 within the 750 free hours.

---

## 3. Vercel Deployment (`apps/web`)

The frontend Next.js App Router application is deployed to Vercel.

### 3.1 Initial Project Link

1. Log into the [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import the `pansgpt` GitHub repository.
4. **Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (Important: do not leave at repository root)
   - **Build & Output Settings**: Automatically detected from [`apps/web/vercel.json`](../apps/web/vercel.json):
     - Build Command: `cd ../.. && pnpm --filter=@pansgpt/web build`
     - Install Command: `pnpm install`
5. **Environment Variables**:
   Add the following variables to **Preview** and **Production** scopes:
   - `NEXT_PUBLIC_APP_URL`: `https://staging.pansgpt.com` (Preview) / `https://pansgpt.com` (Production)
   - `NEXT_PUBLIC_API_URL`: `https://api.staging.pansgpt.com` (Preview) / `https://api.pansgpt.com` (Production)
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://nrzbjhqtcxlfiyvoeanb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<SUPABASE_ANON_KEY>`
   - `NEXT_PUBLIC_POSTHOG_KEY`: `<POSTHOG_PROJECT_KEY>`
   - `NEXT_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`
   - `NEXT_PUBLIC_SENTRY_DSN`: `<SENTRY_DSN>`
   - `X_API_KEY_WEB`: `<SECRET_INTERNAL_CLIENT_KEY>`
6. Click **Deploy**.

---

## 4. Supabase Database Wiring

### 4.1 Staging Project #1 (`nrzbjhqtcxlfiyvoeanb`)

- **Status**: Live and verified.
- **Connection Type**: Transaction Pooler on port `5432` / `6543`.
- **Pooler Mode**: Session/Transaction with `statement_cache_size=0`.
- **Auto-Pause Policy**: Free-tier projects pause after 7 days of inactivity. If paused, log into the Supabase dashboard and click **Restore project**.

### 4.2 Production Project #2

- Provisioned immediately before Phase 28 (Production Launch).
- Completely isolated from Staging. No data, users, or credentials are shared.

---

## 5. Keep-Alive & Observability

### 5.1 GitHub Actions Keep-Alive Pinger

- **File**: [`.github/workflows/keep_alive.yml`](../.github/workflows/keep_alive.yml)
- **Schedule**: `*/10 * * * *` (runs every 10 minutes).
- **Target**: `GET https://api.staging.pansgpt.com/health/ready`
- **Purpose**: Prevents Render free-tier container spin-down.

### 5.2 Secondary Uptime Monitor (cron-job.org / Better Uptime)

- In addition to GitHub Actions (which can experience queue delays), set up a free monitor on [cron-job.org](https://cron-job.org) or [Better Uptime](https://betteruptime.com):
  - **URL**: `https://api.staging.pansgpt.com/health/live`
  - **Interval**: Every 5 or 10 minutes
  - **Alert Threshold**: Send notification if endpoint fails 2 consecutive checks.
