"""Opt-in, bounded synthetic routing/voice/latency audit. No student/DB records.

Run from apps/api. Logical requests are paced by default and keep all configured
privacy, capacity and provider circuit controls. Availability is not accuracy.
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))
from app.engines.intent_classifier import IntentClassifier  # noqa: E402
from app.engines.provider_capacity import close_capacity  # noqa: E402
from app.engines.provider_http import close_provider_http  # noqa: E402


async def evaluate(output: Path, limit: int, pause: float, only: list[str] | None) -> int:
    cases = json.loads(
        (ROOT / "apps/api/tests/fixtures/semantic-routing.json").read_text(encoding="utf-8")
    )
    for case in json.loads(
        (ROOT / "apps/api/tests/fixtures/chat-voice.json").read_text(encoding="utf-8")
    ):
        cases.append(
            {
                **case,
                "expected_route": "fast_path",
                "requires_tools": False,
                "requires_rag": False,
                "requires_web": False,
            }
        )
    if only:
        missing = set(only) - {case["id"] for case in cases}
        if missing:
            raise ValueError(f"Unknown audit cases: {sorted(missing)}")
        cases = [case for case in cases if case["id"] in only]
    engine = IntentClassifier()
    records: list[dict[str, Any]] = []
    try:
        for index, case in enumerate(cases[:limit]):
            if index:
                await asyncio.sleep(pause)
            started = time.monotonic()
            result = await engine.classify(
                case["message"], history=case["history"], **case.get("context", {})
            )
            available = result.routing_source == "model"
            passed = (
                available
                and result.route.value == case["expected_route"]
                and all(
                    getattr(result, key) == case[key]
                    for key in ("requires_tools", "requires_rag", "requires_web", "clinical_risk")
                    if case.get(key) is not None
                )
                and (
                    not case.get("evidence_required") or result.requires_rag or result.requires_web
                )
            )
            record = {
                "case": case["id"],
                "available": available,
                "contract_passed": passed,
                "route": result.route.value,
                "intent": result.intent.value,
                "requires_rag": result.requires_rag,
                "requires_tools": result.requires_tools,
                "requires_web": result.requires_web,
                "clinical_risk": result.clinical_risk,
                "provider": result.routing_provider,
                "model": result.routing_model,
                "latency_ms": round((time.monotonic() - started) * 1000),
                "answer": result.direct_answer,
                "review_criteria": case.get("review", []),
            }
            records.append(record)
            print(json.dumps(record), flush=True)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(
                json.dumps(
                    {"synthetic_only": True, "pause_s": pause, "results": records},
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
    finally:
        await close_provider_http()
        await close_capacity()
    available = [item for item in records if item["available"]]
    summary = {
        "requested": len(records),
        "available": len(available),
        "correct_when_available": sum(bool(item["contract_passed"]) for item in available),
        "median_latency_ms": statistics.median(item["latency_ms"] for item in records)
        if records
        else None,
        "maximum_latency_ms": max((item["latency_ms"] for item in records), default=None),
        "note": "Small live sample; no universal quality/personality or p95/SLO claim.",
    }
    output.write_text(
        json.dumps(
            {"synthetic_only": True, "pause_s": pause, "summary": summary, "results": records},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"summary": summary}), flush=True)
    return int(any(not item["contract_passed"] for item in records))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, choices=range(1, 15), default=14)
    parser.add_argument("--pause", type=float, default=25)
    parser.add_argument("--case", action="append")
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required to use configured free-tier quotas")
    if args.pause < 0 or args.pause > 60:
        parser.error("--pause must be between 0 and 60 seconds")
    raise SystemExit(asyncio.run(evaluate(args.output, args.limit, args.pause, args.case)))
