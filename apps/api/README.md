# PansGPT API

<!-- [CHAT FIX 2] Project metadata and local setup use the production Python version. -->

FastAPI backend for PansGPT. Requires Python 3.12 or newer.

From this directory:

```sh
uv sync --frozen --all-extras
uv run uvicorn app.main:app --reload
```

The local API listens on port 8000. Configure credentials through environment variables.
See [testing instructions](../../docs/testing.md) for offline checks, live-test safeguards,
and the approval-before-ingestion migration deployment requirement.

### Main background worker

From the repository root, `pnpm dev` starts the web frontend, API and main worker
together. Use `pnpm dev:api` or `pnpm dev:worker` for individual services. Both
Python services load the same root `.env`. Ctrl+C stops the owned process trees;
the launcher restarts a crashed worker with bounded backoff. Python 3.12 must be
installed in `apps/api/.venv` first (`uv sync --frozen --all-extras` in this folder).

Run `uv run python -m workers.runner` from `apps/api` with the same environment as FastAPI. It subscribes to quiz wake notifications for immediate pickup and retains normal ARQ polling and durable reconciliation as fallback. The picture worker command remains separate.

### Local startup with the root environment file

The local root `.env` contains the configured service credentials. The API-local `.env` may contain blank placeholders. From `apps/api`, load the root environment explicitly into both processes (in separate terminals):

```powershell
.\.venv\Scripts\python.exe -c "from dotenv import load_dotenv; load_dotenv('../../.env', override=True); import uvicorn; uvicorn.run('app.main:app', host='127.0.0.1', port=8000, reload=True)"
.\.venv\Scripts\python.exe -c "from dotenv import load_dotenv; load_dotenv('../../.env', override=True); from workers.runner import main; main()"
```

Both processes are required for quiz generation. HTTP readiness verifies service connections; it does not prove a worker is running. Confirm `quiz_wake_listening` in the worker output and verify a submitted request progresses. Provider-capacity waits can still defer work after questions have been saved; timed quizzes require their full question set before starting.

`ENABLE_QUIZ_INVENTORY` defaults to `false`. Automatic inventory warming shares daily provider allowances with student requests, even when it runs while the queue is idle. Enable it only with a deliberate capacity allocation. Existing validated questions remain reusable with warming disabled; already-queued inventory deliveries are ignored without deleting saved questions. New timed and untimed quizzes both require their complete question set.
