# PansGPT — Complete Build Roadmap (Engine-First)

> **Source of Truth**: Every decision in this roadmap is drawn directly from [`implementation_plan.md`](implementation_plan.md).
> **Core Philosophy**: Engines are built and verified first via API tests. UI is built last, on top of proven infrastructure.
> **Budget**: $0. Every tool listed below has a free tier that works at launch.

---

## 🧭 The Engine-First Principle

Most teams build auth screens and home pages before the core product engine exists.
That is the wrong order. Here is the correct order:

```
Infrastructure → Engines (no UI) → API verification → Walking skeleton → Full UI
```

For PansGPT:
```
1. Set up environments (dev, staging, production)
2. Scaffold the monorepo + CI tooling
3. Lock secrets and config validation
4. Build the database foundation (schema, RLS, migrations)
5. Build the document ingestion engine (R2, PyMuPDF, 8-stage pipeline, gemini-embedding-002, HNSW)
6. Build the AI/LLM orchestration engine (Gemma 4 → Groq → OpenRouter, tools, SSE)
7. Build the auth backend (JWKS, JWT, RBAC role guards)
8. Verify all three engines work via pytest API tests — no UI yet
9. Build the walking skeleton web UI (sign up → upload → chat → AI response on staging)
10. Build the full UI surface by surface on top of proven APIs
11. Add mobile (Expo), then desktop (Electron), then payments, email, SEO
12. Security hardening, observability, load testing, launch
```

---

## 🌍 Platform Build Priority

| Priority | Platform | Decision |
|:---:|---|---|
| **1st** | **Web (Next.js 15)** | Fastest iteration. No app store delays. Proves product-market fit first. SEO-discoverable. |
| **2nd** | **Mobile (Expo SDK 52+)** | Students are mobile-heavy for daily study. Built once web features are stable. |
| **3rd** | **Desktop (Electron 33)** | Offline-first power users. ~90% code share with web. Sequenced last. |

> [!IMPORTANT]
> All three platforms share the **same FastAPI backend engines**. Engines are built once. Web, Mobile, and Desktop are UI layers on top of those engines.
> **Clients never call LLM providers directly. All AI calls go through FastAPI.**

---

## 🌐 Environment Architecture

Before writing a single line of product code, understand the three-tier environment system.

### The Three Environments

```
┌─────────────────────────────────────────────────────────────┐
│  LOCAL DEV          STAGING                PRODUCTION        │
│  ──────────         ───────                ──────────        │
│  Your laptop        Shared test env        Real students     │
│                                                              │
│  Supabase:          Supabase:              Supabase:         │
│  Local Docker       Hosted Free Project #1 Hosted Free #2   │
│  (supabase start)                                            │
│                                                              │
│  FastAPI:           Render staging svc     Render prod svc   │
│  localhost:8000                                              │
│                                                              │
│  Next.js:           Vercel Preview URL     Vercel Production  │
│  localhost:3000      (every PR gets one)   (custom domain)   │
└─────────────────────────────────────────────────────────────┘
```

### Code Promotion Flow

```
Developer codes locally
        │  git push → open Pull Request
        ▼
GitHub Actions CI (lint + typecheck + pytest + next build)
        │  CI MUST PASS — merge blocked if it fails
        │
        ├──► Vercel auto-creates a Preview URL for this PR
        │
        ▼
PR reviewed + CI green → merged to main
        │
        ├──► Migrations applied to target environment via CLI (BEFORE code deploy)
        ├──► Vercel auto-deploys apps/web to production
        └──► Render auto-deploys apps/api to production
```

> [!CAUTION]
> **Migrations always run BEFORE the new code is deployed.** Schema is updated first. Code is deployed second.
> Staging and Production **never** share a database, Sentry project, or payment keys.

### Supabase Free Tier Constraints (Real-World)
- **Exactly 2 free hosted projects per org** → Project #1 = Staging, Project #2 = Production
- **Local dev uses `supabase start` (Docker)** — never burns a hosted project slot
- **Free projects pause after 7 days of inactivity** — unpause staging manually before test runs
- **500MB database ceiling** — pgvector embeddings (3072d × many chunks) approach this with real course documents
- **First expected paid milestone**: Supabase Pro ($25/mo) when document volume hits the limit

### Render Free Tier Constraints
- 750 free instance hours/month (exact 24/7 for one service)
- **Sleeps after 15 minutes of inactivity** — cold start delay ~1 minute
- **Keep-alive strategy**: cron-job.org (free) pings `GET /health/ready` every 10 minutes
- Keep to **1 free service** per Render account — API + Worker running simultaneously burns both services' hours

---

## 📋 Phase Overview

| # | Phase | What Gets Built | Gate Before Continuing |
|:---:|---|---|---|
| **0** | Local Dev Environment | Every developer runs the full stack locally | All services start without errors |
| **1** | Monorepo Scaffold + CI | Repo structure, turbo.json, git hooks, PR templates, blocking CI | CI passes on an empty repo push |
| **2** | Secrets + Config | `.env.example`, Pydantic BaseSettings, `@t3-oss/env-nextjs`, per-env isolation | App refuses to start with missing vars |
| **3** | Environments Wired | Local, staging, production Supabase + Vercel + Render all connected | Staging URL is reachable; `/health/ready` returns 200 |
| **4** | Database Foundation | All migrations, RLS policies, enums, indexes, seed data | `supabase db reset` succeeds locally; migrations apply cleanly to staging |
| **5** | Document Ingestion Engine | R2 storage, PyMuPDF, 8-stage pipeline, `gemini-embedding-002` HNSW | A PDF can be uploaded and fully indexed via pytest API test |
| **6** | AI / LLM Orchestration Engine | Gemma 4 primary, Groq fallback, OpenRouter safety net, tools, SSE streaming | Streamed AI response over a document works via pytest API test |
| **7** | Auth Backend | JWKS, JWT validation, RBAC role guards, per-client API keys | `GET /auth/me` returns correct user on staging; role guards reject wrong roles |
| **8** | Walking Skeleton Web UI | Thin auth + upload + chat — proves all 3 engines together | Student signs up, uploads a doc, gets an AI response — on staging |
| **9** | Design System + App Shell | OKLCH tokens, atomic components, 3 themes, navigation | Core screens navigable with real design |
| **10** | PDF Reader (Web) | 4-layer virtualized reader, highlights, AI sidebar, snip-to-chat | Student opens, reads, highlights, and Snips to Chat |
| **11** | AI Chat Interface (Web) | `assistant-ui`, streaming, `<BranchPicker />`, voice, generative UI skills | Student chats with the AI; branch navigation works |
| **12** | Learn Mode (Web) | Section outline, explanations, check questions, mastery ring | Student studies a section and answers recall checks |
| **13** | Quiz System (Web) | Async ARQ job, 5 formats, timed interface, results, share card | Student generates and completes a quiz |
| **14** | Notes (Web) | Tiptap editor, idb-keyval offline, sync-on-reconnect | Student writes, edits, and syncs a note |
| **15** | Timetable + Dashboard (Web) | Schedule engine, home page, recents carousel, tasks list | Home page shows real timetable and recent activity |
| **16** | Portals | Lecturer submission, admin management, super admin | Lecturer submits → admin approves → document enters ingestion |
| **17** | Settings + Profile + Feedback | Profile, preferences, session management, CSAT, feedback triage | Student updates profile and theme; feedback lands in admin |
| **18** | Credits + Payments | Double-entry credit ledger, Paystack, Flutterwave | Student purchases credits and spends them on AI |
| **19** | Email System | Resend, React Email templates, ARQ worker queue | Welcome email arrives after signup |
| **20** | Mobile (Expo) | Auth, PDF reader, chat, quiz, notes, timetable, widgets | Full student journey works on iOS + Android |
| **21** | Desktop (Electron) | Offline SQLite, PDF cache, background sync, auto-updater | Full offline study session works without internet |
| **22** | PWA + Offline (Web) | `@serwist/next`, caching tiers, IndexedDB outbox | Web app installs and key flows work offline |
| **23** | Public Pages + SEO | Landing, pricing, about, JSON-LD, Open Graph, sitemap | Public pages indexed by Google with correct metadata |
| **24** | Security Hardening | CORS, headers, rate limits, NDPA 2023, dependency scan | Security checklist cleared |
| **25** | Observability + Monitoring | Sentry, PostHog, Better Uptime, structlog, keep-alive | Errors visible, events tracked, uptime alerting live |
| **26** | Performance + Load Testing | Lighthouse, k6, EXPLAIN ANALYZE | p95 API < 500ms; Lighthouse performance > 90 |
| **27** | Pre-Launch Checklist | Full checklist verification | Every item checked |
| **28** | Production Launch 🚀 | DNS live, migrations applied, smoke tested | Real students using the app |
| **29** | Post-Launch Iteration | Feature flags, DORA metrics, incident process | Sustainable delivery culture active |

