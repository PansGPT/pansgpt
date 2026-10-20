# Staging API and worker deployment - 20 October 2026

Status: deployment candidate verified; actual Render deployment awaits account access. GitHub Actions was selected for staging worker checks; Oracle worker hosting is deferred. See [worker verification](worker-verification-2026-10-20.md) for its separate execution status.

## Verified preparation

- Existing database gate remains passed: 31 migrations, 50 public tables, 18 declared RPC contracts, four documents and 275 chunks preserved.
- Read-only checks from the operator workspace reached staging Postgres, Upstash Redis and R2 (`pansgpt-library-staging`). The concurrent implementation returned infrastructure 200 while full product readiness remained 503 with chat and embeddings blocked. This proves local code against hosted dependencies, not a Render-deployed response. No external AI calls were made.
- Found a deployment blocker: Render's configured full-readiness endpoint rejects privacy-blocked providers. Added `/health/infrastructure` for required infrastructure health while `/health/ready` continues to report blocked chat/embeddings. Database, Redis and R2 failures still return 503.
- Bound independent probes to four seconds and run them concurrently to fit Render's health-check deadline. Added regression coverage for privacy holds, each failed dependency and concurrent probe progress.
- Local API suite passed: **405 passed, 12 skipped**, with two dependency deprecation warnings. Ruff lint and formatting passed across 92 API files.
- [All six CI jobs passed](https://github.com/PansGPT/pansgpt/actions/runs/39430512919) for revision `e5345b6fabd2a9940290921d5f1a213f95ddd56e`: existing code/database/web gates plus a real Docker build, startup/fail-closed health and real LibreOffice conversion under the non-root runtime user.
- Added a Docker ignore file so local environment files, virtual environments and test caches are not included in build context.

## Access and host selection

- No Render API credential or deployment hook was found in the configured local environment. GitHub repository/staging environment secret names did not include deployment credentials.
- Render integration discovery found the integration available but not installed. Installation/account authorization is pending; its connection is not assumed.
- The user selected GitHub Actions staging checks now and Oracle Linux hosting later. Actions is limited to development/testing, not ongoing queue consumers. No paid Render worker has been provisioned.
- Initial HTTP probes of the documented API domains timed out or failed to resolve. GitHub's last successful Render staging deployment record points to `https://pansgpt-api-staging.onrender.com`, service `srv-dahesc15efls73dpl5ug`, at older revision `b3ee1f4f326023526852f2721fab3756b23ec495`. The verified candidate has not been deployed.
- Oracle account verification, capacity and ARM compatibility remain deferred. No Oracle resources have been created.

## Remaining execution

1. Complete Render connection and inspect the actual staging service/configuration.
2. CI passed, including deployment-image smoke checks. Deploy the exact verified candidate revision.
3. Verify the deployed API's infrastructure/full-readiness distinction and role guards against staging.
4. Configure and exercise the selected remote worker host with the same revision; test durable enqueue/recovery and cleanup within approved scope.
5. Preserve all provider privacy blocks until account evidence is approved. Complete the provider-dependent document journey only after that gate passes.

Notion: the user reported that the previous database verification entries were synchronized. This new deployment follow-up has not been synchronized by this session.
