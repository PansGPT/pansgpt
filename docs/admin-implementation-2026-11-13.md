# Administrative workspaces — implementation contract

Scope: `admin.md`, implementation plan sections 14–15 and roadmap phase 16. The frontend uses the existing UI tokens, buttons, fields and Radix dialogs. Four workspaces share accessible navigation, searchable paginated directories, focused forms, detail views, reasons for sensitive changes and explicit failure/retry states.

## Authority and transport

`/api/v1/governance/identity`, `/analytics`, and `/{resource}` (GET/POST) use bearer identity plus the per-client API key. The same-origin Next transport holds the client key on the server. Public DTOs live in `packages/types/src/governance.ts`; strict Pydantic request/response models mirror them. Fields are string-encoded form values, validated against resource-specific allowlists and constraints before SQL. Unknown fields/actions are rejected. IDs are UUIDs; update versions use the row timestamp. Search and pagination are bounded server-side. Backend-authorized actions accompany each row; the browser never grants privileges.

Senior membership is explicit and stored in `admin_memberships`. Existing university admins default to standard; no implicit senior promotion. Super admins manage platform governance; senior admins manage their own accounts, subscriptions, administrators and terms. Standard admins manage academic operations. Lecturers see their own submissions and restrictions and may only restrict assigned courses. Student conversations, notes and answer keys are excluded.

Mutations lock records, validate tenant/ownership and state transitions, compare versions, and write an audit event within the transaction. No hard deletes. University suspension and user suspension are checked during authentication. Read-only universities block mutations. Exam windows use server time and block student AI generation. Approval and background ingestion remain separate states.

## Required acceptance checks

- Unauthenticated/student access is denied; standard administrators cannot change subscriptions, memberships or terms.
- A tenant cannot list or mutate another tenant; lecturers cannot review materials or restrict unassigned courses.
- Stale updates return 409; failed mutations preserve forms and do not show success.
- Document rejection requires a reason; corrected submissions retain the original review and permit one replacement.
- Prompt proposals require a second super administrator; concurrent/outdated proposals cannot overwrite newer settings.
- Lists support loading, error/retry, empty, filtered-empty and pagination states. Dialogs are labelled and keyboard accessible. Mobile navigation closes after selection; tables scroll without widening the page.
- Sample preview is explicitly labelled and isolated from production transport; live failures never use sample data.

## Release gates

Versioned migrations must be applied through the Supabase CLI, with PostgreSQL/RLS integration checks, hosted end-to-end journeys and provider/storage checks before production certification. Local automated API tests do not certify hosted RLS or external delivery. The sibling legacy repository is unavailable in this workspace, so the supplied blueprint and canonical local plans define scope.

## Running and reviewing

- Branch: `feat/admin-workspaces`.
- Run the web app normally and open `/admin-preview` in development for the clearly labelled synthetic workspace. Its role selector supports platform, senior, standard and lecturer views. The preview returns 404 in production.
- Authenticated routes are `/super-admin/*`, `/admin/*` and `/lecturer/*`. Account menus link staff to their appropriate workspace. FastAPI determines actual permissions independently.
- `ENABLE_GOVERNANCE=false` is the default. Deploy both copies of `20261113120000_administrative_governance.sql` through the Supabase CLI before enabling it. Existing authentication queries remain compatible with the old schema while the flag is off.
- `FRONTEND_URL` controls generated invitation links; use the real application origin for each environment. `X_API_KEY_WEB` stays on the Next server. No new service or dependency is required.
- Existing university admins are deliberately standard after migration. Assign the initial senior administrator through the reviewed provisioning/invitation flow; no implicit promotion takes place.

## Local verification

The isolated PostgreSQL harness reads canonical table DDL and applies the actual governance migration to `pansgpt_governance_test` on loopback port 55434. It does not use hosted credentials, emulate Supabase Auth, or certify all historical RLS policies. `tooling/governance-test-database.py --fresh` resets only that explicitly named disposable database.

Commands:

```powershell
pnpm --filter @pansgpt/web typecheck
pnpm --filter @pansgpt/web lint
pnpm --filter @pansgpt/web build
pnpm --filter @pansgpt/web test
pnpm --filter @pansgpt/web test:admin
# With the isolated PostgreSQL server running and schema prepared:
pnpm --filter @pansgpt/web test:admin:integration
```

From `apps/api`, run `.venv/Scripts/python.exe -m pytest -q`. To run the designated real SQL tests, set `GOVERNANCE_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55434/pansgpt_governance_test` and run `pytest tests/test_governance_database.py tests/test_governance_dataflow.py --allow-live-services`.

The real browser integration uses a synthetic HS256 bearer token, the actual token verifier and database role lookup, a required client key, FastAPI routes and PostgreSQL. It covers material approval/outbox creation, a persisted subscription change, and invitation acceptance through the actual staff onboarding form. The regular browser suite also checks all workspace sections, role exclusions, rejected-submission correction, mobile navigation, themes, search/pagination, batch results and failure recovery without sample fallback. The test server and signing secret exist only in the loopback test harness.

Final API and build checks on 14 November: **804 passed, 85 skipped** in the offline API suite; **20 passed** in the isolated PostgreSQL suite; **55 passed** in the web unit suite. Root lint, root TypeScript checks, Ruff and the full production build passed. Skipped live-service tests are not release certification. Streaming regression verification also caught and fixed ContextVar cleanup across task boundaries and retrieval exceeding an expired total request deadline.

Final browser checks: **11 passed** in the workspace suite (the two integration-only journeys intentionally skipped there), and **2 passed** in the separate real API/PostgreSQL integration suite. Mobile verification includes viewport width after dialog dismissal, keyboard navigation and all three themes. The disposable PostgreSQL cluster was stopped after verification; no hosted data or external provider was used.

## Current boundaries and pending handoff

- Invitations return a shareable link once, are email-bound and expire after seven days. Pending links can be revoked in the invitation directory; raw tokens do not enter listings or audit snapshots. Redemption checks the issuer's current authority and cannot replace an existing administrator's privileges. Staff onboarding skips the student-level question and routes verified staff to the appropriate workspace. A generated link does not mean email was dispatched.
- University creation includes a review step and storage allocations entered in GiB, converted to bytes at the API boundary. Creation, initial term and initial senior invitation are atomic.
- External R2 PUT/download, Redis delivery, email dispatch, real Supabase invitation redemption and hosted role/RLS journeys still need staging verification. Local approval proves the durable database outbox, not external queue delivery or completed ingestion.
- Analytics report measured requests, tokens, failures and latency. Provider pricing/cost estimates, daily rollup scheduling, email campaigns, payment/refund operations and DSAR operations are not certified by this work. A subscription change does not write payment history or invent credits.
- Material uploads currently target one academic level in the UI; the existing library API continues to accept multiple target levels. Prior academic schedules are retained by soft deletion; term changes preserve student levels and earlier materials.
- The user explicitly authorized course-knowledge use on 14 November. FastAPI includes bounded shared curriculum for the student's university, level and selected course in course-oriented generation, with existing provider privacy gates. General answers and private student records do not enter this supplement. See `provider-privacy.md`.
- Student/lecturer schedule RLS follows the active academic session and semester; administrators retain history access. Legacy unversioned schedules remain visible for compatibility. Native-device and hosted student journeys remain release checks.
- The required Notion Engineering sync could not run because Notion is not connected. A concise structured handoff is saved in `docs/admin-engineering-log-2026-11-13.md`.
