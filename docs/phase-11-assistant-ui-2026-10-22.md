# Phase 11: assistant-ui integration - 22 October 2026

**Historical record:** The 23 October follow-up implements the capabilities previously left open below. See [current interaction contracts and verification](phase-11-chat-interactions-2026-10-23.md), including the user-approved Google retention exception.

Status: first Phase 11.1 slice implemented and verified locally; full Phase 11 remains in progress. The user authorized starting Phase 11 while Phase 10 remains open, and explicitly requires assistant-ui as the chat foundation. Preserve the approved layout and shared colors.

## First implementation scope

- Use `@assistant-ui/react` external-store runtime with the existing FastAPI session/history/SSE transport. Do not enable assistant-ui Cloud, client-side provider calls or client-side skill execution.
- Use native thread/message/composer/action primitives, rich Markdown/GFM/math, scroll management, cancellation, copy actions, reasoning and tool presentation. Retain authenticated history, citations, artifacts, memory-only Home drafts, New chat reset and academic acknowledgement.
- Keep edit/regeneration/branch controls gated until canonical server message identities and owner-authorized branch operations are implemented and verified. Database tree fields alone do not establish those contracts.
- Attachments, voice, tone controls, sharing and the full generative skill UI remain separate Phase 11 work. Do not pretend disabled capabilities are working.

## Contracts and acceptance

`packages/types/src/chat.ts` records the existing stream request and validated discriminated SSE event payloads, plus a client-only message presentation type. FastAPI continues to own persistence, retrieval, tools, privacy and quotas. Existing endpoints: `POST /api/v1/ai/chat/sessions`, `GET /api/v1/ai/chat/sessions/{id}`, `POST /api/v1/ai/chat/sessions/{id}/stream`.

A successful response requires an explicit `done` event. Interrupted/failed streams preserve partial content and release the generating state. An error followed by `done` remains an error. Abort during session creation must never dispatch inference afterwards. Changing conversations/verified identities must abort old work. Unsupported content must not dispatch requests. Markdown must not execute raw HTML or fetch arbitrary response images. Provider eligibility stays strictly blocked unless independently attested.

Verification uses synthetic responses and offline contracts, with no live AI calls or hosted data mutations. This completes the first local integration slice, not all Phase 11 capabilities or hosted release gates.

## Local verification

- Web TypeScript, shared-contract TypeScript and full web lint passed.
- All 16 web unit tests passed. Four new regressions cover partial/error completion, cancellation versus missing `done`, reasoning/tool/artifact/source state and unsafe URL handling.
- All 58 targeted offline chat, deadline and tenant-security API tests passed. Existing dependency deprecation warnings are unchanged.
- Installed-Chrome preview passed six combinations: 1440/375px in Dark, Light and Sepia. Native message rendering, Markdown/GFM tables, KaTeX, source chips, existing artifacts and native tool-part status rendered successfully, with no horizontal overflow.
- Message/code copy, partial-response cancellation, unfinished-tool interruption, error followed by `done`, EOF without `done`, cancelled session creation, saved history, foreign-owner rejection, native latest-message scrolling and acknowledgement-before-dispatch passed. No third-party image/script fetches or browser errors occurred.
- [Desktop synthetic preview](design-system/phase-11-assistant-ui/assistant-ui-1440-dark.png) and [mobile synthetic preview](design-system/phase-11-assistant-ui/assistant-ui-375-dark.png) were reviewed. The isolated preview uses actual shell/chat/UI components and synthetic auth/data/navigation/HTTP adapters. It does not certify real auth, hosted inference, production utility styling or artifact downloads.
- The existing disposable-auth CI journey now asserts rich assistant-ui messages and late-session cancellation. It has not been executed against the new source in CI yet; its earlier passing runs do not verify this change.
- The isolated production Next.js build passed, including TypeScript and all 16 pages. The initial root-directory launcher failed to resolve the config's `./env` import; launching from its app directory resolved that harness issue. The successful build emitted 204 CSS optimizer warnings involving slash-named Figma token strings present in existing UI preview data (`packages/ui/preview/{radio,field}-layout-data.ts`); source-scanning/build cleanup remains separate. The running developer app was not stopped.

## Compatibility and remaining work

The installed versions are `@assistant-ui/react` 0.15.30 and `@assistant-ui/react-markdown` 0.14.23. Use the current `useAui` API and capability-based external-store callbacks. Match directly imported KaTeX CSS to the renderer's 0.16 series. New dependencies and the lockfile are versioned; no new credentials or migration are required.

Long-history virtualization, persisted branches/edits/regeneration, feedback, named skill UI wrappers, full pharmacy drawers, voice, attachments, tone controls, sharing and complete session-management/search remain open. Provider flags remain unverified/blocked under strict ZDR. The first native tool renderer displays server-owned progress/results only; it does not execute tools in the browser.

Files: chat page/styles and native composer, new message/runtime components and pure message reducer, shared chat contracts/parser re-exports, package manifest/lockfile, unit and disposable-auth browser assertions, canonical plans and these synthetic previews.

## Sources

- [External-store runtime](https://www.assistant-ui.com/docs/runtimes/custom/external-store)
- [Thread primitives](https://www.assistant-ui.com/docs/api-reference/primitives/thread)
- [Message primitives](https://www.assistant-ui.com/docs/api-reference/primitives/message)
- [Composer primitives](https://www.assistant-ui.com/docs/api-reference/primitives/composer)
- [Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files) (reference for the separately observed preview-data scan warnings)

## Notion handoff

No callable Notion connector is available in this session. Session: begin Phase 11 assistant-ui runtime integration; Area Web / Chat / Shared Contracts. Decision: retain server-owned transport through ExternalStoreRuntime; alternative: migrate to a provider-specific client transport or rewrite persistence. Roadmap: Phase 11 in progress, Phase 10 outstanding. Knowledge Base: record that assistant-ui renders typed FastAPI-owned state through ExternalStoreRuntime, with no browser provider/tool execution or Cloud history. Verified: true for the local checks explicitly listed above; CI/hosted/live-provider certification remains pending. Files touched are listed above. No Notion row has been updated by this session.
