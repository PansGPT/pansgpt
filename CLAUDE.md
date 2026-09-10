# PansGPT 2.0 — Agent Engineering & Architectural Rules

> **Canonical Sources of Truth**: `docs/build_roadmap.md` (Phased Execution) & `docs/implementation_plan.md` (28-Section System Architecture).
> **Rule Precedence**: The rules in this file are non-negotiable and strictly enforced across all development sessions.

---

## 1. Core Non-Negotiable Engineering Principles

1. **Engine-First Sequence**:
   - Sequence: `Infrastructure -> Database Schema & Migrations -> Ingestion & AI Engines -> API Verification (pytest) -> Walking Skeleton UI -> Full Platform UI`.
   - Never build frontend pages or auth screens before backend engines, database tables, and API contracts are implemented and verified via automated tests.

2. **Strict AI Engine Routing**:
   - **Clients (Web, Mobile, Desktop) NEVER invoke LLM providers directly.**
   - All AI inference, embeddings, prompt generation, tool execution, and streaming SSE MUST route through the FastAPI backend (`apps/api`).

3. **Database & Migration Governance**:
   - **Zero manual SQL Editor edits in any environment — ever.**
   - All schema changes must be versioned SQL files in `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`.
   - Deployments to Staging/Production must use the Supabase CLI (`pnpm exec supabase db push`).
   - Row-Level Security (RLS) must be enabled on every table at creation (`ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`).
   - Primary keys must use **RFC 9562 UUIDv7** (`uuid_generate_v7()`) for time-ordered indexing and zero B-tree fragmentation.
   - Vector columns must use `vector(3072)` with HNSW cosine indexes (`USING hnsw (embedding vector_cosine_ops)`).

