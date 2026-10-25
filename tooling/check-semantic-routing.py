"""Opt-in provider evaluation using synthetic text; never executes study tools or writes data."""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

from pydantic import BaseModel, TypeAdapter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.engines.intent_classifier import IntentClassifier  # noqa: E402


class RoutingCase(BaseModel):
    id: str
    message: str
    history: list[dict[str, str]]
    expected_route: str
    requires_tools: bool
    requires_rag: bool
    requires_web: bool | None = None


async def evaluate() -> int:
    cases = TypeAdapter(list[RoutingCase]).validate_json(
        (ROOT / "apps/api/tests/fixtures/semantic-routing.json").read_text(encoding="utf-8")
    )
    engine = IntentClassifier()
    failures = 0
    for case in cases:
        started = time.monotonic()
        result = await engine.classify(case.message, history=case.history)
        passed = (
            result.routing_source == "model"
            and result.route.value == case.expected_route
            and result.requires_tools == case.requires_tools
            and result.requires_rag == case.requires_rag
            and (case.requires_web is None or result.requires_web == case.requires_web)
            and (case.expected_route != "fast_path" or bool(result.direct_answer))
        )
        failures += int(not passed)
        print(
            json.dumps(
                {
                    "case": case.id,
                    "passed": passed,
                    "route": result.route.value,
                    "intent": result.intent.value,
                    "provider": result.routing_provider,
                    "model": result.routing_model,
                    "requires_rag": result.requires_rag,
                    "requires_web": result.requires_web,
                    "requires_tools": result.requires_tools,
                    "latency_ms": round((time.monotonic() - started) * 1000),
                }
            ),
            flush=True,
        )
    return int(failures > 0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live",
        action="store_true",
        help="Use configured provider credentials and quotas",
    )
    args = parser.parse_args()
    if not args.live:
        parser.error(
            "Pass --live explicitly to use provider quotas. Run from apps/api to load its ignored .env."
        )
    raise SystemExit(asyncio.run(evaluate()))
