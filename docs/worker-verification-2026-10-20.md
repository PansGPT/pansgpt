# Worker verification and Oracle handoff - 20 October 2026

Status: credential-free workflow implemented; remote execution evidence pending below.

The user chose GitHub Actions now and Oracle later, then asked us to avoid credential upload if it carried risk. The existing staging keys are powerful and their R2 scope is not certified as staging-only, so they have not been uploaded. No GitHub secret environment was created. Automatic approval review rejected the original upload; the selected alternative needs no staging keys.

GitHub Actions is used only for development/testing under [its service terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions). Ongoing application queue consumers require a separate host. Oracle provisioning remains deferred.

## What GitHub runs

- [Worker Verification (Disposable Services)](../.github/workflows/worker-verification.yml): standard Ubuntu runner, Python 3.12, locked dependencies, a disposable Supabase database and a Redis service. Thirty-minute job limit, finite test deadlines, one verification run at a time. No scheduled runs, pull-request triggers, staging credentials, artifact uploads or hosted staging connections.
- All 31 migrations plus seed replay through the Supabase CLI inside the runner. Neither the hosted staging database nor its four course documents and 275 chunks are touched.
- Both ARQ configurations run their real startup and shutdown hooks. Synthetic probes on unique queues defer once, the first worker exits, and a second worker completes the same job. Real cancellation also releases and removes canary keys.
- Row fingerprints and sentinel application-queue jobs verify isolation. These are disposable test records only. No R2 or AI provider calls occur. This does not certify document claim/heartbeat/process-kill recovery, hosted R2 access, ingestion, chat or ongoing worker availability.
- The normal CI database job also runs the two real-service worker tests alongside its 12 database/RLS contracts. Ordinary API tests skip those service checks unless explicitly enabled against loopback-only disposable targets.

## Running it again

1. Open the recorded worker workflow run linked in the evidence below and select **Re-run jobs** to test that exact revision. No key setup is needed.
2. Before merge, an operator can start a new run by explicitly pushing the reviewed commit to `ops/staging-worker-check/<run-name>`. Regular source pushes do not trigger this manual worker workflow.
3. After review and merge, use **Actions -> Worker Verification (Disposable Services) -> Run workflow**. [GitHub requires the workflow on the default branch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) for that button. This session does not merge or push changes to main.

## Evidence

- Offline safety tests: **22 passed**, covering unsafe target/privacy rejection, cancellation cleanup, exact-key cleanup and sanitized output. The strict-target diagnostic keeps raw configuration/SDK errors out of public output.
- Full local API suite before adding the disposable integration fixtures: **427 passed, 12 skipped**, with two dependency deprecation warnings. The two added integration tests skip locally without disposable service URLs. Ruff passes across 95 files.
- Remote CI and the explicit worker workflow run: pending.

## Safer Oracle steps for later

1. Create an eligible free Linux VM when ready. Check current allocation, availability, billing settings, architecture and memory before provisioning. Do not assume free capacity or continuous availability.
2. Restrict SSH to your access, install Python 3.12, uv and LibreOffice, and check out the exact verified application commit. Run `uv sync --frozen --no-dev` in `apps/api`.
3. Create dedicated staging-only credentials with the minimum database, Redis and R2 permissions required. Keep them in a protected environment file on the VM, excluded from Git. Never put production keys in a staging worker or paste secrets into chat.
4. Configure separate supervised main and picture worker processes using `workers.settings.WorkerSettings` and `workers.settings.PictureWorkerSettings`. Keep all six provider attestations false until account evidence is approved; document processing will remain blocked.
5. On the trusted Linux host, `python -m workers.verify_batch` can run the separate strict-target staging diagnostic with AI/ingestion disabled and provider credentials omitted. It checks R2 HEAD access and unchanged hosted rows on temporary queues. This diagnostic is not invoked by GitHub.
6. Verify startup, shutdown/restart, real document claim/heartbeat/lease recovery and a scoped storage-deletion canary. Only after provider approval, exercise the document ingestion/chat journey. Record evidence before closing the worker release gate.

Render application deployment, provider eligibility, native authentication and the separate shared-UI feed timeout remain separate open gates. Notion synchronization remains pending through the user's connected agent; see [the handoff](notion-sync-2026-10-20.md).
