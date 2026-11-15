"""Opt-in synthetic conversational evaluation; uses backend routing, no chat/database writes.

Run from apps/api with --live to retain existing provider/privacy/capacity controls.
Saved answers are synthetic output for human review, not an automated personality score.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from pydantic import BaseModel, ConfigDict, TypeAdapter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.engines.intent_classifier import IntentClassifier  # noqa: E402
from app.engines.provider_capacity import close_capacity  # noqa: E402


class VoiceCase(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: str
    message: str
    history: list[dict[str, str]]
    review: list[str]


async def evaluate(output: Path, limit: int, selected: list[str] | None) -> int:
    cases = TypeAdapter(list[VoiceCase]).validate_json(
        (ROOT / "apps/api/tests/fixtures/chat-voice.json").read_text(encoding="utf-8")
    )
    if selected:
        cases = [case for case in cases if case.id in selected]
    engine = IntentClassifier()
    results: list[dict[str, object]] = []
    try:
        for case in cases[:limit]:
            result = await engine.classify(case.message, history=case.history)
            record: dict[str, object] = {
                "case": case.id,
                "route_contract_passed": result.routing_source == "model"
                and result.direct_answer is not None
                and not (result.requires_rag or result.requires_tools or result.requires_web),
                "provider": result.routing_provider,
                "model": result.routing_model,
                "latency_ms": result.routing_latency_ms,
                "answer": result.direct_answer,
                "human_review_criteria": case.review,
            }
            results.append(record)
            print(json.dumps(record), flush=True)
    finally:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        await close_capacity()
    return int(any(not result["route_contract_passed"] for result in results))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Use configured provider quotas")
    parser.add_argument("--limit", type=int, choices=range(1, 5), default=4)
    parser.add_argument(
        "--case",
        action="append",
        choices=[
            "identity_repair",
            "continue_agreed_plan",
            "support_without_lecture",
            "own_a_factual_mistake",
        ],
        help="Evaluate only selected synthetic exchanges",
    )
    parser.add_argument(
        "--output", type=Path, required=True, help="Save synthetic answers for review"
    )
    args = parser.parse_args()
    if not args.live:
        parser.error("Pass --live explicitly; run from apps/api to load its ignored .env.")
    raise SystemExit(asyncio.run(evaluate(args.output, args.limit, args.case)))
