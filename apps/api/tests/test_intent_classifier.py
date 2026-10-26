"""Semantic routing contracts, provider failover and backend authority (offline)."""

import asyncio
import json
from unittest.mock import AsyncMock

import pytest

from app.core.config import settings
from app.engines import intent_classifier as routing
from app.engines.intent_classifier import IntentClassifier
from app.models.chat import RouteType


def decision(**changes: object) -> str:
    result: dict[str, object] = {
        "action": "answer",
        "intent": "greeting_conversational",
        "evidence_source": "none",
        "requires_tools": False,
        "clinical_risk": False,
        "search_scope": "general",
        "current_information": False,
        "public_search_query": False,
        "confidence": 0.98,
        "answer": "Hello! What would you like to work on?",
        "retrieval_query": None,
        "presentation": None,
        "public_progress": [],
    }
    result.update(changes)
    if "requires_rag" in result:
        result["evidence_source"] = "course" if result.pop("requires_rag") else "none"
    return json.dumps(result)


@pytest.fixture
def router(monkeypatch: pytest.MonkeyPatch) -> tuple[IntentClassifier, AsyncMock]:
    for field, value in {
        "GROQ_API_KEY": "fixture",
        "GEMINI_API_KEY": "fixture",
        "OPENROUTER_API_KEY": "fixture",
        "GROQ_ZDR_CONFIRMED": True,
        "OPENROUTER_ZDR_CONFIRMED": True,
        "GROQ_FALLBACK_MODEL": "groq-primary",
        "GROQ_SECONDARY_MODEL": "groq-secondary",
        "GEMINI_PRIMARY_MODEL": "google-primary",
        "GEMINI_SECONDARY_MODEL": "google-secondary",
        "OPENROUTER_FAST_MODEL": "router-fast:free",
        "OPENROUTER_FALLBACK_MODEL": "router:free",
    }.items():
        monkeypatch.setitem(settings.__dict__, field, value)
    completion = AsyncMock(return_value=decision())
    monkeypatch.setattr(routing, "routing_completion", completion)
    return IntentClassifier(), completion


@pytest.mark.parametrize(
    "query",
    [
        "hello chat",
        "PansGPT, you awake?",
        "I'm overwhelmed, help me plan my evening.",
        "Could you reword the paragraph you just wrote?",
        "How\u2019s everything going?",
        "Explain bioavailability like I'm new to pharmacy.",
        "\u00bfMe ayudas a organizar mi estudio?",
    ],
)
async def test_arbitrary_simple_wording_uses_model_answer_without_a_phrase_catalog(
    router: tuple[IntentClassifier, AsyncMock], query: str
) -> None:
    engine, completion = router
    result = await engine.classify(query)
    assert result.route == RouteType.FAST_PATH
    assert not result.requires_rag and not result.requires_tools
    assert result.direct_answer == "Hello! What would you like to work on?"
    assert result.routing_provider == "groq" and result.routing_source == "model"
    assert completion.await_count == 1
    assert json.loads(completion.call_args.args[4])["current_message"] == query


