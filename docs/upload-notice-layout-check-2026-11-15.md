# Upload notice layout check — 15 November 2026

The main CI run `43688745641` failed the desktop failed-upload journey: a separately measured banner bottom was 751px and composer top was 745px. The same commit had passed all nine jobs in verification run `43687458418`.

The assertion read the two rectangles through separate browser calls. Scrolling or layout changes between those calls can compare different frames. Read both edges synchronously in one `banner.evaluate` call, scoped to its own composer host. Keep the strict `noticeBottom < composerTop` assertion and all existing draft, file retention, banner width, dismissal, retry and request-count checks. This correction changes only the test; application layout and upload behavior are unchanged.

Verification:

- Before the correction, all eight repeated desktop/mobile upload journeys passed locally; the CI failure did not reproduce in those runs.
- With the correction, all four repeated desktop/mobile upload journeys passed.
- A temporary 16px downward banner displacement failed the corrected assertion as intended: banner bottom 767px versus composer top 759px. The injection was removed automatically after this check.
- Syntax, formatting and final source checks passed. GitHub CI remains the merge gate for the exact follow-up commit.

The user-authorized removal of `.temp/verify-20261105` also completed. Its reviewed files matched the recorded hashes before deletion; only the main working directory remains registered. No application source was changed by that cleanup.

Notion tools are unavailable; pending Engineering entries:

| Gallery                    | Entry                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | **Summary:** Stabilize failed-upload geometry measurement; remove reviewed obsolete worktree. **Date:** 2026-11-15. **Area:** Web tests / repository cleanup. **Files Touched:** `apps/web/tests/chat/interactions.spec.cjs`, this record. **Verified:** Four corrected browser journeys passed; injected real overlap rejected. |
| Decision Log               | **Rationale:** Compare both elements in one browser frame while preserving strict separation. **Alternatives Considered:** Increase pixel tolerance, add a fixed delay, change application spacing without a reproduced layout defect.                                                                                           |
| Product Roadmap & Features | **Chat upload recovery verification:** Local correction verified; final GitHub CI pending.                                                                                                                                                                                                                                       |

Knowledge Base unchanged; no stack or core architecture changes.
