# Mobile Library — legacy layout refinement

User direction: improve the legacy mobile Library from header to footer. Keep the approved Home-style material cards, real cached covers and shared palette. This follows the [26 October scope](library-browsing-2026-10-26.md). The chat follow-up queue remains tool-specific cards, code/diagram rendering, then quoted replies.

## Fidelity correction after user review

The initial local UI passed functional checks but the user rejected its resemblance to the legacy design. Those checks did not establish visual fidelity. Direct comparison with `../pansgpt-eli/frontend/components/library/LibraryCore.tsx` (mobile layout around lines 721-1140) identified the missing rounded content panel, boxed navigation/layout controls and incorrectly narrow course tiles.

The initial correction used the legacy composition: plain menu/header, a separate pill-shaped search area, academic filters above the content panel, a 28px rounded-top panel enclosing Recent/Courses tabs and results, small uppercase collection headings, one alternative-layout action, date labels and full-width course-folder cards on phones. Search replaces the tabbed view with its results heading. Home-style document cards/covers remain the explicit earlier user requirement, rather than copying legacy document-card geometry. Theme tokens and authenticated data flows remain in use. The follow-up below removes the Library composer by explicit user direction. The latest screenshots below show the subsequent grid/navigation refinements; visual acceptance remains open.

## Requested browsing simplification (completed locally 28 October)

Follow-up direction: remove the Library input area; make the leading mobile header control return Home; put layout/filter actions on the Recent/Courses row; improve course folders and simplify the Recent empty state.

- The shell omits its composer on Library routes, and Library no longer reserves composer space. Home retains its own input and sheet.
- The mobile header back button explicitly navigates to `/app`, rather than relying on browser history or opening navigation.
- Tabs and mobile browsing actions share one compact row. Search keeps the same action placement beside its results label. Desktop controls retain their previous location; both placements share handlers/state.
- Course folders use a two-column phone grid with a folder, course code/name, real material count and trailing chevron; the course skeleton shares its dimensions.
- Empty Recent shows only "No recent documents," one short sentence and Browse courses. Errors and filter-empty states keep their distinct retry/clear actions.

## Mobile composition

- Library header with Back to Home, refresh and role-appropriate upload. Hide the generic PansGPT header only on this mobile route.
- Full-width search, Recent/Courses tabs and browsing actions on the same row. Course folders omit document-only layout controls.
- Academic filters close after selection and expose removable chips. Distinguish a filtered-out period from an empty university catalog.
- Group actual opening timestamps into Today, Yesterday, Previous 7 days and Earlier using device-local calendar days. Preserve grid/list views; hide these extra headings on desktop. Never invent history or progress.
- Two-column course-folder cards on phones with matching loading skeletons, shared Home document cards and cached covers. Use safe-area spacing at the bottom of the results; no Library composer.
- Document-details bottom sheet with preview, title, an immediately accessible Open PDF action and divided metadata. Preserve authenticated file opening, failure/retry states and saved pages.

## Integration

The Library back button uses the shared Next router to return Home. The existing shell retains desktop sidebar behavior and Home retains its composer. Document selection continues to restore focus after closing details.

No API contract, schema, migration, inference, provider or thumbnail-cache-policy changes. Desktop layout and shared Home cards retain the earlier direction.

## Verification

Latest browsing simplification: all ten targeted Library/sidebar journeys passed across the broad run and focused reruns (the initial full-flow assertion needed a 1px allowance for browser scroll rounding). Final recorded browser results for the course-grid/skeleton and empty-Recent journeys are passed. The final course test holds the catalog response, measures skeleton/card geometry, verifies two columns, tab-row controls, no Library composer, details focus, academic filters and return Home. The phone flow covers 320x568, 390x844 and 430x932; the separate theme flow covers dark/light/sepia. TypeScript and affected ESLint passed. The final production build with synthetic public settings, formatting and whitespace checks passed on 28 October. No live hosted or backend claim is added.

Earlier fidelity correction: the three focused browser journeys passed for mobile Library interactions/themes, rounded panel/full-width folder layout at 320/390/430px, and desktop Home-card/cache parity. TypeScript and affected ESLint pass. The production build with synthetic public settings, formatting and whitespace checks also pass. These checks establish the tested behavior and geometry, not user approval of the design.

Earlier implementation verification (before the fidelity correction):

The 12 focused Library/navigation journeys pass, including desktop card/cache parity, staff uploads, account isolation and the mobile Home-sheet regression. All 47 web unit tests pass, including calendar grouping across midnight. A further focused run passes Help/drawer focus return after the last refinement. The final production build (with synthetic public settings), TypeScript checks, affected ESLint, formatting and whitespace checks pass. No authenticated hosted run is claimed.

Phone checks cover 320×568, 390×844 and 430×932: header/search/tabs/actions order, real date groups, no outer-page/horizontal scrolling, last-document access above the composer, navigation focus, sheet bounds and visible PDF action. The frozen-calendar layout journey uses reduced motion; the existing journey covers ordinary rendering and dark/light/sepia at short heights.

These screenshots use synthetic PDF/PNG fixtures, never student documents. Live accounts continue to use authorized R2-backed covers.

- [Recent documents](design-system/library-mobile-2026-10-27/recent.png)
- [Course grid](design-system/library-mobile-2026-10-27/courses.png)
- [Matching course skeleton](design-system/library-mobile-2026-10-27/course-skeleton.png)
- [Empty Recent](design-system/library-mobile-2026-10-27/empty-recent.png)
- [Document details sheet](design-system/library-mobile-2026-10-27/details.png)

Hosted/native, disposable-database and full CI gates remain open. The earlier broader API deadline-test failures remain in the 26 October record; this UI change adds no backend verification claim.

Notion handoff: connector unavailable; remote sync pending. **Session:** Simplify mobile Library navigation, tab-row actions, courses and empty Recent; **Date:** 2026-10-28; **Area:** Web / Library; **Files:** mobile Library component/styles, shell navigation context/focus, date helper, browser/unit tests, plan/roadmap; **Verified:** local checks above only. **Decision:** preserve the rounded-panel composition and shared Home cards; remove the Library composer, return Home directly, align browsing controls with tabs and use compact course cards. Details remain a mobile sheet. **Roadmap:** local refinement verified; full phase remains Testing. **Knowledge Base:** unchanged, routine UI integration.