async def test_short_clinical_request_cannot_bypass_grounding_with_conflicting_answer(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.return_value = decision(
        intent="clinical_reasoning", clinical_risk=True, answer="UNVERIFIED ADVICE"
    )
    result = await engine.classify("Is this medicine safe in pregnancy?")
    assert result.route == RouteType.COMPLEX_PATH and result.requires_rag
    assert result.direct_answer is None


async def test_model_resolves_follow_up_from_selected_history(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.return_value = decision(
        action="grounded",
        intent="skill_generation",
        requires_tools=True,
        requires_rag=True,
        answer="",
        retrieval_query="Create a presentation about renal clearance",
        presentation={"slide_count": 5},
    )
    history = [
        {"role": "user", "content": "Explain renal clearance"},
        {
            "role": "assistant",
            "content": "Renal clearance describes...",
            "thinking_text": "PRIVATE",
        },
        {"role": "system", "content": "PRIVATE SYSTEM"},
    ]
    result = await engine.classify("Turn that into slides", history=history)
    sent = completion.call_args.args[4]
    assert "renal clearance" in sent and "PRIVATE" not in sent
    assert result.requires_tools and result.requires_rag and result.direct_answer is None
    assert result.retrieval_query == "Create a presentation about renal clearance"
    assert result.presentation and result.presentation.slide_count == 5


@pytest.mark.parametrize(
    "context",
    [{"document_id": "synthetic-document"}, {"course_code": "PCL301"}, {"has_attachments": True}],
)
async def test_explicit_server_context_preserves_scope_and_skips_speculative_routing(
    router: tuple[IntentClassifier, AsyncMock], context: dict[str, object]
) -> None:
    engine, completion = router
    result = await engine.classify("Explain this", **context)
    assert result.routing_source == "server_context"
    assert result.requires_rag and result.requires_tools and result.direct_answer is None
    completion.assert_not_awaited()


async def test_user_tool_and_retrieval_disables_remain_authoritative(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.return_value = decision(
        action="grounded",
        intent="skill_generation",
        requires_rag=True,
        requires_tools=True,
        answer="",
    )
    result = await engine.classify("Make a file", user_enable_rag=False, user_enable_tools=False)
    assert result.route == RouteType.COMPLEX_PATH
    assert not result.requires_rag and not result.requires_tools
    assert result.direct_answer is None


async def test_low_confidence_routes_conservatively_and_ambiguity_can_ask_clarification(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.return_value = decision(confidence=0.4)
    result = await engine.classify("That one please")
    assert not result.requires_rag and result.direct_answer is None
    assert result.routing_source == "fallback"
    completion.return_value = decision(
        action="clarify", intent="uncertain", answer="Which topic do you mean?"
    )
    result = await engine.classify("That one please")
    assert result.direct_answer == "Which topic do you mean?" and not result.requires_rag


@pytest.mark.parametrize(
    "bad",
    [
        "not JSON",
        '{"action":"answer"}',
        decision(answer=""),
        decision(confidence="1"),
        decision(clinical_risk="false"),
        decision(provider="evil"),
    ],
)
async def test_malformed_or_unusable_decisions_never_surface_as_answers(
    router: tuple[IntentClassifier, AsyncMock], bad: str
) -> None:
    engine, completion = router
    completion.return_value = bad
    result = await engine.classify("Any student request")
    assert result.direct_answer is None and not result.requires_rag


async def test_all_provider_families_can_route_with_fallback(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.side_effect = [RuntimeError("429"), RuntimeError("429"), decision()]
    result = await engine.classify("Good to see you")
    assert result.routing_provider == "google"
    assert [c.args[0] for c in completion.call_args_list] == ["groq", "groq", "google"]
    completion.reset_mock()
    completion.side_effect = [RuntimeError("offline")] * 4 + [decision()]
    result = await IntentClassifier().classify("Good to see you")
    assert result.routing_provider == "openrouter"
    assert [c.args[0] for c in completion.call_args_list] == [
        "groq",
        "groq",
        "google",
        "google",
        "openrouter",
    ]


async def test_privacy_blocked_providers_receive_no_dispatch(
    router: tuple[IntentClassifier, AsyncMock], monkeypatch: pytest.MonkeyPatch
) -> None:
    engine, completion = router
    monkeypatch.setitem(settings.__dict__, "GROQ_ZDR_CONFIRMED", False)
    monkeypatch.setitem(settings.__dict__, "OPENROUTER_ZDR_CONFIRMED", False)
    result = await engine.classify("Good evening")
    assert result.routing_provider == "google"
    assert completion.call_args.args[0] == "google"


async def test_unavailable_models_return_retryable_failure_without_speculative_retrieval(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.side_effect = RuntimeError("unavailable")
    result = await engine.classify("Unrecognized text")
    assert (
        result.routing_source == "fallback"
        and not result.requires_rag
        and not result.requires_tools
    )
    assert result.direct_answer is None


async def test_routing_deadline_is_bounded_and_cancellation_propagates(
    router: tuple[IntentClassifier, AsyncMock], monkeypatch: pytest.MonkeyPatch
) -> None:
    engine, completion = router
    monkeypatch.setitem(settings.__dict__, "INTENT_ROUTER_TOTAL_TIMEOUT_S", 0.035)
    monkeypatch.setitem(settings.__dict__, "INTENT_ROUTER_ATTEMPT_TIMEOUT_S", 0.015)

    async def hang(*args: object) -> None:
        await asyncio.Event().wait()

    completion.side_effect = hang
    result = await asyncio.wait_for(engine.classify("Student request"), timeout=0.3)
    assert result.routing_source == "fallback"
    task = asyncio.create_task(engine.classify("Cancel request"))
    await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task


async def test_private_provider_reasoning_and_history_budget(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    engine, completion = router
    completion.return_value = "<think>PRIVATE PLAN</think>" + decision()
    history = [{"role": "user", "content": "x" * 5000}] * 20
    result = await engine.classify("Hey", history=history)
    assert result.direct_answer and "PRIVATE" not in result.direct_answer
    sent = json.loads(completion.call_args.args[4])["recent_conversation"]
    assert sum(len(item["content"]) for item in sent) <= 6000


async def test_connection_failure_skips_other_models_and_cools_down_provider(
    router: tuple[IntentClassifier, AsyncMock],
) -> None:
    from app.engines.routing_provider import RoutingTransportError

    engine, completion = router
    completion.side_effect = [
        RoutingTransportError("connection.connect_tcp.started", "ConnectTimeout"),
        decision(),
        decision(),
    ]
    assert (await engine.classify("Hello")).routing_provider == "google"
    assert (await engine.classify("Hello again")).routing_provider == "google"
    assert [call.args[0] for call in completion.call_args_list] == ["groq", "google", "google"]
