# Backend and chat verification

<!-- [CHAT FIX 2] Explicit service isolation and Python 3.12 verification. -->

Use Python 3.12, matching the API Dockerfile and CI. From `apps/api`:

```sh
uv sync --frozen --all-extras
uv run pytest -q -rs
uv run ruff check .
uv run ruff format --check .
```

The test bootstrap clears service credentials before importing application singletons.
The default suite blocks synchronous and asynchronous connections, including Windows
Proactor socket connections and DNS, and replaces local FlashRank model loading with
the deterministic heuristic fallback. Individual tests mock provider responses. No live
AI, database, object storage, or Redis service is required. Local neural inference counts
as AI use too; an outbound HTTP counter alone is insufficient for a live-test budget.

Live tests require explicit selection and `--allow-live-services`. The embedding smoke
test additionally requires `RUN_LIVE_EMBED_TEST=1`. Do not enable either option during a
mock-only verification run.

The RLS and database-contract tests use only `RLS_TEST_DATABASE_URL`, never the application's `DATABASE_URL`.
Configure it for a disposable, migrated Supabase test database. The tests insert temporary
universities, auth users, documents and chunks inside transactions and intentionally roll
them back. They still require permission to insert rows; never point them at a live database.
Run them explicitly with:

```sh
uv run pytest tests/test_rls_security.py tests/test_database_contracts.py -m live --allow-live-services -v
```

The approval-before-ingestion migration must be applied through the normal Supabase CLI
deployment workflow. Unit tests do not deploy migrations or modify hosted data.

Deployment dependencies are exported from the lockfile with:

```sh
uv export --frozen --no-dev --no-emit-project --format requirements-txt --output-file requirements.txt
```

From `apps/web`, `pnpm test` runs the SSE parser regressions without starting an API or
calling a model. The tests require Node.js 22 with TypeScript stripping support or newer.

The `database-contracts` CI job starts disposable Supabase, replays the full migration
history and seed, executes real RLS/grants/credit/re-embed/quota/registry contracts,
compares 50 public tables and 18 RPC declarations with the catalog, regenerates
authoritative types, and typechecks consumers. When a test
database URL is supplied, connection or schema failure fails the job instead of skipping.
Run `python tooling/check-migrations.py` at the root to check mirrored SQL and immediate RLS.
After database startup, run `uv run --project apps/api python tooling/check-db-contracts.py`.
Review the generated type artifact; a local snapshot is not proof of hosted type generation.

Web lint scope is verified by `node tooling/check-lint-scope.mjs`. Run native protocol tests
with `pnpm --filter=@pansgpt/desktop test`; actual device OAuth/refresh/logout remains a
separate integration check. Strict privacy attestations are simulated only for mocked unit
tests. See [the privacy register](provider-privacy.md) before enabling any live provider.

The completed disposable replay and staging CLI verification, including preserved data
checksums and remaining release gates, are recorded in
[database-verification-2026-10-20.md](database-verification-2026-10-20.md).


## Shared design-system browser contracts

Run `pnpm --filter @pansgpt/ui test` to build the preview and execute the existing
Playwright suite. The portable Node driver forwards test filters/options and fails
on either a build failure or a test failure. Tests use a fresh compiled preview on
loopback port 4174; `preview:dev` remains the interactive Vite workbench on 4173.
No database, hosted credentials or external AI calls are required.

A cold development-server feed run requested 5,083 resources and exceeded its
60-second navigation deadline. Both unchanged feed tests passed against the
compiled preview. Individual test/assertion timeouts, traces, source-geometry
checks and accessibility assertions remain intact. See
[the verification follow-up](design-system/verification-2026-10-21.md) for the
complete-suite result and practical limits.

The `shared-ui` CI job installs Chromium and its Linux dependencies, builds the
fresh preview and runs the same suite with a 15-minute global deadline. This
checks the existing shared library; it does not verify hosted product integration.
On Windows use a terminal permitted to launch and clean up native browser/server
processes. Run `pnpm.cmd` if PowerShell blocks the `pnpm.ps1` shim; no execution-policy
change is required.
