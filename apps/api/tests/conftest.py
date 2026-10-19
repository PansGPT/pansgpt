import asyncio  # [CHAT FIX 2]
import socket  # [CHAT FIX 2]
import uuid  # [TENANT FIX]
from collections.abc import AsyncIterator, Iterator  # [TENANT FIX]
from contextlib import asynccontextmanager  # [TENANT FIX]
from dataclasses import dataclass  # [TENANT FIX]
from unittest.mock import AsyncMock, MagicMock  # [TENANT FIX]

import pytest
from httpx import ASGITransport, AsyncClient

from tests import offline_bootstrap as _offline_bootstrap  # noqa: F401  # [CHAT FIX 2]

# isort: split
# [CHAT FIX 2] The bootstrap must run before any app singleton reads .env.
from app.core.config import settings  # [EMBED FIX]
from app.core.dependencies import UserContext, get_current_user  # [TENANT FIX]
from app.engines.llm import llm_engine
from app.engines.query_expansion import query_expansion_engine  # [CHAT FIX 2]
from app.engines.reranker import CandidateReranker  # [CHAT FIX 2]
from app.main import app


@pytest.fixture(autouse=True)
def mock_offline_llm_defaults(
    monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest
) -> None:
    """Ensure all test cases run fast and offline by default without network calls."""
    if request.node.get_closest_marker("live") and request.config.getoption(
        "--allow-live-services"
    ):
        return
    monkeypatch.setattr(settings, "EMBEDDER_FAKE_MODE", True)  # [EMBED FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", True)  # [IMAGE FIX]
    for field in ("GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.setattr(settings, field, "test-mock-key")  # [CHAT FIX 2]
    monkeypatch.setattr(llm_engine, "gemini_key", "test-mock-key")
    monkeypatch.setattr(llm_engine, "groq_key", "test-mock-key")
    monkeypatch.setattr(llm_engine, "openrouter_key", "test-mock-key")
    monkeypatch.setattr(query_expansion_engine, "gemini_key", "test-mock-key")  # [CHAT FIX 2]
    monkeypatch.setattr(query_expansion_engine, "groq_key", "test-mock-key")
    # [CHAT FIX 2] Local ONNX inference also consumes AI budget; unit tests use heuristics.
    monkeypatch.setattr(CandidateReranker, "_get_flashrank_client", lambda self: None)
    monkeypatch.setattr(settings, "COHERE_API_KEY", None)


def pytest_addoption(parser: pytest.Parser) -> None:  # [CHAT FIX 2]
    parser.addoption(
        "--allow-live-services",
        action="store_true",
        default=False,
        help="Allow network only for explicitly marked live tests; may use external quotas.",
    )


@pytest.fixture(autouse=True)  # [CHAT FIX 2]
def block_unit_test_network(
    monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest
) -> None:
    """Tests must mock services rather than reaching credentials loaded from .env."""
    if request.node.get_closest_marker("live") and request.config.getoption(
        "--allow-live-services"
    ):
        return
    original_connect = socket.socket.connect

    def connect(sock: socket.socket, address: object) -> None:
        # Windows' asyncio wakeup sockets are created through socket.socketpair.
        # They need a local connection; every service connection is denied.
        import sys

        frame = sys._getframe(1)
        if (
            frame.f_code.co_name in {"socketpair", "_fallback_socketpair"}
            and frame.f_globals.get("__name__") == "socket"
        ):
            return original_connect(sock, address)
        raise OSError("Network disabled in unit tests; mock the service explicitly.")

    monkeypatch.setattr(socket.socket, "connect", connect)
    monkeypatch.setattr(socket.socket, "connect_ex", connect)

    # [CHAT FIX 2] Windows Proactor uses native ConnectEx, bypassing socket.connect.
    async def async_connect(*args: object, **kwargs: object) -> None:
        raise OSError("Network disabled in unit tests; mock the service explicitly.")

    monkeypatch.setattr(asyncio.BaseEventLoop, "create_connection", async_connect)
    from asyncio import proactor_events, selector_events

    monkeypatch.setattr(proactor_events.BaseProactorEventLoop, "sock_connect", async_connect)
    monkeypatch.setattr(selector_events.BaseSelectorEventLoop, "sock_connect", async_connect)

    def deny_dns(*args: object, **kwargs: object) -> None:
        raise OSError("Network disabled in unit tests; mock the service explicitly.")

    monkeypatch.setattr(socket, "getaddrinfo", deny_dns)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture  # [PRELAUNCH FIX]
def authenticated_student() -> Iterator[UserContext]:  # [PRELAUNCH FIX]
    user = UserContext(  # [PRELAUNCH FIX]
        id="018f3a10-0001-7000-8000-000000000001",  # [PRELAUNCH FIX]
        email="student@example.com",  # [PRELAUNCH FIX]
        role="student",  # [PRELAUNCH FIX]
        roles=["student"],  # [PRELAUNCH FIX]
        university_id="01a07664-7a69-7ce0-ad6a-b219462cbde3",  # [PRELAUNCH FIX]
    )  # [PRELAUNCH FIX]
    previous = dict(app.dependency_overrides)  # [PRELAUNCH FIX]
    app.dependency_overrides[get_current_user] = lambda: user  # [PRELAUNCH FIX]
    try:  # [PRELAUNCH FIX]
        yield user  # [PRELAUNCH FIX]
    finally:  # [PRELAUNCH FIX]
        app.dependency_overrides.clear()  # [PRELAUNCH FIX]
        app.dependency_overrides.update(previous)  # [PRELAUNCH FIX]


@pytest.fixture  # [PRELAUNCH FIX]
def mock_upload_services(monkeypatch: pytest.MonkeyPatch) -> MagicMock:  # [PRELAUNCH FIX]
    from app.routers import library  # [PRELAUNCH FIX]

    connection = MagicMock()  # [PRELAUNCH FIX]
    connection.execute = AsyncMock(return_value="INSERT 0 1")  # [PRELAUNCH FIX]
    connection.close = AsyncMock()  # [PRELAUNCH FIX]
    monkeypatch.setattr(settings, "DATABASE_URL", "offline-unit-test")  # [PRELAUNCH FIX]
    monkeypatch.setattr(  # [PRELAUNCH FIX]
        library.asyncpg,  # [PRELAUNCH FIX]
        "connect",  # [PRELAUNCH FIX]
        AsyncMock(return_value=connection),  # [PRELAUNCH FIX]
    )  # [PRELAUNCH FIX]
    monkeypatch.setattr(  # [PRELAUNCH FIX]
        type(library.storage_engine),  # [PRELAUNCH FIX]
        "is_configured",  # [PRELAUNCH FIX]
        property(lambda _: True),  # [PRELAUNCH FIX]
    )  # [PRELAUNCH FIX]
    monkeypatch.setattr(  # [PRELAUNCH FIX]
        library.storage_engine,  # [PRELAUNCH FIX]
        "generate_presigned_put_url",  # [PRELAUNCH FIX]
        AsyncMock(return_value="https://storage.invalid/put"),  # [PRELAUNCH FIX]
    )  # [PRELAUNCH FIX]
    return connection  # [PRELAUNCH FIX]


@dataclass  # [TENANT FIX]
class TenantTestState:  # [TENANT FIX]
    user: UserContext  # [TENANT FIX]
    connection: MagicMock  # [TENANT FIX]
    retrieval: AsyncMock  # [TENANT FIX]
    ai: MagicMock  # [TENANT FIX]
    credit: AsyncMock  # [TENANT FIX]
    sessions: dict[uuid.UUID, dict[str, object]]  # [TENANT FIX]
    documents: dict[uuid.UUID, dict[str, object]]  # [TENANT FIX]


@pytest.fixture  # [TENANT FIX]
def tenant_state(monkeypatch: pytest.MonkeyPatch) -> Iterator[TenantTestState]:  # [TENANT FIX]
    from app.core import authorization  # [TENANT FIX]
    from app.models.chat import (  # [TENANT FIX]
        ComplexityLevel,  # [TENANT FIX]
        IntentType,  # [TENANT FIX]
        QueryClassification,  # [TENANT FIX]
        RouteType,  # [TENANT FIX]
    )  # [TENANT FIX]
    from app.routers import chat, library  # [TENANT FIX]

    user = UserContext(  # [TENANT FIX]
        id="018f3a10-0001-7000-8000-000000000001",  # [TENANT FIX]
        email="student@example.com",  # [TENANT FIX]
        role="student",  # [TENANT FIX]
        roles=["student"],  # [TENANT FIX]
        university_id="01a07664-7a69-7ce0-ad6a-b219462cbde3",  # [TENANT FIX]
    )  # [TENANT FIX]
    stamp = "2026-01-01T00:00:00+00:00"  # [TENANT FIX]
    sessions = {  # [TENANT FIX]
        uuid.UUID(f"018f3a30-0001-7000-8000-00000000000{i}"): {  # [TENANT FIX]
            "id": uuid.UUID(f"018f3a30-0001-7000-8000-00000000000{i}"),  # [TENANT FIX]
            "user_id": user.id,  # [TENANT FIX]
            "document_id": None,  # [TENANT FIX]
            "title": "Scoped session",  # [TENANT FIX]
            "summary": None,  # [TENANT FIX]
            "created_at": stamp,  # [TENANT FIX]
            "updated_at": stamp,  # [TENANT FIX]
        }  # [TENANT FIX]
        for i in (1, 2)  # [TENANT FIX]
    }  # [TENANT FIX]
    documents = {  # [TENANT FIX]
        uuid.UUID("018f3a30-0001-7000-8000-000000000001"): {  # [TENANT FIX]
            "id": uuid.UUID("018f3a30-0001-7000-8000-000000000001"),  # [TENANT FIX]
            "university_id": user.university_id,  # [TENANT FIX]
            "status": "active",  # [TENANT FIX]
            "storage_key": "universities/"  # [TENANT FIX]
            + str(user.university_id)  # [TENANT FIX]
            + "/courses/test/original/test.pdf",  # [TENANT FIX]
            "converted_key": None,  # [TENANT FIX]
        }  # [TENANT FIX]
    }  # [TENANT FIX]
    documents[uuid.UUID("018f3a40-0001-7000-8000-000000000002")] = {  # [TENANT FIX]
        "id": uuid.UUID("018f3a40-0001-7000-8000-000000000002"),  # [TENANT FIX]
        "university_id": uuid.UUID("01a07664-7a69-7ce0-ad6a-b219462cbde4"),  # [TENANT FIX]
        "status": "active",  # [TENANT FIX]
    }  # [TENANT FIX]
    for document in documents.values():  # [TENANT FIX]
        document.update(  # [TENANT FIX]
            title="Scoped document",  # [TENANT FIX]
            course_code="PCL 401",  # [TENANT FIX]
            course_title="Pharmacology",  # [TENANT FIX]
            page_count=1,  # [TENANT FIX]
            file_size_bytes=100,  # [TENANT FIX]
            mime_type="application/pdf",  # [TENANT FIX]
            embedding_status="completed",  # [TENANT FIX]
            embedding_progress=100,  # [TENANT FIX]
            total_chunks=1,  # [TENANT FIX]
            target_levels=["400"],  # [TENANT FIX]
            academic_session=None,  # [TENANT FIX]
            semester=None,  # [TENANT FIX]
            created_at=stamp,  # [TENANT FIX]
            topic=None,  # [TENANT FIX]
            lecturer_name=None,  # [TENANT FIX]
        )  # [TENANT FIX]
    connection = MagicMock()  # [TENANT FIX]

    async def fetchrow(sql: str, *args: object) -> dict[str, object] | None:  # [TENANT FIX]
        if "INSERT INTO public.chat_sessions" in sql:  # [TENANT FIX]
            sessions[args[0]] = {  # [TENANT FIX]
                "id": args[0],  # [TENANT FIX]
                "user_id": args[1],  # [TENANT FIX]
                "document_id": args[2],  # [TENANT FIX]
                "title": args[3],  # [TENANT FIX]
                "summary": None,  # [TENANT FIX]
                "created_at": stamp,  # [TENANT FIX]
                "updated_at": stamp,  # [TENANT FIX]
            }  # [TENANT FIX]
            return {"created_at": stamp, "updated_at": stamp}  # [TENANT FIX]
        if "public.chat_sessions" in sql:  # [TENANT FIX]
            row = sessions.get(uuid.UUID(str(args[0])))  # [TENANT FIX]
            if row and ("user_id = $2" not in sql or row["user_id"] == args[1]):  # [TENANT FIX]
                return row  # [TENANT FIX]
            return None  # [TENANT FIX]
        if "public.documents" in sql:  # [TENANT FIX]
            row = documents.get(uuid.UUID(str(args[0])))  # [TENANT FIX]
            if (  # [TENANT FIX]
                row  # [TENANT FIX]
                and "status = 'active'" in sql  # [TENANT FIX]
                and row.get("status") != "active"  # [TENANT FIX]
                and not (len(args) > 2 and args[2])  # [TENANT FIX]
            ):  # [TENANT FIX]
                return None  # [TENANT FIX]
            if row and (  # [TENANT FIX]
                "university_id = $2" not in sql or row["university_id"] == args[1]  # [TENANT FIX]
            ):  # [TENANT FIX]
                return row  # [TENANT FIX]
            return None  # [TENANT FIX]
        return None  # [TENANT FIX]

    async def fetch(sql: str, *args: object) -> list[dict[str, object]]:  # [TENANT FIX]
        if "public.chat_sessions" in sql:  # [TENANT FIX]
            return [row for row in sessions.values() if row["user_id"] == args[0]]  # [TENANT FIX]
        return []  # [TENANT FIX]

    connection.fetchrow = AsyncMock(side_effect=fetchrow)  # [TENANT FIX]
    connection.fetch = AsyncMock(side_effect=fetch)  # [TENANT FIX]
    connection.fetchval = AsyncMock(return_value=100)  # [TENANT FIX]
    connection.execute = AsyncMock(return_value="UPDATE 1")  # [TENANT FIX]
    connection.close = AsyncMock()  # [TENANT FIX]

    @asynccontextmanager  # [TENANT FIX]
    async def database(*args: object, **kwargs: object) -> AsyncIterator[MagicMock]:  # [TENANT FIX]
        yield connection  # [TENANT FIX]

    async def stream(  # [TENANT FIX]
        **kwargs: object,  # [TENANT FIX]
    ) -> AsyncIterator[tuple[str, dict[str, str], str]]:  # [TENANT FIX]
        text = (  # [TENANT FIX]
            "FOREIGN_B_CONTENT"  # [TENANT FIX]
            if "FOREIGN_B_CONTENT" in str(kwargs.get("system_prompt"))  # [TENANT FIX]
            else "Scoped test answer."  # [TENANT FIX]
        )  # [TENANT FIX]
        if kwargs.get("enable_tools"):  # [TENANT FIX]
            yield "thinking_chunk", {"delta": "Planning a study artifact."}, "mock"  # [TENANT FIX]
            yield "tool_start", {"tool_name": "generate_presentation"}, "mock"  # [TENANT FIX]
            yield "artifact_ready", {"skill_name": "generate_presentation"}, "mock"  # [TENANT FIX]
            yield "tool_end", {"status": "success"}, "mock"  # [TENANT FIX]
        yield "text_chunk", {"token": text}, "mock"  # [TENANT FIX]

    retrieval = AsyncMock(return_value=("University A content", []))  # [TENANT FIX]
    ai = MagicMock(side_effect=stream)  # [TENANT FIX]
    credit = AsyncMock(return_value=100)  # [TENANT FIX]
    previous = dict(app.dependency_overrides)  # [TENANT FIX]
    app.dependency_overrides[get_current_user] = lambda: user  # [TENANT FIX]
    monkeypatch.setattr(chat, "get_db_connection", database)  # [TENANT FIX]
    monkeypatch.setattr(authorization, "get_db_connection", database)  # [TENANT FIX]
    monkeypatch.setattr(settings, "DATABASE_URL", "offline-unit-test")  # [TENANT FIX]
    monkeypatch.setattr(  # [TENANT FIX]
        library,  # [TENANT FIX]
        "enqueue_ingestion_job",  # [TENANT FIX]
        AsyncMock(return_value="unit-job"),  # [TENANT FIX]
    )  # [TENANT FIX]
    monkeypatch.setattr(chat, "_deduct_user_credit", credit)  # [TENANT FIX]
    monkeypatch.setattr(chat, "_auto_generate_session_title", AsyncMock())  # [TENANT FIX]
    monkeypatch.setattr(chat.rag_engine, "retrieve_context", retrieval)  # [TENANT FIX]
    monkeypatch.setattr(chat.llm_engine, "stream_agentic_chat", ai)  # [TENANT FIX]
    monkeypatch.setattr(  # [TENANT FIX]
        chat.intent_classifier,  # [TENANT FIX]
        "classify",  # [TENANT FIX]
        MagicMock(  # [TENANT FIX]
            return_value=QueryClassification(  # [TENANT FIX]
                intent=IntentType.COURSE_RETRIEVAL,  # [TENANT FIX]
                complexity=ComplexityLevel.SIMPLE,  # [TENANT FIX]
                route=RouteType.FAST_PATH,  # [TENANT FIX]
                requires_rag=True,  # [TENANT FIX]
                requires_tools=True,  # [TENANT FIX]
                confidence=1.0,  # [TENANT FIX]
            )  # [TENANT FIX]
        ),  # [TENANT FIX]
    )  # [TENANT FIX]
    monkeypatch.setattr(  # [TENANT FIX]
        library.asyncpg,  # [TENANT FIX]
        "connect",  # [TENANT FIX]
        AsyncMock(return_value=connection),  # [TENANT FIX]
    )  # [TENANT FIX]
    try:  # [TENANT FIX]
        yield TenantTestState(  # [TENANT FIX]
            user,  # [TENANT FIX]
            connection,  # [TENANT FIX]
            retrieval,  # [TENANT FIX]
            ai,  # [TENANT FIX]
            credit,  # [TENANT FIX]
            sessions,  # [TENANT FIX]
            documents,  # [TENANT FIX]
        )  # [TENANT FIX]
    finally:  # [TENANT FIX]
        app.dependency_overrides.clear()  # [TENANT FIX]
        app.dependency_overrides.update(previous)  # [TENANT FIX]
