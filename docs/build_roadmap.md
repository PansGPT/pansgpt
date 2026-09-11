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

| Priority | Platform                  | Decision                                                                                   |
| :------: | ------------------------- | ------------------------------------------------------------------------------------------ |
| **1st**  | **Web (Next.js 15)**      | Fastest iteration. No app store delays. Proves product-market fit first. SEO-discoverable. |
| **2nd**  | **Mobile (Expo SDK 52+)** | Students are mobile-heavy for daily study. Built once web features are stable.             |
| **3rd**  | **Desktop (Electron 33)** | Offline-first power users. ~90% code share with web. Sequenced last.                       |

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

|   #    | Phase                         |                                   Status                                   | What Gets Built                                                                                            | Gate Before Continuing                                                         |
| :----: | ----------------------------- | :------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **0**  | Local Dev Environment         |                                ✅ **Done**                                 | Every developer runs the full stack locally                                                                | All services start without errors                                              |
| **1**  | Monorepo Scaffold + CI        |                                ✅ **Done**                                 | Repo structure, turbo.json, git hooks, PR templates, blocking CI                                           | CI passes on an empty repo push                                                |
| **2**  | Secrets + Config              |                                ✅ **Done**                                 | `.env.example`, Pydantic BaseSettings, `@t3-oss/env-nextjs`, per-env isolation                             | App refuses to start with missing vars                                         |
| **3**  | Environments Wired            |                                ✅ **Done**                                 | Local, staging, production Supabase + Vercel + Render deployment                                           | Staging URL is reachable; `/health/ready` returns 200                          |
| **4**  | Database Foundation           |                                ✅ **Done**                                 | All migrations, RLS policies, enums, indexes, seed data, 45 tables, 3-pool hybrid search, credit ledger    | `supabase db reset` succeeds locally; migrations apply cleanly to staging      |
| **5**  | Document Ingestion Engine     |                                ✅ **Done**                                 | R2 storage, PyMuPDF, PDF pipeline, `gemini-embedding-002` (3072d) HNSW — multi-format, ARQ worker pipeline | A PDF can be uploaded and fully indexed via pytest API test                    |
| **6A** | AI Engine Foundation          |                               ⏳ **Pending**                               | Gemma/Groq/OpenRouter failover, 3072d vector search, basic SSE, guard, acronym normalizer                  | Streamed AI response over a document works via pytest API test                 |
| **6B** | AI Engine Advanced            |                               ⏳ **Pending**                               | Hybrid RAG (FTS+Trigram+RRF), tools.py, multi-turn loop, AI skills, ZDR, Whisper                           | All tools callable by LLM; agentic loop works with 5 turns                     |
| **7**  | Auth Backend                  |                                 ⏳ Pending                                 | JWKS, JWT validation, RBAC role guards, per-client API keys                                                | `GET /auth/me` returns correct user on staging; role guards reject wrong roles |
| **8**  | Walking Skeleton Web UI       |         Thin auth + upload + chat — proves all 3 engines together          | Student signs up, uploads a doc, gets an AI response — on staging                                          |
| **9**  | Design System + App Shell     |           OKLCH tokens, atomic components, 3 themes, navigation            | Core screens navigable with real design                                                                    |
| **10** | PDF Reader (Web)              |      4-layer virtualized reader, highlights, AI sidebar, snip-to-chat      | Student opens, reads, highlights, and Snips to Chat                                                        |
| **11** | AI Chat Interface (Web)       | `assistant-ui`, streaming, `<BranchPicker />`, voice, generative UI skills | Student chats with the AI; branch navigation works                                                         |
| **12** | Learn Mode (Web)              |        Section outline, explanations, check questions, mastery ring        | Student studies a section and answers recall checks                                                        |
| **13** | Quiz System (Web)             |       Async ARQ job, 5 formats, timed interface, results, share card       | Student generates and completes a quiz                                                                     |
| **14** | Notes (Web)                   |            Tiptap editor, idb-keyval offline, sync-on-reconnect            | Student writes, edits, and syncs a note                                                                    |
| **15** | Timetable + Dashboard (Web)   |          Schedule engine, home page, recents carousel, tasks list          | Home page shows real timetable and recent activity                                                         |
| **16** | Portals                       |             Lecturer submission, admin management, super admin             | Lecturer submits → admin approves → document enters ingestion                                              |
| **17** | Settings + Profile + Feedback |      Profile, preferences, session management, CSAT, feedback triage       | Student updates profile and theme; feedback lands in admin                                                 |
| **18** | Credits + Payments            |             Double-entry credit ledger, Paystack, Flutterwave              | Student purchases credits and spends them on AI                                                            |
| **19** | Email System                  |              Resend, React Email templates, ARQ worker queue               | Welcome email arrives after signup                                                                         |
| **20** | Mobile (Expo)                 |          Auth, PDF reader, chat, quiz, notes, timetable, widgets           | Full student journey works on iOS + Android                                                                |
| **21** | Desktop (Electron)            |          Offline SQLite, PDF cache, background sync, auto-updater          | Full offline study session works without internet                                                          |
| **22** | PWA + Offline (Web)           |              `@serwist/next`, caching tiers, IndexedDB outbox              | Web app installs and key flows work offline                                                                |
| **23** | Public Pages + SEO            |           Landing, pricing, about, JSON-LD, Open Graph, sitemap            | Public pages indexed by Google with correct metadata                                                       |
| **24** | Security Hardening            |           CORS, headers, rate limits, NDPA 2023, dependency scan           | Security checklist cleared                                                                                 |
| **25** | Observability + Monitoring    |           Sentry, PostHog, Better Uptime, structlog, keep-alive            | Errors visible, events tracked, uptime alerting live                                                       |
| **26** | Performance + Load Testing    |                      Lighthouse, k6, EXPLAIN ANALYZE                       | p95 API < 500ms; Lighthouse performance > 90                                                               |
| **27** | Pre-Launch Checklist          |                        Full checklist verification                         | Every item checked                                                                                         |
| **28** | Production Launch 🚀          |                 DNS live, migrations applied, smoke tested                 | Real students using the app                                                                                |
| **29** | Post-Launch Iteration         |               Feature flags, DORA metrics, incident process                | Sustainable delivery culture active                                                                        |

---

## ⚙️ PHASES 0–6 — Exhaustive Build Checklist

> Every item below is an atomic buildable task. [x] = built & verified in code. [ ] = specced but not yet built. [~] = partially implemented.
> For design decisions and technical detail on any item, see [implementation_plan.md](implementation_plan.md).

