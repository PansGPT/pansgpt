"""Provider-specific transport preserving tool messages, streaming and privacy controls."""

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.core.config import settings
from app.engines.provider_capacity import observe, provider_budget


def finalize_calls(calls: list[dict[str, Any]]) -> None:
    for call in calls:
        call["id"] = call.get("id") or f"call_{uuid.uuid4().hex}"
        arguments = call.get("arguments") or {}
        if isinstance(arguments, str):
            arguments = json.loads(arguments)
        if not isinstance(arguments, dict):
            raise ValueError("Tool arguments must be a JSON object")
        call["arguments"] = arguments


def openai_delta(delta: dict[str, Any], calls: list[dict[str, Any]]) -> str:
    for item in delta.get("tool_calls") or []:
        index = item.get("index", 0)
        while len(calls) <= index:
            calls.append({"id": "", "name": "", "arguments": ""})
        call = calls[index]
        if item.get("id"):
            call["id"] = item["id"]
        function = item.get("function") or {}
        call["name"] += function.get("name") or ""
        call["arguments"] += function.get("arguments") or ""
    thought = delta.get("reasoning") or delta.get("reasoning_content") or ""
    return (f"<think>{thought}</think>" if thought else "") + (delta.get("content") or "")


async def google_turn(
    key: str, model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None
) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
    from google import genai
    from google.genai import types

    settings.require_provider_privacy("google")
    contents = []
    system = []
    for message in messages:
        role = message["role"]
        if role == "system":
            system.append(message.get("content") or "")
            continue
        parts = []
        if role == "tool":
            value = message.get("content") or "{}"
            try:
                result = json.loads(value)
            except (ValueError, TypeError):
                result = {"result": value}
            if not isinstance(result, dict):
                result = {"result": result}
            parts.append(
                types.Part.from_function_response(name=message.get("name", "tool"), response=result)
            )
        else:
            if message.get("content"):
                parts.append(types.Part.from_text(text=message["content"]))
            for call in message.get("tool_calls") or []:
                function = call["function"]
                args = function.get("arguments") or "{}"
                parts.append(
                    types.Part(
                        function_call=types.FunctionCall(
                            name=function["name"],
                            args=json.loads(args) if isinstance(args, str) else args,
                        )
                    )
                )
        if parts:
            contents.append(
                types.Content(role="model" if role == "assistant" else "user", parts=parts)
            )
    declarations = [tool["function"] for tool in tools or []]
    config = types.GenerateContentConfig(
        system_instruction="\n".join(system),
        tools=[types.Tool(function_declarations=declarations)] if declarations else None,
        max_output_tokens=settings.TEXT_CHAT_MAX_TOKENS,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    client = genai.Client(api_key=key)
    calls: list[dict[str, Any]] = []

    async def stream() -> AsyncIterator[str]:
        try:
            async with provider_budget(
                "google",
                model,
                {"messages": messages, "tools": tools},
                settings.TEXT_CHAT_MAX_TOKENS,
            ):
                response = await client.aio.models.generate_content_stream(
                    model=model, contents=contents, config=config
                )
                async for chunk in response:
                    for candidate in chunk.candidates or []:
                        for part in (candidate.content.parts if candidate.content else []) or []:
                            if part.function_call:
                                calls.append(
                                    {
                                        "id": getattr(part.function_call, "id", None)
                                        or f"call_{uuid.uuid4().hex}",
                                        "name": part.function_call.name,
                                        "arguments": part.function_call.args or {},
                                    }
                                )
                            if part.text:
                                yield f"<think>{part.text}</think>" if part.thought else part.text
                    if getattr(chunk, "usage_metadata", None) is not None:
                        from app.engines.llm import MultiTierLlmEngine

                        await observe(
                            {},
                            getattr(chunk.usage_metadata, "prompt_token_count", None),
                            getattr(chunk.usage_metadata, "candidates_token_count", None),
                        )
                        MultiTierLlmEngine._log_provider_usage(
                            "google", model, chunk.usage_metadata
                        )
        finally:
            await client.aio.aclose()

    return calls, stream()


async def groq_turn(
    key: str, model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None
) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
    from groq import AsyncGroq

    settings.require_provider_privacy("groq")
    client = AsyncGroq(api_key=key, max_retries=0)
    calls: list[dict[str, Any]] = []

    async def stream() -> AsyncIterator[str]:
        try:
            async with provider_budget(
                "groq", model, {"messages": messages, "tools": tools}, settings.TEXT_CHAT_MAX_TOKENS
            ):
                kwargs: dict[str, Any] = {
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "max_tokens": settings.TEXT_CHAT_MAX_TOKENS,
                    "temperature": 0.2,
                }
                if tools:
                    kwargs.update(tools=tools, tool_choice="auto")
                response = await client.chat.completions.create(**kwargs)
                async for chunk in response:
                    usage = getattr(chunk, "usage", None) or getattr(
                        getattr(chunk, "x_groq", None), "usage", None
                    )
                    if usage is not None:
                        from app.engines.llm import MultiTierLlmEngine

                        await observe(
                            {},
                            getattr(usage, "prompt_tokens", None),
                            getattr(usage, "completion_tokens", None),
                        )
                        MultiTierLlmEngine._log_provider_usage("groq", model, usage)
                    if chunk.choices:
                        text = openai_delta(
                            chunk.choices[0].delta.model_dump(exclude_none=True), calls
                        )
                        if text:
                            yield text
                finalize_calls(calls)
        finally:
            await client.close()

    return calls, stream()


async def openrouter_turn(
    key: str, model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None
) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
    settings.require_provider_privacy("openrouter")
    calls: list[dict[str, Any]] = []
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": settings.TEXT_CHAT_MAX_TOKENS,
        "temperature": 0.2,
        "provider": {"zdr": True, "data_collection": "deny"},
    }
    if tools:
        payload.update(tools=tools, tool_choice="auto")

    async def stream() -> AsyncIterator[str]:
        async with provider_budget("openrouter", model, payload, settings.TEXT_CHAT_MAX_TOKENS):
            async with httpx.AsyncClient(timeout=settings.CHAT_CHUNK_GAP_TIMEOUT_S) as client:
                async with client.stream(
                    "POST",
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json=payload,
                ) as response:
                    await observe(response.headers)
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        body = line[5:].strip()
                        if body == "[DONE]":
                            finalize_calls(calls)
                            return
                        data = json.loads(body)
                        if data.get("usage"):
                            from app.engines.llm import MultiTierLlmEngine

                            MultiTierLlmEngine._log_provider_usage(
                                "openrouter", model, data["usage"]
                            )
                        if data.get("error"):
                            raise RuntimeError("OpenRouter reported a streaming error")
                        if data.get("choices"):
                            text = openai_delta(data["choices"][0].get("delta") or {}, calls)
                            if text:
                                yield text
                    finalize_calls(calls)

    return calls, stream()
