# Shared composer, compact Tools and reasoning — 23 October 2026

> Latest layout/session direction: [chat controls follow-up](chat-session-controls-2026-10-23.md). The user restored the original compact default input and inline branch controls, removed welcome prompt actions/four core-tool starters, and added owned session menus and selected-branch copy sharing.

> Later palette feedback refined the shared dark backgrounds and removed chat glow. See [neutral dark surfaces](neutral-dark-theme-2026-10-23.md) for current colors/previews; the layout and interaction verification below remains applicable.

User direction: use the mobile Home input appearance on all current message surfaces, reduce Tools/suggestion sizing, follow assistant-ui's thinking UI and add Learn to mobile navigation. The follow-up removes “What would you like to learn or work on today?” and makes the primary button Send only, gray/disabled without text.

## Implementation

- Shared `p-study-composer` styling in `packages/ui`: 53px minimum height, 28px radius, 14px input type, shared semantic colors, plus/microphone controls and circular arrow. Home, mobile shell pages, chat welcome and active conversation use the same appearance; chat keeps native assistant-ui controls and multiline resizing. Attachments/recording can expand the container. Focus highlights the container, avoiding a second rectangular input outline.
- Send requires non-whitespace text, including a question/caption for attachments. The primary button never becomes a microphone or stop button. Recording and generation cancellation use separate controls. Keyboard/form submission follows the same empty-draft rule. Home still opens chat with a memory-only draft; chat sends through the authenticated FastAPI flow.
- Desktop Tools sits below compact suggestions, within the 45rem composer width. Four initial cards are 44px tall; See all exposes the existing twelve starters. Descriptions remain accessible and available as tooltips. Selection fills/focuses a draft and never auto-sends; unsupported chemical structures stays disabled.
- Reasoning adapts assistant-ui's MIT element: Brain icon, shimmering active label, accessible Radix disclosure, bounded Markdown trace and streaming scroll follow. Opens during reasoning and collapses on completion unless the reader toggles it manually. Existing scroll locking limits thread jumps. Render only actual backend reasoning; no fabricated trace or duration. Reduced motion disables shimmer. An empty running response uses the same thinking label without inventing reasoning content.
- Learn appears in mobile Home's Study tools list and mobile drawer, links to `/app/learn`, and is discoverable in page search. Its existing placeholder remains; this does not implement or certify the Learn engine. Desktop sidebar is unchanged.
- Canonical plan/roadmap amended. Earlier UI records are historical and link here for the later direction. No API, migration, provider configuration or hosted data changes were needed.

## Verification

Local actual-component tests with synthetic HTTP/auth, installed Chrome and no live AI calls:

- Mobile Home at 360/393/430px: Learn quick link/drawer, disabled empty/whitespace Send, 53px composer, complete sample timeline above it, no horizontal overflow, profile/navigation focus return, tabs, retry and memory-only draft handoff. Desktop document grid preserved; no browser errors.
- Chat: shared desktop welcome/conversation computed geometry; 44px Tools cards; four/twelve expansion; no inference on selection; draft survives responsive changes; removed subtitle; empty/whitespace Send and keyboard guard with attachments. Existing edit, branch, feedback failure/retry, voice capture/cancellation, upload, all three themes and 240-turn virtualization checks remain covered.
- Streamed reasoning opens automatically, renders Markdown, collapses on completion and preserves manual close/reopen decisions. Stop generating remains separately accessible.
- Web TypeScript, affected web/shared-UI ESLint, sixteen web unit tests, CSS reference validation and shared paint-style checksum checks.

A transient Vite development ResizeObserver notification appeared during responsive layout testing; the run completed with all interaction assertions passing and no captured page errors. Production build, full disposable-auth CI, physical devices and hosted AI inference are not newly certified by these UI checks. The in-app browser connection failed with `missing field sandboxPolicy`; installed Chrome supplied the local preview verification.

## Files

`packages/ui/src/styles/{index,study-composer}.css`, `packages/ui/src/{shell.ts,components/collapsible.tsx}`; web chat page/CSS and `components/chat/{composer,message,reasoning,tools,assistant-ui.LICENSE}`; shell `app-shell`, `dashboard`, `navigation`, `sidebar`, CSS; browser chat/auth assertions; canonical plan/roadmap and this record.

## Notion handoff

No callable Notion connector is available in this session; these entries have not been written remotely.

- Session / Change Log: Shared Home-style composer, compact chat starters, assistant-ui-style reasoning and mobile Learn. Date 2026-10-23; Area Web / AI Chat; Files above. Verified only for the local checks recorded here.
- Decision Log: Centralize composer appearance in shared UI styles while retaining native assistant-ui controls and backend transport. Keep Send separate from voice/cancellation, with an empty-draft guard. Alternative: independent layouts and a changing primary action. Reasoning follows the upstream disclosure pattern while keeping PansGPT colors.
- Product Roadmap: Phase 9.3 mobile navigation refinement and Phase 11 chat UI refinement; retain open hosted/native/release gates and the Learn backend gate.
- Knowledge Base: no update; backend ownership, stack and privacy architecture remain unchanged.

Reference: [assistant-ui reasoning element](https://www.assistant-ui.com/elements/reasoning), [upstream implementation](https://github.com/assistant-ui/assistant-ui/blob/main/packages/ui/src/components/react/assistant-ui/elements/reasoning.aui.tsx). License attribution is retained in the chat source directory.

## Reviewed previews

- [Desktop welcome and compact Tools](design-system/shared-chat-composer-2026-10-23/desktop-chat-welcome-1440-dark.png)
- [Mobile Home with Learn and disabled Send](design-system/shared-chat-composer-2026-10-23/mobile-home-393-dark.png)
- [Mobile conversation composer](design-system/shared-chat-composer-2026-10-23/mobile-chat-375-dark.png)
- [Expanded reasoning](design-system/shared-chat-composer-2026-10-23/desktop-reasoning-1440-dark.png)
