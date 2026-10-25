import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pymupdf
import pytest

from app.core.config import settings
from app.engines import provider_adapters
from app.engines.chunker import SemanticChunker
from app.engines.circuit import ModelCircuits
from app.engines.job_outbox import deliver_job
from app.engines.skills import skill_engine
from app.engines.stream_guard import StreamGuard
from app.engines.web_search import WebSearchEngine


@pytest.mark.parametrize(
    "secret",
    [
        "sk-abcdef123456789012345678901234",
        "AIza12345678901234567890123456789012345",
        "postgresql://user:password@db/private",
        "SUPABASE_SERVICE_ROLE_KEY=private",
    ],
)
def test_stream_guard_redacts_every_split(secret: str) -> None:
    for split in range(1, len(secret)):
        guard = StreamGuard()
        result = (
            guard.feed("before " + secret[:split])
            + guard.feed(secret[split:] + " after")
            + guard.flush()
        )
        assert secret not in result
        assert "after" in result


def test_stream_guard_discards_oversized_secret_until_delimiter() -> None:
    guard = StreamGuard()
    output = guard.feed("before sk-" + "x" * 5000)
    output += guard.feed("private-continuation") + guard.feed(" end") + guard.flush()
    assert "private-continuation" not in output
    assert output == "before [REDACTED_SECRET] end"


def test_unbroken_text_is_bounded_and_overlaps() -> None:
    chunker = SemanticChunker(max_tokens=512, overlap_tokens=51)
    chunks = chunker.split_text_recursive("pharmacology " * 1800, 512, 51)
    assert len(chunks) > 2
    assert all(chunker.count_tokens(chunk) <= 512 for chunk in chunks)
    assert all(chunks[i][-30:] in chunks[i + 1][:300] for i in range(len(chunks) - 1))


@pytest.mark.asyncio
async def test_google_preserves_tools_results_and_output_ceiling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "GOOGLE_ZDR_CONFIRMED", False)
    captured = {}

    async def generate(**kwargs: object):
        captured.update(kwargs)

        async def chunks():
            call = SimpleNamespace(id="call-1", name="rag_search", args={"query": "dose"})
            part = SimpleNamespace(function_call=call, text=None, thought=False)
            yield SimpleNamespace(
                candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))]
            )

        return chunks()

    close = AsyncMock()
    client = SimpleNamespace(
        aio=SimpleNamespace(models=SimpleNamespace(generate_content_stream=generate), aclose=close)
    )
    monkeypatch.setattr("google.genai.Client", lambda **kwargs: client)
    tools = [
        {
            "type": "function",
            "function": {
                "name": "rag_search",
                "description": "Search course",
                "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
            },
        }
    ]
    messages = [
        {"role": "system", "content": "Study safely"},
        {"role": "user", "content": "dose"},
        {
            "role": "assistant",
            "tool_calls": [
                {"id": "prior", "function": {"name": "rag_search", "arguments": '{"query":"dose"}'}}
            ],
        },
        {
            "role": "tool",
            "name": "rag_search",
            "tool_call_id": "prior",
            "content": '{"context":"course"}',
        },
    ]
    calls, stream = await provider_adapters.google_turn("mock", "model", messages, tools)
    assert [part async for part in stream] == []
    assert calls[0]["name"] == "rag_search"
    config = captured["config"]
    assert config.max_output_tokens == settings.TEXT_CHAT_MAX_TOKENS
    assert config.tools[0].function_declarations[0].name == "rag_search"
    assert captured["contents"][-1].parts[0].function_response.response == {"context": "course"}
    close.assert_awaited_once()


@pytest.mark.asyncio
async def test_privacy_block_still_prevents_groq_client_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "GROQ_ZDR_CONFIRMED", False)
    client = MagicMock(side_effect=AssertionError("No provider network client may be created"))
    monkeypatch.setattr("groq.AsyncGroq", client)
    with pytest.raises((RuntimeError, ValueError)):
        await provider_adapters.groq_turn("live-key", "model", [], None)
    client.assert_not_called()


