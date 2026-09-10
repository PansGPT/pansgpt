# 🛠️ PansGPT 2.0 Developer Playbook

Practical engineering guide for developing, testing, and shipping in the PansGPT monorepo.

---

## 1. How to Add a Database Migration

1. Navigate to `packages/database/migrations`.
2. Name the file: `YYYYMMDDHHMMSS_action_name.sql`.
3. Include both up migration, table definitions, and RLS policies.
4. Verify locally using `supabase db reset` or against your dev database.
5. Run `pnpm --filter=@pansgpt/database db:types` (or `tooling/gen-types.sh local`) to refresh `packages/types/src/supabase.ts`.

---

## 2. How to Add an API Route in FastAPI

1. Create a new router module in `apps/api/app/routers/[feature].py`.
2. Define request and response schemas using Pydantic v2 in `apps/api/app/models/[feature].py`.
3. Register the router in `apps/api/app/main.py` with appropriate tag and route prefix (`/api/v1/...`).
4. Add corresponding pytest suites in `apps/api/tests/test_[feature].py`.
5. Verify OpenAPI documentation loads and validates at `http://localhost:8000/docs`.

---

## 3. How to Connect Web to API

1. Client components must call typed helper functions in `apps/web/lib/api.ts` or feature query hooks.
2. All endpoints proxy through `API_BASE_URL` (configured via `apps/web/env.ts`).
3. Set the appropriate headers (`Authorization: Bearer <token>`, `Content-Type: application/json`).
4. Never expose service role or upstream AI provider API keys in client-side code (`apps/web`).

---

## 4. How to Add a Shared Type

1. Define your interface or type in `packages/types/src/[domain].ts` (e.g., `chat.ts`, `document.ts`, `user.ts`).
2. Export the type from `packages/types/src/index.ts`:
   ```ts
   export * from "./[domain]";
   ```
3. If the type is derived from Supabase schema, run `tooling/gen-types.sh` to update `packages/types/src/supabase.ts`, then export convenience alias types (e.g., `export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"];`).
4. Consume in any application via `@pansgpt/types`:
   ```ts
   import type { ChatSession } from "@pansgpt/types";
   ```
5. Run `pnpm turbo typecheck` from the repository root to verify all workspaces compile without errors.

---

## 5. How to Add a Feature Flag

1. **Define the Flag**: Add the feature flag key and default boolean value to `packages/config` or `apps/web/config/flags.ts`:
   ```ts
   export const FEATURE_FLAGS = {
     NEW_PDF_READER: process.env.NEXT_PUBLIC_FF_NEW_PDF_READER === "true",
     VOICE_STT_INPUT: process.env.NEXT_PUBLIC_FF_VOICE_STT === "true",
   } as const;
   ```
2. **Backend Guard (if applicable)**: For API endpoints gated by flags, verify the flag in `apps/api/app/core/config.py` via Pydantic settings, or check tenant/feature overrides in the database.
3. **Frontend Component Branching**:
   ```tsx
   import { FEATURE_FLAGS } from "@/config/flags";

   export function StudyViewer() {
     if (FEATURE_FLAGS.NEW_PDF_READER) {
       return <VirtualizedPDFViewer />;
     }
     return <StandardPDFViewer />;
   }
   ```
4. **Environment Configuration**: Add the variable to `.env.example` across affected workspaces with a safe `false` default for production.

---

## 6. How to Debug SSE Streaming

FastAPI streams AI responses over Server-Sent Events (`text/event-stream`).

1. **Verify Response Headers**: Ensure the endpoint sets:
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no` (critical for Nginx/Render proxies to prevent buffering)
2. **Curl Streaming Test**:
   ```bash
   curl -N -X POST http://localhost:8000/api/v1/ai/chat/sessions/<SESSION_ID>/stream \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"message": "Summarize chapter 1"}'
   ```
   _Note: The `-N` flag disables curl output buffering so tokens appear immediately._
3. **Verify Event Formatting**: Each SSE event frame must strictly follow:
   ```text
   event: text_chunk\n
   data: {"content": "token"}\n\n
   ```
   A missing double newline `\n\n` will cause client parsers (`eventsource` / `fetch-event-source`) to stall.
4. **Keep-Alive & Aborts**:
   - Check that a comment heartbeat (`: ping\n\n`) is dispatched every 15 seconds during long processing.
   - Test client disconnection to ensure the backend generator cleans up asyncpg and LLM streaming tasks upon `http.disconnect`.
