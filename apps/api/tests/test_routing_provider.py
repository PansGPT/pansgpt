"""Routing transports preserve privacy, token bounds and private structured output."""

import json
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.engines.routing_provider import routing_completion


@pytest.mark.parametrize("provider", ["groq", "openrouter"])
async def test_private_json_transport_uses_expected_origin_and_no_tools(
    monkeypatch: pytest.MonkeyPatch, provider: str
) -> None:
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)
    monkeypatch.setitem(settings.__dict__, "OPENROUTER_ZDR_CONFIRMED", True)
    requests = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"finish_reason": "stop", "message": {"content": '{"action":"answer"}'}}
                ]
            },
        )

    real = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real(transport=httpx.MockTransport(respond), **kwargs),
    )
    text = await routing_completion(
        provider, "fixture-model", "synthetic-key", "Return JSON", "Synthetic student message"
    )
    assert text == '{"action":"answer"}'
    body = json.loads(requests[0].content)
    assert body["stream"] is False and "tools" not in body
    assert body["response_format"] == {"type": "json_object"}
    assert body["max_tokens"] == settings.INTENT_ROUTER_MAX_TOKENS
    assert requests[0].headers["authorization"] == "Bearer synthetic-key"
    assert requests[0].url.host == ("api.groq.com" if provider == "groq" else "openrouter.ai")
    if provider == "openrouter":
        assert body["provider"] == {"zdr": True, "data_collection": "deny"}


async def test_privacy_block_prevents_transport_creation(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", False)
    client = AsyncMock()
    monkeypatch.setattr(httpx, "AsyncClient", client)
    with pytest.raises(RuntimeError, match="blocked"):
        await routing_completion("groq", "fixture", "synthetic-key", "JSON", "Hello")
    client.assert_not_called()


async def test_incomplete_routing_generation_is_not_accepted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)
    real = httpx.AsyncClient
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200, json={"choices": [{"finish_reason": "length", "message": {"content": "{}"}}]}
        )
    )
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real(transport=transport, **kwargs))
    with pytest.raises(ValidationError):
        await routing_completion("groq", "fixture", "synthetic-key", "JSON", "Hello")


async def test_supported_groq_models_use_strict_schema_and_low_reasoning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)
    requests = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200, json={"choices": [{"finish_reason": "stop", "message": {"content": "{}"}}]}
        )

    real = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real(transport=httpx.MockTransport(respond), **kwargs),
    )
    await routing_completion("groq", "openai/gpt-oss-120b", "fixture", "JSON", "Hello")
    payload = json.loads(requests[0].content)
    assert payload["response_format"]["type"] == "json_schema"
    schema = payload["response_format"]["json_schema"]
    assert schema["strict"] is True and schema["schema"]["additionalProperties"] is False
    assert payload["reasoning_effort"] == "low"


@pytest.mark.parametrize("finish", ["STOP", "MAX_TOKENS"])
async def test_google_fallback_finishes_and_closes_its_client(
    monkeypatch: pytest.MonkeyPatch, finish: str
) -> None:
    from types import SimpleNamespace

    from google import genai

    generate = AsyncMock(
        return_value=SimpleNamespace(
            text='{"action":"clarify"}', candidates=[SimpleNamespace(finish_reason=finish)]
        )
    )
    close = AsyncMock()
    client_options: dict[str, object] = {}

    def make_client(**kwargs: object) -> SimpleNamespace:
        client_options.update(kwargs)
        return SimpleNamespace(
            aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate), aclose=close)
        )

    monkeypatch.setattr(genai, "Client", make_client)
    if finish == "STOP":
        assert (
            await routing_completion("google", "fixture", "fixture", "JSON", "Hello")
            == '{"action":"clarify"}'
        )
    else:
        with pytest.raises(ValueError, match="did not finish"):
            await routing_completion("google", "fixture", "fixture", "JSON", "Hello")
    close.assert_awaited_once()
    options = client_options["http_options"]
    assert options.retry_options.attempts == 1
    assert options.timeout >= 10000

    assert (
        generate.call_args.kwargs["config"].max_output_tokens == settings.INTENT_ROUTER_MAX_TOKENS
    )


async def test_transport_failure_reports_only_stage_without_request_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.engines.routing_provider import RoutingTransportError

    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", True)

    async def fail(request: httpx.Request) -> httpx.Response:
        await request.extensions["trace"](
            "connection.connect_tcp.started", {"private": "NEVER LOG"}
        )
        raise httpx.ConnectTimeout("synthetic timeout", request=request)

    real = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kwargs: real(transport=httpx.MockTransport(fail), **kwargs)
    )
    with pytest.raises(RoutingTransportError) as error:
        await routing_completion("groq", "fixture", "key", "JSON", "PRIVATE STUDENT PROMPT")
    assert error.value.phase == "connection.connect_tcp.started"
    assert error.value.error_type == "ConnectTimeout"
    assert "PRIVATE" not in str(error.value)
