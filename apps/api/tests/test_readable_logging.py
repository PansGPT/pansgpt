"""Operational logs stay readable without exposing private model/user content."""

import io
import json
import logging
from unittest.mock import AsyncMock, MagicMock

import pytest
import structlog

from app.core.config import settings
from app.core.diagnostics import error_fields
from app.core.logging_setup import ReadableRenderer, configure_logging, operational_fields
from app.engines import provider_capacity as capacity
from app.engines.llm import MultiTierLlmEngine


@pytest.mark.parametrize(
    "event,expected",
    [
        (
            {
                "event": "provider_admission_failed",
                "model": "fixture",
                "error_type": "TimeoutError",
                "elapsed_ms": 5000,
            },
            "no provider request sent",
        ),
        (
            {"event": "chat_artifact_followup_failed", "error_code": "TIMEOUT"},
            "Keeping saved material",
        ),
        (
            {
                "event": "chat_run_finished",
                "outcome": "complete",
                "completion_warning": "additional_work_incomplete",
            },
            "additional work could not finish",
        ),
    ],
)
def test_partial_success_and_quota_failures_are_distinct_and_private(event, expected):
    event["prompt"] = "PRIVATE USER CONTENT"
    text = ReadableRenderer(colors=False)(None, "warning", event)
    assert expected in text and "PRIVATE" not in text
    assert "ERROR" not in text


@pytest.mark.parametrize("wrapped", [False, True])
def test_google_outage_detail_is_readable_without_raw_message(wrapped):
    from google.genai.errors import ServerError

    cause = ServerError(
        503,
        {
            "error": {
                "status": "UNAVAILABLE",
                "message": "Model experiencing high demand. PRIVATE PROMPT",
            }
        },
    )
    exc = capacity.CapacityDeferred(120, "provider_unavailable") if wrapped else cause
    if wrapped:
        exc.__cause__ = cause
    fields = error_fields(exc)
    assert fields["http_status"] == 503 and fields["provider_error_status"] == "UNAVAILABLE"
    assert fields["provider_error_reason"] == "high_demand"
    assert "PRIVATE" not in json.dumps(fields)
    text = ReadableRenderer(colors=False)(
        None,
        "warning",
        {
            "event": "provider_request_rejected",
            "model": "gemma-test",
            **fields,
        },
    )
    assert "HTTP 503" in text and "UNAVAILABLE" in text and "high demand" in text
    assert "PRIVATE" not in text


def test_unknown_google_detail_is_not_guessed_or_logged():
    from google.genai.errors import ServerError

    fields = error_fields(ServerError(503, {"error": {"message": "PRIVATE UNKNOWN ERROR"}}))
    assert "provider_error_reason" not in fields and "PRIVATE" not in json.dumps(fields)
    text = ReadableRenderer(colors=False)(
        None,
        "warning",
        {
            "event": "provider_request_rejected",
            **fields,
        },
    )
    assert "no further safe detail" in text


@pytest.fixture
def output(monkeypatch):
    before = structlog.get_config().copy()
    previous_httpx = logging.getLogger("httpx").level
    stream = io.StringIO()
    monkeypatch.setattr(settings, "LOG_COLOR", "never")
    monkeypatch.setattr(settings, "LOG_LEVEL", "INFO")
    structlog.configure(logger_factory=structlog.PrintLoggerFactory(file=stream))
    try:
        yield stream
    finally:
        structlog.configure(**before)
        logging.getLogger("httpx").setLevel(previous_httpx)


def test_local_console_explains_failure_and_completed_run(output, monkeypatch):
    monkeypatch.setattr(settings, "LOG_FORMAT", "console")
    configure_logging()
    log = structlog.get_logger()
    log.warning(
        "model_failover",
        model="gemma-test",
        http_status=503,
        reason="provider_unavailable",
        run_id="synthetic-abcdefgh",
        prompt="PRIVATE",
        error="PRIVATE RESPONSE",
    )
    log.info("chat_run_finished", outcome="complete", total_ms=12500)
    text = output.getvalue()
    assert "WARN" in text and "provider is temporarily unavailable" in text
    assert "Trying the next eligible model" in text and "ref:abcdefgh" in text
    assert "OK" in text and "Response completed in 12.5s" in text
    assert "PRIVATE" not in text and "null" not in text and "\x1b" not in text


