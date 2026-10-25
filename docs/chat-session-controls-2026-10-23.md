# Chat layout and session controls — 23 October 2026

> Later user feedback changes the primary Send/Stop behavior, greeting, progress and popup styling. See [public progress and chat polish](chat-progress-and-controls-2026-10-23.md) for current behavior. The restored compact input and original branch switches remain.

User-directed scope: vertically centered welcome with the original compact input (the user later reverted the enlargement); remove prompt-action chips and the course-search/document-reading/web-search/image-analysis welcome starters; a title dropdown, per-conversation menus and Share; multiline text above the input controls; the existing inline version navigation for edited questions (restored by later user direction).

## Agreed contracts and states

- `GET /ai/chat/sessions?archived=false|true`: owner-scoped live/archived lists, pinned first. `GET /ai/chat/sessions/{id}/metadata`: owned metadata without reloading messages.
- `PATCH /ai/chat/sessions/{id}` accepts one or more of `title` (trimmed, 1–120 characters), `is_pinned` (boolean), `archived` (boolean); rejects null, unknown fields and empty updates. Returns `ChatSessionMetadata` matching the existing session response plus `is_pinned` and `archived_at`.
- `DELETE /ai/chat/sessions/{id}` returns 204 after soft deletion. Missing/foreign/deleted sessions return 404; unavailable storage 503. Archiving/deleting during an unexpired answer lease returns 409. All changes require authenticated university membership and session/document authorization. No direct client database writes.
- Add `is_pinned boolean NOT NULL DEFAULT false` and `archived_at timestamptz` through mirrored versioned SQL, retaining existing RLS and grants. Resume in an archived conversation automatically unarchives it. Archived chats remain accessible through an explicit list and Restore action.
- Menus show pending/error/retry states and persist only successful responses. Rename has a bounded input; Delete requires a review/confirmation step. Removing the current conversation returns to a fresh welcome. Sample conversations stay explicitly synthetic.
- Share opens a preview of a copy of the selected branch: visible user/assistant text and attachment names only. Copy/download require a user action. Exclude hidden branches, reasoning, tool internals, tokens and private attachment URLs. This does not publish a public link; planned public-link sharing remains a separate release gate.
- Native assistant-ui compact mode keeps the empty/short input inline; wrapped or multiline text moves above a stable bottom toolbar. The user later reverted the enlargement: restore the original 53px minimum, 45rem desktop width, 6px padding and 14px input type across welcome/conversation, preserving the requested multiline toolbar behavior. Default/one-line inputs have fully pill-shaped corners; expanded inputs retain comfortable rounded corners. Later user direction restores the original branch arrows/counter beside Copy/Edit; the alternative placement was reverted.

## Verification and delivery

- Supabase CLI dry-run identified only `20261023150000_chat_session_controls.sql`; CLI push applied it to staging project `nrzbjhqtcxlfiyvoeanb`. All 33 migration files match their mirrors by SHA-256. No production push, manual SQL Editor changes, student-data deletion or live AI calls.
- Five real SQL/API journeys passed in automatically rolled-back synthetic staging transactions: organization/listing, rename validation and ownership, active-run protection, automatic unarchive on resumed chat, and existing branches/feedback/attachments/RLS. These are ASGI tests against the real database, not a deployed Render journey.
- Full offline API suite: **496 passed**, 19 live cases deselected. Targeted session/chat contracts: **50 passed**. Ruff passes for affected Python sources/tests and the bounded catalog helper.
- Both actual-component Chrome browser journeys pass: original 53px/default pill restored, equal default welcome/conversation width, vertically centered desktop greeting/input/Tools, no prompt chips, four/eight tool cards, explicit newline and naturally wrapped mobile text above the toolbar, original inline branch controls, Dark/Light/Sepia, 240-turn virtualization, attachments and voice cancellation. Session journey verifies title/sidebar menus, pin state, rename failure/retry, archive/restore, cancel-before-delete, successful deletion, focus return and selected-branch copy/download without reasoning or other branches. No page errors in the final run.
- Web TypeScript, affected web ESLint, sixteen web unit tests, CSS references and whitespace checks pass. In-app browser attachment failed with `missing field sandboxPolicy`; verification used installed Chrome. Earlier development runs emitted a transient ResizeObserver notification; the final two browser journeys completed without it.
- Read-only bounded catalog refresh updated the three chat table definitions and checked all 52 public table/column-name contracts. Full Supabase CLI-generated type certification and disposable replay of migration 33 remain CI gates; this fallback is not a full CLI type generation claim.
- Final isolated Next.js production build passed, including TypeScript and all 16 pages. It used disposable settings, disabled webpack disk caching and left the running developer servers alone. Verified that copied application/contract sources match the current workspace. The 204 pre-existing CSS-optimizer warnings from slash-named Figma preview token strings remain a separate source-scanning issue; they are not new chat-layout errors. Hosted API/worker deployment, physical-device verification, full disposable-auth CI, AI-generated short titles, full-text history search, public share links and overall Phase 11 remain open.

## Files and plan

API session router, chat schemas/list/history, run-claim engine, registration and pytest contracts; mirrored migration 20261023150000; shared chat DTOs/catalog types; web session requests, menus/header/sidebar/archive recovery, native composer layout, message action placement and browser fixtures/assertions; canonical roadmap/implementation plan. Earlier palette/composer records are historical; this record governs the later reverts and session scope.

## Notion handoff

No callable Notion connector is available; these entries have not been remotely synchronized.

- Session / Change Log: Refine chat layout and add owned session controls. Date 2026-10-23; Area Web / API / Database; Files above; Verified for the local and transactional checks named above, not hosted rollout.
- Decision Log: Persist pin/archive on existing owned sessions via FastAPI, use soft deletion and existing lease fencing, and expose selected-branch copy/download without public publishing. Retain the original input/branch design by user direction while keeping multiline toolbar behavior. Alternatives: local-only organization, a separate metadata authority or public-link infrastructure in this UI scope.
- Roadmap: Phase 11 remains In Progress; session controls and copy sharing are locally verified. Retain public links, full-text search, short AI titles and release gates.
- Knowledge Base: no update; the shared semantic UI and backend-owned authorization/transport patterns are unchanged.

## Reviewed previews

- [Welcome with original compact input](design-system/chat-session-controls-2026-10-23/desktop-welcome-dark.png)
- [Chat title dropdown and original branch controls](design-system/chat-session-controls-2026-10-23/desktop-title-dropdown-dark.png)
- [Mobile conversation](design-system/chat-session-controls-2026-10-23/mobile-conversation-dark.png)
- [Expanded desktop input](design-system/chat-session-controls-2026-10-23/desktop-expanded-input-dark.png)
- [Expanded mobile input](design-system/chat-session-controls-2026-10-23/mobile-expanded-input-dark.png)
