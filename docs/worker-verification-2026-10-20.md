# Staging worker verification - 20 October 2026

Status: implementation and offline safeguards tested; hosted execution pending.

The user selected GitHub Actions now and Oracle later. Actions is limited to on-demand staging development/testing, as required by [GitHub's terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions). Ongoing application queue consumption requires a worker host; Oracle provisioning remains deferred.

## Execution contract

- Workflow: [Staging Worker Verification](../.github/workflows/staging-workers.yml), standard Ubuntu runner, Python 3.12 and locked runtime dependencies. Twenty-minute job limit; three-minute verification deadline with bounded worker shutdown. No scheduled runs, pull-request triggers, artifact uploads or dependency caches.
- Dedicated `staging-workers` environment with branch restrictions. Minimal token permission: contents read. One verification job at a time; an existing run is not cancelled by a newer request.
- The runner accepts only the known staging Supabase project and R2 bucket, TLS Redis, disabled inference/ingestion and six false privacy attestations. Provider keys and fake engines are rejected. No external AI calls.
- Both worker configurations run their actual Postgres startup/reconciliation and shutdown hooks. Their workload is replaced with one synthetic Redis/Postgres probe on a unique queue; application queue names and cron cleanup are excluded.
- Each probe defers once, the first worker exits, and a new worker completes the same queued job. This verifies graceful worker restart delivery, not process-kill lease recovery or a document ingestion journey.
- R2 is checked with HEAD only. Full-row fingerprints of documents, chunks, durable jobs and storage cleanup jobs are compared before/after in memory. No rows, titles, checksums, object keys, SDK logs or raw configuration errors are published.
- Exact canary queue/job keys are removed after each check, including failure. Temporary queue/job/result TTLs limit leftovers if the runner is killed before cleanup. Application queues are never consumed; existing course data is never modified.

## Secrets

Configure only these encrypted environment secrets: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_URL`, `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`. The Supabase public/service keys satisfy the existing hosted settings validator; the checks use Postgres directly. No provider, payment, email, Render or GitHub account credential is passed to the worker process.

Secrets belong only to `staging-workers`, restricted to `main` and `ops/staging-worker-check/*`. Do not enable Actions debug logging or publish raw exception traces. The workflow passes secrets only to the verification step, after dependency installation.

## Running a check

GitHub requires a new `workflow_dispatch` workflow to exist on the default branch before the Run workflow button is available ([documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)). Before merge, an operator can explicitly push the reviewed, CI-passing commit to a new `ops/staging-worker-check/<run-name>` branch. That dedicated trigger runs this check without changing `main` or deploying Render.

After the first run, use its **Re-run jobs** action to repeat that exact revision. After the workflow is reviewed and merged, use **Actions → Staging Worker Verification → Run workflow**. Ordinary source pushes and pull requests do not access the staging environment.

Success reports infrastructure connectivity, both canary restarts, unchanged staging rows, unconsumed application queues and blocked providers. It does not certify API deployment, live inference, document lease recovery, retention deletion, native auth or continuous worker availability.

## Evidence

- Offline safety tests: 22 passed, including target/privacy rejection, cancellation cleanup, exact-key cleanup and public-output redaction.
- Full local API suite: **427 passed, 12 skipped**, with two dependency deprecation warnings. Ruff lint and format checks passed across 94 files. Hosted GitHub execution remains pending.

## Oracle handoff

When the user proceeds with Oracle, deploy the same verified application revision and locked dependencies to an eligible Linux VM. Configure protected staging environment values, restart supervision and separate main/picture consumers. Validate CPU architecture, LibreOffice and memory before use. Keep unverified providers blocked. Complete actual document claim/heartbeat/recovery and scoped storage deletion checks there before closing the worker release gate.
