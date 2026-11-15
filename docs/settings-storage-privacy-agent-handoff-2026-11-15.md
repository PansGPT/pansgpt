# Agent handoff: functional Data & Storage and Privacy & Data

## Assignment and delivery order

Implement the existing Settings controls for **Data & Storage**, then **Privacy & Data**, preserving the approved desktop/mobile design. The user will give this brief to another agent. Return reviewable commits and verification evidence to the original agent; after review, that agent will start the core chat/reader/quiz journeys. Do not start those core-journey changes as part of this assignment.

Read repository `AGENTS.md`, relevant nested instructions, `docs/build_roadmap.md`, `docs/implementation_plan.md` (Settings, Support and Security sections), and `docs/settings-functionality-2026-11-15.md`. Existing specifications and architectural/security gates apply. The legacy `../pansgpt-eli` is reference material only.

Work in two reviewable increments: A, device storage; B, privacy/data management. Finish A before expanding into B. This is implementation work, not a request to return only an audit or plan.

## Branch, working tree and protected work

- Reviewed starting point: `9cf7651` on `fix/reader-loading-ux`; its parent Settings implementation is `c94a8a0`. Verify the actual HEAD and any newer work before proceeding; these hashes are context, not permission to reset anything.
- Use a separate feature branch, preferably `feature/settings-storage-privacy`. If another agent/dev server is using the current checkout, use an isolated worktree rather than switching its branch.
- Four unrelated working-tree drafts existed when this handoff was written: `apps/web/app/app/loading.tsx`, `apps/web/components/shell/loading.tsx`, `apps/web/components/shell/shell.css`, and `apps/web/next-env.d.ts`. Preserve them byte-for-byte and exclude them from your commits. Record hashes before work and verify afterward. Builds/dev tools may regenerate `next-env.d.ts`; preserve the original file and inspect such changes carefully.
- Keep normal secret scanning, formatting and commit hooks. No force operations, merge, push, deployment, hosted migrations or real-account deletion are authorized by this brief. Local implementation, local versioned migration files and disposable tests are authorized.
- Do not overwrite unrelated changes. Do not read, copy, print or commit credentials from either repository.

## Preserve the design and feedback conventions

- Wire the existing screens, navigation, row layout, mobile grouping and rounded containers. Do not redesign them or change the agreed labels/layout simply to make implementation easier.
- New management content should reuse the existing desktop dialog/mobile subpage or sheet patterns. Keep it simple; no new dashboard, wizard or replacement Settings navigation.
- Loading: small accessible spinner. Success/nonblocking operation failure: the compact text-only toast established in the Security section, without status icon or close button, with a short automatic dismissal. Do not put large status paragraphs into the page.
- Initial list/load failures need a compact persistent error and round retry icon so users can recover. Keep field validation beside its field. Preserve drafts/selections on failure. Report success only after the actual operation succeeds.
- Opening an overflow menu must never perform its action. Disable duplicate submissions while pending. Preserve focus, Escape, keyboard navigation, reduced-motion preferences and accessible announcements.
- Clear account-specific lists, object URLs, pending state and owned notifications on account/university changes. A late response from account A must not change account B's UI.
- Preserve all three themes. No new UI dependency is needed. Read the installed Next.js documentation before changing its routes/server APIs.

## Current implementation map: inspect before changing

