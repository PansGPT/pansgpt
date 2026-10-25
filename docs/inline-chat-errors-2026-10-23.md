# Inline chat errors — 23 October 2026

The latest user screenshot showed Steps near the question and a timeout warning above the fixed composer, separated by most of the viewport. The message error had been copied into global operation-error state and rendered in the footer.

- Render response failures inside their assistant message, after Steps or partial response content. Preserve partial text, use a single accessible alert, shared error color and 13px text, and avoid the additional “No response was returned” placeholder on errors.
- Stop copying response failures into composer error state. Input validation, voice, attachment and other operation errors keep their existing feedback path. Composer geometry and branch controls are preserved.
- Synthetic browser coverage checks HTTP failure/recovery and SSE timeout-plus-done behavior, empty/partial responses, desktop/mobile placement, a maximum 20px gap from preceding content, no duplicate footer alert and recovery on the next successful turn. All four browser journeys passed. Reviewed previews: [desktop](design-system/inline-chat-errors-2026-10-23/inline-timeout-1440.png), [mobile partial response](design-system/inline-chat-errors-2026-10-23/inline-timeout-390.png).
- Source TypeScript and affected ESLint checks passed; all **22** web unit tests passed. The prior production build was not rerun for this local presentation fix. No backend or schema changes belong to this follow-up; Phase 11 remains In Progress.

The user's subsequent server logs show a separate database availability problem:

- `pooled_connection_acquire_failed_falling_back` means the API could not acquire a usable pooled connection within its acquisition deadline. It then attempts a separate connection.
- `database_connection_failed` plus 503 means that replacement connection also failed; endpoints cannot verify ownership or read session data safely. Startup success proves the initial connection worked, not continuing availability. Interleaved 200/201 responses show the failure is intermittent.
- There are no routing-completion/classification logs for the failed requests. Ownership checks, run reservation/credits and user-message persistence require Postgres before model routing. A 503 may happen before SSE opens; a 200 SSE stream can later hit its overall deadline while waiting for database work before classification. The routing budget does not cover all earlier setup.
- Current database warnings log only `str(exc)`, which can be empty for a timeout; they omit exception class and pool/phase metrics. These logs cannot distinguish exhausted/stale pool connections, stalled queries and network/Supabase pooler availability.
- Confirmed implementation gap: `get_db_connection` gives pooled connections a command timeout, but its transient `asyncpg.connect` fallback omits `command_timeout`; acquisition/connection deadlines do not bound subsequent SQL on that connection. This can prolong a failure until an outer request deadline. Database lifecycle/query deadline instrumentation and recovery are separate remaining work; they have not been implemented or certified by moving the error message.

Notion handoff: no connector is callable; remote sync remains pending.

- Session: Move response timeout errors beside the affected chat turn; 2026-10-23; Web; message renderer, runtime, chat styles, browser regression and canonical docs; Verified for completed checks recorded here.
- Decision: Keep response failures with their message and retain separate operation feedback. Alternative: one global footer error for every failure.
- Roadmap: record inline error placement under Phase 11; keep database availability/deadline investigation open.
- Knowledge Base: no stack/core-pattern change for this presentation fix; record database findings in the session follow-up, without claiming a confirmed infrastructure root cause.
