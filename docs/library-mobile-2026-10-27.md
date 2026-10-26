# Mobile Library — legacy layout refinement

User direction: improve the legacy mobile Library from header to footer. Keep the approved Home-style material cards, real cached covers and shared palette. This follows the [26 October scope](library-browsing-2026-10-26.md). The chat follow-up queue remains tool-specific cards, code/diagram rendering, then quoted replies.

## Mobile composition

- Library header with navigation, refresh and role-appropriate upload. Hide the generic PansGPT header only on this mobile route.
- Full-width search, Recent/Courses tabs and compact collection actions. Course folders omit document-only layout controls.
- Academic filters close after selection and expose removable chips. Distinguish a filtered-out period from an empty university catalog.
- Group actual opening timestamps into Today, Yesterday, Previous 7 days and Earlier using device-local calendar days. Preserve grid/list views; hide these extra headings on desktop. Never invent history or progress.
- Compact course-folder tiles, shared Home document cards and cached covers. Reserve safe-area space above the fixed composer so the last document is reachable.
- Document-details bottom sheet with preview, title, an immediately accessible Open PDF action and divided metadata. Preserve authenticated file opening, failure/retry states and saved pages.

## Integration

`WorkspaceNavigationContext` opens the existing authenticated shell drawer from the Library header and remembers its opener for close. Profile/help recovery returns to the visible Library control. Reuse the drawer rather than duplicate navigation or click hidden DOM controls.

No API contract, schema, migration, inference, provider or thumbnail-cache-policy changes. Desktop layout and shared Home cards retain the earlier direction.

## Verification

The 12 focused Library/navigation journeys pass, including desktop card/cache parity, staff uploads, account isolation and the mobile Home-sheet regression. All 47 web unit tests pass, including calendar grouping across midnight. A further focused run passes Help/drawer focus return after the last refinement. The final production build (with synthetic public settings), TypeScript checks, affected ESLint, formatting and whitespace checks pass. No authenticated hosted run is claimed.

Phone checks cover 320×568, 390×844 and 430×932: header/search/tabs/actions order, real date groups, no outer-page/horizontal scrolling, last-document access above the composer, navigation focus, sheet bounds and visible PDF action. The frozen-calendar layout journey uses reduced motion; the existing journey covers ordinary rendering and dark/light/sepia at short heights.

These screenshots use synthetic PDF/PNG fixtures, never student documents. Live accounts continue to use authorized R2-backed covers.

- [Recent documents](design-system/library-mobile-2026-10-27/recent.png)
- [Course folders](design-system/library-mobile-2026-10-27/courses.png)
- [Document details sheet](design-system/library-mobile-2026-10-27/details.png)

Hosted/native, disposable-database and full CI gates remain open. The earlier broader API deadline-test failures remain in the 26 October record; this UI change adds no backend verification claim.

Notion handoff: connector unavailable; remote sync pending. **Session:** Refine mobile Library from header to document sheet; **Date:** 2026-10-27; **Area:** Web / Library; **Files:** mobile Library component/styles, shell navigation context/focus, date helper, browser/unit tests, plan/roadmap; **Verified:** local checks above only. **Decision:** retain legacy information order and reuse the shell drawer; improve details with a mobile sheet. **Roadmap:** local refinement verified; full phase remains Testing. **Knowledge Base:** unchanged, routine UI integration.