| Area                                      | Starting points                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storage screen and synthetic figures      | `apps/web/components/shell/settings/sections/data-storage-section.tsx`, `settings-preview-data.ts` in the parent Settings directory                                                                                                        |
| Privacy screen                            | `apps/web/components/shell/settings/sections/privacy-section.tsx`                                                                                                                                                                          |
| Existing confirmation UI                  | `apps/web/components/shell/settings/delete-history-dialog.tsx`                                                                                                                                                                             |
| PDF disk copies                           | `apps/web/lib/reader-pdf-cache.ts`                                                                                                                                                                                                         |
| Thumbnail disk copies                     | `apps/web/lib/document-thumbnail-cache.ts`                                                                                                                                                                                                 |
| Current Settings API/transport/contracts  | `apps/api/app/routers/settings.py`, `apps/api/app/models/settings.py`, `apps/web/lib/settings.ts`, `apps/web/lib/settings-proxy.ts`, `packages/types/src/settings.ts`                                                                      |
| Compact feedback and account lifecycle    | `apps/web/components/shell/settings/use-account-security.ts`, `sections/security-section.tsx`, `settings-modal.css`                                                                                                                        |
| Conversation list/archive/delete/recovery | `apps/web/lib/chat-sessions.ts`, `apps/web/lib/chat-history.ts`, `apps/api/app/routers/chat.py`, `chat_sessions.py`, `chat_discovery.py`                                                                                                   |
| Uploaded chat attachments                 | `apps/api/app/routers/chat_interactions.py`; inspect existing preview/removal rules and attachment/message references                                                                                                                      |
| Saved feedback                            | `public.support_tickets`, `public.support_ticket_replies`; the existing Settings endpoint currently submits reports                                                                                                                        |
| Retention and physical file cleanup       | Versioned retention migrations, `apps/api/workers/maintenance.py`, and existing durable `storage_cleanup_jobs`                                                                                                                             |
| Useful tests                              | `apps/web/tests/reader-pdf-cache.test.mjs`, `settings.test.mjs`, `root-session.test.mjs`, `tests/chat/settings.spec.cjs`, `tests/chat/settings-functionality.spec.cjs`, `apps/api/tests/test_settings.py`, related live conversation tests |

Treat this as a navigation map, not proof every planned endpoint exists or is safe to reuse unchanged. Discover capabilities and contract mismatches first.

## A. Data & Storage: required implementation

### A1. Measure actual device storage

- Replace production sample totals/counts/breakdown with measured storage for the current user **and university**. Synthetic values belong only in an explicitly marked preview/test adapter.
- PDFs and thumbnails already use private browser **Cache Storage**, not localStorage or an implemented full offline PWA. Inspect their namespaces, bounds, revisions, expiry, read authorization and cleanup behavior.
- Count the actual local PDF copies and cached previews. Define whether a count is documents or cached revisions and keep the list, count and byte totals consistent. Use bounded enumeration/body reads and truthful fallbacks when metadata is absent.
- `navigator.storage.estimate()` is origin-wide and may be approximate; never present it as the signed-in account's measured PDF usage. Do not download remote documents just to measure storage.
- Distinguish empty storage from unavailable/blocked/private-browsing storage. An error is not zero bytes. Handle quota failures and absent Cache Storage without blocking normal reading.
- Label these as app-managed local copies; the app cannot enumerate or remove arbitrary files in the OS Downloads folder. Cached reading must retain the reader's existing access checks; do not promise complete offline access or implement a new PWA engine.

### A2. Manage and remove local copies

- Enable Manage with an actual list of the current account's saved PDFs, meaningful available metadata and per-item removal. Resolve titles through authorized metadata if needed; do not bypass document authorization to retrieve a cached file or disclose another account's cached titles.
- Enable Remove downloads for those local PDF copies only. Preserve library/cloud source documents, chat attachments, reader progress/highlights and other study records. Use a concise confirmation for a bulk removal and show confirmed counts afterward.
- Enable Clear cache for the temporary-preview category described by its row. Keep saved PDFs/downloads intact and leave auth cookies, tokens, preferences, unsent drafts and unrelated origin data alone.
- These actions are scoped to the current account/university. **Do not use `clearPdfCopies(owner)` or `clearThumbnailCaches(owner)` as “clear this owner's data”: their existing `keep` argument preserves that owner and deletes other namespaces.** Existing sign-out cleanup has different semantics and must remain effective.
- Existing cache helpers intentionally swallow some failures to protect reading/sign-out. Settings mutations need truthful results; introduce strict management operations rather than claiming success from a swallowed exception.
- Coordinate clearing/removal with in-flight cache writes, account changes and reader activity. Old pending work must not recreate a removed copy immediately after a successful clear. Preserve reader fallback to a new authorized network load when appropriate.
- Refresh usage/list state after confirmed changes and reconcile changes from another tab. Never delete another account's namespace as a shortcut.