# PansGPT — Roadmap Phases 0–6

| Phase        | Status     |
| ------------ | ---------- |
| **Phase 0**  | ✅ Done    |
| **Phase 1**  | ✅ Done    |
| **Phase 2**  | ✅ Done    |
| **Phase 3**  | ✅ Done    |
| **Phase 4**  | ✅ Done    |
| **Phase 5**  | ✅ Done    |
| **Phase 6A** | ⏳ Pending |
| **Phase 6B** | ⏳ Pending |

---

### 0.0 Stack Decisions Review

> 📖 See implementation_plan.md § Section 1 — Stack Decisions (L379)

- [x] Read and understand Section 1 (Stack Decisions) in full before any setup
- [x] Confirm chosen stack: Next.js 15, Expo SDK 52, Electron 33, FastAPI, Supabase, Cloudflare R2, Upstash Redis
- [x] Confirm AI providers: Gemma 4 (Google AI Studio), Groq, OpenRouter, Gemini Embedding 002 (3072d)
- [x] Confirm all third-party services have free-tier accounts created: Supabase, Render, Vercel, Cloudflare R2, Upstash Redis, Google AI Studio, Groq, OpenRouter, Tavily, Paystack, Resend, Sentry, PostHog

### 0.1 Node.js & Package Manager

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Install Node.js via nvm
- [x] Pin Node.js version in `.nvmrc` at repository root | file: .nvmrc
- [x] Add `.node-version` file at repository root or apps | file: .node-version
- [x] Install pnpm globally and declare package manager (`pnpm@11.9.0`) | file: package.json
- [x] Set engine constraints (Node `>=20.0.0`, pnpm `>=9.0.0`) | file: package.json

### 0.2 Python Environment

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Pin Python version to 3.11 | file: apps/api/.python-version
- [x] Align Python version with roadmap spec (`>=3.11` compatible across 3.11 and 3.12) | file: apps/api/pyproject.toml
- [x] Install Python dependency manifests for FastAPI | file: apps/api/requirements.txt, apps/api/pyproject.toml
- [x] Generate and commit `uv.lock` dependency lockfile via `uv lock` | file: apps/api/uv.lock

### 0.3 Local Supabase Stack

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Install Docker Desktop and Supabase CLI (Configured remote hosted Supabase DB)
- [x] Configure local Supabase Docker infrastructure | file: supabase/config.toml
- [x] Configure local Supabase UNIJOS seed data | file: supabase/seed.sql

### 0.4 Docker Setup

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Create `docker-compose.yml` for local development orchestration | file: docker-compose.yml

### 0.5 IDE & Editor Config

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Configure shared VS Code settings (`editor.formatOnSave: true`, Prettier for TS/TSX, Ruff for Python) | file: .vscode/settings.json
- [x] Configure VS Code recommended extensions (ESLint, Prettier, Tailwind CSS, Ruff, Python, Pylance) | file: .vscode/extensions.json
- [x] Add `eamodio.gitlens` to recommended VS Code extensions | file: .vscode/extensions.json
- [x] Add `supabase.supabase-vscode` to recommended VS Code extensions | file: .vscode/extensions.json

### 0.6 Developer Documentation

> 📖 See implementation_plan.md § Local Dev Environment

- [x] Write root onboarding README covering prerequisites, local setup, service start commands, and testing | file: README.md
- [x] Write root contributing guide detailing branching strategy, conventional commit conventions, and DoD | file: CONTRIBUTING.md
- [x] Write developer playbook documentation for migrations, FastAPI routing, and Web-to-API client integration | file: docs/dev-playbook.md
- [x] Add instructions for "how to add a shared type" to developer playbook | file: docs/dev-playbook.md
- [x] Add instructions for "how to add a feature flag" to developer playbook | file: docs/dev-playbook.md
- [x] Add instructions for "how to debug SSE streaming" to developer playbook | file: docs/dev-playbook.md
- [x] Create root-level `Makefile` or `scripts/` directory for developer convenience workflows | file: Makefile, scripts/dev.ps1
- [x] Add Next.js dev server script (`next dev --port 3000`) | file: apps/web/package.json
- [x] Add FastAPI application entrypoint exposing `/health` and OpenAPI documentation at `/docs` | file: apps/api/app/main.py

---

### 1.1 Turborepo & Workspace Structure

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Initialize Git repository with `main` as default branch and configure GitHub remote | file: .git/config
- [x] Configure repository code ownership rules (`CODEOWNERS`) | file: .github/CODEOWNERS
- [x] Define Turborepo monorepo pipeline with `build`, `dev`, `lint`, `typecheck`, `test`, `clean` tasks | file: turbo.json
- [x] Define pnpm workspace linking `apps/*` and `packages/*` with `allowBuilds` | file: pnpm-workspace.yaml

### 1.2 Application Packages

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Scaffold Next.js 15 App Router web application workspace (`@pansgpt/web`) | file: apps/web/package.json
- [x] Scaffold Expo SDK 52 mobile application workspace (`@pansgpt/mobile`) | file: apps/mobile/package.json
- [x] Scaffold Electron 33 desktop application workspace (`@pansgpt/desktop`) | file: apps/desktop/package.json
- [x] Scaffold FastAPI Python backend service workspace (`pansgpt-api`) | file: apps/api/pyproject.toml

### 1.3 Shared Config Packages

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Scaffold shared design system primitives package (`@pansgpt/ui`) | file: packages/ui/package.json
- [x] Scaffold shared TypeScript schemas, API contracts, and Supabase DB types (`@pansgpt/types`) | file: packages/types/package.json
- [x] Scaffold database migrations, RLS policies, and seed data package (`@pansgpt/database`) | file: packages/database/package.json
- [x] Scaffold shared ESLint configuration package (`@pansgpt/eslint-config`) | file: packages/eslint-config/package.json
- [x] Scaffold shared TypeScript configuration package (`@pansgpt/typescript-config`) | file: packages/typescript-config/package.json
- [x] Create shared Prettier configuration package or root-level configuration (`@pansgpt/prettier-config` & `.prettierrc`) | file: .prettierrc, packages/prettier-config
- [x] Create shared Tailwind preset configuration package (`@pansgpt/tailwind-config`) | file: packages/tailwind-config
- [x] Create root-level `.eslintrc.*` | file: .eslintrc.json
- [x] Create root-level `prettier.config.*` / `.prettierrc` | file: .prettierrc

