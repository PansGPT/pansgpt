# Phase 11 chat interactions - 23 October 2026

**Later desktop UI amendment:** The user subsequently approved matching desktop welcome/conversation composers and replacing desktop welcome Recent with Tools. The preservation statements below record the earlier scope; mobile welcome remains preserved. See [desktop Chat update](desktop-chat-tools-2026-10-23.md).

Status: implemented; local integration checks pass. Full Phase 11 and hosted release gates remain open.

## Delivered scope

- Preserve the original welcome greeting, pill composer, suggestions and Recent cards. Only active conversations adopt assistant-ui's registry thread/message/action/composer composition, with PansGPT semantic colors. No Cloud history, client provider keys or browser tool execution.
- Canonical server message IDs in SSE init; native edit and regeneration create non-destructive siblings. The backend reconstructs saved ancestors, ignores client-provided history, checks ownership and serializes inference with fenced session leases. Branch selection persists across reloads; failed selection restores the saved path.
- Durable positive/negative feedback and optional comments on owned assistant messages. UI selection updates only after persistence; failed saves can retry.
- Native file picker for PDF, UTF-8 text/Markdown/CSV and PNG/JPEG. Four files per question; 10 MB each; PDF up to 50 pages; 40,000 extracted characters per file and 50,000 combined. Invalid/spoofed/binary files are rejected. Combined overflow is rejected rather than silently dropping source text.
- Uploads are owner/session scoped and private in R2. API returns metadata, never private keys or extracted text. Deleting an unused attachment or its owning account/session enqueues durable cleanup. Unbound uploads expire after 24 hours. Existing cleanup workers must run for physical R2 removal. Hourly account and request/IP limits precede expensive processing.
- Image analysis and speech transcription use existing backend provider privacy/quota gates. Vision cache now includes account and full prompt, preventing cross-account or different-question reuse. Microphone capture stops on navigation/cancel/error, caps recording at 60 seconds/10 MB, and fills the composer without sending. Permission/unsupported-browser failures are visible.
- Dynamic TanStack virtualization above 80 visible messages, using assistant-ui MessageByIndex and stable IDs. Small chats retain normal native messages.
- Interrupted/failed SSE preserves partial content and error state. A subsequent question walks back to the last saved assistant rather than posting an unsaved optimistic parent ID.

## Database and deployment evidence

- Migration `supabase/migrations/20261023090000_chat_interactions.sql`, mirrored in `packages/database/migrations`, was applied through Supabase CLI to staging project `nrzbjhqtcxlfiyvoeanb`. One pending migration was dry-run before push. No manual SQL Editor actions and no production push.
- There are 32 mirrored migrations. New tables enable RLS immediately: `chat_message_feedback` (owner SELECT, API writes), `chat_attachments` (API only). Direct authenticated INSERT/UPDATE/DELETE on chat sessions/messages is revoked; writes go through authenticated FastAPI. Composite foreign keys enforce same-session parents and attachment ownership.
- Two real staging database/API tests passed with synthetic auth/session records inside outer transactions that always roll back. Real streaming persistence, regeneration, tree selection, feedback, attachments, RLS/grants and cross-owner denial were exercised. Inference, storage and credit services were mocked: these tests did not contact external AI or create R2 objects.
- Full CLI type generation could not run locally: db-url mode requires Docker (unavailable), while project mode lacks usable management authentication. `tooling/sync-chat-schema-types.py` provides a read-only bounded fallback for the three affected table definitions, validates all 52 public table/column contracts, and refuses mismatches. This is not full CLI-generated schema certification. Disposable CI replay/seed and authoritative full type generation remain pending for migration 32.

## Verification

