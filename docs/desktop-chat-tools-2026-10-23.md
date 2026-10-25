# Desktop chat welcome: composer consistency and Tools - 23 October 2026

> Later user-directed refinements supersede composer geometry, welcome subtitle, card sizing and mobile Learn navigation below. See [shared composer follow-up](shared-chat-composer-2026-10-23.md).

User direction: the desktop welcome and conversation input areas should match; replace desktop welcome Recents with Tools, following the implementation plan. This explicitly amends the earlier instruction to preserve the entire welcome screen. Mobile chat welcome keeps its pill composer and Recent cards.

## Changes

- Desktop welcome uses the existing assistant-ui `ChatComposer` thread variant, constrained to the same 45rem content width as the conversation input. Same input controls, colors, padding, radius, attachments, voice, send/cancel and draft state.
- A subscribed media query selects desktop composition at 861px and above. Greeting/suggestions remain; responsive changes preserve the runtime draft rather than mounting separate simultaneous composers.
- Tools follows implementation plan ?8.5: Word, Markdown, PDF, PowerPoint, graphs, flashcards, mnemonics, course search, document reading, web research and image analysis. Four initial starters, expandable to the full list. Chemical structures is visibly Coming later and disabled; its planned drawer is not certified.
- Clicking a starter fills and focuses the composer. The user adds a topic and sends explicitly. No browser inference, provider calls, forced tool execution or fabricated downloads. The backend still decides which skills are active for the account and enforces privacy, tenancy and quotas.
- Existing auth/browser assertions now reflect desktop Tools versus mobile Recent and verify the actual current suggestion prompt. Full disposable Supabase auth CI has not been rerun locally.

## Verification

Passed: web TypeScript, ESLint for affected shell/chat components, all 16 web unit tests, and the full synthetic chat browser journey. Computed width/radius/padding/background match between desktop welcome and conversation composers. Verified 4 initial and 12 expanded tool cards, disabled chemical drawer, editable/focused slide prompt, no inference on tool selection, retained mobile Recent/pill composition and draft preservation across the breakpoint. Existing edit/regenerate/branch/feedback/attachment/voice/error/virtualization regressions also pass with no page errors. Full disposable-auth CI and a new production build remain unrun for this UI-only follow-up; earlier builds are not new verification. Tests use actual components with synthetic HTTP/auth and installed Chrome, not live AI or hosted rollout. No schema, provider configuration or credential changes were needed.

Files: `apps/web/app/app/chat/{page.tsx,chat.css}`, new `apps/web/components/chat/tools.tsx`, existing browser tests, canonical plans and this record.

## Notion handoff

No callable Notion connector is available; no Notion writes were made.

- Session / Change Log: Unify desktop chat composers and add planned tool starters. Date 2026-10-23; Area Web / AI Chat. Files listed above; Verified only for local checks recorded here.
- Decision Log: Reuse the native assistant-ui composer on both desktop states; select responsive composition without duplicate runtimes. Tool cards prepare drafts rather than dispatching inference or overriding server eligibility. Alternative: keep mismatched composers or expose unimplemented direct tool actions.
- Product Roadmap: Phase 11 remains In Progress; welcome starters do not complete named generative skill renderers, pharmacy drawers or hosted integration gates.
- Knowledge Base: no update; existing backend-owned transport and skill architecture are unchanged.

[Reviewed desktop welcome preview](design-system/phase-11-assistant-ui/desktop-chat-tools-1440-dark.png)