### 1.4 Git Hooks & Commit Standards

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Configure Conventional Commits enforcing commit types | file: commitlint.config.js
- [x] Create Husky git hooks directory with `pre-commit` and `commit-msg` hooks | file: .husky/pre-commit, .husky/commit-msg
- [x] Ensure Husky is fully configured in root `package.json` | file: package.json
- [x] Install git hooks tooling (`husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`) in root `package.json` `devDependencies` | file: package.json
- [x] Create `lint-staged` configuration file or add `lint-staged` key to `package.json` | file: .lintstagedrc.json
- [x] Add secret scanning pre-commit hook to scan staged files for secrets | file: tooling/check-secrets.py, .husky/pre-commit

### 1.5 GitHub CI Workflow

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Create GitHub Actions CI workflow running `code-quality` and `api-tests` on pushes/PRs to `main` | file: .github/workflows/ci.yml
- [x] Create GitHub Pull Request template with testing, risk, and phase checklists | file: .github/PULL_REQUEST_TEMPLATE.md
- [x] Create GitHub Issue template for bug reports with Sentry link prompts | file: .github/ISSUE_TEMPLATE/bug_report.md
- [x] Create GitHub Issue template for feature requests | file: .github/ISSUE_TEMPLATE/feature_request.md
- [x] Create Changelog following Keep a Changelog standard | file: CHANGELOG.md
- [x] Add CI `build-web` smoke check job running `next build` | file: .github/workflows/ci.yml
- [x] Add CI backend linting (`ruff check`) step | file: .github/workflows/ci.yml
- [x] Add Render keep-alive pinger workflow | file: .github/workflows/keep_alive.yml

### 1.6 Secret Scanning

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Add CI `security-scan` job running `gitleaks` | file: .github/workflows/ci.yml
- [x] Configure pre-commit secret scanning gate | file: tooling/check-secrets.py, .husky/pre-commit

### 1.7 Type Generation

> 📖 See implementation_plan.md § Monorepo Scaffold + CI

- [x] Create automated TypeScript type generation script from Supabase schema | file: tooling/gen-types.sh
- [x] Fix default target typo in type generation script (change `"2ocal"` to `"local"`) | file: tooling/gen-types.sh

---

### 2.1 Environment Templates (.env.example files)

> 📖 See implementation_plan.md § Secrets + Config

- [x] Create master Secrets Inventory document | file: docs/secrets-inventory.md
- [x] Create root environment variables template | file: .env.example
- [x] Create FastAPI engine environment template | file: apps/api/.env.example
- [x] Create Web application environment template | file: apps/web/.env.example
- [x] Create Mobile app environment template | file: apps/mobile/.env.example
- [x] Create Desktop app environment template | file: apps/desktop/.env.example
- [x] Configure Git secret discipline ignoring `.env`, `.env.local`, `.env.*.local` | file: .gitignore

### 2.2 API Config (Pydantic BaseSettings)

> 📖 See implementation_plan.md § Secrets + Config

- [x] Create Pydantic v2 `BaseSettings` configuration loader | file: apps/api/app/core/config.py
- [x] Remove hardcoded remote credentials from default field values to enforce fail-fast validation | file: apps/api/app/core/config.py
- [x] Add `PAYSTACK_WEBHOOK_SECRET` and `FLUTTERWAVE_WEBHOOK_SECRET` | file: apps/api/app/core/config.py
- [x] Add `TAVILY_API_KEY` (needed for search tool) | file: apps/api/app/core/config.py
- [x] Add `X_API_KEY_WEB`, `X_API_KEY_MOBILE`, `X_API_KEY_DESKTOP` (client identity headers) | file: apps/api/app/core/config.py
- [x] Fix embedding model name mismatch (`gemini-embedding-002` instead of `gemini-embedding-2`) | file: apps/api/app/core/config.py

### 2.3 Web Config (@t3-oss/env-nextjs)

> 📖 See implementation_plan.md § Secrets + Config

- [x] Create Web environment schema parsing with Zod | file: apps/web/env.ts
- [x] Install `@t3-oss/env-nextjs` package | file: apps/web/package.json
- [x] Refactor `apps/web/env.ts` to use `@t3-oss/env-nextjs` for strict build-time validation | file: apps/web/env.ts
- [x] Remove fallback defaults in Web config to ensure fail-fast validation | file: apps/web/env.ts
- [x] Add `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | file: apps/web/env.ts
- [x] Add `X_API_KEY_WEB` | file: apps/web/env.ts

### 2.4 Mobile & Desktop Config

> 📖 See implementation_plan.md § Secrets + Config

- [x] Create Mobile environment configuration | file: apps/mobile/src/config/env.ts
- [x] Create Desktop environment configuration | file: apps/desktop/src/config/env.ts
- [x] Refactor Mobile `appConfig.ts` to use `expo-constants` integration instead of direct `process.env` lookups | file: apps/mobile/src/config/env.ts

### 2.5 Shared Config Package

> 📖 See implementation_plan.md § Secrets + Config

- [x] Create shared config or env package in `packages/` (e.g., `@pansgpt/config` or `@pansgpt/env`) | directory: packages/config

### 2.6 Fail-Fast Validation

> 📖 See implementation_plan.md § Secrets + Config

- [x] Ensure API startup fails fast on missing env vars | file: apps/api/app/core/config.py
- [x] Ensure Web build fails fast on missing env vars | file: apps/web/env.ts

### 2.7 Secret Hygiene

> 📖 See implementation_plan.md § Secrets + Config

- [x] Pre-commit secret scanning gate | file: tooling/check-secrets.py, .husky/pre-commit
- [x] CI secret scan workflow | file: .github/workflows/ci.yml
- [x] Enable GitHub Secret Scanning on GitHub repository (Enabled in GitHub Settings)

---

### 3.1 Local Environment

> 📖 See implementation_plan.md § Environments Wired

- [x] Configure local Supabase CLI | file: supabase/config.toml
- [x] Create `apps/web/.env.local` file | file: apps/web/.env.local

### 3.2 Health Check Endpoints

> 📖 See implementation_plan.md § Environments Wired

- [x] Implement FastAPI Liveness probe `GET /health/live` returning 200 OK | file: apps/api/app/main.py
- [x] Implement FastAPI Readiness probe `GET /health/ready` testing Postgres & Redis ping | file: apps/api/app/main.py
- [x] Write Healthcheck automated pytest suite (`test_health_live`, `test_health_ready`) | file: apps/api/tests/test_health.py

### 3.3 Staging: API (Render)

> 📖 See implementation_plan.md § Environments Wired

- [x] Write multi-stage production `Dockerfile` | file: apps/api/Dockerfile
- [x] Create Render infrastructure blueprint for staging web service (`pansgpt-api-staging`) | file: render.yaml
- [x] Add Render background worker service spec in `render.yaml` | file: render.yaml
- [x] Use Docker build instruction (`env: docker`) in `render.yaml` instead of raw Python pip | file: render.yaml
- [x] Add missing environment variable declarations to `render.yaml` | file: render.yaml
- [x] Configure Render GitHub connection and automated continuous deployment to staging | docs: docs/environments-setup.md
- [x] Verify public reachable Staging API Render URL (`https://pansgpt-api-staging.onrender.com`) | docs: docs/environments-setup.md

