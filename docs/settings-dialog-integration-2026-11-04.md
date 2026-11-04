# Settings dialog integration - 4 November 2026

Resumed the user-authorized merge of PR #6. Its last failing browser contract showed that Escape from the nested feedback dialog could also dismiss Settings. Feedback now consumes Escape and closes itself explicitly; Settings ignores Escape targeted at another dialog. Existing browser assertions require Settings to remain visible and focus to return to Send feedback.

CI exposed that a document-level event can have no containing dialog. The parent guard now ignores only an actual different dialog, preserving normal Settings dismissal. Feedback also handles Escape during React key capture, so its explicit close does not depend on Radix's document-listener ordering. The preceding head passed the other eight CI jobs, including authenticated journeys; the corrected head must repeat all required checks.

The user's current `feat/streak-timetable-tasks` checkout and its uncommitted change are preserved. Integration continues in the isolated worktree. Required CI must pass on the final PR head before merge; existing hosted/device and live quiz completion gates remain open.

Notion sync is pending because no connector is available. Session log: 2026-11-04; Web / Settings / Integration; `settings-modal.tsx`, `sections/help-section.tsx` and this note. Verification is recorded in the final PR checks. Roadmap: integration in verification; feature release gates remain open. No stack or core architecture change.