@pytest.mark.asyncio
async def test_outbox_delivery_failure_does_not_mark_delivered(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    database = MagicMock(side_effect=AssertionError("Must remain pending"))
    monkeypatch.setattr("app.engines.job_outbox.get_db_connection", database)
    redis = SimpleNamespace(enqueue_job=AsyncMock(side_effect=ConnectionError("Redis unavailable")))
    with pytest.raises(ConnectionError):
        await deliver_job(redis, "durable-id", "ingest_document_job", "doc", "original.pdf")
    database.assert_not_called()


@pytest.mark.asyncio
async def test_concurrent_quota_reservations_never_exceed_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "REDIS_URL", None)
    monkeypatch.setattr(settings, "UPSTASH_REDIS_URL", None)
    engine = WebSearchEngine()
    count = 0

    async def current(user: str) -> int:
        await asyncio.sleep(0)
        return count

    async def increment(user: str) -> int:
        nonlocal count
        await asyncio.sleep(0)
        count += 1
        return count

    monkeypatch.setattr(engine, "get_daily_usage", current)
    monkeypatch.setattr(engine, "increment_daily_usage", increment)
    results = await asyncio.gather(*(engine.reserve_daily_usage("student", 3) for _ in range(20)))
    assert sum(allowed for allowed, _ in results) == 3
    assert count == 3