---

## ⚙️ PHASE 0 — Local Developer Environment

> Goal: every developer can start all services locally from a fresh machine in under 30 minutes.

### 0.1 Workstation Prerequisites
- [ ] **Git** — configured with name, email, SSH key added to GitHub
- [ ] **Node.js** — installed via `nvm`. Version pinned in `.nvmrc` at repo root
- [ ] **pnpm** — installed globally (`npm install -g pnpm`)
- [ ] **Python 3.12** — installed via `pyenv`. Version pinned in `apps/api/.python-version`
- [ ] **uv** — Python package manager: `pip install uv`
- [ ] **Docker Desktop** — required to run local Supabase
- [ ] **Supabase CLI** — installed and authenticated

### 0.2 IDE Setup (VS Code — shared `.vscode/settings.json` committed to repo)
- [ ] `editor.formatOnSave: true`
- [ ] Default formatter: `esbenp.prettier-vscode` (TypeScript), `charliermarsh.ruff` (Python)
- [ ] Extensions every developer installs: ESLint, Prettier, Tailwind CSS IntelliSense, Pylance, Ruff, GitLens, Supabase

### 0.3 Running All Services Locally
- [ ] `supabase start` → local Postgres + Auth + Storage + pgvector + Realtime + Studio on Docker
- [ ] Confirm Studio at `http://localhost:54323`
- [ ] `pnpm install` from monorepo root
- [ ] `uv sync` inside `apps/api/`
- [ ] `pnpm dev --filter=web` → Next.js at `http://localhost:3000`
- [ ] `uvicorn main:app --reload` in `apps/api/` → FastAPI at `http://localhost:8000`
- [ ] `http://localhost:8000/docs` → OpenAPI docs load successfully

### 0.4 Onboarding Documentation (Written Before Any Feature Code)
- [ ] `README.md` — prerequisites, local setup steps, how to run each service, how to run tests, how to apply migrations
- [ ] `CONTRIBUTING.md` — branch naming, commit format, PR process, Definition of Done
- [ ] `docs/dev-playbook.md` — how to write a migration, how to add a shared type, how to add a feature flag, how to debug SSE streaming

---

## 🏗️ PHASE 1 — Monorepo Scaffold + CI Tooling

### 1.1 Repository Setup
- [ ] Create GitHub repository — initialize with `main` as the default branch
- [ ] Enable **branch protection on `main`**:
  - Require PR review before merge
  - Require all CI status checks to pass
  - **No direct pushes — ever. Including from admins.**
- [ ] Add `CODEOWNERS` file

### 1.2 Turborepo Workspace Structure
```
pansgpt/
├── apps/
│   ├── web/        ← Next.js 15, App Router, React 19, TypeScript, Tailwind v4
│   ├── mobile/     ← Expo SDK 52+, React Native New Architecture
│   ├── desktop/    ← Electron 33, offline-first, local SQLite
│   └── api/        ← FastAPI, Python 3.12, Pydantic v2, Uvicorn + Gunicorn, ARQ
├── packages/
│   ├── ui/         ← Shared design system: Radix primitives + OKLCH token definitions
│   ├── types/      ← Shared TypeScript schemas, API DTOs, Supabase DB types
│   └── config/     ← Shared ESLint, tsconfig, Prettier, Tailwind presets
├── supabase/
│   ├── migrations/ ← YYYYMMDDHHMMSS_name.sql (Supabase CLI only — never the Dashboard)
│   └── seed.sql    ← Local dev seed: 2 universities, 5 levels, 10 test users
└── tooling/        ← CI scripts, type codegen, keep-alive pinger
```

- [ ] `pnpm-workspace.yaml` — lists `apps/*` and `packages/*`
- [ ] `turbo.json` — defines `build`, `dev`, `lint`, `typecheck`, `test` pipelines
  - `build` has `dependsOn: ["^build"]` — packages build before apps that consume them
  - Remote caching configured (Vercel Remote Cache, free for open teams)

### 1.3 Shared Package Configs (`packages/config`)
- [ ] `eslint-base` — ESLint config (React, Next.js, import sorting)
- [ ] `typescript-base` — `tsconfig.json` with `"strict": true` — no `any`, no exceptions
- [ ] `prettier-base` — Prettier config (consistent formatting across every developer)
- [ ] `tailwind-base` — Tailwind v4 config consuming `packages/ui` design tokens

### 1.4 Git Hooks (Local Quality Gates)
- [ ] **Husky** — manages git hooks from the repo
- [ ] **lint-staged** — runs checks only on staged files (keeps pre-commit under 5 seconds)
- [ ] **commitlint** — enforces Conventional Commits:
  ```
  feat:     new feature
  fix:      bug fix
  chore:    tooling, deps, config
  docs:     documentation only
  test:     tests only
  refactor: no functional change
  perf:     performance improvement
  ```
- [ ] `.husky/pre-commit` → `lint-staged` (ESLint, Prettier on TS; Ruff on Python staged files)
- [ ] `.husky/commit-msg` → `commitlint` (rejects non-conventional messages)
- [ ] **detect-secrets** hook — scans staged files for secrets before any commit

### 1.5 GitHub Actions — Blocking CI
`.github/workflows/ci.yml` runs on every PR:
- [ ] `lint` — ESLint on all TS workspaces + Ruff on `apps/api/`
- [ ] `typecheck` — `tsc --noEmit` across all TypeScript packages
- [ ] `test-api` — `pytest` unit tests on `apps/api/`
- [ ] `test-web` — `vitest` unit tests on `apps/web/`
- [ ] `build-web` — `next build` smoke check
- [ ] `security-scan` — `pip-audit` (Python deps) + `npm audit` (Node deps)
- [ ] **All jobs must pass for merge** — no exceptions, no bypasses

### 1.6 PR + Issue Templates
- [ ] `.github/PULL_REQUEST_TEMPLATE.md`:
  - What changed and why (link to issue)
  - How to test this
  - Risk / rollback plan
  - Checklist: tests added, migration included, staging verified, Sentry clean
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` — links Sentry event, reproduction steps
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md`

### 1.7 Semantic Versioning
- [ ] Adopt `MAJOR.MINOR.PATCH`
- [ ] `CHANGELOG.md` — start with `## [Unreleased]`
- [ ] Update on every milestone release using Conventional Commit history

---

## 🔐 PHASE 2 — Secrets, Environment Variables + Config

> This is the #1 thing done wrong by early-stage teams. Lock it in now.

### 2.1 Secrets Inventory (Document in `docs/secrets-inventory.md`)
| Secret | Used By |
|---|---|
| `SUPABASE_URL` | All apps |
| `SUPABASE_ANON_KEY` | Web, Mobile, Desktop (client-side auth only) |
| `SUPABASE_SERVICE_ROLE_KEY` | FastAPI only (never exposed to clients) |
| `SUPABASE_JWT_SECRET` | FastAPI JWKS verification |
| `GOOGLE_AI_API_KEY` | FastAPI only (Gemma 4 + `gemini-embedding-002`) |
| `GROQ_API_KEY` | FastAPI only |
| `OPENROUTER_API_KEY` | FastAPI only |
| `CLOUDFLARE_R2_ACCOUNT_ID` | FastAPI only |
| `CLOUDFLARE_R2_ACCESS_KEY` | FastAPI only |
| `CLOUDFLARE_R2_SECRET_KEY` | FastAPI only |
| `CLOUDFLARE_R2_BUCKET_NAME` | FastAPI only |
| `UPSTASH_REDIS_URL` | FastAPI only (ARQ queue) |
| `UPSTASH_REDIS_TOKEN` | FastAPI only |
| `RESEND_API_KEY` | FastAPI ARQ worker only |
| `PAYSTACK_SECRET_KEY` | FastAPI only |
| `PAYSTACK_WEBHOOK_SECRET` | FastAPI only |
| `FLUTTERWAVE_SECRET_KEY` | FastAPI only |
| `FLUTTERWAVE_WEBHOOK_SECRET` | FastAPI only |
| `SENTRY_DSN_WEB` | apps/web |
| `SENTRY_DSN_MOBILE` | apps/mobile |
| `SENTRY_DSN_DESKTOP` | apps/desktop |
| `SENTRY_DSN_API` | apps/api |
| `POSTHOG_API_KEY` | apps/web, apps/mobile |
| `TAVILY_API_KEY` | FastAPI only (web search tool) |
| `X_API_KEY_WEB` | Web client identity header |
| `X_API_KEY_MOBILE` | Mobile client identity header |
| `X_API_KEY_DESKTOP` | Desktop client identity header |

