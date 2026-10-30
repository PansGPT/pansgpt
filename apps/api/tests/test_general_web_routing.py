"""General current facts use real web contracts, never unrelated course evidence."""

import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import settings
from app.engines.web_search import BIOMEDICAL_AUTHORITY_DOMAINS, WebSearchEngine
from app.routers import chat
from tests.conftest import TenantTestState
from tests.test_intent_classifier import decision
from tests.test_semantic_routing_api import semantic_router

REFERENCE = {
    "title": "Synthetic match report",
    "url": "https://example.test/match",
    "content": "A synthetic dated match report used only by offline tests.",
}


def web_decision(**changes: object) -> str:
    fields: dict[str, object] = {
        "action": "grounded",
        "intent": "general_assistance",
        "evidence_source": "web",
        "retrieval_query": "Arsenal Everton result 2026-10-24",
        "current_information": True,
        "public_search_query": True,
    }
    fields.update(changes)
    return decision(**fields)


async def test_current_general_question_searches_web_without_rag_and_keeps_only_web_citations(
    client: httpx.AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    completion = semantic_router(monkeypatch, web_decision())
    web = AsyncMock(return_value={"status": "success", "results": [REFERENCE]})
    monkeypatch.setattr(chat.web_search_engine, "search", web)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "what was the score btwn arsenal and everton yesterday"},
    )
    assert response.status_code == 200 and "event: done" in response.text
    tenant_state.retrieval.assert_not_awaited()
    assert web.call_args.kwargs["query"] == "Arsenal Everton result 2026-10-24"
    assert (
        web.call_args.kwargs["public_query"] is True and web.call_args.kwargs["scope"] == "general"
    )
    assert "checking_materials" not in response.text and "searching_sources" in response.text
    assert '"source_type": "web"' in response.text and REFERENCE["url"] in response.text
    assert '"source_type": "document"' not in response.text
    args = tenant_state.ai.call_args.kwargs
    assert args["fast_path"] is True and args["enable_tools"] is False
    assert (
        "pharmacy-only scope" in args["system_prompt"] and "Request time:" in args["system_prompt"]
    )
    assert "CRITICAL CLINICAL SAFETY RULES" not in args["system_prompt"]
    sent = json.loads(completion.call_args.args[4])
    assert sent["request_timezone"] == "Africa/Lagos" and "+01:00" in sent["request_datetime"]


@pytest.mark.parametrize(
    "status",
    [
        "not_configured",
        "privacy_blocked",
        "disabled",
        "quota_exceeded",
        "quota_unavailable",
        "provider_error",
        "timeout",
        "empty",
        "sensitive_query",
    ],
)
async def test_web_failure_does_not_invent_answer_search_course_or_consume_chat_credit(
    client: httpx.AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
    status: str,
) -> None:
    semantic_router(monkeypatch, web_decision())
    monkeypatch.setattr(
        chat.web_search_engine,
        "search",
        AsyncMock(
            return_value={
                "status": status,
                "results": [],
                "message": "A specific search capability failure.",
            }
        ),
    )
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Search the web for the result yesterday"},
    )
    assert f"WEB_SEARCH_{status.upper()}" in response.text and "event: done" in response.text
    assert (
        "not found in your course materials" not in response.text
        and "event: citations" not in response.text
    )
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_not_called()
    assert finish.call_args.kwargs["refund"] is True


async def test_tools_disabled_prevents_network_and_unverified_current_answer(
    client: httpx.AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    semantic_router(
        monkeypatch,
        web_decision(
            action="answer",
            answer="An unverified memorized result",
            public_progress=[{"code": "searching_sources", "label": "Looking up the match report"}],
        ),
    )
    web = AsyncMock()
    monkeypatch.setattr(chat.web_search_engine, "search", web)
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "The result yesterday?", "enable_tools": False},
    )
    assert "WEB_SEARCH_TOOLS_DISABLED" in response.text and "memorized" not in response.text
    assert (
        "event: public_progress" not in response.text and "searching_sources" not in response.text
    )
    web.assert_not_awaited()
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_not_called()


async def test_medical_web_evidence_keeps_clinical_guardrails(
    client: httpx.AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch
) -> None:
    semantic_router(
        monkeypatch,
        web_decision(
            intent="clinical_reasoning",
            clinical_risk=True,
            search_scope="general",
            retrieval_query="Warfarin current official contraindications",
        ),
    )
    web = AsyncMock(return_value={"status": "success", "results": [REFERENCE]})
    monkeypatch.setattr(chat.web_search_engine, "search", web)
    await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Check the current official contraindications"},
    )
    assert web.call_args.kwargs["scope"] == "biomedical"
    prompt = tenant_state.ai.call_args.kwargs["system_prompt"]
    assert (
        "CRITICAL CLINICAL SAFETY RULES" in prompt
        and "authoritative external web evidence" in prompt
    )
    assert "Ground your answers strictly in the verified course material chunks" not in prompt
    assert tenant_state.ai.call_args.kwargs["fast_path"] is False


@pytest.fixture
def search_probe(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "tvly-offline-fixture")
    monkeypatch.setattr(settings, "TAVILY_ZDR_CONFIRMED", False)
    monkeypatch.setattr(settings, "TAVILY_PUBLIC_SEARCH_ALLOWED", True)
    engine = WebSearchEngine()
    reserve = AsyncMock(return_value=(True, 1))
    monkeypatch.setattr(engine, "reserve_daily_usage", reserve)
    calls: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"results": [REFERENCE]})

    real = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real(transport=httpx.MockTransport(respond), **kwargs),
    )
    return engine, reserve, calls


