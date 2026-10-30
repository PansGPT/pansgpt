# Combined development startup — 29 October 2026

`pnpm dev` now starts Next.js, FastAPI with reload, and the main quiz/ingestion
worker in one terminal. Previously it ran Turbo workspaces only, leaving the
Python API and worker to separate manual commands.

The dependency-free Node supervisor runs the existing Python virtual environment
and local Next.js executable without shell interpolation. API/worker load the
root environment in their own Python process; the supervisor does not load
backend secrets into the frontend. Individual `dev:web`, `dev:api`, `dev:worker`
commands remain available; `dev:workspaces` retains the old Turbo behavior.

Worker exits restart with exponential backoff, capped at 30 seconds and five
consecutive short-lived failures. A run lasting a minute resets that counter.
An API/frontend exit or exhausted restart budget stops the stack with failure.
Ctrl+C cancels restarts and stops only owned process trees. Windows children get
a short signal grace period followed by tree termination; persisted work retains
normal lease recovery. Port preflight refuses existing listeners without killing
them. Worker source edits require restarting the session.

The optional `compose.worker.yml` configures restart-on-exit for an existing
Docker worker host. It provisions no host and changes no Render service or cost
allocation. Existing provider/quiz enablement gates remain intact.

Verification: three Node lifecycle tests passed on Windows, exercising a real
worker process crash/restart, descendant cleanup, bounded restart exhaustion and
occupied-port refusal. Python launcher Ruff lint/format passed. Against the
running development services, the real launcher refused the occupied frontend
port without starting another worker. Docker is unavailable locally, so container
runtime verification remains open. CI now runs the Node lifecycle suite.

## Notion synchronization pending

No Notion connector is available; no entries were posted.

- Session / Change Log: One command starts frontend/API/quiz worker; bounded worker restart and owned-process cleanup. Date: 2026-10-29. Area: Developer tooling / Worker operations. Files: package.json, tooling/dev.mjs, tooling/dev-service.py, tooling/dev.test.mjs, scripts/dev.ps1, Makefile, compose.worker.yml, CI and startup docs. Verified: local lifecycle tests and Python checks; Docker runtime unverified.
- Decision Log: Use existing runtimes and a small supervisor, without another dependency or paid worker provisioning. Alternatives: separate terminals, attaching a worker to every API process, or adding paid hosting.
- Product Roadmap & Features: Combined local startup configured and tested; optional worker container supplied, always-on hosting still unprovisioned.
- Knowledge Base: No application stack or core architecture change.