## B. Privacy & Data: required integration and explicit boundaries

Start with a short capability matrix in your implementation notes: control, existing backend capability, typed contract needed, implementation status and verification. Then implement the controls below. Do not make unsupported controls look functional.

### B1. Existing information and conversation controls

- Connect Privacy policy and the data-use/protection rows to existing accurate policy content or small in-context views. Follow `docs/provider-privacy.md`: do not invent verified ZDR, training opt-outs, retention guarantees or controls the backend does not enforce.
- Connect Archived chats to owned archived conversations with open/unarchive behavior. Connect Deleted chats to the existing retained-trash list and restore operation. Respect pagination, tenancy, retention and inaccessible/missing records.
- Keep normal-chat and document-study histories correctly scoped. Opening a study conversation must preserve its document context; do not pollute normal chat history with study sessions.
- Wire review-before-delete from Data & Storage to a real owned conversation selection/review flow. Clearly define the selected/bulk scope. Reuse soft deletion and recovery; do not hard-delete messages/files or change retention policy.
- The existing `DeleteHistoryDialog` currently claims permanent, unrecoverable deletion. Correct that copy when wiring it: the existing conversation policy allows owner recovery for 30 days. Verify active-run cancellation/release and shared/generated-file reference safety when deleting history; reuse established backend operations rather than inventing client-authoritative deletion.

### B2. Owned uploads and feedback

- Implement an owned uploaded-files list with bounded pagination and existing authorized preview/download behavior. Preserve the distinction between personal uploads, chat attachments and institution-managed library content.
- Only offer removal when the backend's reference/ownership rules allow it. Do not weaken an existing “attachment is in use” restriction or delete an institutional library document to satisfy a personal-file button. Reuse durable physical cleanup; preserve files referenced elsewhere.
- Implement My feedback/Your feedback from the existing support records. Users may see their own submission, category, dates/status and any genuinely public replies supported by the contract. Never expose staff internal notes, other users' reports, private diagnostics or a simulated support conversation.
- These owner features must not require switching on the administrative governance feature flag or impersonating a staff role. Extend the authenticated Settings contracts where necessary.

### B3. Exports and shared chats: do not silently expand scope

- Inspect whether a supported export or shared-chat backend already exists. Planned routes in the architecture document are not evidence of an implemented API.
- Reuse working owned export capabilities if present. Otherwise record the specific proposed study/account export inventory, format, size limits, lifetime, authorization, cleanup and contract in the handoff to the reviewer. A newly built general account-export/DSAR engine is a separate security-sensitive increment; do not quietly add one to this wiring batch or label a partial chat download “complete account data.” Keep the existing export control honestly unavailable until its complete backend contract and integration are implemented and verified.
- Similarly, manage/revoke existing owned shares if that capability exists. If public chat sharing is not built, keep Shared chats clearly unavailable and report that dependency; do not invent a zero-share response or launch a new public-sharing system.
- Full DSAR/account erasure, new public-sharing infrastructure, payments, pricing, native apps, full offline PWA work, Notes and core AI/reader/quiz changes are outside this batch. Finish all independent A/B1/B2 work; do not stop the entire assignment because one separately scoped capability is unavailable.
- The final report must list these remaining controls explicitly. Do not claim all of Settings/Privacy or the whole roadmap phase is complete.

## Contracts, backend and data safety