### 3.4 Staging: Web (Vercel)

> 📖 See implementation_plan.md § Environments Wired

- [x] Configure Next.js Vercel monorepo build | file: apps/web/vercel.json
- [x] Configure Vercel GitHub connection for automated PR preview deployments | docs: docs/environments-setup.md
- [x] Set Staging environment variables in Vercel Preview and Render dashboards | docs: docs/environments-setup.md
- [x] Verify public reachable Vercel Preview URL (Next.js 16.3.4 build verified) | docs: docs/environments-setup.md

### 3.5 Staging: Supabase

> 📖 See implementation_plan.md § Environments Wired

- [x] Wire and confirm Staging Supabase hosted database is reachable | verified live via pooler port 5432

### 3.6 Production Provisioning

> 📖 See implementation_plan.md § Environments Wired

- [x] Add Production service specification to `render.yaml` | file: render.yaml
- [ ] Provision Production Supabase Hosted Project #2 _(Deferred to Phase 28 — Production Launch)_ | docs: docs/environments-setup.md
- [ ] Configure Production DNS and custom domain in Vercel _(Deferred to Phase 28 — Production Launch)_ | docs: docs/environments-setup.md

### 3.7 Monitoring & Keep-Alive

> 📖 See implementation_plan.md § Environments Wired

- [x] Create Keep-alive cron workflow | file: .github/workflows/keep_alive.yml
- [x] Configure automated health monitoring pinger for API and Web | file: .github/workflows/keep_alive.yml

---

### 4.1 Extensions & Types

> 📖 See implementation_plan.md § Database Foundation

- [x] Enable `uuid-ossp` extension | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Enable `pgcrypto` extension | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Enable `vector` extension | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Enable `pg_trgm` extension for Trigram Similarity Pool | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `university_level` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `user_role` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `document_status` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `ai_provider` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `interaction_role` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `skill_type` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `quiz_job_status` enum | file: supabase/migrations/20260906090001_extensions_and_uuidv7.sql
- [x] Create `credit_tx_type` enum | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `flashcard_card_type` enum | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.2 Core Tables

> 📖 See implementation_plan.md § Database Foundation

- [x] Create `universities` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `academic_terms` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `users` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `invitations` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `documents` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_chunks` table (upgraded to 3072d) | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_sections` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_notes` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_highlights` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `study_progress` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `quizzes` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `quiz_questions` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `quiz_attempts` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `quiz_generation_jobs` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_learn_progress` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_learn_pending_retests` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `ai_skills` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `chat_sessions` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `chat_messages` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `ai_telemetry` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `timetables` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `student_tasks` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `course_knowledge` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `exam_restrictions` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `general_notes` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `system_settings` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `system_settings_history` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `audit_logs` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_pages` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_segments` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `document_elements` table | file: supabase/migrations/20260906090002_core_schema.sql
- [x] Create `flashcards` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `subscriptions` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `user_credits` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `credit_ledger` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `credit_pricing` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `credit_purchases` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `exam_timetables` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `ai_usage_daily_rollups` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `user_preferences` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `academic_level_history` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `support_tickets` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `support_ticket_replies` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `csat_survey_responses` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `email_logs` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `email_suppressions` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `user_email_preferences` table | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.3 RLS Policies

> 📖 See implementation_plan.md § Database Foundation

- [x] Create `uni_select` policy on `universities`
- [x] Create `users_select_self` policy on `users`
- [x] Create `users_update_self` policy on `users`
- [x] Create `documents_select_student` policy on `documents`
- [x] Create `documents_admin_all` policy on `documents`
- [x] Create `chunks_select` policy on `document_chunks`
- [x] Create `notes_owner` policy on `document_notes`
- [x] Create `highlights_owner` policy on `document_highlights`
- [x] Create `study_progress_owner` policy on `study_progress`
- [x] Create `quizzes_owner` policy on `quizzes`
- [x] Create `quiz_questions_owner` policy on `quiz_questions`
- [x] Create `quiz_attempts_owner` policy on `quiz_attempts`
- [x] Create `quiz_jobs_owner` policy on `quiz_generation_jobs`
- [x] Create `chat_sessions_owner` policy on `chat_sessions`
- [x] Create `chat_messages_owner` policy on `chat_messages`
- [x] Create `student_tasks_owner` policy on `student_tasks`
- [x] Create `general_notes_owner` policy on `general_notes`
- [x] Create `timetables_select` policy on `timetables`
- [x] Create `ai_skills_select` policy on `ai_skills`
- [x] Create `settings_select` policy on `system_settings`
- [x] Create `pages_select` policy on `document_pages`
- [x] Create `segments_select` policy on `document_segments`
- [x] Create `elements_select` policy on `document_elements`
- [x] Create RLS policies for `document_sections` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `document_learn_progress` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `document_learn_pending_retests` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `academic_terms` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `invitations` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `course_knowledge` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `exam_restrictions` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `ai_telemetry` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `system_settings_history` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create RLS policies for `audit_logs` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create Admin write policies for `universities` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create Admin write policies for `timetables` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create Admin write policies for `ai_skills` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create Admin write policies for `system_settings` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create Admin write policies for `academic_terms` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create User registration INSERT policy on `users` | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create complete tenant-isolation and owner RLS policies across all 14 new Phase 4 tables | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.4 Indexes

> 📖 See implementation_plan.md § Database Foundation

- [x] Create HNSW index on 3072d embeddings (`idx_document_chunks_hnsw`)
- [x] Create Full Text Search GIN index (`idx_document_chunks_fts`)
- [x] Create GIN Index on user roles (`idx_users_roles`)
- [x] Create Partial index on soft deletes (`idx_users_deleted`, `idx_documents_deleted`, `idx_chat_sessions_deleted`)
- [x] Create Active student tasks partial index (`idx_student_tasks_active`)
- [x] Create Pending ingestion partial index (`idx_documents_ingestion`)
- [x] Create Image hash deduplication partial index (`idx_chat_messages_image_hash`)
- [x] Create Learn retest queue partial index (`idx_learn_retests_queue`)
- [x] Create Foreign key and order lookup indexes
- [x] Create GIN Trigram index on `document_chunks.content` (`idx_document_chunks_trgm`) | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.5 Database Functions & RPCs

