"""Content-free correlation and phase timing for chat requests and background runs."""

import logging
import time
import uuid
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = structlog.get_logger(__name__)


class RedactAccessQueries(logging.Filter):
    """Uvicorn includes query strings separately from our safe structured logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        if isinstance(args, tuple) and len(args) == 5 and isinstance(args[2], str):
            record.args = (*args[:2], args[2].partition("?")[0], *args[3:])
        return True


def error_fields(exc: BaseException) -> dict[str, object]:
    """Never include exception text: SDK errors can contain private response bodies."""
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    status = status or getattr(getattr(exc, "response", None), "status_code", None)
    cause = exc.__cause__ or (exc.__context__ if not exc.__suppress_context__ else None)
    if type(status) is not int and cause is not None:
        status = getattr(cause, "status_code", None) or getattr(cause, "code", None)
        status = status or getattr(getattr(cause, "response", None), "status_code", None)
    reason = getattr(exc, "reason", None)
    trace = exc.__traceback__
    while trace and trace.tb_next:
        trace = trace.tb_next
    fields: dict[str, object] = {
        "error_type": type(exc).__name__,
        "cause_type": type(cause).__name__ if cause else None,
        "http_status": status if type(status) is int else None,
        "reason": reason
        if isinstance(reason, str)
        and reason
        in {
            "provider_capacity",
            "capacity_store_unavailable",
            "request_exceeds_budget",
            "provider_cooldown",
            "daily_budget",
            "minute_budget",
            "provider_rate_limit",
            "provider_unavailable",
            "model_unsupported",
            "model_cache_incomplete",
            "model_archive_limit",
            "model_archive_path",
            "model_package_incomplete",
        }
        else None,
        "retry_after_s": getattr(exc, "seconds", None)
        if type(getattr(exc, "seconds", None)) in {int, float}
        else None,
        "error_location": f"{trace.tb_frame.f_code.co_name}:{trace.tb_lineno}" if trace else None,
    }
    # Google SDK keeps its structured error on .details, including streaming
    # failures with no HTTP response. Inspect only known fields/phrases; never
    # return the raw message (it may echo prompt or response content).
    provider_error = cause if cause is not None else exc
    details = getattr(provider_error, "details", None)
    if isinstance(details, dict):
        body = details.get("error", details)
        if isinstance(body, dict):
            provider_status = body.get("status")
            if isinstance(provider_status, str) and provider_status in {
                "UNAVAILABLE",
                "RESOURCE_EXHAUSTED",
                "INTERNAL",
                "DEADLINE_EXCEEDED",
                "INVALID_ARGUMENT",
                "PERMISSION_DENIED",
                "UNAUTHENTICATED",
                "NOT_FOUND",
            }:
                fields["provider_error_status"] = provider_status
            message = body.get("message")
            if isinstance(message, str) and len(message) <= 4096:
                normalized = message.lower()
                for marker, reason in (
                    ("high demand", "high_demand"),
                    ("overloaded", "overloaded"),
                    ("resource exhausted", "quota_exhausted"),
                    ("quota exceeded", "quota_exhausted"),
                    ("service unavailable", "service_unavailable"),
                    ("internal error", "internal_error"),
                ):
                    if marker in normalized:
                        fields["provider_error_reason"] = reason
                        break
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            body = response.json() if len(response.content) <= 16384 else None
            error = body.get("error") if isinstance(body, dict) else None
            if isinstance(error, dict):
                for key, allowed in {
                    "code": {
                        "json_validate_failed",
                        "model_not_found",
                        "model_decommissioned",
                        "invalid_api_key",
                        "rate_limit_exceeded",
                        "context_length_exceeded",
                        "unsupported_value",
                    },
                    "type": {
                        "invalid_request_error",
                        "authentication_error",
                        "rate_limit_error",
                        "server_error",
                        "insufficient_quota",
                    },
                    "param": {
                        "reasoning_effort",
                        "reasoning_format",
                        "response_format",
                        "model",
                        "messages",
                        "max_tokens",
                        "tools",
                    },
                }.items():
                    if isinstance(error.get(key), str) and error[key] in allowed:
                        fields[f"provider_error_{key}"] = error[key]
        except Exception:
            pass
    return fields


@contextmanager
def phase(name: str, **fields: Any) -> Iterator[None]:
    started = time.monotonic()
    logger.info("chat_phase_started", phase=name, **fields)
    with structlog.contextvars.bound_contextvars(phase=name):
        try:
            yield
        except BaseException as exc:
            logger.warning(
                "chat_phase_failed",
                phase=name,
                elapsed_ms=round((time.monotonic() - started) * 1000),
                **error_fields(exc),
                **fields,
            )
            raise
        else:
            logger.info(
                "chat_phase_finished",
                phase=name,
                elapsed_ms=round((time.monotonic() - started) * 1000),
                **fields,
            )


@asynccontextmanager
async def async_phase(name: str, **fields: Any) -> AsyncIterator[None]:
    with phase(name, **fields):
        yield


class RequestDiagnostics:
    """Pure ASGI middleware preserves streaming and background task context."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = str(uuid.uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.monotonic()
        status = 500

        async def traced_send(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message = {
                    **message,
                    "headers": [
                        *message.get("headers", []),
                        (b"x-request-id", request_id.encode()),
                    ],
                }
            await send(message)

        with structlog.contextvars.bound_contextvars(request_id=request_id):
            try:
                await self.app(scope, receive, traced_send)
            finally:
                route = scope.get("route")
                # Route templates exclude prompts/search terms and arbitrary path/query text.
                if scope.get("path", "").startswith("/api/v1/ai/chat"):
                    logger.info(
                        "chat_http_finished",
                        route=getattr(route, "path", "unmatched"),
                        method=scope.get("method"),
                        http_status=status,
                        elapsed_ms=round((time.monotonic() - started) * 1000),
                    )