def test_json_remains_available_and_retains_full_correlation(output, monkeypatch):
    monkeypatch.setattr(settings, "LOG_FORMAT", "json")
    configure_logging()
    structlog.get_logger().warning(
        "model_failover", request_id="full-request-id", model="test", http_status=503, unused=None
    )
    value = json.loads(output.getvalue())
    assert value["request_id"] == "full-request-id" and value["http_status"] == 503
    assert "unused" not in value


def test_redundant_instrumentation_is_hidden_but_debug_is_available(output, monkeypatch):
    monkeypatch.setattr(settings, "LOG_FORMAT", "json")
    configure_logging()
    structlog.get_logger().info("provider_capacity_observed", input_tokens=20)
    assert not output.getvalue()
    monkeypatch.setattr(settings, "LOG_LEVEL", "DEBUG")
    configure_logging()
    structlog.get_logger().debug("provider_capacity_observed", input_tokens=20)
    assert json.loads(output.getvalue())["input_tokens"] == 20


def test_explicit_colors_and_empty_field_filter():
    line = ReadableRenderer(colors=True)(
        None, "info", {"event": "chat_run_finished", "outcome": "complete", "total_ms": 3000}
    )
    assert "\x1b[32m" in line and "OK" in line
    assert operational_fields(None, "warning", {"event": "error", "optional": None}) == {
        "event": "error"
    }


def test_routing_and_reranking_console_include_decision_and_search_metrics():
    renderer = ReadableRenderer(colors=False)
    route = renderer(
        None,
        "info",
        {
            "event": "query_classified",
            "intent": "skill_generation",
            "route": "complex_path",
            "routing_provider": "groq",
            "routing_model": "synthetic-router",
            "routing_latency_ms": 2063,
        },
    )
    assert "Intent=skill_generation" in route and "path=complex_path" in route
    assert "groq/synthetic-router" in route and "2.1s" in route
    ranked = renderer(
        None,
        "info",
        {
            "event": "rerank_completed",
            "provider": "flashrank",
            "model": "TinyBERT",
            "candidates_in": 16,
            "candidates_passed": 4,
            "candidates_kept": 3,
            "top_score": 0.9866,
            "latency_ms": 277,
        },
    )
    assert "flashrank/TinyBERT" in ranked and "16 passages" in ranked
    assert "4 passed" in ranked and "3 kept" in ranked and "0.9866" in ranked
    fallback = renderer(None, "warning", {"event": "reranker_timeout_fallback_engaged"})
    assert "WARN" in fallback and "using heuristic ranking" in fallback


async def test_streamed_usage_is_accounted_continuously_but_summarized_once(output, monkeypatch):
    monkeypatch.setattr(settings, "LOG_FORMAT", "json")
    monkeypatch.setattr(settings, "AI_CAPACITY_ENABLED", True)
    store = MagicMock(eval=AsyncMock(side_effect=[[1, 0, 1], 1]))
    monkeypatch.setattr(capacity, "redis_client", lambda: store)
    configure_logging()
    async with capacity.provider_budget("google", "synthetic", "fixture", 1000):
        for thinking in (398, 422, 430, 430):
            await capacity.observe({}, 3465, 656)
            MultiTierLlmEngine._log_provider_usage(
                "google",
                "synthetic",
                {
                    "prompt_token_count": 3465,
                    "candidates_token_count": 656,
                    "thoughts_token_count": thinking,
                },
            )
    lines = [json.loads(line) for line in output.getvalue().splitlines()]
    assert len(lines) == 1 and lines[0]["event"] == "provider_request_budget"
    assert lines[0]["prompt_tokens"] == 3465
    assert lines[0]["completion_tokens"] == 656 and lines[0]["thinking_tokens"] == 430
    assert lines[0]["actual_tokens"] == 4121