> 📖 See implementation_plan.md § Database Foundation

- [x] Create `uuid_generate_v7()` function
- [x] Create `current_user_has_role()` function
- [x] Create `current_user_university_id()` function
- [x] Create `match_document_chunks()` function (3072d)
- [x] Create `match_documents_global()` function (3072d)
- [x] Create `claim_document_ingestion()` function
- [x] Create `heartbeat_document_ingestion()` function
- [x] Create `purge_soft_deleted_records()` function
- [x] Create `prepare_document_reembed()` function
- [x] Create `match_documents_hybrid()` function (3-pool dense + FTS + trigram with RRF k=60) | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql
- [x] Create `deduct_user_credits()` function (Atomic balance verification & double-entry credit ledger logging) | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.6 Triggers

> 📖 See implementation_plan.md § Database Foundation

- [x] Create `set_updated_at()` trigger function
- [x] Attach `trg_*_updated_at` to 13 tables
- [x] Attach `updated_at` triggers to `study_progress`, `document_learn_progress`, `course_knowledge`, `exam_restrictions`, `system_settings`, and all 12 applicable Phase 4 tables | file: supabase/migrations/20260911010001_phase4_database_foundation_complete.sql

### 4.7 Seed Data

> 📖 See implementation_plan.md § Database Foundation

- [x] Seed initial university for University of Jos (UNIJOS) | file: supabase/seed.sql
- [x] Seed default `system_settings` configuration | file: supabase/seed.sql
- [x] Seed core AI skills (`dosage_calculator`, `drug_interaction_checker`, `chemical_drawer`) | file: supabase/seed.sql
- [x] Fix `supabase/seed.sql` with clean schema-aligned columns and ON CONFLICT handling | file: supabase/seed.sql
- [x] Fix `course_knowledge` seed to match the actual schema | file: supabase/seed.sql
- [x] Seed sample documents and institutions with multi-tenant isolation support | file: supabase/seed.sql

### 4.8 Type Generation (supabase.ts)

> 📖 See implementation_plan.md § Database Foundation

- [x] Create type generation script: `tooling/gen-types.sh`
- [x] Regenerate `packages/types/src/supabase.ts` against actual migrations and live Staging DB across all 45 tables and RPCs | file: packages/types/src/supabase.ts

---

### ✋ Architecture Review Gate (Before Phase 5)

> 📖 See implementation_plan.md § Section 2 — System Architecture (L819)

- [x] Read and understand Section 2 (System Architecture) in full before building engines
- [x] Understand the 3-tier environment system: Local → Staging → Production
- [x] Understand the multi-client API architecture: all AI calls go through FastAPI, never directly from clients
- [x] Understand the data flow: Upload → R2 → ARQ Worker → Supabase → Vector Index → RAG → LLM → SSE → Client

---

### 5.1 R2 Cloud Storage

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement S3-Compatible Client Engine | file: apps/api/app/engines/storage.py
- [x] Implement Canonical Storage Key Format `build_document_storage_key()`
- [x] Implement Presigned Upload URL (PUT) `generate_presigned_put_url()`
- [x] Implement Presigned Streaming URL (GET) `generate_presigned_get_url()`
- [x] Implement Direct Byte Transfer Methods (`download_bytes()`, `upload_bytes()`, `object_exists()`, `delete_object()`)
- [x] Implement Bucket Name Scoping based on environment
- [x] Implement Office Document Converted Path (`converted/{document_id}.pdf`) directory structure
- [x] Implement Direct Upload Complete Callback (`POST /api/v1/library/documents/{id}/complete`) API endpoint
- [x] Automate R2 CORS rules for web frontend origins

### 5.2 Document Upload API

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement `POST /api/v1/library/upload` (mounted at `/library/upload` instead of `/documents/upload`) | file: apps/api/app/routers/library.py
- [x] Implement `GET /api/v1/library/{document_id}/pdf-url` | file: apps/api/app/routers/library.py
- [x] Implement `GET /api/v1/library/documents` | file: apps/api/app/routers/library.py
- [x] Implement `POST /api/v1/library/{document_id}/reembed` | file: apps/api/app/routers/library.py
- [x] Create `POST /api/v1/library/{id}/confirm-upload` or `process` endpoint to enqueue the background ingestion job
- [x] Implement `GET /api/v1/library/documents/{id}` endpoint to fetch single document metadata
- [x] Implement `PATCH /api/v1/library/documents/{id}` admin update endpoint
- [x] Implement `DELETE /api/v1/library/documents/{id}` admin soft-delete endpoint
- [x] Implement `GET /api/v1/library/documents/{id}/segments` endpoint
- [x] Resolve Endpoint Path Discrepancy (change `/api/v1/library/upload` to `/api/v1/documents/upload` if needed)

### 5.3 Text Extraction (PDF)

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement Stage 1: Upload & Immutable R2 Storage
- [x] Implement Stage 2: Per-Page Text-Layer Check (`check_page_text_layer`) | file: apps/api/app/engines/extractor.py
- [x] Implement Stage 3a: Native Extraction + Image Scan (`extract_embedded_images()`)
- [x] Implement Stage 3b: Scanned Canvas Render (`page.get_pixmap()`)
- [x] Implement Stage 6: Dual-Path Table Extraction (Native Path)
- [x] Implement Local OCR-First Step ($0 Cost) before falling back to Vision LLM

### 5.4 Text Extraction (Office: DOCX, PPTX, TXT, CSV, MD)

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Add Multi-Format Extractors (DOCX, PPTX, TXT, CSV, MD) support
- [x] Add `python-docx`, `python-pptx`, `openpyxl` dependencies

### 5.5 Vision Classification (Gemini)

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement Stage 4: Classify-Then-Route (`image_classifier.classify_and_process()`) | file: apps/api/app/engines/classifier.py
- [x] Implement Stage 5: Verbatim Transcription Prompt (Gemini Vision)
- [x] Implement Stage 6: Image table extraction via Vision Path

