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

The two RLS tests use only `RLS_TEST_DATABASE_URL`, never the application's `DATABASE_URL`.
Configure it for a disposable, migrated Supabase test database. The tests insert temporary
universities, auth users, documents and chunks inside transactions and intentionally roll
them back. They still require permission to insert rows; never point them at a live database.
Run them explicitly with:

```sh
uv run pytest tests/test_rls_security.py -m live --allow-live-services -v
```

The approval-before-ingestion migration must be applied through the normal Supabase CLI
deployment workflow. Unit tests do not deploy migrations or modify hosted data.

Deployment dependencies are exported from the lockfile with:

```sh
uv export --frozen --no-dev --no-emit-project --format requirements-txt --output-file requirements.txt
```

From `apps/web`, `pnpm test` runs the SSE parser regressions without starting an API or
calling a model. The tests require Node.js 22 with TypeScript stripping support or newer.