async def test_general_query_is_not_rewritten_and_biomedical_scope_remains_authoritative(
    search_probe,
) -> None:
    engine, reserve, calls = search_probe
    for scope in ["general", "biomedical"]:
        result = await engine.search(
            "Public event 2026-10-24", user_id="student", scope=scope, public_query=True
        )
        assert result["status"] == "success"
    bodies = [json.loads(call.content) for call in calls]
    assert bodies[0]["query"] == "Public event 2026-10-24" and "include_domains" not in bodies[0]
    assert bodies[1]["include_domains"] == BIOMEDICAL_AUTHORITY_DOMAINS
    assert all(
        body["search_depth"] == "basic" and body["include_answer"] is False for body in bodies
    )
    assert settings.provider_privacy_allowed("tavily") is False


@pytest.mark.parametrize(
    "query",
    [
        "patient name: Private Person",
        "Patient John has a private medical condition",
        "contact learner@example.test",
        "phone +234 801 234 5678",
        "https://private.test/file?X-Amz-Signature=secret",
    ],
)
async def test_public_exception_rejects_identifiers_before_quota_and_http(
    search_probe, query: str
) -> None:
    engine, reserve, calls = search_probe
    result = await engine.search(query, user_id="student", scope="general", public_query=True)
    assert result["status"] == "sensitive_query"
    reserve.assert_not_awaited()
    assert not calls


async def test_privacy_revocation_precedes_cache_and_private_query_cannot_inherit_exception(
    search_probe, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine, reserve, calls = search_probe
    assert (
        await engine.search("Public event", user_id="student", scope="general", public_query=True)
    )["status"] == "success"
    assert (
        await engine.search("Public event", user_id="student", scope="general", public_query=False)
    )["status"] == "privacy_blocked"
    monkeypatch.setattr(settings, "TAVILY_PUBLIC_SEARCH_ALLOWED", False)
    assert (
        await engine.search("Public event", user_id="student", scope="general", public_query=True)
    )["status"] == "privacy_blocked"
    assert len(calls) == reserve.await_count == 1


async def test_cache_is_account_scope_and_freshness_bound_and_expires(
    search_probe, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine, reserve, calls = search_probe
    clock = [1000.0]
    monkeypatch.setattr("app.engines.web_search.time.time", lambda: clock[0])
    args = {
        "query": "Public event",
        "user_id": "first",
        "scope": "general",
        "public_query": True,
        "current_information": True,
    }
    assert (await engine.search(**args))["cached"] is False
    assert (await engine.search(**args))["cached"] is True
    await engine.search(**{**args, "user_id": "second"})
    await engine.search(**{**args, "scope": "biomedical"})
    await engine.search(**{**args, "current_information": False})
    clock[0] += settings.WEB_SEARCH_CURRENT_CACHE_TTL_SECONDS + 1
    assert (await engine.search(**args))["cached"] is False
    assert len(calls) == reserve.await_count == 5


async def test_missing_configuration_does_not_reserve_quota(
    search_probe, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine, reserve, calls = search_probe
    engine.tavily_key = None
    assert (await engine.search("Public event", user_id="student", public_query=True))[
        "status"
    ] == "not_configured"
    reserve.assert_not_awaited()
    assert not calls


@pytest.mark.parametrize("failure", ["timeout", "bad_status", "empty", "invalid", "unsafe_url"])
async def test_provider_failures_are_not_cached_as_success(
    monkeypatch: pytest.MonkeyPatch, failure: str
) -> None:
    engine = WebSearchEngine()
    engine.tavily_key = "tvly-offline-fixture"
    reserve = AsyncMock(return_value=(True, 1))
    real = httpx.AsyncClient

    def respond(request: httpx.Request) -> httpx.Response:
        if failure == "timeout":
            raise httpx.ReadTimeout("synthetic timeout")
        if failure == "bad_status":
            return httpx.Response(503)
        if failure == "invalid":
            return httpx.Response(200, json={"results": {}})
        if failure == "unsafe_url":
            return httpx.Response(
                200, json={"results": [{**REFERENCE, "url": "javascript:alert(1)"}]}
            )
        return httpx.Response(200, json={"results": []})

    monkeypatch.setattr(settings, "TAVILY_ZDR_CONFIRMED", True)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real(transport=httpx.MockTransport(respond), **kwargs),
    )
    monkeypatch.setattr(engine, "reserve_daily_usage", reserve)
    expected = (
        "timeout"
        if failure == "timeout"
        else "empty"
        if failure in {"empty", "unsafe_url"}
        else "provider_error"
    )
    assert (await engine.search("Public event", user_id="student", public_query=True))[
        "status"
    ] == expected
    assert not engine._result_cache


async def test_total_deadline_survives_a_receive_checkpoint_swallowing_cancellation(
    client: httpx.AsyncClient,
    tenant_state: TenantTestState,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import asyncio

    from starlette.requests import Request

    monkeypatch.setattr(settings, "CHAT_TOTAL_TIMEOUT_S", 0.02)

    async def receive_checkpoint(self: Request) -> bool:
        try:
            await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            return False
        return False

    monkeypatch.setattr(Request, "is_disconnected", receive_checkpoint)
    response = await asyncio.wait_for(
        client.post(
            "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
            json={"message": "Synthetic deadline regression"},
        ),
        timeout=1,
    )
    assert '"code": "TIMEOUT"' in response.text and "event: done" in response.text
    tenant_state.retrieval.assert_not_awaited()
    tenant_state.ai.assert_not_called()