### 5.6 Chunking Strategy

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement Semantic Chunker | file: apps/api/app/engines/chunker.py
- [x] Implement Atomic Chunk Invariant (Tables and diagrams are strictly atomic)
- [x] Implement Recursive Text Splitting (512 max tokens with 64-token overlap)
- [x] Implement Segment Bounding (preserve `page_start`, `page_end`, `segment_id`, `element_id`)
- [x] Implement True LLM-driven topic shift detection and hierarchical sectioning (Stage 7)
- [x] Explicitly populate `title_source = 'inherited'` when elements continue an existing segment

### 5.7 Embedding (Gemini 3072d)

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement Gemini 3072d Embedder | file: apps/api/app/engines/embedder.py
- [x] Implement API Batching (up to 32 items)
- [x] Implement Deterministic Test Fallback for offline/dev CI execution
- [x] Implement Database Persistence (pages, segments, elements, chunks)
- [x] Implement Batch Upsert Optimization for database writes

### 5.8 ARQ Background Worker

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Configure ARQ Worker Settings (`WorkerSettings`) | file: apps/api/workers/settings.py
- [x] Configure Worker Concurrency Limit (`max_jobs = 3`)
- [x] Define Worker Job (`ingest_document_job(ctx, document_id, storage_key)`) | file: apps/api/workers/tasks.py
- [x] Create `enqueue_ingestion_job(document_id, storage_key)` producer to enqueue jobs into Redis via ARQ
- [x] Implement Worker Concurrency Claim Call (`claim_document_ingestion`) inside the worker job
- [x] Implement Worker Heartbeat Loop (`heartbeat_document_ingestion`) inside the worker job
- [x] Implement Automatic Retries (Exponential backoff) in the worker job

### 5.9 Document Status & Progress Tracking

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Implement Intermediate Progress Updates passing a callback to write to `documents.embedding_progress`
- [x] Implement Initial Status Transition (`embedding_status = 'processing'`) when worker starts
- [x] Implement Failure Status Transition (`embedding_status = 'failed'`) on exceptions
- [x] Wire up Supabase Realtime Notifications for progress changes

### 5.10 RBAC Guards on Endpoints

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Enforce RBAC Authentication Guard (`require_role(["university_admin", "super_admin"])`) on `POST /upload` and `POST /{id}/reembed`

### 5.11 Tests

> 📖 See implementation_plan.md § Document Ingestion Engine

- [x] Pass all 7 tests in `apps/api/tests/test_ingestion.py` (Storage key generation, Chunker atomic rules, Text splitting, Embedder dimensions, Upload endpoints, Full 8-stage pipeline)
- [x] Write Worker Job Integration Test
- [x] Write Worker Lock & Heartbeat Tests
- [x] Write Worker Error & Failure State Test
- [x] Write Database Chunks Upsert Test
- [x] Write RBAC Auth Security Tests
- [x] Write Non-PDF Format Tests

---

### ✋ Architecture Review Gate (Before Phase 6)

> 📖 See implementation_plan.md § Section 6 — AI & LLM Engine (L2483)

- [ ] Read and understand Section 6 (AI & LLM Engine) in full before implementing LLM orchestration
- [ ] Understand Provider Topology & Failover Cascade: Gemma 4 (31B/26B) -> Groq (OSS 120B) -> OpenRouter (Nemotron 3)
- [ ] Understand 3-Pool Hybrid Retrieval (Dense Vector + FTS + Trigram with Reciprocal Rank Fusion k=60)
- [ ] Understand LLM Tool Architecture (`tools.py` schemas for rag_search, read_document, web_search, vision_analyze)
- [ ] Understand Multi-Turn Agentic Loop (max 5 turns) with live SSE event emissions

---

### 6A.1 Engine Directory Structure

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Set up engine directory structure (`apps/api/app/engines/`) | file: apps/api/app/engines/

### 6A.2 Model Configuration (Pydantic)

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Configure primary models (`GEMINI_PRIMARY_MODEL`, `GEMINI_SECONDARY_MODEL`, `GEMINI_EMBEDDING_MODEL`) | file: apps/api/app/core/config.py
- [ ] Configure Groq fallback model (`GROQ_FALLBACK_MODEL`) | file: apps/api/app/core/config.py
- [ ] Correct `OPENROUTER_FALLBACK_MODEL` to match spec (Nemotron 3 Ultra/Super instead of `gemma-2-27b-it`) | file: apps/api/app/core/config.py
- [ ] Correct `GEMINI_EMBEDDING_MODEL` to match spec (`gemini-embedding-002` instead of `gemini-embedding-2`) | file: apps/api/app/core/config.py

### 6A.3 Database Connection (asyncpg)

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement asyncpg connection with `statement_cache_size=0` | file: apps/api/app/core/database.py
- [ ] Refactor connection pattern to use `asyncpg.create_pool()` or unified session pooling

### 6A.4 Medical Acronym Normalizer

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement Medical Acronym Normalizer (`apps/api/app/engines/guard.py`)

### 6A.5 Pre/Post LLM Policy Guard

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement Credential leakage filter (Post-LLM guard) token-by-token | file: apps/api/app/engines/llm.py
- [ ] Implement post-generation prompt-exfiltration or schema-leakage validation on the final assembled text
- [ ] Append standardized clinical/educational disclaimer footnote to medical responses

### 6A.6 3072d Dense Vector Search

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement Dense Vector Pool calling Supabase RPCs `match_document_chunks` and `match_documents_global` | file: apps/api/app/engines/rag.py
- [ ] Pass `config={"output_dimensionality": 3072}` in Google GenAI SDK call instead of manual list padding | file: apps/api/app/engines/embedder.py

### 6A.7 Sibling Chunk Expansion

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement adaptive sibling expansion (Currently hardcoded to ±1 for the top chunk only) | file: apps/api/app/engines/rag.py
- [ ] Support `expand_full_segment=True` for sibling expansion
- [ ] Expand siblings for ranks 2–4

### 6A.8 Citation Formatting

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement basic citation metadata (`page_start`, `page_end`, `doc_title`, `course_code`, `snippet`)
- [ ] Return citations as artifact or payload in `done` event instead of inline `citations` event

### 6A.9 Multi-Tier Model Failover (Gemma → Groq → OpenRouter)

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement failover cascade across Tier 1, Tier 1b, Tier 2, Tier 3, and offline deterministic mock fallback | file: apps/api/app/engines/llm.py

### 6A.10 SSE Token Streaming (Basic)

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement SSE Streaming Endpoint (`POST /api/v1/ai/chat/sessions/{id}/stream`) with `Content-Type: text/event-stream` | file: apps/api/app/routers/chat.py
- [ ] Emit basic SSE event types: `init`, `text_chunk`, `citations`, `error`, `done`