- Record typed DTOs, states and acceptance criteria before enabling new integration. Shared TypeScript DTOs go in `packages/types`; mirror them with strict Pydantic models and API contract tests. Row types are not public API contracts.
- All owned backend reads/writes require verified identity and university/owner authorization, bounded queries and appropriate client identity. Keep private responses/downloads no-store. Never accept user-supplied owner/university IDs as authority.
- Reuse the fixed same-origin Settings proxy where suitable; expand only its explicit method/path/query allowlist. Keep client API keys server-side. No arbitrary proxy URLs or public R2 links for private files.
- Browser-cache management remains browser-local; do not add backend endpoints pretending to measure a device's Cache Storage. Use backend contracts only for server-owned records/metadata/actions.
- Add versioned migrations only when necessary, with UUIDv7 application IDs, RLS/grants and aligned generated types. No SQL Editor changes or runtime DDL. Do not mutate Supabase Auth schema or change existing retention/security policies.
- Prevent duplicate mutations, false-success UI and account-switch races. Retry safe reads where useful; preserve idempotency for retryable writes and do not blindly replay a destructive operation after an ambiguous response.
- No real student data in committed fixtures. No live-user deletion/session revocation for testing. Do not log sensitive request bodies, tokens, file contents or exports.

## Acceptance checks and review evidence

Use meaningful tests matched to the change; fixtures prove only the frontend scope exercised.

1. **Device storage:** exact measured synthetic bytes/counts; empty/unavailable states; stale/expired entries; malformed metadata; owner/university separation; removal of one/all owned PDF copies; preview clear preserves PDFs; cloud records untouched; an in-flight write/account switch cannot resurrect or leak removed data; real browser Cache Storage journeys.
2. **Privacy APIs:** signed-out and cross-owner/tenant denial; pagination; archived/trash separation; retention boundary and restore; bulk-delete scope; upload references/cleanup; feedback isolation and internal-note exclusion. Exercise applicable SQL against a disposable transaction/local database, not only string-matching mocks.
3. **UI:** desktop and mobile, existing themes/layout, spinner, compact toast, persistent recoverable list error, failed actions retain rows/drafts, double clicks, focus/Escape, account changes and late responses. Update obsolete “Sample storage” expectations only after replacing the live implementation with real measurements.
4. Run applicable lint, workspace type checks, API pytest/contract checks, web unit/browser checks and Next production build. Read repo scripts/current environment first; use `pnpm.cmd` under PowerShell if its script execution policy blocks `pnpm.ps1`. Avoid heavy build/Chrome jobs concurrently on this machine. Never skip hooks to get a commit through.
5. Record exact commands, counts, skips, failures fixed and remaining verification limits. A mock Auth or local SQL run is not hosted provider/native-device/production verification.
6. Update canonical roadmap/implementation notes accurately. Follow the Notion Engineering protocol; if no connector is available, leave a concise pending structured entry with Summary, Date, Area, Files Touched and actual verification instead of claiming it synchronized. Add decisions/alternatives; update Knowledge Base only for an actual core-pattern change.

## Return this to the original agent for review

- Branch/worktree, starting base and final commit SHA(s); no unsolicited push or merge.
- What works in A and each B category; exact remaining export/share dependencies and any other unimplemented controls.
- Contract/migration changes and their compatibility/security implications.
- Test commands/results, screenshots of the unchanged desktop/mobile design with real operations, and a short reproducible manual-review path.
- Preservation check for pre-existing drafts and final working-tree status; identify any intentional uncommitted work.
- Hosted checks still pending, documented limitations and location of the Notion handoff.

The original agent will inspect the diff, run targeted independent checks and resolve findings before starting the core study journeys. Do not pre-empt that review by marking unverified release gates complete.

## Handoff document record

Notion connector unavailable when authored. Pending Session / Change Log: Summary **Storage/privacy implementation handoff**; Date **2026-11-15**; Area **Phase 17 / Planning**; Files Touched **this brief and `docs/build_roadmap.md`**; Verified **document formatting, source-path review and scope review only; no feature implementation or runtime test is claimed**. Decision Log: preserve the approved UI and existing ownership/retention patterns, split storage/privacy into reviewable increments, and keep new export/DSAR/public-sharing engines explicitly separate rather than silently expanding a wiring task. Product Roadmap: **handoff ready; implementation pending**. No Knowledge Base change: authoring this brief changes no core architecture.
