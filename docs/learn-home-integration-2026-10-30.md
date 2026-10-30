# Learn/Home branch integration - 30 October 2026

The user requested merging the current `feat/learn-home` branch into `main`. Its scope includes the Learn articles/cards and four-card Home grid, Library browsing/catalog/details, and Settings UI work already committed on that branch. The integration starts from `main` at `357925a`, retaining the merged quiz workflows and chat changes.

## Conflict resolution

- Export both quiz and library DTOs from `packages/types`.
- Run both library catalog and quiz lifecycle/retry contracts in disposable database CI.
- Preserve both branches' architecture amendments in the implementation plan.

Existing Library/Settings UI preview boundaries, hosted and device verification, and the incomplete live quiz generation gate remain open. A branch merge does not certify those features complete. No hosted migration, provider call, data import or feature-flag change is included.

## Verification

API Ruff lint and formatting (155 files), all 36 migration mirrors and whitespace checks passed on the combined tree. Full API, TypeScript, lint, build and browser checks must pass on the integration PR before merging; their final results are recorded by GitHub CI.

## Notion handoff

No Notion connector is available; remote synchronization remains pending.

- Session / Change Log: integrate Learn/Home, Library and Settings with main; 2026-10-30; Web / Library API / CI; files from `feat/learn-home` plus `.github/workflows/ci.yml`, `packages/types/src/index.ts`, canonical docs and this record. Verified only for the checks listed above until integration CI completes.
- Decision Log: combine DTO exports, database test lists and architecture notes to retain both branches' contracts. Alternative: select one branch's conflict blocks, which would omit existing contracts or verification.
- Product Roadmap & Features: branch integration in verification; existing feature-specific release gates remain open.