4. **Zero-Budget ($0) Free-Tier Architecture**:
   - **Primary LLM**: Google AI Studio Gemma 4 (`gemma-4-31b-it`) & `gemini-embedding-002` (3072d).
   - **Fallback LLM**: Groq (`llama-3.3-70b-versatile`) via circuit breaker.
   - **Safety-Net LLM**: OpenRouter free-tier.
   - **Document Storage**: Cloudflare R2 (PDF monographs, slide conversions, note attachments).
   - **Queue & Cache**: Upstash Serverless Redis + ARQ background workers.
   - **Transactional Email**: Resend (3,000 free emails/month) + React Email.
   - **Database**: Supabase Free Tier (2 isolated hosted projects: Project #1 = Staging, Project #2 = Production).
   - **Keep-Alive**: Automated 10-minute HTTP ping to `GET /health/ready` to prevent Render free-tier instance sleep.

5. **Strict Quality & Code Gates**:
   - TypeScript: `"strict": true`. No `any` types permitted.
   - Python: Python 3.12, strict Pydantic v2 schemas, complete type annotations, Ruff formatting.
   - CI Quality Gate: Lint + Typecheck + Pytest + Next.js build must pass 100% on every pull request.

---

## 2. Notion Engineering Workspace Synchronization Protocol

From now on, after any meaningful change to the PansGPT codebase (new feature, bug fix, architecture change, or decision made), update the Engineering gallery in Notion (**Project Overview → 🎯 Engineering**) as follows:

1. **Session / Change Log**:
   - Add a row with `Summary`, `Date`, `Area`, `Files Touched`.
   - Check `Verified` ONLY if you actually tested the change.
2. **Decision Log**:
   - If the change involved choosing between approaches, add a row with the `Rationale` and `Alternatives Considered`.
3. **Product Roadmap & Features**:
   - Update the relevant row's `Status`, or add a new row if it is a new piece of work.
4. **Knowledge Base**:
   - ONLY touch Knowledge Base if the change altered the stack, architecture, or a core pattern — never for routine fixes.

> **Formatting Rule**: Keep entries concise and scannable — this is a structured log, not documentation prose.

---

## 3. Monorepo Structure & Workspace Topology

```
pansgpt/
├── apps/
│   ├── web/            # Next.js 15 App Router, React 19, Tailwind CSS v4, assistant-ui
│   ├── api/            # FastAPI, Python 3.12, Pydantic v2, ARQ Worker, PyMuPDF
│   ├── mobile/         # Expo SDK 52+, React Native New Architecture, MMKV, Nitro SQLite
│   └── desktop/        # Electron 33, SQLite embedded database, Context Isolation
├── packages/
│   ├── database/       # Migrations & database schemas (mirrored to supabase/migrations)
│   ├── ui/             # Shared Radix primitives & OKLCH token definitions (Light/OLED/Sepia)
│   ├── types/          # Shared TypeScript DTOs, API contracts, Supabase generated types
│   ├── eslint-config/  # Shared ESLint base configurations
│   └── typescript-config/ # Shared tsconfig bases
├── supabase/
│   ├── migrations/     # Supabase CLI tracked migrations
│   ├── config.toml     # Supabase project configuration
│   └── seed.sql        # Local & staging mock seed data
├── docs/               # Canonical specs (build_roadmap.md, implementation_plan.md)
└── tooling/            # Codegen & type sync utilities (gen-types.sh)
```

---

## 4. Canonical Workflow Commands

| Operation                  | Command                                        | Scope / Notes                                 |
| -------------------------- | ---------------------------------------------- | --------------------------------------------- |
| **Install Dependencies**   | `pnpm install`                                 | Monorepo root                                 |
| **Full Build**             | `pnpm build`                                   | Turbo pipeline (`dependsOn: ["^build"]`)      |
| **Lint All Workspaces**    | `pnpm lint`                                    | ESLint + Ruff                                 |
| **Typecheck TypeScript**   | `pnpm typecheck`                               | `tsc --noEmit` across all TS workspaces       |
| **Run API Pytest Suite**   | `cd apps/api && pytest`                        | Unit & engine integration tests               |
| **Run Web Vitest Suite**   | `pnpm test --filter=web`                       | UI component tests                            |
| **Push DB Migrations**     | `pnpm exec supabase db push`                   | Applies pending migrations to remote Supabase |
| **Reset Local DB + Seed**  | `pnpm exec supabase db reset`                  | Local Supabase Docker environment             |
| **Generate TS DB Types**   | `./tooling/gen-types.sh`                       | Outputs to `packages/types/src/supabase.ts`   |
| **Run Web Dev Server**     | `pnpm dev --filter=web`                        | `http://localhost:3000`                       |
| **Run FastAPI Dev Server** | `cd apps/api && uvicorn app.main:app --reload` | `http://localhost:8000` (`docs` at `/docs`)   |

---

## 5. Key Architectural Patterns & Guidelines

### A. Database Design

- **Unified Tables**:
  - `users`: Replaces split `profiles`, `user_roles`, and `lecturer_profiles`. Scoped by `role` enum (`student`, `lecturer`, `university_admin`, `super_admin`).
  - `documents`: Single table handling admin library monographs and lecturer submissions via `document_status` enum.
  - `chat_messages`: Tree-structured message history using `parent_message_id` for branch generation.
- **Tenancy Scoping**: Strict multi-tenant isolation by `university_id`.
- **Soft Deletes**: `deleted_at timestamptz` with automated daily 30-day purge worker (`purge_soft_deleted_records()`).

### B. Document Ingestion Engine (`apps/api/app/engines/ingestion.py`)

- 8-stage pipeline:
  1. Atomic claim lock (`claim_document_ingestion`)
  2. PyMuPDF parsing & metadata extraction
  3. Cloudflare R2 upload (original & converted)
  4. Structure & table extraction
  5. Semantic chunking (500–1000 tokens, 10% overlap)
  6. Batch vector embeddings via `gemini-embedding-002` (3072 dims)
  7. Postgres transactional write to `document_chunks`
  8. Ingestion heartbeat (`heartbeat_document_ingestion`) & status update to `active`.

### C. AI / LLM Orchestration (`apps/api/app/engines/ai.py`)

- Streaming SSE responses (`text/event-stream`) over HTTP/2.
- Dynamic AI Skill system (`ai_skills` registry) supporting Dosage Calculator, Drug Interaction Checker, Chemical Reaction Drawer.
- Multi-tier circuit breaker: Gemma 4 -> Groq LLaMA 3.3 -> OpenRouter.

### D. Authentication & Security

- Asymmetric RS256 JWKS verification in FastAPI against Supabase Auth.
- FastAPI dependency role guards: `require_role(["student", "lecturer", "university_admin", "super_admin"])`.
- Per-client API identity authentication (`X-API-Key` header with SHA-256 validation).
- Compliance: Zero Data Retention (ZDR) policy for AI prompts; automated DSAR and Right-to-be-Forgotten data deletion handlers.

### E. Frontend & UI/UX Standards

- Three semantic themes: **Light**, **OLED Dark**, and **Sepia Warm Reading Mode** using OKLCH color tokens in `packages/ui`.
- 4-layer virtualized PDF Reader with text highlights, snip-to-chat, and sticky AI sidebar.
- Offline-First PWA via `@serwist/next` with 3 caching tiers and IndexedDB outbox sync.

---

## 6. Platform Implementation Sequence

1. **Phase 0–3**: Monorepo Scaffolding, Secrets Validation, Multi-Environment Wiring.
2. **Phase 4**: Database Foundation (Schema, Extensions, RLS, Seed, Functions).
3. **Phase 5–7**: Document Ingestion Engine, AI Orchestration, Auth Backend & Pytest API Gates.
4. **Phase 8–17**: Walking Skeleton UI, Design System, PDF Reader, AI Chat, Learn Mode, Quizzes, Notes, Portals.
5. **Phase 18–19**: Credits & Nigerian Payments (Paystack/Flutterwave), Transactional Email (Resend).
6. **Phase 20–22**: Mobile App (Expo SDK 52+), Desktop App (Electron 33), PWA Offline Engine.
7. **Phase 23–29**: Public Pages, Security Hardening, Observability (Sentry + PostHog), Load Testing, Production Launch.