### 2.2 .env Discipline
- [ ] Create `.env.example` in each app (committed — no real values, only `YOUR_VALUE_HERE` placeholders)
- [ ] Add `.env`, `.env.local`, `.env.*.local` to root `.gitignore`
- [ ] Enable **GitHub Secret Scanning** on the repository

### 2.3 Validated Config Loading (Apps Refuse to Start with Missing Vars)
- [ ] **`apps/api`** — Pydantic `BaseSettings` in `core/config.py`:
  - All required env vars declared as fields with types
  - Missing var at startup → `ValidationError` → app exits with a clear error message
- [ ] **`apps/web`** — `@t3-oss/env-nextjs`:
  - Build fails if required env vars missing
  - Runtime validation on startup
- [ ] **`apps/mobile`** — typed `appConfig.ts` with `expo-constants`

### 2.4 Where Secrets Live Per Environment
| Environment | Location |
|---|---|
| Local Dev | `.env.local` on your machine (never committed) |
| Staging Web | Vercel Dashboard → Project → Environment Variables → **Preview** |
| Production Web | Vercel Dashboard → Project → Environment Variables → **Production** |
| Staging API | Render Dashboard → Staging service → Environment group |
| Production API | Render Dashboard → Production service → Environment group |

---

## 🌐 PHASE 3 — Environments Wired (Dev / Staging / Production)

> This phase proves the deployment pipeline works before any product code exists.

### 3.1 Local Dev
- [ ] `supabase start` confirmed working (Docker)
- [ ] `apps/api/.env` + `apps/web/.env.local` populated from `.env.example` with local values
- [ ] `GET /health/ready` returns `{"status": "ok", "db": "ok", "redis": "ok"}`
- [ ] Next.js renders at `localhost:3000` without errors

### 3.2 Staging
- [ ] Create **Supabase Hosted Project #1** (Staging) — note URL and API keys
- [ ] Write `apps/api/Dockerfile` (multi-stage, non-root user, production-ready)
- [ ] Write `render.yaml` — defines:
  - `web` service (FastAPI API) — `pnpm dev` → `gunicorn` in prod
  - `worker` service (ARQ worker) — **NOTE**: at bootstrap both run in same Render service to stay within free hours
- [ ] Connect Render to GitHub — auto-deploys on push to `main`
- [ ] Connect `apps/web` to Vercel — every PR gets an automatic Preview URL
- [ ] Set staging env vars in Vercel (Preview) and Render (staging service)
- [ ] Confirm staging API reachable at its Render URL
- [ ] Confirm Vercel Preview deployment renders the Next.js app

### 3.3 Production
- [ ] Create **Supabase Hosted Project #2** (Production) — completely isolated from staging
- [ ] Set production env vars in Vercel (Production) and Render (production service)
- [ ] Configure custom domain in Vercel and point DNS records
- [ ] Confirm HTTPS active on the custom domain
- [ ] **Production receives no data until Phase 28 (Launch)**
- [ ] Set up cron-job.org to ping `GET /health/ready` every 10 minutes (keeps Render awake)
- [ ] Set up Better Uptime to monitor production API and web URLs

---

## 🗄️ PHASE 4 — Database Foundation

> The schema is the contract all engines are built on. Get it right before building engines.

### 4.1 Migration Governance (Non-Negotiable Rules)
- [ ] Every schema change = `supabase migration new <name>` (auto-generates `YYYYMMDDHHMMSS_<name>.sql`)
- [ ] **Zero manual SQL Editor edits in any environment — ever**
- [ ] RLS enabled on every table in its first migration with `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`
- [ ] Test every migration locally with `supabase db reset` before pushing to staging
- [ ] Migrate staging: `supabase db push`

### 4.2 Required Extensions (First Migration)
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- UUIDv7 generation
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector for 3072-dim embeddings
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- cryptographically secure tokens
```

### 4.3 Custom Enums (Second Migration)
```sql
CREATE TYPE university_level AS ENUM ('100','200','300','400','500','600');
CREATE TYPE user_role AS ENUM ('student','lecturer','university_admin','super_admin');
CREATE TYPE document_status AS ENUM ('pending_review','active','rejected','archived');
CREATE TYPE ai_provider AS ENUM ('google','groq','openrouter');
CREATE TYPE interaction_role AS ENUM ('user','assistant');
CREATE TYPE skill_type AS ENUM ('prompt','python_tool','api_webhook');
CREATE TYPE quiz_job_status AS ENUM ('queued','retrieving','generating','saving','completed','failed','cancelled');
```

### 4.4 Schema Migrations (Supabase CLI — timestamp auto-generated)

Each created with `supabase migration new <name>`. Descriptive names below — actual files will be `YYYYMMDDHHMMSS_<name>.sql`:

| Migration Name | Tables Created |
|---|---|
| `..._extensions_and_enums` | Extensions + all 7 enums |
| `..._universities` | `universities`, `academic_terms` |
| `..._users` | `users` (unified — replaces profiles + user_roles + lecturer_profiles), `invitations` |
| `..._documents` | `documents` (unified library + lecturer submissions), `document_pages`, `document_segments`, `document_elements`, `document_chunks` (vector 3072), `document_sections`, `document_notes`, `document_highlights` |
| `..._study` | `study_progress` |
| `..._learn_mode` | `document_learn_progress`, `document_learn_pending_retests` |
| `..._chat` | `chat_sessions`, `chat_messages` (tree model with `parent_message_id`), `ai_skills`, `ai_telemetry` |
| `..._quiz` | `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_generation_jobs` |
| `..._timetable` | `timetables`, `student_tasks`, `course_knowledge`, `exam_restrictions` |
| `..._notes` | `general_notes` |
| `..._admin` | `system_settings`, `system_settings_history`, `audit_logs` |

> Example real filename: `20260901120000_extensions_and_enums.sql`

### 4.5 Key Design Decisions (from Section 4 of implementation plan)
- **UUIDv7 primary keys** — time-ordered, eliminates B-tree index fragmentation vs random UUIDv4
- **Unified `users` table** — one table replacing `profiles` + `user_roles` + `lecturer_profiles`
- **Unified `documents` table** — admin uploads start as `active`; lecturer submissions start as `pending_review`
- **`document_chunks` uses `vector(3072)`** — matches `gemini-embedding-002` output dimensions
- **HNSW index**: `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)` — no periodic rebuild needed unlike IVFFlat
- **Soft deletes** on `users`, `chat_sessions`, `quizzes`, `general_notes` — `deleted_at timestamptz`
- **30-day purge cron** — `purge_soft_deleted_records()` function runs daily

### 4.6 RLS Policies
- [ ] `users` — user reads/updates own row only
- [ ] `documents` — scoped to `university_id` — student only sees their university's documents
- [ ] `chat_sessions`, `chat_messages` — user sees only their own
- [ ] `quiz_attempts` — user sees only their own
- [ ] `general_notes` — user sees only their own
- [ ] Write pytest security tests proving RLS isolation: Student A cannot read Student B's data

### 4.7 Key DB Functions + Triggers
- [ ] `set_updated_at()` trigger — auto-updates `updated_at` on row mutation (all tables)
- [ ] `match_document_chunks(query_embedding, threshold, count, doc_id)` — HNSW cosine similarity
- [ ] `match_documents_global(query_embedding, threshold, count, doc_ids[])` — multi-doc search
- [ ] `claim_document_ingestion(doc_id, worker_id)` — atomic concurrency lock for ingestion worker
- [ ] `heartbeat_document_ingestion(doc_id, worker_id)` — 30s heartbeat prevents abandoned jobs
- [ ] `purge_soft_deleted_records()` — hard deletes rows past 30-day grace period

### 4.8 Type Generation + Seed
- [ ] `tooling/gen-types.sh` — `supabase gen types typescript > packages/types/src/supabase.ts`
- [ ] `supabase/seed.sql` — 2 Nigerian universities, 3 faculties, 5 levels, 10 test users, sample documents
- [ ] `supabase db reset` confirms migrations + seed apply cleanly

---

## 📄 PHASE 5 — Document Ingestion Engine

> Build the engine. No UI. Verify with pytest. This is PansGPT's core value proposition.

### 5.1 Cloudflare R2 Storage
- [ ] Create R2 bucket: `pansgpt-library-production` (staging: `pansgpt-library-staging`)
- [ ] R2 key structure:
  ```
  universities/{university_id}/courses/{course_code}/original/{doc_id}.pdf
  universities/{university_id}/courses/{course_code}/converted/{doc_id}.pdf
  notes/{university_id}/{user_id}/{note_id}.jpg
  ```
- [ ] Configure CORS on R2 for allowed frontend origins
- [ ] `POST /api/library/upload-url` — validates RBAC (admin only), generates presigned PUT URL (client uploads directly to R2, backend never proxies file bytes)
- [ ] `GET /api/library/{doc_id}/pdf-url` — generates presigned GET URL (15-min TTL) after ownership validation
- [ ] Pytest: confirm presigned URL is generated; confirm unauthenticated request is rejected; confirm student cannot call upload-url

### 5.2 ARQ Background Worker Setup
- [ ] Configure Upstash Redis (free tier: 10,000 commands/day)
- [ ] Create `apps/api/workers/settings.py` with ARQ `WorkerSettings`
- [ ] Define `ingest_document` ARQ job
- [ ] At bootstrap: API and Worker run in same Render service (conserves free hours)
- [ ] When funded: split into two Render services

### 5.3 The 8-Stage Document Processing Pipeline

This is the most important engine in PansGPT. Pharmacy and medical lecture materials are heterogeneous — pages mix native text, scanned images, tables, diagrams, and chemical pathways. This pipeline handles all cases.

```
Stage 1: Upload + R2 immutable storage
       │
