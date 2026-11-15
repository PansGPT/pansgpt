# Branch consolidation — 15 November 2026

User-authorized scope: consolidate the completed feature work into main, then delete obsolete merged branches. Explicitly exclude the experimental Library UI. Use `integrate/main-20261115` for integration; do not rewrite the existing main or feature history.

## Included work and exclusions

- `feature/pdf-study-workspace` at `5c03fb5` includes `settings-update` and `ui-updates`; one merge brings in all three histories.
- `origin/feat/admin-workspaces` at `d568781` adds administrative workspaces, governance contracts and the versioned migration. `ENABLE_GOVERNANCE` remains off by default until applicable migration/integration release gates are met; no hosted migration or flag change is part of consolidation.
- The current student Library UI must remain byte-for-byte identical to the reader branch. The old Library redesign tips already occur in main's history, followed by the Library restoration in PR #8. Do not separately merge or revive them. Retain `feat/library-mobile-redesign`, `feat/library-legacy-refresh`, `backup/learn-home-with-library` and `feat/learn-home` references.
- Retain `backup/quiz-ui-before-revert`: its unmerged historical Quiz designs are not authorized for restoration.
- Leave both existing `.temp` worktrees and their uncommitted changes untouched. Retain the checked-out `integrate/all-branches-20261104` branch and its remote counterpart.
- The root's sole original uncommitted change was the Quiz icon verification note; preserve it in this integration. Source commit `5c03fb5` remains unchanged.

## Integration decisions

Resolve all four conflicted files by combining their required behavior:

1. Register academic, reader and governance API routers together.
2. Retain owned document/chat scope, supporting uploads, no canned material-miss answers, bounded recovery and total request deadlines. Apply governance assessment restrictions, generation policy, scoped curriculum and temperature without an extra database lookup when governance is disabled. Preserve the reader's document ID into generation and keep course retrieval's implicit web fallback disabled.
3. Keep the current account menu, Settings, Support, app downloads and shortcut design; add the role-scoped Administration entry.
4. Export library, reader, academic and governance DTOs together.

Add the synthetic admin workspace browser suite to CI. Extend its existing browser job budget to accommodate the combined reader/chat/quiz/admin coverage. No provider, hosted database, legacy data or production network settings are changed.

## Verification and publication gates

- Combined offline API suite: **1,036 passed; 88 live-service checks skipped**.
- Student Library UI tree comparison: unchanged against `feature/pdf-study-workspace` after conflict resolution.
- Workspace lint passed; typechecking, web units, production build and browser suites are in progress at the integration commit. Final GitHub PR checks must pass before main is updated. Final outcomes are recorded on the integration PR.
- A separate loopback-only PostgreSQL cluster is being prepared under ignored `.tmp/consolidation-pg-data`; only synthetic governance SQL/browser workflows use it. Hosted migrations/RLS/provider/native release gates remain separate.

After verified publication, refresh refs and delete only branches whose current tips are ancestors of main, excluding the retained references above and any checked-out worktree branch. Use a merge commit to preserve ancestry; never force-delete unmerged work. Record final cleanup in the PR and user handoff.

## Engineering gallery

No Notion tools are available in this session. Pending structured entries:

| Gallery                    | Ready-to-sync entry                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session / Change Log       | **Summary:** Consolidate reader/chat/Settings/UI and admin workspaces, preserve current Library UI, then clean fully merged obsolete branches. **Date:** 2026-11-15. **Area:** Repository / API / Web / CI. **Files Touched:** merge resolutions in main.py, chat.py, account-menu.tsx and shared exports; CI; verification notes and this record. **Verified:** API suite and Library comparison above; remaining gates recorded on integration PR. |
| Decision Log               | **Rationale:** Preserve complete branch history and current reader/Library behavior while integrating scoped governance; defer deletion until ancestry proves all work retained. **Alternatives Considered:** squash merges, merging old Library/Quiz experiments, deleting checked-out/dirty worktrees, bypassing CI.                                                                                                                               |
| Product Roadmap & Features | **Branch consolidation:** In verification. Governance remains disabled pending existing release gates; this merge does not certify hosted deployment.                                                                                                                                                                                                                                                                                                |

Knowledge Base unchanged; no new stack or core pattern is introduced by consolidation.
