# Mobile Home reference alignment - 23 October 2026

> Later user-directed refinements supersede composer geometry, welcome subtitle, card sizing and mobile Learn navigation below. See [shared composer follow-up](shared-chat-composer-2026-10-23.md).

User direction: closely reproduce the mobile composition in `Downloads/Dark-Mode PansGPT Dashboard.png`, using the existing PansGPT colors. Follow-up: reduce font sizes to match the reference. The comparison screenshot was `Screenshot 2026-10-23 013200.jpg`.

## Top-to-bottom changes

- Wordmark and circular account button replace the Home hamburger header. Profile, settings, help, logout and workspace navigation remain reachable from the account menu. Keyboard focus returns to the avatar after closing a panel on Home.
- Library, Quiz, Notes and Focus use the reference-style outline icons and compact vertical rows. Wordmark 22px, shortcuts 15px; existing font family and semantic tokens.
- Mobile Recents shows four document rows: muted dots, normal-weight 13px titles, 11px Library/time metadata, dividers and chevrons. Library fallback accurately says Added rather than implying the file was opened. Desktop retains its six-card document-thumbnail grid. Real titles/data are not replaced with the reference's fictional records.
- Activity has Timetable/Tasks tabs, Today/date headers, a vertical time rail, colored dots, titles/subtitles and compact status pills. Real data uses the existing task/timetable contracts. Clock/countdown values come from known times; ambiguous legacy ranges remain literal, and ongoing is shown only with a known start/end interval. No schema or backend change.
- Empty accounts show four clearly labeled sample study blocks matching the reference's visual structure. Sample states never conceal a loading or failed live request, and nothing is persisted.
- Bottom composer follows the reference's pill shape, smaller input text and circular waveform action using brand green. Typing switches to the send arrow. Text remains a memory-only draft; the waveform opens chat, and the microphone shortcut explicitly opens chat for voice input. Home does not record audio directly.
- Desktop colors/cards, chat welcome and active-chat layout are not redesigned by this change. Native phone status/home-indicator bars are provided by the device rather than rendered as page content.

## Verification

Local checks passed: web TypeScript and ESLint for changed components; Chrome previews at 360/393/430px and desktop 1440px. Verified four mobile Recents, the complete sample timeline above the composer, no horizontal overflow, tab switching, profile/navigation focus return, sample preview, memory-only draft handoff, error/retry handling, and real schedule rendering without an invented ongoing state. No browser page errors. The desktop six-card document grid and Learn section remain intact. Full disposable-auth CI and a new production build were not run for this UI refinement; earlier runs do not certify it. The preview uses actual shell/dashboard/UI components with synthetic auth/data/navigation adapters, not hosted service credentials. The in-app browser bootstrap failed with an environment sandbox metadata error; installed Chrome was used instead.

Files: `apps/web/components/shell/{dashboard,account-menu,app-shell,mobile-activity-timeline}.tsx`, `shell.css`, existing auth test navigation helpers/assertions, canonical plans and this record.

## Notion handoff

No callable Notion connector is available; no Notion updates were made.

- Session / Change Log: Match mobile Home reference and reduce typography. Date 2026-10-23; Area Web / Design System & App Shell; files listed above. Verified only for the local checks recorded here.
- Decision Log: Match mobile reference composition using shared colors; keep live document data and clearly labeled sample schedules. Account avatar opens the existing menu; navigation remains reachable. Alternative: retain the oversized shortcuts/hamburger layout or insert fictional activity into real records.
- Product Roadmap: update Phase 9.3 mobile Home refinement; preserve existing hosted/native release gates.
- Knowledge Base: no update needed; no stack, architecture or core integration pattern changed.

## Subsequent desktop Chat follow-up

The user separately requested matching desktop welcome/conversation composers and replacing desktop chat welcome Recents with Tools. See [desktop Chat update](desktop-chat-tools-2026-10-23.md). Mobile Home and mobile chat welcome remain distinct surfaces.

[393px mobile preview](design-system/mobile-home-reference-2026-10-23/mobile-home-393-dark.png)