### 6A.11 Chat Session CRUD Endpoints

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Implement chat session endpoints

### 6A.12 Chat Models (Pydantic)

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Define chat input/output models

### 6A.13 Basic Verification Tests

> 📖 See implementation_plan.md § AI Engine Foundation

- [ ] Write pytest for `POST /api/v1/ai/chat/sessions/{id}/stream` token streaming
- [ ] Write pytest for Policy guard prompt injection rejection
- [ ] Write pytest for Medical acronym normalization
- [ ] Write pytest for Credential leakage filter

---

### 6B.1 True Token Streaming (generate_content_stream)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Refactor Google AI Studio calls to use native token streaming (`client.aio.models.generate_content_stream`) instead of simulated word-splitting
- [ ] Refactor OpenRouter to use true streaming instead of non-streaming `httpx.AsyncClient` post

### 6B.2 Zero Data Retention (ZDR) Headers

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Pass Zero Data Retention headers/parameters to all upstream AI providers

### 6B.3 FTS Retrieval Pool (websearch_to_tsquery)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement Full-Text Search Retrieval Pool (`websearch_to_tsquery`)

### 6B.4 Trigram Retrieval Pool (word_similarity / pg_trgm)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement Trigram Retrieval Pool (`word_similarity(query, content)`) via `pg_trgm`

### 6B.5 Reciprocal Rank Fusion (RRF k=60)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement unweighted Reciprocal Rank Fusion merging candidates from all 3 pools

### 6B.6 Multi-Query Expansion & HyDE

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement Multi-Query Expansion and Hypothetical Document Embedding (HyDE)

### 6B.7 Candidate Re-Ranking

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement candidate re-ranking (cross-encoder or secondary scoring pass)

### 6B.8 Verbatim PDF Page Coordinate Citations

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Extract verbatim text coordinates or bounding boxes for PDF reader deep linking

### 6B.9 Absence Policy (Web Search Fallback)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement fallback to `web_search` when syllabus confidence is low/empty

### 6B.10 AI Tools Schema (tools.py)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Create `apps/api/app/engines/tools.py` defining schemas for AI tools

### 6B.11 rag_search Tool Handler

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement `rag_search` tool handler

### 6B.12 read_document Tool Handler

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement `read_document` tool handler to read PDF, DOCX, PPTX, TXT from R2

### 6B.13 web_search Tool Handler (Tavily)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement `web_search` tool handler using Tavily integration
- [ ] Add `TAVILY_API_KEY` to config

### 6B.14 vision_analyze Tool Handler (Gemma Vision)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement `vision_analyze` tool handler callable by the chat model

### 6B.15 Multi-Turn Agentic Tool Loop (max 5 turns)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement while-loop (max 5 turns) parsing tool call deltas and invoking handlers

### 6B.16 SSE Event Types: tool_start, tool_end, artifact_ready, thinking_chunk

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Emit `thinking_chunk` event
- [ ] Emit `tool_start` event
- [ ] Emit `tool_end` event
- [ ] Emit `artifact_ready` event

### 6B.17 SSE 15s Keep-Alive Heartbeat

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Add 15s keep-alive heartbeat background task (`: keep-alive\n\n`) to SSE stream

### 6B.18 Client Disconnect Abort

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Accept `request: Request` in SSE generator and check `await request.is_disconnected()` to abort on disconnect

### 6B.19 Credit Balance Check (pre-generation)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Hook into `user_credits` check before AI generation

### 6B.20 Intent / Complexity Classifier

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement Intent and Complexity Classifier to route queries

### 6B.21 Fire-and-Forget: Credit Deduction

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Dispatch credit deduction via `BackgroundTasks`

### 6B.22 Fire-and-Forget: Session Title Generation

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Dispatch session title generation via `BackgroundTasks` (remove inline synchronous SQL)

### 6B.23 Whisper STT (Voice Input)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Add `WHISPER_MODEL` settings and configure STT endpoints in the LLM engine

### 6B.24 Dynamic AI Skills Handlers

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Implement handler for `create_doc`
- [ ] Implement handler for `create_md`
- [ ] Implement handler for `create_pdf`
- [ ] Implement handler for `create_pptx`
- [ ] Implement handler for `plot_graph`
- [ ] Implement handler for `generate_flashcards`
- [ ] Implement handler for `generate_mnemonics`
- [ ] Implement handler for `draw_chemical_structure`
- [ ] Dynamically query `public.ai_skills` to inject available skills into model prompts

### 6B.25 Connection Pool (asyncpg pool, not per-call connect)

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Refactor connection pattern to use `asyncpg.create_pool()` or unified session pooling to eliminate per-call connection handshake overhead

### 6B.26 OpenRouter Model Config Fix

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Update OpenRouter fallback model to `nvidia/nemotron-3-ultra-550b-a55b:free` / `nvidia/nemotron-3-super-120b-a12b:free`

### 6B.27 Advanced Integration Tests

> 📖 See implementation_plan.md § Advanced AI Engine

- [ ] Write integration test asserting cross-university RAG isolation (rejects/filters chunks belonging to other universities)
- [ ] Write integration test mocking Google returning 429 and asserting Groq is invoked

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

| Concern       | Web                               | Mobile                            | Desktop                              |
| ------------- | --------------------------------- | --------------------------------- | ------------------------------------ |
| SDK           | `@supabase/supabase-js`           | `@supabase/supabase-js`           | `@supabase/supabase-js`              |
| Token storage | In-memory + HttpOnly cookie (SSR) | `expo-secure-store`               | Electron `safeStorage` (OS keychain) |
| OAuth         | Browser redirect                  | `expo-auth-session` deep link     | Opens system browser                 |
| Offline auth  | N/A                               | Cached JWT valid up to 1hr expiry | Cached JWT valid up to 1hr expiry    |

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

## 🏠 PHASE 10 — Home Page (Student Daily Hub)

> 📖 See implementation_plan.md § Home Page — Student Daily Hub (L2886)
> ⚠️ Note: This phase should be built before PDF Reader and AI Chat

### 10.1 Layout & Navigation Shell

- [ ] Implement app shell sidebar layout for web (collapsible)
- [ ] Implement bottom tab navigation for mobile (5 tabs: Home, Library, Chat, Quiz, Profile)
- [ ] Implement top bar with user avatar, initials badge, settings icon
- [ ] Implement active route highlighting in navigation
- [ ] Implement auth guard: redirect to /auth/login if no session

### 10.2 Home Page Components

