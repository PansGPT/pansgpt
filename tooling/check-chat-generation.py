"""Opt-in synthetic streamed generation probe, with DB telemetry disabled explicitly."""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from unittest.mock import AsyncMock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from app.engines.guard import ASSISTANT_IDENTITY, ASSISTANT_VOICE  # noqa: E402
from app.engines.llm import MultiTierLlmEngine  # noqa: E402
from app.engines.provider_capacity import close_capacity  # noqa: E402
from app.engines.provider_http import close_provider_http  # noqa: E402


async def evaluate(output: Path) -> int:
    engine = MultiTierLlmEngine()
    # This development adapter invokes the real backend/provider path but never
    # creates a student chat, writes telemetry rows or executes study tools.
    engine._record_telemetry = AsyncMock()
    started = time.monotonic()
    first = None
    answer = ""
    error = None
    provider = None
    try:
        async for kind, data, source in engine.stream_agentic_chat(
            ASSISTANT_IDENTITY + ASSISTANT_VOICE,
            "Explain why oil and water separate and how soap helps, in about 180 words. Use a friendly study-colleague tone, with one concrete example.",
            enable_tools=False,
        ):
            provider = source
            if kind == "text_chunk":
                token = data.get("token", data.get("delta", ""))
                if token and first is None:
                    first = round((time.monotonic() - started) * 1000)
                answer += token
            elif kind == "error":
                error = {key: data.get(key) for key in ("code", "retryable")}
    finally:
        await close_provider_http()
        await close_capacity()
    result = {
        "synthetic_only": True,
        "tools_and_database_disabled": True,
        "provider": provider,
        "first_visible_output_ms": first,
        "total_ms": round((time.monotonic() - started) * 1000),
        "answer": answer,
        "error": error,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result), flush=True)
    return int(error is not None or not answer.strip())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required to use configured provider quotas")
    raise SystemExit(asyncio.run(evaluate(args.output)))
