# Upload notice checks and reader navigation — 15 November 2026

The main CI run `43688745641` failed the desktop failed-upload journey: a separately measured banner bottom was 751px and composer top was 745px. The same commit had passed all nine jobs in verification run `43687458418`.

The assertion read the two rectangles through separate browser calls. Scrolling or layout changes between those calls can compare different frames. Read both edges synchronously in one `banner.evaluate` call, scoped to its own composer host. Keep the strict `noticeBottom < composerTop` assertion and all existing draft, file retention, banner width, dismissal, retry and request-count checks. This correction changes only the test; application layout and upload behavior are unchanged.

Verification:

- Before the correction, all eight repeated desktop/mobile upload journeys passed locally; the CI failure did not reproduce in those runs.
- With the correction, all four repeated desktop/mobile upload journeys passed.
- A temporary 16px downward banner displacement failed the corrected assertion as intended: banner bottom 767px versus composer top 759px. The injection was removed automatically after this check.
- Syntax, formatting and final source checks passed. GitHub CI remains the merge gate for the exact follow-up commit.

The user-authorized removal of `.temp/verify-20261105` also completed. Its reviewed files matched the recorded hashes before deletion; only the main working directory remains registered. No application source was changed by that cleanup.

## Reader page-number edits

Verification run `43691257753` passed both corrected upload journeys and eight CI jobs, then exposed a separate intermittent reader journey failure: page 8 never appeared after typing its number while chat resizing settled. Three focused repeats of that original journey passed locally.

A new regression reproduced a concrete input bug: type `8`, scroll the real PDF viewport by 16px, then wait for the scroll handler. The field reverted to `3`, causing Enter to navigate to the old page. Preserve the focused page-number input during viewport updates, explicitly set the bounded destination on navigation, and synchronize the field with the displayed page on blur. Reading progress continues to follow the actual displayed page.

Files: `apps/web/components/reader/reader-workspace.tsx`, `apps/web/tests/chat/reader.spec.cjs`. All five focused journeys passed: the new regression, original navigation, fit/night mode, mobile controls and progress recovery. Formatting, JavaScript syntax, web typecheck and focused lint passed. Final GitHub CI remains required.

Notion tools are unavailable; pending Engineering entries:

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | **Summary:** Stabilize failed-upload geometry measurement; remove reviewed obsolete worktree. **Date:** 2026-11-15. **Area:** Web tests / repository cleanup. **Files Touched:** `apps/web/tests/chat/interactions.spec.cjs`, this record. **Verified:** Four corrected browser journeys passed; injected real overlap rejected. |
| Decision Log               | **Rationale:** Compare both elements in one browser frame while preserving strict separation. **Alternatives Considered:** Increase pixel tolerance, add a fixed delay, change application spacing without a reproduced layout defect.                                                                                           |
| Product Roadmap & Features | **Chat upload recovery verification:** Local correction verified; final GitHub CI pending.                                                                                                                                                                                                                                       |

Knowledge Base unchanged; no stack or core architecture changes.

Additional pending Engineering entry: **Summary:** Preserve page-number edits during PDF scroll updates. **Area:** Reader / web. **Decision:** Keep the edited field separate from viewport notifications until submit or blur; continue saving actual reading progress. **Alternatives Considered:** Increase reader test timeout or retry page navigation without fixing the reproduced input overwrite. **Verified:** Regression failed before the fix with expected `8`, received `3`; all five focused reader journeys passed afterward. Final GitHub CI pending.
