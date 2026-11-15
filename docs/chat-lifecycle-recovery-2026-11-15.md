# Chat lifecycle recovery — 15 November 2026

User-reported scope: false busy errors after completed replies, untitled conversations after failed first replies, study conversations in general history, hidden question actions during generation, and conversation navigation replacing the whole workspace with a loader.

Implementation stays on `fix/reader-loading-ux`. Preserve the user's uncommitted app loading page, shell loading component and shell stylesheet byte-for-byte; do not merge or publish those drafts.

## Contracts and acceptance

1. **Run lifecycle:** Release the owned run lease before a terminal completion reaches the client. Protect bounded refund/lease cleanup from disconnect cancellation, including a stream that never started its producer. Keep the parallel-run guard and run-ID match; never clear another run's lease or automatically replay inference/tool requests. Verify immediate next sends and cancellation during cleanup.
2. **Failed first replies:** Keep a saved question available for Retry. Schedule backend semantic title generation from saved questions even if generation fails, preserving manual/generated titles and provider privacy gates. Refresh pending titles and history after failures. Hide unused default sessions with no saved question from active history; creating an owned upload/session context alone is not a completed conversation. Provider unavailability can still defer a semantic title; do not manufacture a title from the prompt's first words.
3. **History separation:** General active history and conversation search exclude document-bound sessions. Study history remains scoped to its document and owner. Retain account-level archived/deleted recovery. Public response shapes remain unchanged; preserve `document_id` in the existing frontend session-summary schema and defensively exclude it from general recent chats.
4. **Question actions:** Show Copy and Edit immediately on a sent question. Copy is usable while an answer runs; Edit stays disabled while busy or before persistence is confirmed. Keep assistant mutation/feedback and branch controls guarded.
5. **Conversation loading:** Keep the shell/sidebar mounted. Scope query-string Suspense to its observer, add a chat-route loading boundary, and use a chat-shaped placeholder inside the conversation area while history loads. Keep reader loading behavior and the user's global loading drafts unchanged. Verify delayed history loads, keyboard/navigation behavior, and rejection of stale responses after switching accounts/conversations.

No schema migration, client-provider inference, hosted database mutation or real student fixture is needed. Existing shared DTO/Pydantic shapes remain aligned; backend authorization and owner/university isolation remain authoritative.

## Provider incident follow-up

The user supplied logs showing a Groq TLS connection timeout, Google timeouts/server errors, and capacity deferrals. A stream HTTP 200 only establishes the SSE transport; semantic routing can still fail inside it. The assistant also misidentified itself as ChatGPT.

Keep semantic routing backend-authoritative and fail retryably if no eligible model returns a valid decision. Give eligible provider families a fair share of a bounded 24-second routing window (8 seconds per attempt by default), retaining model ordering, privacy gates, capacity admission, circuit breakers and cancellation. Never replay the whole chat/tool request to recover a routing failure. Emit the existing recovery event during automatic retry/failover so the existing thinking UI shows it. Request minimal thinking for the Google routing fallback. Set explicit PansGPT identity instructions in both routing and regular response prompts without matching identity questions against phrase lists.

For a transport failure proven to occur before sending an HTTP request (connection/TLS establishment or pool acquisition), settle its local token reservation to zero. Keep attempt counts and provider-reported remaining limits conservative. Do not refund token estimates for ambiguous write/read failures, provider timeouts after submission, or partial generation. Verify transport stages, cancellation, capacity settlement, family budgets, privacy exclusion and existing retry/error UI.

## Verification and Engineering handoff

Verified locally:

- Full offline API suite: **1,058 passed, 90 skipped** using `ENABLE_GOVERNANCE=false uv run pytest -q`. An earlier run inherited a local governance override and failed 18 upload fixtures; the default feature configuration passes. No production feature flag was changed.
- Real PostgreSQL chat/API checks: **9 passed, 1 deselected** against a separate loopback-only synthetic database, with inference/storage/credits mocked and each test rolled back. Covers owner isolation, normal/study history and search separation, empty upload contexts, manual empty names, archived study recovery, saved failed questions, Retry without duplication, new questions after failure, immediate follow-ups, branches, feedback and lease cleanup. The disposable schema uses selected canonical versioned DDL with RLS enabled; this does not replace the full Supabase Auth/RLS/provider release gates. The existing RLS-specific live case was deliberately excluded from this subset environment. The rollback fixture uses `clock_timestamp()` only inside its transaction so statement order is not frozen by the outer test transaction.
- Browser checks: **21 passed** across three focused runs (10 lifecycle/planner, 9 saved-history/reader/retry, 2 automatic-recovery checks). Covers desktop/mobile immediate question actions, Copy during inference, guarded Edit, failed-question naming refresh, delayed history loading with an interactive sidebar, query suspension, mobile routing, search, branches, feedback, long-history virtualization, planner drafts/account changes, document history, reader loading/failures and thinking-style recovery with one message POST.
- Web unit suite: **93 passed**. Workspace typecheck passed (11 packages in scope, 6 applicable tasks). Web ESLint, backend Ruff lint/format, changed TypeScript/Markdown formatting and diff checks passed.
- Next production build passed. Its OAuth-provider settings fetch timed out during prerendering; the existing fallback handled it and the build completed successfully. No live LLM requests were made for these checks.
- The user's three original loading drafts retain their original SHA-256 hashes and remain outside this change. Work remains on `fix/reader-loading-ux`; no push or main merge is part of this task.

Synthetic design previews: [chat-area loader with sidebar](design-system/chat-lifecycle-2026-11-15/conversation-loading-desktop.png), [question actions on desktop](design-system/chat-lifecycle-2026-11-15/question-actions-desktop.png), [question actions on mobile](design-system/chat-lifecycle-2026-11-15/question-actions-mobile.png).

Provider outages can still exhaust every eligible fallback. Retain the simple terminal error and Retry in that case. Prompt identity and failover behavior are covered with synthetic provider output; hosted Google/OpenRouter performance and model adherence are not claimed as verified. A semantic title can remain pending if title providers are unavailable. No provider privacy exception, quota limit or paid service was added.

No Notion tools are available in this session. Pending Engineering entries:

- **Session / Change Log:** Fix chat run completion, failed-question naming, study/general history separation, question actions and scoped loading; improve bounded routing failover, unsent token accounting and PansGPT identity. **Date:** 2026-11-15. **Area:** API / chat / reader / shell. **Files Touched:** API chat/interaction/title/routing/guard/capacity engines and routes, config/env examples and regression tests; web chat actions/header/runtime/loading, shell query observer/history data, summary schema and browser fixtures; canonical routing/roadmap/implementation docs, this record and synthetic previews. **Verified:** Local checks above passed.
- **Decision Log:** Preserve recoverable questions; clean up the owned run before signaling completion; separate document-bound discovery and narrow Suspense boundaries. **Alternatives Considered:** Remove the run guard, hide conflicts, discard failed questions, expose study conversations in general history, or edit the user's global loading drafts.
- **Decision Log (provider follow-up):** Share a bounded routing window across eligible provider families; retain conservative accounting except for transport-proven unsent tokens; use existing thinking recovery and explicit shared identity instructions. **Alternatives Considered:** Unbounded provider retries, restarting a whole chat/tool run, bypassing capacity/privacy gates, marking ambiguous requests as free, or adding phrase-based identity answers.
- **Product Roadmap & Features:** Chat lifecycle and routing recovery fixes implemented and locally verified; hosted release gates remain separate.

Knowledge Base unchanged; these fixes refine the existing routing, recovery and chat architecture.