- [ ] Implement greeting header with student name and university
- [ ] Implement "Recent Documents" horizontal scroll carousel (last 5 opened)
- [ ] Implement "Quick Chat" input bar routing to AI Chat
- [ ] Implement "Today's Timetable" mini widget (next 3 class slots)
- [ ] Implement "Pending Tasks" list (student_tasks table)
- [ ] Implement "Continue Studying" card (last read document + page)
- [ ] Implement AI usage summary mini widget (credits used today)

### 10.3 Data Fetching

- [ ] Server Component fetches: recent documents, timetable slots, pending tasks, study progress
- [ ] Client Component fetches: credit balance (real-time via Supabase Realtime)
- [ ] Implement Suspense boundaries with Skeleton placeholders for each widget
- [ ] Implement error boundaries with retry actions

### 10.4 Offline Support

- [ ] Cache home page data in IndexedDB (idb-keyval) for offline rendering
- [ ] Show "Offline" badge when navigator.onLine is false

### 10.5 Verification

- [ ] Pytest API: `GET /api/v1/home/summary` returns correct user data
- [ ] E2E Playwright: home page loads within 2s on staging
- [ ] All 5 widgets render with real data on staging

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
- [ ] **AI Response Style & Tone Selector**: Header/composer dropdown enabling students to toggle AI pedagogical tone (_Concise_, _Exam-focused_, _Explain Like I'm 5_, _In-depth Academic_) which injects corresponding system modifiers
- [ ] **Chat Session Sharing (`/share/[sessionId]`)**: Generate read-only public links allowing students to share AI study chats and clinical explanations with classmates
- [ ] Session management: create, rename (AI auto-suggests 3–5 word title after first response), search, soft-delete
- [ ] Full-text search across chat history (PostgreSQL `tsvector`)
- [ ] Credit deduction hook: `deduct_user_credits` stored procedure called after `event: done`

---

## 🧠 PHASE 12 — Learn Mode

_(Engine already built in Phase 6. This phase wires the UI to it.)_

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

_(Engine already built in Phase 6. This phase wires the UI to it.)_

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

## 💰 PRICING DECISION GATE (Must Complete Before Phase 18)

> 📖 See implementation_plan.md § Section 5 — Pricing / Business Model (L2139)
> ⚠️ Section 5 is currently marked PENDING FOUNDER ALIGNMENT. These decisions must be made before building any payment flow.

### Pricing Model Decisions

- [ ] Decide: Free tier credit allowance per month (e.g., 100 AI responses free)
- [ ] Decide: Credit pack pricing (e.g., 500 credits = ₦500 via Paystack)
- [ ] Decide: Subscription tier pricing if applicable (monthly/annual)
- [ ] Decide: University bulk licensing model (B2B vs B2C)
- [ ] Decide: Which features are gated (AI chat, quiz generation, document upload limits)
- [ ] Document decisions in implementation_plan.md Section 5
- [ ] Update `credit_pricing` seed data in `supabase/seed.sql`
- [ ] Update `ai_skills` cost weights in database

---

## 💳 PHASE 18 — Credits + Payments

_(Full architecture documented in `credits_pricing_architecture.md` — pricing packages pending co-founder alignment)_

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
- [ ] Clinical disclaimer injected on all medical/pharmacology responses: _"Educational Study Aid: Always verify with official departmental guidelines."_

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

| Layer             | Technology                                                   |
| ----------------- | ------------------------------------------------------------ |
| Monorepo          | Turborepo + pnpm workspaces                                  |
| Web Framework     | Next.js 15, App Router, React 19, TypeScript strict          |
| Web Styling       | Tailwind CSS v4, OKLCH tokens, Framer Motion                 |
| Web PDF           | `pdfjs-dist` + TanStack Virtual                              |
| Web Chat UI       | `@assistant-ui/react`                                        |
| Web Notes         | Tiptap                                                       |
| Web PWA           | `@serwist/next`                                              |
| Web Forms         | React Hook Form + Zod                                        |
| Web State         | Zustand (global) + TanStack Query (server)                   |
| Web Components    | Radix UI                                                     |
| Mobile Framework  | Expo SDK 52+, React Native New Architecture                  |
| Mobile Navigation | Expo Router v4                                               |
| Mobile Styling    | NativeWind v4                                                |
| Mobile Chat UI    | `@assistant-ui/react-native`                                 |
| Mobile Notes      | `@10play/tentap-editor`                                      |
| Mobile PDF        | `react-native-pdf` (PDFKit / PdfRenderer)                    |
| Mobile Offline    | MMKV                                                         |
| Mobile Build      | EAS (Expo Application Services)                              |
| Desktop           | Electron 33, offline-first, local SQLite (`better-sqlite3`)  |
| Backend           | FastAPI, Python 3.12, Pydantic v2, Uvicorn + Gunicorn        |
| Task Queue        | ARQ + Upstash Redis                                          |
| PDF Extraction    | PyMuPDF                                                      |
| Primary LLM       | `gemma-4-31b-it` + `gemma-4-26b-a4b-it` via Google AI Studio |
| Fast Fallback LLM | `openai/gpt-oss-120b`, `qwen/qwen3.6-27b` via Groq           |
| Safety Net LLM    | NVIDIA Nemotron models via OpenRouter (free `:free` tier)    |
| Embeddings        | `gemini-embedding-002` (3072 dimensions, HNSW index)         |
| Voice STT         | `whisper-large-v3-turbo` / `whisper-large-v3` via Groq       |
| Web Search        | Tavily (feature-flagged via PostHog)                         |
| Database          | Supabase Postgres + pgvector, UUIDv7 PKs                     |
| Auth              | Supabase Auth, RS256 JWT, JWKS validation in FastAPI         |
| File Storage      | Cloudflare R2 (presigned URLs, $0 egress)                    |
| Frontend Host     | Vercel (free tier)                                           |
| Backend Host      | Render (free tier + cron-job.org keep-alive)                 |
| Email             | Resend (replaces Zoho SMTP) + React Email templates          |
| Error Tracking    | Sentry (all 4 apps — separate DSNs)                          |
| Analytics         | PostHog (web + mobile, feature flags, session replay)        |
| Uptime            | Better Uptime                                                |
| Payments          | Paystack + Flutterwave (double-entry credit ledger)          |
| Testing (Backend) | pytest + HTTPX                                               |
| Testing (Web)     | Vitest + React Testing Library + Playwright E2E              |
| Testing (Mobile)  | Jest + React Native Testing Library + Maestro E2E            |
| Testing (Desktop) | Vitest + Playwright (Electron mode)                          |
