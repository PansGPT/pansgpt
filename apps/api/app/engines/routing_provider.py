"""Bounded, private JSON completions for semantic routing; no tool execution."""

import asyncio
from typing import Literal

import httpx
import structlog
from pydantic import BaseModel, Field

from app.core.config import settings
from app.engines.provider_capacity import observe, provider_budget
from app.models.chat import SemanticDecision
from app.models.presentation import PresentationPlan

logger = structlog.get_logger(__name__)


STRICT_GROQ_MODELS = {"openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"}


class RoutingTransportError(RuntimeError):
    def __init__(self, phase: str, error_type: str) -> None:
        super().__init__("Routing transport failed")
        self.phase = phase
        self.error_type = error_type


class CompletionMessage(BaseModel):
    content: str


class CompletionChoice(BaseModel):
    message: CompletionMessage
    finish_reason: Literal["stop"]


class CompletionEnvelope(BaseModel):
    choices: list[CompletionChoice] = Field(min_length=1)
    usage: dict[str, object] | None = None


async def routing_completion(
    provider: str,
    model: str,
    key: str,
    system: str,
    context: str,
    response_schema: type[BaseModel] = SemanticDecision,
    *,
    max_output_tokens: int | None = None,
    timeout_s: float | None = None,
    constrained_json: bool = True,
    structured_schema: dict[str, object] | None = None,
    google_thinking_level: Literal["minimal"] | None = None,
) -> str:
    settings.require_provider_privacy(provider)
    sent_schema = (
        (
            structured_schema
            if structured_schema is not None
            else response_schema.model_json_schema()
        )
        if constrained_json and provider == "groq" and model in STRICT_GROQ_MODELS
        else None
    )
    async with provider_budget(
        provider,
        model,
        {"system": system, "context": context, "schema": sent_schema},
        max_output_tokens or settings.INTENT_ROUTER_MAX_TOKENS,
    ):
        return await _routing_completion(
            provider,
            model,
            key,
            system,
            context,
            response_schema,
            max_output_tokens=max_output_tokens,
            timeout_s=timeout_s,
            constrained_json=constrained_json,
            structured_schema=structured_schema,
            google_thinking_level=google_thinking_level,
        )


async def _routing_completion(
    provider: str,
    model: str,
    key: str,
    system: str,
    context: str,
    response_schema: type[BaseModel] = SemanticDecision,
    *,
    max_output_tokens: int | None = None,
    timeout_s: float | None = None,
    constrained_json: bool = True,
    structured_schema: dict[str, object] | None = None,
    google_thinking_level: Literal["minimal"] | None = None,
) -> str:
    """JSON is validated by the caller before any content reaches the student."""
    settings.require_provider_privacy(provider)
    token_limit = max_output_tokens or settings.INTENT_ROUTER_MAX_TOKENS
    attempt_timeout = timeout_s or settings.INTENT_ROUTER_ATTEMPT_TIMEOUT_S
    if provider == "google":
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=key,
            http_options=types.HttpOptions(
                # Google rejects advertised server deadlines below 10s. The outer
                # routing deadline still cancels this call at its smaller budget.
                timeout=max(10000, round(attempt_timeout * 1000)),
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=context,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=0,
                    max_output_tokens=token_limit,
                    thinking_config=types.ThinkingConfig(thinking_level=google_thinking_level)
                    if google_thinking_level and model.startswith("gemma-4-")
                    else None,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            usage = getattr(response, "usage_metadata", None)
            if usage is not None:
                await observe(
                    {},
                    getattr(usage, "prompt_token_count", None),
                    getattr(usage, "candidates_token_count", None),
                )
                logger.info(
                    "intent_provider_usage",
                    provider=provider,
                    model=model,
                    prompt_tokens=getattr(usage, "prompt_token_count", None),
                    completion_tokens=getattr(usage, "candidates_token_count", None),
                )
            # Account for returned usage even when the answer was truncated.
            if not response.candidates or str(response.candidates[0].finish_reason) not in {
                "STOP",
                "FinishReason.STOP",
            }:
                logger.warning(
                    "google_completion_incomplete",
                    model=model,
                    finish_reason=str(response.candidates[0].finish_reason)
                    if response.candidates
                    else "NO_CANDIDATES",
                )
                raise ValueError("Routing completion did not finish")
            return response.text or ""
        finally:
            await client.aio.aclose()

    if provider not in {"groq", "openrouter"}:
        raise ValueError("Unsupported routing provider")
    url = (
        "https://api.groq.com/openai/v1/chat/completions"
        if provider == "groq"
        else "https://openrouter.ai/api/v1/chat/completions"
    )
    payload: dict[str, object] = {
        "model": model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": context}],
        "response_format": {"type": "json_object"},
        "temperature": 0,
        "max_tokens": token_limit,
        "stream": False,
    }
    # Strict output is supported on these Groq models; other configured models use JSON mode.
    if constrained_json and provider == "groq" and model in STRICT_GROQ_MODELS:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "pansgpt_semantic_route"
                if response_schema is SemanticDecision
                else "pansgpt_presentation_plan"
                if response_schema is PresentationPlan
                else "pansgpt_title",
                "strict": True,
                "schema": structured_schema
                if structured_schema is not None
                else response_schema.model_json_schema(),
            },
        }
    if provider == "groq" and model.startswith("openai/gpt-oss-"):
        payload["reasoning_effort"] = "low"
    if provider == "groq" and model == "qwen/qwen3.8-27b":
        payload["reasoning_effort"] = "none"
    if provider == "openrouter":
        payload["provider"] = {"zdr": True, "data_collection": "deny"}
    phase = "client_setup"

    async def trace(event: str, info: dict[str, object]) -> None:
        nonlocal phase
        # Keep only stage names; trace info can contain headers, prompts or credentials.
        if event.endswith(".started"):
            phase = event

    timeout = httpx.Timeout(attempt_timeout, connect=4.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}"},
                json=payload,
                extensions={"trace": trace},
            )
            await observe(response.headers)
            response.raise_for_status()
            phase = "response_validation"
            result = CompletionEnvelope.model_validate_json(response.text)
    except asyncio.CancelledError as exc:
        # asyncio.timeout preserves this cause; external cancellation still propagates.
        exc.routing_phase = phase
        raise
    except httpx.RequestError as exc:
        raise RoutingTransportError(phase, type(exc).__name__) from exc
    if result.usage:
        input_tokens = result.usage.get("prompt_tokens")
        output_tokens = result.usage.get("completion_tokens")
        await observe(
            {},
            input_tokens if isinstance(input_tokens, int) else None,
            output_tokens if isinstance(output_tokens, int) else None,
        )
        logger.info(
            "intent_provider_usage",
            provider=provider,
            model=model,
            prompt_tokens=result.usage.get("prompt_tokens"),
            completion_tokens=result.usage.get("completion_tokens"),
        )
    # Do not log response bodies, requests or provider errors containing user content.
    return result.choices[0].message.content