- Full offline API suite: **483 passed, 16 skipped**; Ruff lint and format pass. Two existing dependency deprecation warnings remain.
- The existing oversized-audio regression initially returned 400 while temporary disk space was exhausted, consistent with multipart spooling failing before endpoint validation. After removing only this task's isolated build cache, the single regression and full API suite passed unchanged. No weakened assertion or endpoint workaround.
- Web unit suite: **16 passed**. Web and shared-contract TypeScript pass. Full web ESLint passes. Frozen offline lockfile validation passed; formatting was normalized without changing parsed YAML values.
- Synthetic installed-Chrome browser suite passed editing, regeneration, persisted branch/reload, feedback/retry, failed branch restoration, file upload bindings, voice/transcript insertion, microphone cleanup and permission failure; Dark/Light/Sepia at 1440/375px; 240-turn virtualization and scroll recovery; no horizontal overflow or page errors. A non-fatal ResizeObserver-loop diagnostic appeared during dynamic resizing in the first run.
- Browser tests exercise actual shell/chat/components with synthetic auth and HTTP, not a deployed application or real provider. The source fixture and CI job are versioned under `apps/web/tests/chat`, `playwright.chat.config.ts` and `.github/workflows/ci.yml`.
- Final welcome/recovery browser journey passed, including the greeting, suggestions, Recent section and original pill composer after New chat. The test-only router now models URL changes, and theme checks use the actual ThemeProvider setter instead of redundant full reloads. [Welcome preview](design-system/phase-11-assistant-ui/chat-welcome-1440-dark.png), [desktop conversation](design-system/phase-11-assistant-ui/chat-interactions-1440-dark.png), [mobile conversation](design-system/phase-11-assistant-ui/chat-interactions-375-dark.png).
- Isolated production Next.js build passed, including TypeScript and all 16 pages, with disposable settings and webpack cache disabled to limit disk usage. The snapshot contained the conversation design and interaction integration; the later unsaved-parent recovery and resize-observer adjustments passed source TypeScript/lint and browser verification separately. No developer server was stopped. The 204 pre-existing CSS optimizer warnings from slash-named Figma preview token strings remain a separate source-scanning issue.
- Final resize-observer browser result: the complete journey passed again after scheduling dynamic measurements with requestAnimationFrame; no ResizeObserver-loop diagnostic or page errors occurred. Full web lint and source TypeScript also passed after this adjustment.

## Remaining gates and recommendations

Full Phase 11 still needs named skill renderers, pharmacy drawers, tone controls, sharing, complete session rename/search/soft-delete and end-to-end hosted journeys. Phase 10 PDF reader/snipping is not complete. No live AI inference or real microphone/device test was performed for this change. Staging app/worker deployment and prior native-client gates remain open.

Google/Gemini follows the explicit retention exception documented in `provider-privacy.md`, not verified ZDR. Groq's local flag reflects the user's confirmation of its account control. Other providers remain blocked until attested. No credentials were committed or uploaded to GitHub.

Recommended next assistant-ui additions, after this slice: quote selected text into a follow-up; source previews that open the PDF at the cited page (depends on Phase 10); named progress/result cards for verified backend skills; a backend-controlled exam/concise explanation selector; searchable and renameable conversation history. Keep sharing disabled until its authorization, expiry and revocation contracts exist.

## Notion handoff

No callable Notion tool is exposed in this session; no Notion writes were made.

- Session / Change Log: Enable assistant-ui chat interactions and conversation design. Date 2026-10-23; Area Web / API / Database. Verified only for the explicitly listed local and rollback checks, not hosted rollout. Files: chat page/CSS and components; runtime, history/parser and shared contracts; chat router/models and new interaction engine/router; vision cache; migration 20261023090000 and mirrored SQL; catalog type fallback; browser/unit/API tests and CI; canonical plans and this record.
- Decision Log: Adopt assistant-ui registry composition only after a conversation starts; preserve the approved welcome and PansGPT colors. Keep ExternalStoreRuntime/FastAPI transport rather than Cloud or provider-specific client transports. Persist server-owned branches/feedback, use private bounded uploads and backend MediaRecorder transcription rather than browser speech-provider calls. Reuse existing selected-path flags rather than adding a conflicting active-leaf authority.
- Product Roadmap: Phase 11 In Progress; mark 11.1 primitives and the backend voice integration locally verified. Leave hosted gates, complete 11.2/11.3 and Phase 10 open.
- Knowledge Base: Describe canonical SSE identities, session run fencing, selected ancestor paths, API-only chat writes/private attachments and backend dictation. Preserve the provider retention exception accurately.

## Primary references and attribution

- [assistant-ui registry composition](https://github.com/assistant-ui/assistant-ui/blob/main/packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx); MIT notice retained at `apps/web/components/chat/assistant-ui.LICENSE`.
- [External-store runtime](https://www.assistant-ui.com/docs/runtimes/custom/external-store)
- [Attachment adapter](https://www.assistant-ui.com/docs/api-reference/adapters/attachments)
- [Feedback adapter](https://www.assistant-ui.com/docs/api-reference/adapters/feedback)
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/api/virtualizer)
