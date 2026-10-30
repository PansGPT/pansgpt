# Learn/Home branch integration - 30 October 2026

The user requested merging the current `feat/learn-home` branch into `main`. Its scope includes the Learn articles/cards and four-card Home grid, Library browsing/catalog/details, and Settings UI work already committed on that branch. The integration starts from `main` at `357925a`, retaining the merged quiz workflows and chat changes.

## Conflict resolution

- Export both quiz and library DTOs from `packages/types`.
- Run both library catalog and quiz lifecycle/retry contracts in disposable database CI.
- Preserve both branches' architecture amendments in the implementation plan.
- Escape literal quotes in Learn article JSX to satisfy the existing lint rule without changing rendered copy.
- Keep synthetic Learn bookmarks/reading progress in an explicit demo adapter and label them visibly as sample activity; they are never persisted as live progress.
- Give each disposable university fixture a unique name as well as a unique slug, allowing the Library test's two tenants to coexist under the migrated name constraint.
- Wait for the selected Settings option to receive focus before keyboard navigation, retaining both keyboard movement and final-value assertions.

Existing Library/Settings UI preview boundaries, hosted and device verification, and the incomplete live quiz generation gate remain open. A branch merge does not certify those features complete. No hosted migration, provider call, data import or feature-flag change is included.

## Verification

API Ruff lint and formatting (155 files), all 36 migration mirrors and whitespace checks passed on the combined tree. Full API, TypeScript, lint, build and browser checks must pass on the integration PR before merging; their final results are recorded by GitHub CI.

The initial local API run reported 809 passed, 68 skipped and three failures while dependencies were installing. Presentation parsing and stream timing passed in the focused rerun; the pre-existing 20ms cancellation test still failed locally. The initial integration CI backend job passed. No timeout or assertion was relaxed. The initial CI lint failure identified the Learn JSX quoting corrected above; the corrected head must pass a fresh complete CI run.

All six TypeScript workspace checks passed before the follow-up; web typecheck passed again after the explicit Learn demo adapter. Focused Learn lint and all 54 web unit tests passed. The first CI database/browser runs exposed the fixture-name collision and dropdown focus race corrected above; the corrected head must repeat those complete CI jobs.

The focused mobile Settings journey passed with installed Chrome after focus synchronization, covering the existing 320/390/430px assertions and keyboard selection. Learn-page formatting and diff checks also passed.

The corrected head passed eight CI jobs, including combined migrated database contracts and the chat/Library/Settings browser suite. The auth job first hit a disposable Supabase port collision; its isolated rerun reached the actual journey and exposed obsolete Help/Profile menu selectors. The auth journey now uses Get help, Settings Account/Appearance, the mobile Settings back/menu flow and current Library navigation while preserving account verification, theme persistence/failure/retry, keyboard focus, privacy and logout assertions. Appearance also restores the existing honest account-sync-unavailable message and retry action that were missing when theme controls moved from the old profile drawer. A fresh complete CI run is required for this follow-up.

## Notion handoff

No Notion connector is available; remote synchronization remains pending.

- Session / Change Log: integrate Learn/Home, Library and Settings with main; 2026-10-30; Web / Library API / CI; files from `feat/learn-home` plus `.github/workflows/ci.yml`, `packages/types/src/index.ts`, canonical docs and this record. Verified only for the checks listed above until integration CI completes.
- Decision Log: combine DTO exports, database test lists and architecture notes to retain both branches' contracts. Alternative: select one branch's conflict blocks, which would omit existing contracts or verification.
- Product Roadmap & Features: branch integration in verification; existing feature-specific release gates remain open.
