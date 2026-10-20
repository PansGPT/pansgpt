# Staging API and worker deployment - 20 October 2026

Status: deployment preparation in progress. No application deployment is claimed by this record yet.

## Verified preparation

- Existing database gate remains passed: 31 migrations, 50 public tables, 18 declared RPC contracts, four documents and 275 chunks preserved.
- Read-only checks from the operator workspace reached staging Postgres and Upstash Redis. A separate R2 bucket HEAD returned HTTP 200 for `pansgpt-library-staging`. No external AI calls were made.
- Found a deployment blocker: Render's configured full-readiness endpoint rejects privacy-blocked providers. Added `/health/infrastructure` for required infrastructure health while `/health/ready` continues to report blocked chat/embeddings. Database, Redis and R2 failures still return 503.
- Bound independent probes to four seconds and run them concurrently to fit Render's health-check deadline. Added regression coverage for privacy holds, each failed dependency and concurrent probe progress.
- Local API suite passed: **405 passed, 12 skipped**, with two dependency deprecation warnings. Ruff lint and formatting passed across 92 API files.
- Added a real Docker-image CI smoke gate for process startup, fail-closed readiness and real LibreOffice conversion under the non-root runtime user. Execution results will be recorded after CI completes.
- Added a Docker ignore file so local environment files, virtual environments and test caches are not included in build context.

## Access and host selection

- No Render API credential or deployment hook was found in the configured local environment. GitHub repository/staging environment secret names did not include deployment credentials.
- Render integration discovery found the integration available but not installed. Installation/account authorization is pending; its connection is not assumed.
- The user prefers remote workers. An existing remote Linux host or an explicitly selected operator-triggered batch host is needed. No paid Render worker has been provisioned.
- Initial probes of the documented API domains timed out or failed to resolve; they do not establish the current service URL or deployed revision.

## Remaining execution

1. Complete Render connection and inspect the actual staging service/configuration.
2. Pass CI including the deployment-image smoke checks; deploy the exact candidate revision.
3. Verify the deployed API's infrastructure/full-readiness distinction and role guards against staging.
4. Configure and exercise the selected remote worker host with the same revision; test durable enqueue/recovery and cleanup within approved scope.
5. Preserve all provider privacy blocks until account evidence is approved. Complete the provider-dependent document journey only after that gate passes.

Notion: the user reported that the previous database verification entries were synchronized. This new deployment follow-up has not been synchronized by this session.
