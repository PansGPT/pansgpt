# Agent Instructions — PansGPT 2.0

## Core Philosophy & Non-Negotiables
- [Engine-First Sequence]: Build and verify database and backend engines with pytest API tests BEFORE building UI layers.
- [AI Routing]: Clients NEVER invoke LLMs directly. All AI/multimodal inference calls must route through FastAPI (`apps/api`).
- [Migration Governance]: **Zero manual SQL Editor edits in any environment — ever.** All migrations are version-controlled in `supabase/migrations/` and executed strictly via Supabase CLI (`pnpm exec supabase db push`).
- [$0 Free-Tier Architecture]: Utilize Google AI Studio (Gemma 4 & gemini-embedding-002), Groq (LLaMA 3.3), Upstash Redis, Resend (3,000 emails/mo), and Supabase free tier.
- [Strict Quality Gates]: Zero lint/typecheck errors (`"strict": true`, no `any`). CI must pass cleanly before merge.


## Package Manager & Monorepo
Use **pnpm** (v11+) and **Turborepo**:
```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build packages and applications
pnpm lint             # Run linters across all workspaces
pnpm typecheck        # Run tsc --noEmit across all TypeScript packages
pnpm test             # Run test suites (pytest + vitest)
```

## Workspaces & Architecture
| Workspace | Path | Tech Stack |
|---|---|---|
| Web | `apps/web` | Next.js 15 App Router, React 19, Tailwind CSS v4 |
| API | `apps/api` | FastAPI, Python 3.12, Pydantic v2, ARQ |
| Mobile | `apps/mobile` | Expo SDK 52+, React Native New Architecture |
| Desktop | `apps/desktop` | Electron 33, SQLite, Context Isolation |
| Database | `supabase/migrations` | PostgreSQL, pgvector 3072d, RLS, RFC 9562 UUIDv7 |
| Types | `packages/types` | Shared TypeScript schemas & Supabase types |
| UI | `packages/ui` | Shared Radix primitives & OKLCH token definitions |


## Canonical Commands
| Task | Command |
|---|---|
| Apply Migrations (Staging) | `pnpm exec supabase db push` |
| Reset Local DB & Apply Seed | `pnpm exec supabase db reset` |
| Generate TypeScript Types | `./tooling/gen-types.sh` |
| Run FastAPI Pytest Suite | `cd apps/api && pytest` |
| Start Web Dev Server | `pnpm dev --filter=web` |
| Start API Dev Server | `cd apps/api && uvicorn app.main:app --reload` |


## Documentation References
- Canonical Roadmap: `docs/build_roadmap.md` (Source of Truth)
- System Implementation Plan: `docs/implementation_plan.md` (28 Section Specs)
- API Contracts: `docs/api-contracts.md` and Developer Playbook: `docs/dev-playbook.md`


## Commit Attribution
AI commits must include:
```
Co-Authored-By: Antigravity <noreply@google.com>
```