Stage 2: Per-page text-layer check (PyMuPDF fitz — $0, deterministic)
       │
       ├── Has text layer → Stage 3a: Native text extraction + scan for embedded images
       └── No text layer  → Stage 3b: Treat whole page as one image
       │
Stage 4: Classify-then-route every image encountered:
       ├── Text image / scan → Stage 5: OCR-first → gemma-4-26b-a4b-it vision verbatim fallback
       ├── Diagram / figure  → Vision description: "[Visual Description: ...]"
       └── Table             → Stage 6: Dual-path table extraction
                                 ├── Native table: PyMuPDF page.find_tables() (exact, $0)
                                 └── Image table:  Vision model structured output
       │
Stage 7: Single AI hierarchy + segmentation pass
       │  - Explicit heading → new segment (title_source = 'explicit')
       │  - Topic shift      → new segment (title_source = 'synthesized')
       │  - Continuation     → append to current segment (title_source = 'inherited')
       │
Stage 8: Semantic chunking + vector embeddings
         - Tables + diagrams: atomic chunks (1 table = 1 chunk, never cut across chunks)
         - Text: segment-bounded recursive splitting (512 tokens, 64-token overlap)
         - gemini-embedding-001 / gemini-embedding-2 (1536 dimensions) → HNSW index
```

**Clinical Safety Rule (Stage 5)**: Drug names, dosages, units, and mechanisms must be recovered **verbatim**. Summarization is strictly forbidden. A dosage table flattened into prose actively causes wrong answers for a pharmacy student.

### 5.4 Ingestion Worker Implementation
- [ ] Concurrency lock: `claim_document_ingestion(doc_id, worker_id)` — atomic worker assignment
- [ ] Heartbeat: every 30 seconds, `heartbeat_document_ingestion(doc_id, worker_id)` — prevents job abandonment
- [ ] Progress telemetry written to `documents.embedding_progress` (0–100%):
  - 0–40%: text layer check, native extraction, OCR/Vision transcription
  - 40–60%: table extraction + classification
  - 60–80%: AI hierarchy pass + segment creation
  - 80–100%: 512-token chunking, `gemini-embedding-001` (1536d) batch embeddings, HNSW insertion
- [ ] Supabase Realtime notifies client of progress changes
- [ ] Retry: failed jobs retry up to 3 times with exponential backoff
- [ ] On all retries exhausted: `embedding_status = 'failed'` → Realtime notifies client

### 5.5 Verification (No UI)
- [ ] Pytest integration: submit a real PDF → confirm `document_chunks` rows with `vector(1536)` exist in DB
- [ ] Pytest: confirm HNSW similarity search (`match_document_chunks`) returns relevant chunks
- [ ] Pytest: confirm concurrent uploads don't deadlock (two workers, two documents)

---

## 🤖 PHASE 6 — AI / LLM Orchestration Engine

> Build the AI brain. No UI. Verify via pytest.

### 6.1 FastAPI Backend Structure (`apps/api/`)
```
apps/api/
├── main.py              ← Entry point only. No business logic.
├── core/
│   ├── config.py        ← Pydantic BaseSettings (all env vars)
│   ├── database.py      ← Async connection pool (psycopg3 + pgvector)
│   ├── dependencies.py  ← Auth, role guards, university scope
│   ├── security.py      ← API key validation, JWT, rate limit helpers
│   └── exceptions.py    ← Custom exception handlers
├── routers/             ← One file per domain (auth, chat, library, quiz, etc.)
├── engines/             ← Core engines (storage, embeddings, chunker, extractor, ingestion, rag)
├── services/            ← Business logic (LLM engine, email, payments, etc.)
├── workers/             ← ARQ background job handlers
├── models/              ← Pydantic request/response models
└── tests/
```

### 6.2 Provider Topology + Failover Chain

| Tier | Provider | Models | Role |
|---|---|---|---|
| **Primary** | Google AI Studio | `gemma-4-31b-it` (deep reasoning), `gemma-4-26b-a4b-it` (fast MoE) | Main chat, vision, OCR |
| **Fast Fallback** | Groq | `openai/gpt-oss-120b`, `qwen/qwen3.6-27b` | On 429/503/timeout from Google |
| **Safety Net** | OpenRouter | `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-super-120b-a12b:free` | When both primary and Groq fail |
| **Voice (STT)** | Groq | `whisper-large-v3-turbo` (primary), `whisper-large-v3` (fallback) | Voice input transcription |
| **Embeddings** | Google AI Studio | `gemini-embedding-001` / `gemini-embedding-2` (1536 dimensions) | All vector embeddings — never falls over to another model |

**Failover trigger**: `HTTP 429 / 503 / timeout > 8s` from current tier → switch to next tier silently.
**No "Fast Mode"** — there is a single unified high-quality reasoning pipeline.
**ZDR**: All upstream requests use Zero Data Retention flags — student data never used for model training.

### 6.3 Core AI Tools (Always Available)
| Tool | Parameters | Purpose |
|---|---|---|
| `rag_search` | `query, doc_id?, course_code?, expand_full_segment?` | Hybrid retrieval: Multi-Query Expansion + Vector (1536d HNSW) + FTS + Trigram with RRF k=60, returns Top-8 |
| `read_document` | `doc_id?, file_url?, format, page_range?` | Reads PDF, DOCX, PPTX, TXT, CSV, MD from R2 |
| `web_search` | `query` | Tavily — verified scientific literature (PubMed, DailyMed, BNF) — feature-flagged via PostHog |
| `vision_analyze` | `image_url, prompt` | Histology slides, chemical structures, graphs — via Gemma 4 vision |

### 6.4 Hybrid Retrieval Engine (RAG)
```
Student query → Acronym normalizer (200+ medical abbreviations expanded)
             → Multi-Query Expansion & HyDE (OpenAI pattern for ambiguous queries)
             → 3 parallel database pools:
               ├── Vector pool: gemini-embedding 1536d → HNSW cosine → Top 30
               ├── FTS pool: websearch_to_tsquery (English) → Top 30
               └── Trigram pool: word_similarity (pg_trgm) → Top 30
             → Reciprocal Rank Fusion (k=60): RRF(d) = Σ 1/(60 + rank_m(d))
             → Candidate Re-ranking & False-Positive Elimination (Top 5-8)
             → Sibling expansion: ± 1 chunk by default; full segment on follow-up
             → Verbatim citation mapping to exact PDF page numbers and text coordinates
```

**Absence policy**: When no relevant match found — AI does **not** hallucinate. It invokes `web_search` and explicitly notes the topic is not in the university slides.

### 6.5 Dynamic AI Skills (`ai_skills` table — database-driven)
| Skill | Output | Purpose |
|---|---|---|
| `create_doc` | `.docx` | Formatted Word docs for assignments + lab reports |
| `create_md` | `.md` | Structured Markdown study notes with KaTeX |
| `create_pdf` | `.pdf` | Printable revision sheets + cheat sheets |
| `create_pptx` | `.pptx` | Presentation decks for seminars |
| `plot_graph` | Interactive chart | Pharmacokinetic curves, dose-response charts |
| `generate_flashcards` | Flashcard deck | Spaced-repetition question/answer pairs |
| `generate_mnemonics` | Mnemonic card | Drug classes, microbiology, anatomy |

### 6.6 SSE Streaming Protocol
- [ ] `Content-Type: text/event-stream` via FastAPI `StreamingResponse`
- [ ] Event types: `init`, `thinking_chunk`, `text_chunk`, `tool_start`, `tool_end`, `artifact_ready`, `error`, `done`
- [ ] SSE heartbeat: `: keep-alive\n\n` every 15 seconds (prevents Vercel/Render proxy timeout)
- [ ] Abort support: client disconnect → FastAPI detects disconnected client and stops LLM stream
- [ ] Post-LLM policy guard: checks generated stream for system prompt leakage

### 6.7 Multi-Turn Agentic Tool Loop (Max 5 Turns)
```
Incoming request → Pre-LLM injection guard → Credit balance check → Load conversation history
→ Intent + complexity classifier
    ├── Simple/conversational → Direct stream (fast path, zero tool latency)
    └── Complex/tool required → Multi-turn loop (max 5 iterations):
           Model generates tool call → Execute with RLS scoping
           → Emit SSE tool_start/tool_end → Append result to context → Loop
