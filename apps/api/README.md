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
