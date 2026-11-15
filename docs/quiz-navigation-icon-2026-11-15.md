# Quiz navigation icon — 15 November 2026

User request: desktop sidebar Quiz should use the same icon as mobile Home. Set the shared Quiz destination to Lucide `ClipboardList`, and remove the mobile Home override so both surfaces use that shared definition. Routes and labels are unchanged.

Verification: pending focused lint and shared-icon identity check. No new tests are needed for this small icon change.

Notion tools are unavailable; these Engineering rows are ready for synchronization after verification:

| Gallery                    | Entry                                                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | **Summary:** Match desktop Quiz icon to mobile Home using shared ClipboardList definition. **Date:** 2026-11-15. **Area:** Web / Navigation. **Files Touched:** navigation.ts, dashboard.tsx. **Verified:** Pending checks above. |
| Decision Log               | **Rationale:** Keep one icon definition so desktop and mobile stay consistent. **Alternatives Considered:** Duplicate a desktop-only override.                                                                                    |
| Product Roadmap & Features | **Quiz navigation polish:** Implemented; local verification pending.                                                                                                                                                              |

Knowledge Base unchanged; no architecture or core-pattern change.
