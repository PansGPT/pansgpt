# Library navigation, refresh and legacy file information

User direction: retain the Library collection/course on refresh, tighten the course sidebar, restore legacy list/file-information styling, remove the desktop course-back row, animate desktop refresh, use mobile pull-to-refresh and give mobile navigation press feedback. The selected file thumbnail must fill its preview area.

- Collection links use `?tab=recent`, `?tab=courses` and `?tab=courses&course=...`. The Next URL is authoritative for collection/course, including reload and browser Back/Forward. Navigation clears the previous search rather than leaking it into a new collection.
- My Library starts near the top of its panel. Header/navigation dividers span the full course-panel width. Remove the sidebar footer copy by explicit user request. Course-back controls remain available on mobile and are hidden on desktop.
- List rows follow the legacy file-icon/name/course/lecturer/last-opened/size composition. Mobile rows use compact metadata and an actual saved-page ring; absent reading history stays absent. No invented uploader or opening dates.
- Wide desktop keeps a File Information column. Selecting a file shows its real authorized cover, grouped metadata, actual saved-page progress and a fixed Open PDF action. Mobile retains a bounded sheet with its action fixed below the scrolling details. Preview images use cover cropping to fill their frame.
- Catalog refresh exposes pending state while retaining same-scope rows. Desktop refresh spins only while the request is outstanding, with reduced-motion support. Mobile has no refresh button: a downward gesture at the top of results arms refresh after a threshold; short, canceled, horizontal or in-list scrolling gestures do not reload.
- Inside a course on mobile, the tab row becomes one chevron-back action and `course code · course title`, with browsing controls alongside. Hide the repeated middle-pane back row, course description and mobile sort row. The chevron returns to the URL-backed Courses grid.
- Mobile app navigation shows the existing light active-surface color during press/click, including touch cancellation. It does not delay navigation.

No migrations, API contracts, permissions, provider calls or cache-policy changes. Shared Home grid cards and private PDF access remain in use. Follow-up chat queue: tool-specific cards, richer code/diagram rendering, then quoted replies.

## Touch feedback correction after user review

The user could see touch feedback on the Library back button but not the navigation links. The earlier pointer-flag assertion did not prove the visible native touch effect. Both controls now share `shell-touch-feedback`, including the same hover/active fill and native tap-highlight color. The main drawer and Home Study tools links also set press feedback from touch-start and clear it on touch cancellation. The user confirmed the main drawer as the affected navigation. A Chrome journey captures the back button hover fill, compares it with the nav link during an actual held touch, checks the shared native tap-highlight color, cancels a nav press without navigating, and verifies a completed tap navigates normally. No navigation delay is added. The focused Chrome touch journey passed, including both navigation sections, visible fill/color comparison, cancellation and normal navigation. The two shared navigation regressions also passed before the Home-link follow-up. Affected ESLint passes; no physical-device check is claimed. [Held drawer touch](design-system/library-details-2026-10-28/navigation-touch-feedback.png), [reference back-button feedback](design-system/library-details-2026-10-28/library-back-touch-feedback.png).

## Verification

All 13 focused Library/shared-navigation browser journeys pass, including URL reload/Back/Forward, desktop refresh pending/settled states, native Chrome touch gestures, saved-page display, filled thumbnails, fixed file actions, the compact mobile course header and sidebar press feedback. TypeScript, affected ESLint, all 48 web unit tests, formatting and whitespace checks pass. The production build with synthetic public settings passed; the subsequent footer-copy removal was parsed/checked and exercised by the remaining browser journey. Physical-device and hosted checks are not claimed. The history test adapter was corrected to accept Next navigation options without treating them as history replacement.

Synthetic screenshots (no real student data):

- [Desktop file information](design-system/library-details-2026-10-28/library-file-information-desktop.png)
- [Desktop list](design-system/library-details-2026-10-28/library-legacy-list-desktop.png)
- [Mobile list](design-system/library-details-2026-10-28/library-legacy-list-mobile.png)
- [Mobile course header](design-system/library-details-2026-10-28/library-mobile-course-header.png)

## Notion handoff

Connector unavailable; remote sync pending. Session: Refine Library URL navigation, legacy file information, refresh and mobile press feedback; follow-up matches actual Library back-button touch feedback. Date: 2026-10-28. Area: Web / Library. Files: Library components/styles/hooks, route helper, shell sidebar feedback, unit/browser tests and canonical docs. Verified: local checks above passed; hosted/physical-device gates remain open. Decision: use the URL as collection/course state and reuse authenticated catalog/PDF/thumbnail flows; restore legacy information layout with current tokens. Alternatives: local-only navigation loses refresh state; artificial refresh timers do not represent network work. Roadmap: local refinement under Phase 10.6, overall Testing. Knowledge Base: unchanged for this UI refinement.
