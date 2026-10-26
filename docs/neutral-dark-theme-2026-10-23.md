# Neutral dark surfaces — 23 October 2026

User feedback: backgrounds felt unnaturally tinted and lacked the expected rich black/gray dark-mode appearance. Replace the cool charcoal canvas and chat glow with neutral charcoal layers; keep green as the brand accent.

| Role                           | Browser-rendered color |
| ------------------------------ | ---------------------- |
| Main canvas                    | `#111111`              |
| Sidebar, cards, composer       | `#181818`              |
| Raised controls, hover, active | `#1F1F1F`              |
| Stronger neutral surface       | `#2B2B2B`              |
| Subtle / primary borders       | `#262626` / `#383838`  |

- Shared dark semantic overrides live in `packages/ui/src/styles/themes.css`, using zero-chroma OKLCH colors. Supporting text/icons also use neutral grays. Generated Figma exports remain intact; Light, Sepia, brand/status colors, auth artwork and persisted `oled_dark` compatibility keep their existing roles.
- Remove the chat canvas pseudo-element's green/gray radial gradients. Cards/sidebar keep their existing surface roles; this is not another background swap.
- Update the existing shared-card dark RGB assertion to `(17,17,17)`.

Verified with actual Home/chat components, synthetic account data and installed Chrome: neutral RGB backgrounds/borders/text, twelve standard text/background contrast pairs at least **5.29:1**, correct Home/sidebar hierarchy, desktop/mobile layouts, distinct Light/Sepia/Dark surfaces, no tinted chat pseudo-element, disabled empty Send and no page errors. Shared CSS references, generated token checks and the 990-style Figma paint checksum pass. [Measured palette](design-system/neutral-dark-2026-10-23/palette-verification.json).

The earlier shared-composer checks also passed: web TypeScript, affected web/shared-UI ESLint, sixteen unit tests, mobile Home checks and the full synthetic chat interaction suite. This later palette-only refinement does not constitute a new production build, full shared-UI suite or hosted/native certification. No backend, schema or provider changes.

Reviewed previews: [desktop chat](design-system/neutral-dark-2026-10-23/desktop-chat-1440-dark.png), [desktop Home](design-system/neutral-dark-2026-10-23/desktop-home-1440-dark.png), [mobile Home](design-system/neutral-dark-2026-10-23/mobile-home-393-dark.png), [mobile chat](design-system/neutral-dark-2026-10-23/mobile-chat-375-dark.png).

Notion handoff (no callable connector; not remotely synchronized):

- Session: Neutral charcoal dark surfaces and remove tinted chat glow. Date 2026-10-23; Area Design System / Web; Files theme CSS, chat CSS, shared-card assertion, canonical docs and this record; Verified for the local checks above.
- Decision: Use zero-chroma project theme overrides and retain green accents. Rationale: user prefers neutral dark surfaces; preserve source Figma exports and shared semantic consumers. Alternative: keep cool gray surfaces/glow or change only one page.
- Roadmap: Phase 9.1 theme refinement, inherited by Home/chat. Keep existing product/release gates.
- Knowledge Base: no change; shared semantic-theme pattern and stack are unchanged.
