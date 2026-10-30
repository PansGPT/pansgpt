# Chat scrollbar containment

The conversation viewport scrolled correctly, but positioned descendants could escape its clipping boundary because the viewport did not establish a containing block. The outer document therefore scrolled too. A long synthetic reply reproduced a **4,441px document in a 975px window**, alongside the conversation's own scrollbar.

Set `position: relative` on `.study-chat-conversation` so its positioned descendants belong to the scroll container. This preserves native scrolling, turn anchoring, the sticky composer and independent sidebars; do not hide document scrollbars globally or disable access to overflowing content.

Local verification: **four browser journeys passed**, covering the new regression plus virtualized 240-turn history, presentation previews and the mobile Home sheet. The regression checks **1440×975, 1440×500, 390×844 and 390×500**: document height stays at screen height, wheel scrolling moves only the conversation, the first question remains reachable, and the composer stays visible at the bottom. Short desktop/mobile screenshots were inspected. Final-head CI/build is tracked in the PR.

Notion handoff (connector unavailable; remote sync pending): **Session:** Fix duplicate chat/page scrollbars, 2026-10-26, Web / Phase 11; **Files:** chat CSS, chat browser regression and roadmap. **Verified:** local reproduction and four viewport sizes above; final checks tracked separately. **Decision:** contain positioned descendants in the existing viewport rather than hiding scrollbars or adding another scroller. **Roadmap:** update Phase 11 scroll behavior; full Phase 11/hosted gates remain open. **Knowledge Base:** unchanged; routine layout fix.