→ Post-LLM leak guard → SSE stream to client
→ Fire-and-forget: credit deduction + title generation + ai_telemetry logging
```

### 6.8 Verification (No UI)
- [ ] Pytest: `POST /api/chat/sessions/{id}/messages` → confirm streamed token response
- [ ] Pytest: RAG tool returns chunks from correct university only (cross-university isolation)
- [ ] Pytest: Policy guard rejects a known prompt injection payload
- [ ] Pytest: Failover — mock Google AI returning 429 → confirm Groq is used

---

## 🔑 PHASE 7 — Auth Backend

### 7.1 JWT + JWKS Verification (FastAPI)
- [ ] On startup: fetch Supabase JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- [ ] Cache signing keys in memory (`PyJWKClient`, `cache_keys=True`)
- [ ] Per-request (hot path, no network call):
  1. Extract Bearer token from Authorization header
  2. Decode JWT header to get `kid`
  3. Look up signing key from in-memory cache by `kid`
  4. Verify RS256 signature + expiry
  5. Extract `sub` (user_id) and email from claims
  6. Lookup role in DB (cached in Redis for 5 minutes)
  7. Attach `UserContext(id, email, role, university_id, client_type)` to request state
  8. On key miss → re-fetch JWKS (handles Supabase key rotation)

### 7.2 Role Guards
- [ ] `require_student` — 403 if not student
- [ ] `require_lecturer` — 403 if not lecturer
- [ ] `require_university_admin` — 403 if not admin; also scopes to `university_id`
- [ ] `require_super_admin` — 403 if not super_admin; cross-institution access
- [ ] **Students have zero upload capability** — admin RBAC enforced at dependency level before any DB query

### 7.3 Per-Client API Keys (`x-api-key` header)
- [ ] Separate keys for `web`, `mobile`, `desktop` clients (stored as env vars on the API server)
- [ ] Middleware accepts either JWT (user sessions) OR `x-api-key` (client identification)
- [ ] API key stored as `SHA-256(key)` — plaintext never persisted in DB

### 7.4 Auth Per Platform
| Concern | Web | Mobile | Desktop |
|---|---|---|---|
| SDK | `@supabase/supabase-js` | `@supabase/supabase-js` | `@supabase/supabase-js` |
| Token storage | In-memory + HttpOnly cookie (SSR) | `expo-secure-store` | Electron `safeStorage` (OS keychain) |
| OAuth | Browser redirect | `expo-auth-session` deep link | Opens system browser |
| Offline auth | N/A | Cached JWT valid up to 1hr expiry | Cached JWT valid up to 1hr expiry |

### 7.5 Verification
- [ ] `GET /api/auth/me` returns correct user profile on staging
- [ ] `GET /api/auth/me` with no token → `401`
- [ ] `POST /api/library/upload-url` with student token → `403`
- [ ] `GET /api/admin/users` with student token → `403`
- [ ] Pytest covers all role guard combinations

---

## 🦴 PHASE 8 — Walking Skeleton Web UI

> All three engines are now built and verified via API tests. Build the thinnest possible UI that exercises the full stack end-to-end on staging.

**This slice**: Sign up → verify email → log in → upload a document → open a chat → get a streamed AI response

- [ ] Auth screens: Login, Signup (email/password), Password Reset — React Hook Form + Zod validation
- [ ] Supabase onboarding: email confirmation → name entry → university selection → level selection → terms acceptance
- [ ] **First-Chat Disclaimer & Academic Agreement Modal**: Mandatory clinical & academic disclaimer modal presented immediately after onboarding completion, right before the user enters chat for the first time
- [ ] Middleware protecting all `/app/**` routes — unauthenticated → redirect to `/login`
- [ ] `<UserInitialsAvatar />` — deterministic initial + color hash from user's first name (no image upload)
- [ ] Bare home page skeleton (no real design — just structure)
- [ ] Document upload modal (functional, no polish)
- [ ] Bare chat interface: text input + streamed response rendered in a `<pre>` tag — proves SSE works
- [ ] **Sentry wired in**: `@sentry/nextjs` on `apps/web`, `sentry_sdk` on `apps/api`
- [ ] **Deploy to staging and verify the full slice works on a real URL**

> [!IMPORTANT]
> **This is the gate.** Document ingestion, AI streaming, and auth must all work end-to-end on staging before proceeding to Phase 9. If it doesn't work here with a bare UI, it will not work in production with a polished one.

---

## 🎨 PHASE 9 — Design System + App Shell

> Now apply real design on top of a proven working system. Design tokens are established **before** scaffolding any feature screens.

### 9.1 Design Token Freeze (`packages/ui`)
- [ ] **3-theme OKLCH color system**:
  - Light — default academic clean
  - OLED Dark — true black (AMOLED-safe, no dark grey compromise)
  - Sepia Warm — low-fatigue long reading sessions
- [ ] Typography scale (font sizes, line heights, weights) as CSS custom properties
- [ ] Spacing scale (4px base unit)
- [ ] All tokens consumed by Tailwind v4 via CSS variables

### 9.2 Atomic Component Library (Web — `packages/ui`)
- [ ] `Button` — variants: primary, secondary, ghost, destructive; sizes: sm, md, lg
- [ ] `Input`, `Textarea`, `Select` — with label, error state, helper text
- [ ] `Modal` / `Dialog` — Radix Dialog, accessible, focus-trapped
- [ ] `Card`, `Badge`, `<UserInitialsAvatar />`
- [ ] `Toast` — Sonner wrapper
- [ ] `Spinner` / `Skeleton` — loading states
- [ ] `ErrorBoundary` — catches React render errors, shows friendly fallback, reports to Sentry

### 9.3 Web App Shell
- [ ] **Top segmented navigation**: `[Avatar] | [🏠 Home] | [📄 Documents] | [💬 Chat] | [🧠 Quiz] | [📝 Notes]`
- [ ] Avatar → profile drawer (student name, university, level, credits)
- [ ] Authenticated layout (`app/(app)/layout.tsx`)
- [ ] Theme switcher: Light / Dark / Sepia — persisted to `localStorage` + Supabase profile `preferences` column
- [ ] **Route loading states** — skeleton screens (no blank flash on navigation)
- [ ] **Error pages** — friendly 404 + 500 with navigation back to safety
- [ ] **Bottom Floating Action Bar**: `[🔍 Quick Search] | [✨ Ask AI] | [📝 New Note/Task]`
- [ ] Framer Motion page transitions

---

## 📖 PHASE 10 — PDF Reader (Web)

### 10.1 4-Layer Virtualized Page Stack
```
Layer 4: Floating interaction popover (Explain / Define / Example / Snip to Chat / Highlight)
Layer 3: Annotation + highlight SVG overlay (yellow / green / blue / pink)
Layer 2: Selectable HTML textLayer (<span> bounding boxes)
Layer 1: High-DPI canvas (pdfjs-dist @ devicePixelRatio × 1.5)
```

- [ ] **Viewport virtualization** (TanStack Virtual + pdfjs-dist): only renders ±1 page of viewport — stays under 100MB RAM on 1,000-page textbooks
- [ ] Page navigation, continuous scroll, zoom with percentage indicator
- [ ] Render scale formula: `zoom × min(2.0, devicePixelRatio)` for sharp footnotes at high zoom
- [ ] Eye-care filters (sepia, warm, night mode via CSS filter)

### 10.2 Text Interaction + Highlights (Full 10-Action Context Menu)
- [ ] Text selection floating action popover + **Right-Click context menu** supporting all 10 actions:
  1. **Explain** (Socratic concept breakdown)
  2. **Define** (Concise medical/pharmacological definition)
  3. **Example** (Clinical scenario or application)
  4. **Summarize** (Bullet-point synopsis)
  5. **Answer** (Direct solution to selected problem)
  6. **Memory Aid** (High-yield mnemonic)
  7. **Ask AI (Snip Explain)** (Sends selection directly into chat input with page context)
  8. **Copy** (Copies clean text to clipboard)
  9. **Add to Input** (Appends text to active chat input)
  10. **Add to Notes** (Saves directly to general notes)
- [ ] Persistent highlights saved to `document_highlights` (per-user, per-page, with bounding box coordinates as percentages so they scale correctly across zoom levels)
- [ ] Highlight colors: yellow, green, blue, pink

### 10.3 In-Reader AI Sidebar (Resizable Draggable Divider)
- [ ] **Resizable sidebar**: Replace fixed-width (`w-96`) panel with dynamic `sidebarWidth` state and a vertical draggable split-pane divider handle between the PDF canvas and AI panel
- [ ] **Chat tab** — full AI chat scoped strictly to this document (uses `rag_search` with `doc_id`, injecting document metadata title/author/course)
- [ ] **Learn Mode tab** — document section outline + recall checks (Phase 12)

### 10.4 Reading Progress + Snip-to-Chat
- [ ] Progress saved every 30s: `PATCH /api/library/{doc_id}/progress {page, offset}`
- [ ] Opens PDF at last-read page on return
- [ ] Snip: selected text pre-filled into chat input with document context attached

---

## 💬 PHASE 11 — AI Chat Interface (Web)

### 11.1 `@assistant-ui/react` Components
- [ ] `<Thread />` — full conversation container with auto-scroll + virtualization
- [ ] `<Message />` — markdown + LaTeX rendering, thinking blocks, tool call indicators
- [ ] `<Composer />` — multi-line input, auto-resize, file/image attachment, voice input hook
- [ ] `<BranchPicker />` — `← 1/2 →` branch navigation for regenerations + edits
- [ ] `<ActionBar />` — copy, thumbs up/down, regenerate, edit

### 11.2 Generative UI for Skills & Pharmacy Drawers
```tsx
export const CreatePptxToolUI = makeAssistantToolUI({
  toolName: "create_pptx",
  render: ({ args, result, status }) => {
    if (status === "running") return <SkillProgressCard title="Generating deck..." />;
    return <ArtifactDownloadCard type="pptx" downloadUrl={result.download_url} />;
  },
});
```
- [ ] Build `makeAssistantToolUI` wrappers for all 7 workspace skills
- [ ] **Chemical Structure Mechanism Drawer (PubChem SMILES)**: Interactive 2D/3D chemical structure drawing canvas and SMILES viewer enabling AI-generated reaction mechanism breakdowns for Pharmacy students

### 11.3 Voice Input, Sharing & Session Management
- [ ] Voice input: Web Speech API → text fills Composer input (graceful degradation on unsupported browsers)
- [ ] **AI Response Style & Tone Selector**: Header/composer dropdown enabling students to toggle AI pedagogical tone (*Concise*, *Exam-focused*, *Explain Like I'm 5*, *In-depth Academic*) which injects corresponding system modifiers
- [ ] **Chat Session Sharing (`/share/[sessionId]`)**: Generate read-only public links allowing students to share AI study chats and clinical explanations with classmates
- [ ] Session management: create, rename (AI auto-suggests 3–5 word title after first response), search, soft-delete
- [ ] Full-text search across chat history (PostgreSQL `tsvector`)
- [ ] Credit deduction hook: `deduct_user_credits` stored procedure called after `event: done`

---

## 🧠 PHASE 12 — Learn Mode

*(Engine already built in Phase 6. This phase wires the UI to it.)*

- [ ] Section outline displayed in PDF reader Learn Mode tab
- [ ] Each section: title + page range + mastery ring (% from `document_learn_progress`)
- [ ] Expand section → explanation loads (from `document_sections.explanation` if cached; triggers ARQ job if not)
- [ ] Recall check questions displayed (from `document_sections.check_questions` JSONB)
- [ ] Student answers → graded with correct/incorrect feedback + explanation
- [ ] `document_learn_progress` updated: `not_started` → `in_progress` → `needs_review` → `mastered`
- [ ] Wrong answers queued in `document_learn_pending_retests` (spaced repetition retest queue)
- [ ] Retest queue surfaces weak sections at the start of next study session

---

## ❓ PHASE 13 — Quiz System

*(Engine already built in Phase 6. This phase wires the UI to it.)*

- [ ] Quiz builder modal: select topics, difficulty, count, time limit, question formats
- [ ] Enqueue `generate_quiz` ARQ job → return `quiz_generation_job_id`
- [ ] Client polls `GET /api/quiz/jobs/{id}` or subscribes to Supabase Realtime for progress
- [ ] Questions parsed from tagged XML blocks: `<question>QUESTION: ... TYPE: ... A: ... ANSWER: ... EXPLANATION: ...</question>` — deterministic regex parse, no JSON fragility
- [ ] Validated with Pydantic `QuizQuestionModel`
- [ ] Question formats: MCQ, True/False, Multi-Select, Fill-in-blank, Negative marking
- [ ] Timed interface: countdown timer, question navigator, flag-for-review
- [ ] Auto-submit on timer expiry
- [ ] Results: score, per-question breakdown, explanations for wrong answers
- [ ] Quiz history + attempt tracking in `quiz_attempts`
- [ ] Shareable result card via `@vercel/og`

---

## 📝 PHASE 14 — Notes System

- [ ] **Tiptap** editor (web + desktop) — extensions: headings, bold/italic, bullet list, task list, code block, KaTeX math, image embed
- [ ] **Offline-first**: every keystroke saves to IndexedDB (`idb-keyval`) — data persists without network
- [ ] Sync-on-reconnect: `online` event → push local changes to Supabase (`general_notes`)
- [ ] Conflict resolution: last-write-wins on `updated_at`
- [ ] Note organization: title, optional document link
- [ ] Full-text search via Postgres `tsvector` on `general_notes.content`
- [ ] Soft delete (`deleted_at`) — restored within 30 days; purge cron clears after
- [ ] Export: copy as Markdown, download `.md` file

---

## 🗓️ PHASE 15 — Timetable + Student Dashboard

### 15.1 Timetable (`timetables` table)
- [ ] Timetable stored by `university_id`, `level`, `day`, `time_slot`, `course_code`, `venue`
- [ ] Admin UI to manage timetable per university
- [ ] Student weekly timetable grid view (`/timetable`)
- [ ] "Today's Classes" summary widget on Home
- [ ] Upcoming class/exam context injected into AI system prompt (via `get_timetable` tool)
- [ ] `exam_restrictions` — time-locked windows that disable AI assistance during exams

### 15.2 Student Dashboard (Home Page)
- [ ] **Single aggregator endpoint**: `GET /api/home/dashboard` returns student info + recents + tasks in one call (< 150ms)
- [ ] **Omni-recent carousel** (polymorphic): Document (last read page) | Note | AI Chat | Quiz — horizontal scroll
- [ ] **Unified tasks list**: timetable events + custom `student_tasks` + urgency badges (Today 🔴 / Tomorrow 🟠 / Upcoming ⚪)
- [ ] Task checkbox → optimistic UI update → `PATCH /api/tasks/{id}/toggle`
- [ ] Floating action bar: Quick Search | Ask AI | New Note/Task

---

## 🏫 PHASE 16 — Portals + Governance

### 16.1 Lecturer Portal
- [ ] Lecturer invite flow: admin generates multi-use invite link → Resend email → lecturer sets password → profile created
- [ ] Material submission: select course + level + semester → upload file → submit for review (`document_status = 'pending_review'`)
- [ ] Submission status tracker: `draft → pending_review → approved / rejected`
- [ ] On approval by admin → auto-enqueue `ingest_document` ARQ job → document enters Phase 5 pipeline

### 16.2 University Admin Portal
- [ ] User management: search, invite, suspend, delete students and lecturers
- [ ] Exam restriction management: create time-locked AI disable windows per course/level
- [ ] Timetable management: CRUD on `timetables`
- [ ] Academic context management: `course_knowledge`, `academic_terms`
- [ ] AI usage analytics from `ai_telemetry` (per-university)
- [ ] `system_settings` changes with `system_settings_history` audit trail
- [ ] Immutable `audit_logs` for all admin actions

### 16.3 Super Admin Portal
- [ ] Cross-university user management
- [ ] University lifecycle: `active | suspended` on `universities.status`
- [ ] Global `ai_telemetry` cost + token dashboard

---

## ⚙️ PHASE 17 — Settings + Profile + Feedback

### 17.1 Settings + Profile
- [ ] Profile editor: first_name, last_name, current_level, university_id
- [ ] `<UserInitialsAvatar />` — first initial from `first_name`, deterministic color
- [ ] AI response style preference: `concise | balanced | detailed` → stored in user preferences
- [ ] Theme selector: Light / OLED Dark / Sepia Warm
- [ ] Active session list + individual session revocation
- [ ] Password change (via Supabase `updateUser`)
- [ ] Account deletion: 30-day soft delete → GDPR purge cron

### 17.2 Feedback + Support
- [ ] In-app bug report with auto-attached device diagnostics + Sentry event ID
- [ ] CSAT rating prompt after quiz completion + learn mode section mastery
- [ ] Admin feedback triage dashboard (view, tag, resolve reports)

---

## 💳 PHASE 18 — Credits + Payments

*(Full architecture documented in `credits_pricing_architecture.md` — pricing packages pending co-founder alignment)*

- [ ] **Double-entry credit ledger**: `user_credits` (fast balance) + `credit_ledger` (immutable transaction log)
- [ ] Atomic balance deduction: `deduct_user_credits(user_id, amount, reason)` stored procedure — uses `SELECT FOR UPDATE` to prevent race conditions
- [ ] Insufficient credits → `402 Payment Required` before opening SSE stream
- [ ] **Paystack**: checkout session + webhook listener with idempotency key
- [ ] **Flutterwave**: checkout session + webhook listener with idempotency key
- [ ] Credit balance display in header + settings
- [ ] Purchase history in settings
- [ ] Receipt email via Resend (ARQ worker) on successful purchase
- [ ] Dynamic pricing per action via `credit_pricing` table (not hardcoded)

---

## 📧 PHASE 19 — Email System

- [ ] Configure **Resend** (replaces Zoho SMTP entirely)
- [ ] Verify domain: DKIM, SPF, DMARC DNS records
- [ ] React Email templates:
  1. Welcome email (post-signup)
  2. Email verification
  3. Password reset
  4. Credit purchase receipt
  5. Lecturer invite
  6. University admin announcement (bulk)
  7. Re-engagement (inactive for 14 days)
- [ ] **All emails sent via ARQ worker** — API never blocks on email send
- [ ] RFC 8058 one-click unsubscribe header on all marketing emails
- [ ] Test every template on Gmail, Outlook, Apple Mail, and mobile before deploying

---

## 📱 PHASE 20 — Mobile App (Expo)

### Build Order Within Mobile
1. Auth + Walking Skeleton → 2. PDF Reader → 3. AI Chat → 4. Quiz → 5. Notes → 6. Timetable + Dashboard → 7. Portals

### 20.1 Mobile Walking Skeleton
- [ ] Initialize Expo SDK 52+ in `apps/mobile/`, configure Expo Router v4 (file-based, same mental model as Next.js)
- [ ] NativeWind v4 — Tailwind CSS utility classes in React Native (same class names as web where possible)
- [ ] Supabase auth: `expo-secure-store` for JWT persistence
- [ ] Biometric auth: `expo-local-authentication` (FaceID / TouchID)
- [ ] `@sentry/react-native` wired in from day 1
- [ ] Confirm auth works on iOS Simulator and Android Emulator

### 20.2 Mobile PDF Reader
- [ ] `react-native-pdf` (Apple PDFKit on iOS, Android PdfRenderer / PdfiumAndroid — hardware-accelerated)
- [ ] 120Hz ProMotion scrolling, pinch-to-zoom, Apple Pencil support
- [ ] Text selection menu → in-reader AI bottom sheet

### 20.3 Mobile Chat + Notes
- [ ] `@assistant-ui/react-native` — same thread state model as web
- [ ] Voice input via `expo-av`
- [ ] Push notifications for async AI task completion (FCM + APNs via Expo Notifications)
- [ ] `@10play/tentap-editor` (React Native Tiptap bridge — same JSON schema as web Tiptap)
  - [ ] **Early prototype validation required** — keyboard accessory performance + custom node rendering must be confirmed before full integration
- [ ] **MMKV** for offline storage (10x faster than AsyncStorage)

### 20.4 Mobile Extras & Onboarding
- [ ] **Mobile Discoverability & Onboarding App Tour**: Guided interactive walkthrough for first-time mobile students highlighting the 5-tab bottom dock, reader gesture controls, and floating Ask AI button
- [ ] iOS home screen widget + lock screen widget: today's classes (WidgetKit)
- [ ] Android home screen widget: today's classes (Glance)
- [ ] ML Kit camera scanner: physical lecture handout → photo → ingest as document

### 20.5 EAS Build Pipeline
- [ ] `eas.json` — `development`, `preview`, `production` build profiles
- [ ] GitHub Actions: trigger EAS build on merge to `main`
- [ ] OTA updates for JS-only changes (no app store review wait)
- [ ] TestFlight (iOS) + Google Play Internal Track (Android) pre-release distribution

---

## 🖥️ PHASE 21 — Desktop App (Electron)

- [ ] Initialize Electron 33 in `apps/desktop/`
- [ ] Load `apps/web` Next.js build as the renderer (90% code share)
- [ ] **Local SQLite** (`better-sqlite3`): notes, chat history, quiz results, reading progress — all readable offline
- [ ] `safeStorage` — OS keychain encryption for local DB key at rest + JWT storage
- [ ] Local PDF file cache: download once → serve from disk on subsequent opens (no R2 request)
- [ ] Background sync: online detection → push local SQLite mutations to Supabase
- [ ] System tray: today's class schedule, quick Ask AI shortcut
- [ ] Native window controls (macOS traffic lights, Windows title bar)
- [ ] Auto-updater via `electron-updater` + GitHub Releases

**90% offline means:**
- Notes, reading, quiz review, library browsing, chat history → all work offline
- AI calls, DB sync, auth refresh → require internet

---

## 📲 PHASE 22 — PWA + Offline (Web)

- [ ] Install and configure `@serwist/next` (successor to `@ducanh2912/next-pwa` — supports Next.js App Router + Workbox v7)
- [ ] Service worker caching strategy:
  - `NetworkFirst` — all API calls (`/api/*`) — never serve stale API data
  - `CacheFirst` — static assets (JS, CSS, fonts, icons)
  - `CacheFirst` — Cloudflare R2 PDFs (cached after first load)
  - `StaleWhileRevalidate` — fonts + icon sprites
- [ ] **User Message Offline Queueing & Re-Sync (IndexedDB Outbox)**: Queue outgoing chat prompts locally when offline (`idb-keyval`); auto-send and stream completions upon network reconnection
- [ ] IndexedDB offline outbox: queue failed mutations (note saves, task toggles) when offline → auto-flush on reconnect
- [ ] Offline fallback page (shown when navigation fails while offline)
- [ ] PWA install prompt banner (shown after 3 visits)
- [ ] `manifest.json`: name, icons (all required sizes), `display: standalone`, theme colors
- [ ] Web Push API registration for push notifications
- [ ] Test: disable network in DevTools → confirm notes save, pending chat messages queue, and sync on reconnect

**Web never supports full offline** (AI calls require internet). PWA offline covers: reading cached PDFs, notes drafts, task list.

---

## 🌐 PHASE 23 — Public Pages + SEO

- [ ] Landing page: hero, features, social proof, CTA
- [ ] Pricing page: credit packages, plan comparison (updated once Section 5 is finalized)
- [ ] About, University Partnerships pages
- [ ] Blog / Changelog (MDX-powered)
- [ ] Legal: Privacy Policy, Terms of Service
- [ ] Download page: PWA install, Electron download, iOS App Store, Google Play
- [ ] Next.js 15 Metadata API: `title`, `description`, `canonical`, `robots` on every public page
- [ ] Dynamic Open Graph images via `@vercel/og` for blog posts + quiz share cards
- [ ] JSON-LD structured data: `SoftwareApplication`, `EducationalOrganization`, `Article`
- [ ] Auto-generated `sitemap.ts` (all public pages + blog posts)
- [ ] `robots.ts`: disallow `/app/**`, allow all public pages
- [ ] Target Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

---

## 🔒 PHASE 24 — Security Hardening

### 24.1 API Security
- [ ] CORS: whitelist only production + staging frontend domains — no `*`
- [ ] HTTPS enforced; HSTS: `max-age=31536000; includeSubDomains`
- [ ] Next.js security headers (`next.config.ts`):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`
- [ ] `rehype-sanitize` on all user-generated Markdown rendered in UI
- [ ] Rate limits per route (SlowAPI):
  - `POST /api/chat/sessions/{id}/messages` — 30 req/min per user
  - `POST /api/quiz/generate` — 10 req/min per user
  - `POST /api/auth/login` — 5 req/min per IP

### 24.2 Data + Compliance
- [ ] **NDPA 2023** (Nigeria Data Protection Act) compliance review completed
- [ ] **GDPR** data minimization: only collect fields actively used
- [ ] DSAR flow: student can request full data export
- [ ] Account deletion: `purge_soft_deleted_records()` cron clears all PII within 30 days
- [ ] **ZDR verification**: confirm no user PII appears in LLM API call logs
- [ ] Clinical disclaimer injected on all medical/pharmacology responses: *"Educational Study Aid: Always verify with official departmental guidelines."*

### 24.3 Secrets + Dependencies
- [ ] API keys stored as `SHA-256(key)` — plaintext never persisted
- [ ] GitHub Dependabot enabled for vulnerability PRs
- [ ] `pip-audit` + `npm audit` run in every CI pipeline run
- [ ] Critical CVEs reviewed and merged within 7 days

---

## 📊 PHASE 25 — Observability + Monitoring

### 25.1 Error Tracking — Sentry (All 4 Apps)
- [ ] `SENTRY_DSN_WEB`, `SENTRY_DSN_MOBILE`, `SENTRY_DSN_DESKTOP`, `SENTRY_DSN_API` — all separate projects
- [ ] Performance monitoring: trace API request → route handler → DB query
- [ ] Release tracking: every deploy tagged with git commit SHA
- [ ] Source maps uploaded in CI (real TS file/line numbers in stack traces)
- [ ] Alert: error rate > 5% or spike of new issues → Slack + email

### 25.2 Product Analytics — PostHog (Web + Mobile)
Core events tracked (behaviour only — never PII):
- `document_uploaded`, `document_opened`, `document_ingested`
- `chat_message_sent`, `chat_skill_used`, `voice_input_used`
- `quiz_generated`, `quiz_completed`, `quiz_score`
- `learn_mode_started`, `section_mastered`, `retest_triggered`
- `note_created`, `note_synced_offline`
- `credit_purchased`, `credit_deducted`
- Session replay on web (input fields anonymized)
- Feature flag evaluation events tracked

### 25.3 Uptime
- [ ] Better Uptime pings `GET /health/ready` every 60 seconds
- [ ] Alert: downtime > 2 minutes → SMS + email
- [ ] `/health/ready` deep probe validates: DB connection, Redis, R2

### 25.4 Structured Logging (`apps/api`)
- [ ] `structlog` — JSON log lines with: `timestamp`, `level`, `service`, `request_id`, `route`, `user_id`, `university_id`
- [ ] `X-Request-ID` header on every API response (for tracing across Sentry + logs)
- [ ] AI cost tracking per `ai_telemetry` row: `model`, `provider`, `prompt_tokens`, `completion_tokens`, `latency_ms`

---

## ⚡ PHASE 26 — Performance + Load Testing

### 26.1 Web Performance
- [ ] Lighthouse audit all public pages: Performance > 90, Accessibility > 95
- [ ] `@next/bundle-analyzer` — identify + eliminate large unused packages
- [ ] All images: `next/image` with WebP format
- [ ] All fonts: `next/font` with `display: swap`

### 26.2 API Load Testing (k6)
- [ ] Load test: `POST /api/chat/sessions/{id}/messages` — 100 concurrent users, SSE streaming
- [ ] Load test: `POST /api/quiz/generate` — job enqueue throughput
- [ ] Load test: `GET /api/home/dashboard` — aggregator query under real data volume
- [ ] Target: **p95 API latency < 500ms at 100 concurrent users**

### 26.3 Database Query Performance
- [ ] `EXPLAIN ANALYZE` on all queries at production-like volume
- [ ] HNSW vector search benchmarked: target < 100ms at 100,000 vectors
- [ ] Missing indexes identified during analysis and added

---

## ✅ PHASE 27 — Pre-Launch Checklist

Every item must be confirmed before DNS points to production:

**Secrets + Config**
- [ ] All production env vars set in Vercel (Production environment only)
- [ ] All production env vars set in Render (Production service only)
- [ ] Production Supabase URL/keys are different from staging
- [ ] Production Sentry DSN is different from staging
- [ ] Production Paystack/Flutterwave keys are **live mode** (not test mode)
- [ ] Secret scan confirms no secrets in any git commit

**Database**
- [ ] All migrations applied to production: `supabase db push --linked` (production project)
- [ ] RLS isolation test passed on production DB (Student A cannot read Student B's data)
- [ ] `purge_soft_deleted_records()` cron verified active

**Infrastructure**
- [ ] Render production: `/health/ready` returns 200
- [ ] Render production: minimum 1 instance (no cold starts for first users)
- [ ] cron-job.org keep-alive active for production API
- [ ] Vercel: custom domain with HTTPS active
- [ ] R2: production bucket isolated from staging bucket

**Monitoring**
- [ ] Sentry: production project receiving data, zero open critical errors
- [ ] PostHog: production project receiving events
- [ ] Better Uptime: production URL monitored

**Legal + Email**
- [ ] Privacy Policy + Terms of Service published and linked from app
- [ ] Resend domain: DKIM, SPF, DMARC all verified
- [ ] All 7 email templates tested on Gmail, Outlook, and mobile

---

## 🚀 PHASE 28 — Production Launch

- [ ] Apply all migrations to production: `supabase db push --linked`
- [ ] Deploy `apps/api` to Render Production (confirm health check passes)
- [ ] Deploy `apps/web` to Vercel Production
- [ ] DNS cutover: point custom domain to Vercel
- [ ] **Smoke test full student journey on production URL**:
  - Sign up → receive welcome email → verify email → log in → upload document → ingestion completes → open PDF → chat → get AI response → generate quiz → complete quiz → create note
- [ ] Monitor Sentry: zero unresolved errors 30 minutes post-launch
- [ ] Confirm PostHog receiving real events
- [ ] Announce to pilot university cohort

---

## 🔄 PHASE 29 — Post-Launch Iteration

### Feature Rollout Process (All New Features)
1. Ship behind a **PostHog feature flag** — disabled by default
2. Enable for internal team (dogfood for 1 week)
3. Enable for 5% of users (canary release)
4. Monitor Sentry error rate + PostHog funnel for 48 hours
5. Roll out to 100% if metrics clean
6. Remove the feature flag from code within 2 weeks — no flag debt

### Ongoing Engineering Culture
- [ ] Weekly sprint planning using PostHog data + user feedback + Sentry issue count
- [ ] Every GitHub bug issue links to its Sentry event
- [ ] Post-incident retrospective for every outage > 30 minutes
- [ ] Track **DORA Metrics** monthly:
  - **Deployment Frequency** — target: multiple times/week
  - **Lead Time for Changes** — time from first commit to production
  - **Change Failure Rate** — % of deploys causing incidents
  - **MTTR** — mean time to recovery from incident
- [ ] Quarterly: dependency upgrade sprint, secret rotation, RLS policy review, security audit
- [ ] **"You build it, you watch it"**: whoever ships a feature owns its Sentry alerts post-deploy

---

## 📐 Technology Reference

All decisions locked in `implementation_plan.md` Section 1:

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web Framework | Next.js 15, App Router, React 19, TypeScript strict |
| Web Styling | Tailwind CSS v4, OKLCH tokens, Framer Motion |
| Web PDF | `pdfjs-dist` + TanStack Virtual |
| Web Chat UI | `@assistant-ui/react` |
| Web Notes | Tiptap |
| Web PWA | `@serwist/next` |
| Web Forms | React Hook Form + Zod |
| Web State | Zustand (global) + TanStack Query (server) |
| Web Components | Radix UI |
| Mobile Framework | Expo SDK 52+, React Native New Architecture |
| Mobile Navigation | Expo Router v4 |
| Mobile Styling | NativeWind v4 |
| Mobile Chat UI | `@assistant-ui/react-native` |
| Mobile Notes | `@10play/tentap-editor` |
| Mobile PDF | `react-native-pdf` (PDFKit / PdfRenderer) |
| Mobile Offline | MMKV |
| Mobile Build | EAS (Expo Application Services) |
| Desktop | Electron 33, offline-first, local SQLite (`better-sqlite3`) |
| Backend | FastAPI, Python 3.12, Pydantic v2, Uvicorn + Gunicorn |
| Task Queue | ARQ + Upstash Redis |
| PDF Extraction | PyMuPDF |
| Primary LLM | `gemma-4-31b-it` + `gemma-4-26b-a4b-it` via Google AI Studio |
| Fast Fallback LLM | `openai/gpt-oss-120b`, `qwen/qwen3.6-27b` via Groq |
| Safety Net LLM | NVIDIA Nemotron models via OpenRouter (free `:free` tier) |
| Embeddings | `gemini-embedding-002` (3072 dimensions, HNSW index) |
| Voice STT | `whisper-large-v3-turbo` / `whisper-large-v3` via Groq |
| Web Search | Tavily (feature-flagged via PostHog) |
| Database | Supabase Postgres + pgvector, UUIDv7 PKs |
| Auth | Supabase Auth, RS256 JWT, JWKS validation in FastAPI |
| File Storage | Cloudflare R2 (presigned URLs, $0 egress) |
| Frontend Host | Vercel (free tier) |
| Backend Host | Render (free tier + cron-job.org keep-alive) |
| Email | Resend (replaces Zoho SMTP) + React Email templates |
| Error Tracking | Sentry (all 4 apps — separate DSNs) |
| Analytics | PostHog (web + mobile, feature flags, session replay) |
| Uptime | Better Uptime |
| Payments | Paystack + Flutterwave (double-entry credit ledger) |
| Testing (Backend) | pytest + HTTPX |
| Testing (Web) | Vitest + React Testing Library + Playwright E2E |
| Testing (Mobile) | Jest + React Native Testing Library + Maestro E2E |
| Testing (Desktop) | Vitest + Playwright (Electron mode) |
