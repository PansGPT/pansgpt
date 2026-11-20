"""Readable local operations, with explicit JSON/debug modes for diagnostics."""

import logging
import os
import sys
from typing import Any

import structlog

from app.core.config import settings

# Redundant instrumentation stays available at DEBUG, not in the normal console.
QUIET_EVENTS = frozenset(
    {
        "provider_capacity_observed",
        "chat_provider_usage",
        "intent_provider_usage",
        "intent_decision_shape",
        "intent_routing_completed",
        "chat_phase_started",
        "chat_public_stage",
        "provider_admission_granted",
        "provider_output_budget_fitted",
        "provider_output_capacity_fitted",
        "model_first_packet",
        "chat_first_output",
    }
)


def operational_fields(_logger: object, _method: str, event: dict[str, Any]) -> dict[str, Any]:
    name = event.get("event")
    if settings.LOG_LEVEL != "DEBUG" and event.get("level") in {"debug", "info"}:
        if (
            name in QUIET_EVENTS
            or name == "chat_http_finished"
            and (event.get("http_status") or 0) < 400
        ):
            raise structlog.DropEvent
    return {key: value for key, value in event.items() if value is not None}


def duration(value: object) -> str:
    return f"{value / 1000:.1f}s" if type(value) in {int, float} else "an unreported duration"


def reason_text(event: dict[str, Any]) -> str:
    provider_reason = {
        "high_demand": "Google reported high demand",
        "overloaded": "Google reported an overloaded model",
        "quota_exhausted": "Google reported exhausted quota",
        "service_unavailable": "Google reported service unavailable",
        "internal_error": "Google reported an internal error",
    }.get(event.get("provider_error_reason"))
    if provider_reason:
        return provider_reason
    reason = {
        "provider_capacity": "token or request capacity is temporarily busy",
        "provider_rate_limit": "the provider rate limit was reached",
        "provider_unavailable": "the provider is temporarily unavailable",
        "capacity_store_unavailable": "the quota service is unavailable",
        "request_exceeds_budget": "the request exceeds the available token budget",
        "privacy_not_verified": "privacy requirements are not verified",
    }.get(event.get("reason"))
    if not reason:
        reason = {
            429: "the provider rate limit was reached",
            500: "the provider returned a server error",
            502: "the provider gateway failed",
            503: "the provider is temporarily unavailable",
            504: "the provider gateway timed out",
        }.get(event.get("http_status") or event.get("status"))
    kind = str(event.get("error_type") or "")
    if not reason and ("Timeout" in kind or kind == "ChatDeadlineError"):
        reason = "the request timed out"
    return reason or kind or event.get("error_code") or "an unexpected error occurred"


