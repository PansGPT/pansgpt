# Environments and staging deployment

Canonical execution order: [build roadmap](build_roadmap.md) and [implementation plan](implementation_plan.md). Current database evidence: [database verification](database-verification-2026-10-20.md). Application deployment is tracked separately in [the staging deployment record](staging-deployment-2026-10-20.md).

## Environment boundaries

| Environment | API                                | Database                                | Workers                                                    |
| ----------- | ---------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Development | Local FastAPI                      | Local Supabase CLI/Docker               | Local ARQ during development                               |
| Staging     | `pansgpt-api-staging`, Render Free | Supabase project `nrzbjhqtcxlfiyvoeanb` | Actions disposable checks; Oracle worker host deferred |
| Production  | Provision and verify before launch | Separate hosted Supabase project        | Separate host/configuration before launch                  |

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

Use the same application revision and staging configuration on the selected worker host:

```sh
cd apps/api
uv sync --frozen --no-dev
uv run arq workers.settings.WorkerSettings
```

Run the picture queue separately when required:

```sh
uv run arq workers.settings.PictureWorkerSettings
```

The main worker initializes a small Postgres pool, reconciles the durable outbox and schedules cleanup. The picture worker drains its separate queue and exits. Do not grant provider eligibility just to make a worker health check pass. Privacy-blocked ingestion stays durable until its dependencies and eligible provider are available.

The user selected GitHub Actions now and Oracle later. [Worker Verification (Disposable Services)](../.github/workflows/worker-verification.yml) runs finite checks on a disposable local Supabase database and Redis inside the GitHub runner. It verifies isolated queue retries/restarts and cancellation without receiving existing staging credentials. It never connects to hosted staging data or R2. See [the worker runbook](worker-verification-2026-10-20.md) for execution and evidence.

GitHub Actions is used for development/testing, not ongoing application hosting ([service terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#actions)). No continuously available worker is provisioned. Oracle remains deferred; application ingestion stays pending while provider privacy and hosting gates are open.

## Database governance

All schema changes use versioned mirrored SQL and Supabase CLI deployment. Staging already records all 31 versions; do not reset or reseed it during application deployment. The existing four documents and 275 chunks have preserved checksums.

## Web configuration

When the matching web deployment is verified, use the actual staging API URL, the staging Supabase public URL/anon key and the server-only client API key. Validate preview and production scopes separately. Never put provider credentials or a Supabase service-role key in public frontend variables.

## Release evidence

Record deployed revision, service URL, infrastructure/full readiness, auth journeys, worker startup/recovery, queue reconciliation, storage operations and the approved document journey. Provider privacy, native OAuth and the separate UI feed timeout remain open until actually verified.