@pytest.mark.asyncio
async def test_pdf_export_preserves_last_line_after_pagination(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = []

    async def upload(key: str, data: bytes, mime: str, **kwargs: object) -> tuple[str, str]:
        captured.append(data)
        return key, "https://example.com/export.pdf"

    monkeypatch.setattr(skill_engine, "_safe_r2_upload", upload)
    await skill_engine.execute_create_pdf(
        title="Revision",
        content="\n".join(f"Line {i}: Pharmacology revision material." for i in range(400))
        + "\nFINAL_SENTINEL",
        university_id="018f3a10-0001-7000-8000-000000000001",
        user_id="018f3a10-0001-7000-8000-000000000002",
    )
    with pymupdf.open(stream=captured[0], filetype="pdf") as doc:
        assert len(doc) > 1
        assert "FINAL_SENTINEL" in "".join(page.get_text() for page in doc)


@pytest.mark.asyncio
async def test_hosted_quota_uses_database_even_when_redis_is_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    connection = SimpleNamespace(fetchval=AsyncMock(return_value=None))

    @asynccontextmanager
    async def database():
        yield connection

    monkeypatch.setattr("app.core.database.get_db_connection", database)
    allowed, count = await WebSearchEngine().reserve_daily_usage(
        "018f3a10-0001-7000-8000-000000000001", 3
    )
    assert not allowed and count == 3
    connection.fetchval.assert_awaited_once()


def test_circuit_allows_only_one_probe_after_cooldown(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [100.0]
    monkeypatch.setattr("app.engines.circuit.time.monotonic", lambda: clock[0])
    circuit = ModelCircuits(threshold=2, cooldown=60)
    circuit.failed("model")
    circuit.failed("model")
    assert not circuit.available("model")
    clock[0] += 61
    assert circuit.available("model")
    assert not circuit.available("model")
    circuit.succeeded("model")
    assert circuit.available("model")


@pytest.mark.asyncio
async def test_openrouter_preserves_fragmented_tool_calls_and_zdr_routing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import json

    captured = {}

    class Response:
        def raise_for_status(self) -> None:
            pass

        async def aiter_lines(self):
            yield "data: " + json.dumps(
                {
                    "choices": [
                        {
                            "delta": {
                                "tool_calls": [
                                    {
                                        "index": 0,
                                        "id": "call-1",
                                        "function": {
                                            "name": "rag_search",
                                            "arguments": '{"query":',
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            )
            yield "data: " + json.dumps(
                {
                    "choices": [
                        {
                            "delta": {
                                "tool_calls": [{"index": 0, "function": {"arguments": '"dose"}'}}]
                            }
                        }
                    ]
                }
            )
            yield "data: [DONE]"

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args: object) -> None:
            pass

        @asynccontextmanager
        async def stream(self, *args: object, **kwargs: object):
            captured.update(kwargs)
            yield Response()

    monkeypatch.setattr(provider_adapters.httpx, "AsyncClient", lambda **kwargs: Client())
    messages = [{"role": "user", "content": "dose"}]
    calls, stream = await provider_adapters.openrouter_turn("mock", "model:free", messages, [])
    assert [text async for text in stream] == []
    assert calls == [{"id": "call-1", "name": "rag_search", "arguments": {"query": "dose"}}]
    assert captured["json"]["provider"] == {"zdr": True, "data_collection": "deny"}
    assert captured["json"]["messages"] == messages


def test_native_pdf_chunks_use_only_their_own_line_rectangles() -> None:
    chunker = SemanticChunker(max_tokens=10, overlap_tokens=1)
    content = "Alpha pharmacology study material.\n" * 5 + "Beta clinical material.\n" * 5
    lines = []
    offset = 0
    for index, line in enumerate(content.splitlines(keepends=True)):
        lines.append(
            {
                "start": offset,
                "end": offset + len(line),
                "bbox": [0.1, index / 20, 0.8, (index + 1) / 20],
            }
        )
        offset += len(line)
    chunks = chunker.create_chunks_for_elements(
        [
            {
                "raw_content": content,
                "bounding_box": {"page": 1, "bbox": [0, 0, 1, 1], "lines": lines},
            }
        ]
    )
    assert len(chunks) > 2
    assert all(chunk.bounding_box["precision"] == "line" for chunk in chunks)
    assert chunks[0].bounding_box["bbox"][3] < chunks[-1].bounding_box["bbox"][1]


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["provider", "persistence", "none"])
async def test_chat_refunds_incomplete_turns_and_settles_saved_answers(
    client, tenant_state, monkeypatch, failure
):
    from app.routers import chat

    deduct = AsyncMock(return_value=49)
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_deduct_user_credit", deduct)
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)

    async def events(**kwargs):
        if failure == "provider":
            yield "error", {"code": "503", "error": "Unavailable"}, "error"
        else:
            yield "text_chunk", {"token": "An educational answer."}, "google"

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", events)
    if failure == "persistence":

        async def execute(sql, *args):
            if "'assistant'" in sql:
                raise RuntimeError("Database write failed")
            return "INSERT 0 1"

        tenant_state.connection.execute.side_effect = execute
    response = await client.post(
        "/api/v1/ai/chat/sessions/018f3a30-0001-7000-8000-000000000001/stream",
        json={"message": "Explain pharmacology", "enable_rag": False, "enable_tools": False},
    )
    assert response.status_code == 200
    deduct.assert_awaited_once()
    finish.assert_awaited_once()
    assert finish.await_args.kwargs["refund"] is (failure != "none")
    if failure != "none":
        assert "event: error" in response.text


@pytest.mark.asyncio
async def test_cancelling_full_sse_queue_does_not_deadlock_and_refunds(tenant_state, monkeypatch):
    from fastapi import BackgroundTasks

    from app.models.chat import StreamChatRequest
    from app.routers import chat

    monkeypatch.setattr(chat, "_deduct_user_credit", AsyncMock(return_value=49))
    finish = AsyncMock()
    monkeypatch.setattr(chat, "_finish_chat_credit", finish)

    async def events(**kwargs):
        for _ in range(100):
            yield "text_chunk", {"token": "answer "}, "google"

    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", events)
    request = SimpleNamespace(is_disconnected=AsyncMock(return_value=False))
    response = await chat.stream_chat_session(
        request,
        "018f3a30-0001-7000-8000-000000000001",
        StreamChatRequest(message="Explain pharmacology", enable_rag=False, enable_tools=False),
        BackgroundTasks(),
        tenant_state.user,
    )
    await anext(response.body_iterator)
    await asyncio.sleep(0.01)
    await asyncio.wait_for(response.body_iterator.aclose(), timeout=1)
    assert finish.await_args.kwargs["refund"] is True


@pytest.mark.asyncio
async def test_empty_ingestion_never_replaces_existing_index(monkeypatch):
    from app.engines.ingestion import document_ingestion_engine

    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=b"source")
    )
    monkeypatch.setattr(
        document_ingestion_engine,
        "run_pipeline_on_bytes",
        AsyncMock(return_value=SimpleNamespace(chunks=[], images=[])),
    )
    connect = AsyncMock(
        side_effect=AssertionError("An empty extraction must not reach index replacement")
    )
    monkeypatch.setattr("app.engines.ingestion.asyncpg.connect", connect)
    with pytest.raises(ValueError, match="no searchable"):
        await document_ingestion_engine.ingest_document_from_r2(
            "018f3a30-0001-7000-8000-000000000001", "source.pdf"
        )
    connect.assert_not_called()


@pytest.mark.asyncio
async def test_disabled_ingestion_keeps_jobs_durable_without_redis_delivery(monkeypatch):
    from app.engines import arq_producer

    monkeypatch.setattr(settings, "ENABLE_INGESTION", False)
    record = AsyncMock(return_value="durable-request")
    deliver = AsyncMock(side_effect=AssertionError("Blocked work must remain pending"))
    monkeypatch.setattr(arq_producer, "record_job", record)
    monkeypatch.setattr(arq_producer, "create_pool", deliver)
    assert await arq_producer.enqueue_ingestion_job("document", "source.pdf") == "durable-request"
    record.assert_awaited_once()
    deliver.assert_not_called()


@pytest.mark.asyncio
async def test_google_retention_exception_allows_ingestion_queue_delivery(monkeypatch):
    from app.engines import arq_producer

    monkeypatch.setattr(settings, "GOOGLE_ZDR_CONFIRMED", False)
    monkeypatch.setattr(settings, "ENABLE_INGESTION", True)
    monkeypatch.setattr(settings, "UPSTASH_REDIS_URL", "redis://localhost:6379")
    record = AsyncMock(return_value="durable-request")
    pool = SimpleNamespace(aclose=AsyncMock())
    create = AsyncMock(return_value=pool)
    deliver = AsyncMock()
    monkeypatch.setattr(arq_producer, "record_job", record)
    monkeypatch.setattr(arq_producer, "create_pool", create)
    monkeypatch.setattr(arq_producer, "deliver_job", deliver)

    assert await arq_producer.enqueue_ingestion_job("document", "source.pdf") == "durable-request"
    deliver.assert_awaited_once_with(
        pool, "durable-request", "ingest_document_job", "document", "source.pdf"
    )
    pool.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_google_retention_exception_allows_pending_job_reconciliation(monkeypatch):
    from app.engines import job_outbox

    monkeypatch.setattr(settings, "GOOGLE_ZDR_CONFIRMED", False)
    monkeypatch.setattr(settings, "ENABLE_INGESTION", True)
    row = {
        "id": "durable-request",
        "job_name": "ingest_document_job",
        "document_id": "document",
        "storage_key": "source.pdf",
    }
    connection = SimpleNamespace(execute=AsyncMock(), fetch=AsyncMock(return_value=[row]))

    @asynccontextmanager
    async def connect():
        yield connection

    deliver = AsyncMock()
    monkeypatch.setattr(job_outbox, "get_db_connection", connect)
    monkeypatch.setattr(job_outbox, "deliver_job", deliver)
    redis = object()
    await job_outbox.reconcile_jobs({"redis": redis})
    deliver.assert_awaited_once_with(
        redis, "durable-request", "ingest_document_job", "document", "source.pdf"
    )


@pytest.mark.parametrize(
    "provider", ["groq", "openrouter", "openai", "tavily", "cohere", "unknown"]
)
def test_google_exception_does_not_allow_unverified_other_providers(monkeypatch, provider):
    if provider != "unknown":
        monkeypatch.setattr(settings, f"{provider.upper()}_ZDR_CONFIRMED", False)
    with pytest.raises(RuntimeError, match="ZDR has not been verified"):
        settings.require_provider_privacy(provider)
