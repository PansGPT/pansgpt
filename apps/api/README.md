# PansGPT API

<!-- [CHAT FIX 2] Project metadata and local setup use the production Python version. -->

FastAPI backend for PansGPT. Requires Python 3.12 or newer.

From this directory:

```sh
uv sync --frozen --all-extras
uv run uvicorn app.main:app --reload
```

The local API listens on port 8000. Configure credentials through environment variables
or `apps/api/.env` when starting from this directory. Copy `.env.example` to `.env`
for a new local setup and supply the configured service credentials.
See [testing instructions](../../docs/testing.md) for offline checks, live-test safeguards,
and the approval-before-ingestion migration deployment requirement.

### Main background worker

From the repository root, `pnpm dev` starts the web frontend, API and main worker
together. Use `pnpm dev:api` or `pnpm dev:worker` for individual services. Both
Python services start from `apps/api` and load its `.env`; when a root `.env`
exists, the launcher loads it first with override enabled, so its values take
precedence. Ctrl+C stops the owned process trees;
the launcher restarts a crashed worker with bounded backoff. Python 3.12 must be
installed in `apps/api/.venv` first (`uv sync --frozen --all-extras` in this folder).

Run `uv run python -m workers.runner` from `apps/api` with the same environment as FastAPI. It subscribes to quiz wake notifications for immediate pickup and retains normal ARQ polling and durable reconciliation as fallback. The picture worker command remains separate.

### Local startup with the root environment file

If your configured service credentials are in a root `.env`, load that environment
explicitly into both processes. From `apps/api`, run these commands in separate terminals:

```powershell
.\.venv\Scripts\python.exe -c "from dotenv import load_dotenv; load_dotenv('../../.env', override=True); import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000, reload=True)"
.\.venv\Scripts\python.exe -c "from dotenv import load_dotenv; load_dotenv('../../.env', override=True); from workers.runner import main; main()"
```

Both processes are required for quiz generation. HTTP readiness verifies service connections; it does not prove a worker is running. Confirm `quiz_wake_listening` in the worker output and verify a submitted request progresses. Provider-capacity waits can still defer work after questions have been saved; timed quizzes require their full question set before starting.

### Enable Quiz locally

`ENABLE_QUIZ` defaults to `false`, including in `.env.example`. After the quiz
lifecycle migrations and applicable integration checks pass, set this explicitly
in the environment file used by your local API:

```dotenv
ENABLE_QUIZ=true
```

Restart the API after changing this flag; Uvicorn's Python-file reload does not
guarantee environment-file changes are reloaded. If you use the root `.env`
override, put the intended value there too. A feature flag is local runtime
configuration and is not enabled merely by merging the Quiz code. Hosted
activation remains a separate release decision.

When the flag is disabled, `/api/v1/quiz/courses` and `/api/v1/quiz/history`
both return HTTP 503 with `Quiz practice is being prepared. Please check back
shortly.` This happens before database queries. A storage failure has a different
message: `Quiz storage is unavailable. Please retry.` After enabling the flag,
unauthenticated direct requests should still return HTTP 401; verify successful
loading through the signed-in app, which supplies the client key and user token.
Loading courses and history does not invoke an LLM or require the generation worker.

The web proxy also needs a matching client identity: keep the raw `X_API_KEY_WEB`
in the web server's `apps/web/.env.local`, and configure the API's `X_API_KEY_WEB`
with the SHA-256 digest of that same value. Keep this out of `NEXT_PUBLIC_*`
variables and source control. Restart/reload the API after configuring its key.
`Invalid client API key.` means this pair is missing or mismatched; it is separate
from the Quiz feature flag and the student's sign-in token. User authentication
remains required after the client key is accepted.

`ENABLE_QUIZ_INVENTORY` defaults to `false`. Automatic inventory warming shares daily provider allowances with student requests, even when it runs while the queue is idle. Enable it only with a deliberate capacity allocation. Existing validated questions remain reusable with warming disabled; already-queued inventory deliveries are ignored without deleting saved questions. New timed and untimed quizzes both require their complete question set.
