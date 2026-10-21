# App-shell design direction - 21 October 2026

User-selected references reviewed from the local Downloads folder:

- Desktop: `PansGPT Dark Study Dashboard (3).png`.
- Mobile web: `Dark-Mode PansGPT Dashboard.png`.

Use their composition and hierarchy with the existing shared semantic palette, typography and Light/OLED/Sepia themes. Do not sample their purple or other accent colors. Reference images remain local and are not copied into public assets.

## Desktop direction

A persistent left sidebar groups primary destinations and recent chats. The main canvas has a personalized greeting, a horizontal recently visited section, learning shortcuts and a calendar/agenda activity area. A compact floating action supplies quick access.

## Mobile direction

A compact brand/profile header precedes prominent destinations, recent work and an activity timeline with tabs. Keep touch targets generous and the primary quick action reachable near the bottom. Reserve viewport space for any fixed composer and account for safe areas and the keyboard.

## Roadmap alignment

This records visual direction, not completed shell implementation. Phase 9.3's top navigation and Phase 10.1's sidebar currently overlap; reconcile them around the user's desktop sidebar reference before implementing navigation. Preserve access to required routes and the profile drawer. The reference's bottom composer must be reconciled with the planned mobile navigation, rather than stacking competing fixed bars.

Phase 9.3 covers authenticated navigation, responsive structure, theme access, loading/error states and quick-action entry points. Greeting, real recent activity, learning cards and calendar data belong to Phase 10. Do not invent activity or expose enabled controls for unavailable features. Preserve API-authoritative roles and tenant scoping.

Auth welcome refinements are tracked separately in the auth verification record. This note records dashboard layout direction only.
