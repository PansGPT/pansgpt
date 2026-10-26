# Scrollbar styling and fixed sidebar controls

User direction: customize scrollbars, let only the sidebar's chat list scroll, and remove More message actions from message toolbars. Preserve the conversation overflow containment fix, normal navigation and account controls.

Use thin native scrollbars with semantic theme colors, transparent tracks and rounded WebKit thumb styling across the app, navigation drawer, mobile chat sheet and presentation panels. Keep forced-color system behavior. No custom scrolling library or input handlers.

The sidebar's logo, main destinations, New chat, Recent chats/search/archive controls and account footer stay outside the scrolling history region. Pinned and recent rows share a focusable, keyboard-scrollable region with its own overflow; the panel's parent no longer scrolls the whole navigation. Collapsed desktop groups remain hidden.

Short windows use compact navigation spacing. The mobile drawer also collapses its redundant visual title/description below 650px height, retaining its accessible dialog name, PansGPT logo and close control so chat rows have usable space.

Remove the per-message More button and its Markdown-export menu on both desktop and mobile. Retain native copy, regeneration, editing, feedback and branch controls; conversation-level menus and sharing keep their existing behavior. Update both the isolated chat and real auth/shell browser contracts so neither expects the removed action.

Verification: all 25 isolated chat browser journeys passed using installed Chrome, including long/pinned history, fixed controls while wheeling, keyboard End access, desktop/mobile short windows, themed scrollbars and public-text copy with no More buttons. All 46 web Node tests, web TypeScript checks, affected-component ESLint, Prettier and diff checks passed. Full CI and authenticated auth/shell verification for this follow-up remain pending. No API, database, provider or retention-policy changes.

Notion handoff (connector unavailable; remote sync pending): **Session:** Theme scrollbars and isolate sidebar chat scrolling, 2026-10-26, Web / Phase 11; **Files:** shell sidebar/CSS, message renderer, browser contracts, canonical roadmap and plan. **Verified:** true for the local checks above; full CI and hosted verification pending. **Decision:** use native themed scrollbars and a dedicated chat-history region; remove the optional message overflow menu by user direction. **Roadmap:** refine Phase 11/shell behavior; full release gates remain open. **Knowledge Base:** unchanged; routine UI refinement.