def readable_message(event: dict[str, Any]) -> tuple[str, str]:
    name = event.get("event", "Event")
    level = {"debug": "DEBUG", "warning": "WARN", "error": "ERROR", "critical": "ERROR"}.get(
        event.get("level"), "INFO"
    )
    model = event.get("model", "model")
    elapsed = duration(event.get("elapsed_ms", event.get("total_ms")))
    if name == "model_attempt_started":
        return level, f"AI: Trying {model} ({event.get('provider', 'provider')})."
    if name == "model_failover":
        return (
            "WARN",
            f"AI: {model} failed because {reason_text(event)}. Trying the next eligible model.",
        )
    if name == "model_candidate_skipped":
        return level, f"AI: Skipping {model}: {reason_text(event)}."
    if name in {"provider_admission_deferred", "model_capacity_wait", "model_capacity_exhausted"}:
        action = "Waiting" if name == "model_capacity_wait" else "Recheck in"
        return (
            "WARN",
            f"AI: {model}: {reason_text(event)}. {action} {event.get('retry_after_s', '?')}s.",
        )
    if name == "provider_request_rejected":
        status = event.get("http_status", event.get("status", "unknown"))
        detail = event.get("provider_error_status")
        return "WARN", (
            f"AI: {model} failed after {elapsed}: HTTP {status}"
            f"{' / ' + detail if detail else ''}; {reason_text(event)}."
            + (
                " Provider supplied no further safe detail."
                if not event.get("provider_error_reason")
                else ""
            )
        )
    if name == "provider_request_budget":
        counts = ", ".join(
            f"{label}: {event[key]}"
            for key, label in (
                ("prompt_tokens", "input"),
                ("completion_tokens", "output"),
                ("thinking_tokens", "thinking"),
            )
            if key in event
        )
        return (
            level,
            f"AI: {model} attempt ended after {elapsed}. {counts or 'Token usage unreported'}.",
        )
    if name == "query_classified":
        return (
            level,
            f"Routing: Intent={event.get('intent', 'unknown')}; path={event.get('route', 'unknown')}; router={event.get('routing_provider', 'server')}/{event.get('routing_model', 'context')}; {duration(event.get('routing_latency_ms'))}.",
        )
    if name == "rerank_completed":
        return "OK", (
            f"Search: {event.get('provider', 'reranker')}/{event.get('model', 'heuristic')} ranked {event.get('candidates_in', '?')} passages; "
            f"{event.get('candidates_passed', '?')} passed the threshold; {event.get('candidates_kept', '?')} kept; top score={event.get('top_score', '?')}; "
            f"{duration(event.get('latency_ms'))}."
        )
    if name in {"reranker_timeout_fallback_engaged", "reranker_error_fallback_engaged"}:
        return (
            "WARN",
            f"Search: Neural reranker failed ({reason_text(event)}); using heuristic ranking.",
        )
    if name in {"tool_dispatch_requested", "skill_dispatch_requested"}:
        tool = event.get("tool_name", event.get("skill", "study tool"))
        return level, f"Study tool: Starting {str(tool).replace('_', ' ')}."
    if name == "chat_artifact_ready":
        if event.get("skill") == "generate_flashcards" and type(event.get("item_count")) is int:
            return "OK", f"Flashcards: Created {event['item_count']} cards."
        return "OK", "Study material: Ready to view."
    if name in {"chat_phase_finished", "chat_phase_failed"}:
        phase = str(event.get("phase", "operation")).replace("_", " ")
        if name.endswith("failed"):
            return "WARN", f"Chat: {phase} failed after {elapsed}: {reason_text(event)}."
        return "OK", f"Chat: {phase} finished in {elapsed}."
    if name == "chat_run_started":
        return level, "Chat: Response started."
    if name == "chat_subscriber_detached":
        return level, (
            "Chat: View disconnected; the response continues in the background."
            if event.get("generation_continues")
            else "Chat: View disconnected after the response ended."
        )
    if name == "chat_run_finished":
        outcome = event.get("outcome")
        if event.get("completion_warning") == "additional_work_incomplete":
            return "WARN", f"Chat: Material saved; additional work could not finish ({elapsed})."
        if outcome == "complete":
            return "OK", f"Chat: Response completed in {elapsed}."
        if outcome == "cancelled":
            return level, f"Chat: Response stopped after {elapsed}."
        return "ERROR", f"Chat: Response failed after {elapsed}: {reason_text(event)}."
    if name == "chat_run_error":
        return "ERROR", f"Chat: Response failed: {reason_text(event)}."
    if name == "chat_artifact_checkpoint_saved":
        return "OK", f"Study material: Saved ({event.get('artifact_count', 1)} ready)."
    if name == "chat_artifact_followup_failed":
        return (
            "WARN",
            f"Chat: Keeping saved material; additional work failed: {reason_text(event)}.",
        )
    if name == "provider_admission_retry":
        return (
            "WARN",
            "Quota service: Temporary connection problem; retrying the same reservation once.",
        )
    if name == "provider_admission_failed":
        return (
            "WARN",
            f"Quota service: {model} reservation unavailable after {elapsed} "
            f"({event.get('error_type', 'connection error')}); no provider request sent.",
        )
    if name == "chat_model_deadline_exceeded":
        return (
            "WARN",
            f"AI: {model} exceeded the {event.get('deadline', 'response')} timeout ({event.get('timeout_s', '?')}s).",
        )
    if name == "database_connection_pool_initialized":
        return "OK", f"Database: Connection pool ready in {elapsed}."
    if name == "database_pool_initialization_failed":
        return "WARN", f"Database: Connection pool could not start: {reason_text(event)}."
    if name == "flashrank_warmup_pending":
        return (
            level,
            "Search: Reranker is still loading; startup continues with the heuristic fallback.",
        )
    if name == "flashrank_warmup_finished":
        return (
            ("OK", "Search: Neural reranker ready.")
            if event.get("ready")
            else ("WARN", "Search: Neural reranker unavailable; using the heuristic fallback.")
        )
    if name == "chat_capacity_store_prewarmed":
        return "OK", "AI: Quota service ready."
    # Unknown events retain useful operational fields, never arbitrary prompt,
    # exception text, response bodies, arguments or user content.
    extras = ", ".join(
        f"{key}={event[key]}"
        for key in (
            "provider",
            "model",
            "phase",
            "http_status",
            "error_type",
            "cause_type",
            "reason",
            "retry_after_s",
            "elapsed_ms",
            "prompt_tokens",
            "completion_tokens",
            "thinking_tokens",
            "input_tokens",
            "output_tokens",
            "remaining_tokens",
            "remaining_requests",
        )
        if key in event
    )
    text = str(name).replace("_", " ").capitalize()
    return level, text + (f": {extras}" if extras else ".")


class ReadableRenderer:
    def __init__(self, colors: bool) -> None:
        self.colors = colors

    def __call__(self, _logger: object, _method: str, event: dict[str, Any]) -> str:
        level, message = readable_message(event)
        if self.colors:
            color = {"OK": "32", "WARN": "33", "ERROR": "31", "INFO": "36", "DEBUG": "90"}[level]
            prefix = f"\x1b[{color}m{level:<5}\x1b[0m"
        else:
            prefix = f"{level:<5}"
        reference = event.get("run_id") or event.get("request_id")
        suffix = f" [ref:{str(reference).replace('-', '')[-8:]}]" if reference else ""
        if settings.LOG_LEVEL == "DEBUG":
            suffix += " " + " ".join(
                f"{key}={event[key]}"
                for key in ("request_id", "session_id", "run_id")
                if key in event
            )
        # Never allow terminal control sequences through dynamic operational fields.
        message = " ".join(message.split()).replace("\x1b", "")
        return f"{event.get('timestamp', '')} {prefix} {message}{suffix}".rstrip()


def configure_logging() -> None:
    console = (
        settings.LOG_FORMAT == "console"
        or settings.LOG_FORMAT == "auto"
        and (settings.ENVIRONMENT == "development" or sys.stdout.isatty())
    )
    colors = (
        settings.LOG_COLOR == "always"
        or settings.LOG_COLOR == "auto"
        and (sys.stdout.isatty() and "NO_COLOR" not in os.environ)
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            operational_fields,
            structlog.processors.TimeStamper(fmt="%H:%M:%S" if console else "iso", utc=not console),
            ReadableRenderer(colors) if console else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, settings.LOG_LEVEL)),
    )
    logging.getLogger("httpx").setLevel(
        logging.DEBUG if settings.LOG_LEVEL == "DEBUG" else logging.WARNING
    )
