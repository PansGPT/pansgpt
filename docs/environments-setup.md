# Environments and staging deployment

Canonical execution order: [build roadmap](build_roadmap.md) and [implementation plan](implementation_plan.md). Current database evidence: [database verification](database-verification-2026-10-20.md). Application deployment is tracked separately in [the staging deployment record](staging-deployment-2026-10-20.md).

## Environment boundaries

| Environment | API                                | Database                                | Workers                                                |
| ----------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Development | Local FastAPI                      | Local Supabase CLI/Docker               | Local ARQ during development                           |
| Staging     | `pansgpt-api-staging`, Render Free | Supabase project `nrzbjhqtcxlfiyvoeanb` | Actions disposable checks; Oracle worker host deferred |
| Production  | Provision and verify before launch | Separate hosted Supabase project        | Separate host/configuration before launch              |

The staging database is migrated and verified. The documented custom domains and previous Render deployment records do not certify that the current API revision is deployed. Production is outside this staging action.

## Render API deployment

`render.yaml` defines the staging Docker web service using `apps/api` as its build root. It does not provision a free background-worker service. [Render Free instances](https://render.com/docs/free) support web services and selected datastores; background workers require another eligible host under the $0 pilot plan.

1. Install/authorize the Render integration, or configure an API credential in a local ignored environment. Never commit a deploy hook or API token.
2. Inspect the existing staging service and confirm its repository, free plan, Docker root/context, environment and current deployment before changing it.
3. Populate staging configuration from the secret inventory in Render's environment manager. Keep all six `*_ZDR_CONFIRMED` flags false until the privacy register contains verified account evidence. Keep fake engines and `LOCAL_DEV_MODE` false.
4. Deploy the reviewed CI-passing commit explicitly; do not assume unmerged local changes or the default branch contain it.
5. Use `/health/infrastructure` for Render's HTTP health check. It verifies required database/Redis/R2 connectivity independently of provider eligibility. Full `/health/ready` remains 503 while a required provider is blocked.
6. Verify the deployed revision and live endpoints. A liveness 200 alone does not establish infrastructure health, provider approval, worker availability or complete product readiness.

[Render's health checks](https://render.com/docs/health-checks) expect a response within five seconds. Independent infrastructure probes run concurrently with four-second bounds and a 30-second cache. `/health/live` stays a lightweight process check. The scheduled availability workflow should keep checking full `/health/ready` and report the privacy hold honestly.

## Worker operation

Local development now uses `pnpm dev` from the repository root for frontend, API
and the supervised main quiz worker. No separate worker terminal is needed.
`pnpm dev:worker` runs just that worker. Stop existing manually launched services
before starting the combined session; Windows Ctrl+C gets a short grace period
before remaining owned process trees are terminated. Saved jobs retain their
normal lease/reconciliation recovery if a process is terminated.

For an **existing Docker host** with the reviewed application revision and a
host-specific root `.env`, the optional worker-only configuration is:

```sh
docker compose -f compose.worker.yml up -d --build
docker compose -f compose.worker.yml logs -f worker
docker compose -f compose.worker.yml stop
```

It starts `workers.runner`, uses `restart: unless-stopped` and gives shutdown
120 seconds. Docker itself must be configured to start on host boot. This file
does not provision hosting, enable quizzes, bypass provider gates, or add a paid
Render service. It must use the same database/Redis/environment as its API.
Its inherited API HTTP health check is disabled; verify worker subscription and
actual job pickup. Do not run a second worker against the same queue accidentally.
The Docker configuration has not been runtime-tested on the current Windows
machine because Docker is not installed.

Use the same application revision and staging configuration on the selected worker host:

```sh
cd apps/api
uv sync --frozen --no-dev
uv run python -m workers.runner
```

Run the picture queue separately when required:

```sh
uv run arq workers.settings.PictureWorkerSettings
```

The main worker subscribes to quiz wake notifications, preserving durable queue polling/reconciliation if a notification is lost. It initializes a small Postgres pool, reconciles the durable outbox and schedules cleanup. The picture worker drains its separate queue and exits. Do not grant provider eligibility just to make a worker health check pass. Privacy-blocked ingestion stays durable until its dependencies and eligible provider are available.

The user selected GitHub Actions now and Oracle later. [Worker Verification (Disposable Services)](../.github/workflows/worker-verification.yml) runs finite checks on a disposable local Supabase database and Redis inside the GitHub runner. It verifies isolated queue retries/restarts and cancellation without receiving existing staging credentials. It never connects to hosted staging data or R2. See [the worker runbook](worker-verification-2026-10-20.md) for execution and evidence.

GitHub Actions is used for development/testing, not ongoing application hosting ([service terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions)). No continuously available worker is provisioned. Oracle remains deferred; application ingestion stays pending while provider privacy and hosting gates are open.

## Database governance

All schema changes use versioned mirrored SQL and Supabase CLI deployment. Staging already records all 31 versions; do not reset or reseed it during application deployment. The existing four documents and 275 chunks have preserved checksums.

## Web configuration

When the matching web deployment is verified, use the actual staging API URL, the staging Supabase public URL/anon key and the server-only client API key. Validate preview and production scopes separately. Never put provider credentials or a Supabase service-role key in public frontend variables.

The current web alias is `https://pansgpt-web.vercel.app`. Its browser calls the staging Render API directly, so the Render service's `ALLOWED_ORIGINS` must contain that exact origin (without a trailing slash). Preserve other required origins; do not allow arbitrary Vercel sites. A confirmed preflight returned `400 Disallowed CORS origin` after the API was healthy, preventing `/api/v1/auth/me` from reaching token/profile verification. An explicit Render environment value overrides the source default and must be updated there before redeploying. The shared `AuthProfileResponse` mirrors the existing API response; profile loading uses bounded, identity-scoped requests and does not substitute cached roles during an outage.

The free pilot container runs one async Uvicorn API process. Its validated TinyBERT FlashRank model is downloaded during image build and copied into a read-only runtime cache. Startup warming is bounded/non-fatal; writable local caches are isolated across processes. ARQ worker hosting remains separate. See [profile/startup verification](profile-verification-2026-10-25.md).

The availability workflow requires repository variables `STAGING_API_HEALTH_URL=https://pansgpt-api-staging.onrender.com/health/ready` and `STAGING_WEB_URL=https://pansgpt-web.vercel.app`. Both public URL variables were configured on 25 October after finding them absent; a manual verification run was dispatched. No staging credentials are required by this workflow. Full readiness failures remain visible rather than being reported as application readiness success.

## Release evidence

Record deployed revision, service URL, infrastructure/full readiness, auth journeys, worker startup/recovery, queue reconciliation, storage operations and the approved document journey. Provider privacy and native OAuth remain open until actually verified. The independent shared-UI browser work is tracked in [its verification record](design-system/verification-2026-10-21.md).
