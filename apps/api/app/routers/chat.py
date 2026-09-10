# ==============================================================================
# PansGPT 2.0 AI / Chat & RAG Streaming API Router (Phase 6)
# ==============================================================================

import json
import time
import uuid
from collections.abc import AsyncGenerator

import structlog
from fastapi import APIRouter, Header, Query, status
from fastapi.responses import StreamingResponse

from app.core.database import get_db_connection
from app.engines.guard import policy_guard
from app.engines.llm import llm_engine
from app.engines.rag import rag_engine
from app.models.chat import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    CitationItem,
    StreamChatRequest,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/ai/chat", tags=["AI & Chat Engine"])

# Default mock user ID for unauthenticated dev/testing sessions
DEV_DEFAULT_USER_ID = "018f3a10-0001-7000-8000-000000000001"
DEV_DEFAULT_UNI_ID = "01a07664-7a69-7ce0-ad6a-b219462cbde3"


def _extract_user_id(x_user_id: str | None = None) -> str:
    """Extracts or assigns user ID for the active request."""
    if x_user_id:
        try:
            uuid.UUID(x_user_id)
            return x_user_id
        except ValueError:
            pass
    return DEV_DEFAULT_USER_ID


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    """Creates a new chat session thread for the authenticated student."""
    user_id = _extract_user_id(x_user_id)
    session_id = str(uuid.uuid4())
    doc_uuid = uuid.UUID(payload.document_id) if payload.document_id else None
    title = payload.title or "New Chat"

    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    async with get_db_connection() as conn:
        if conn:
            try:
                sql = """
                    INSERT INTO public.chat_sessions (
                        id, user_id, document_id, title
                    ) VALUES ($1, $2, $3, $4)
                    RETURNING created_at::text, updated_at::text;
                """
                row = await conn.fetchrow(
                    sql,
                    uuid.UUID(session_id),
                    uuid.UUID(user_id),
                    doc_uuid,
                    title,
                )
                if row:
                    now_str = row["created_at"]
            except Exception as exc:
                logger.warning("create_chat_session_db_failed", error=str(exc))

    return ChatSessionResponse(
        id=session_id,
        user_id=user_id,
        title=title,
        document_id=payload.document_id,
        created_at=now_str,
        updated_at=now_str,
    )


@router.get(
    "/sessions",
    response_model=ChatSessionListResponse,
    summary="List student's active chat sessions",
)
async def list_chat_sessions(
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    limit: int = Query(default=30, ge=1, le=100),
):
    """Returns a list of conversation threads for the student."""
    user_id = _extract_user_id(x_user_id)
    sessions: list[ChatSessionResponse] = []

    async with get_db_connection() as conn:
        if conn:
            try:
                sql = """
                    SELECT id, user_id, document_id, title, summary,
                           created_at::text, updated_at::text
                    FROM public.chat_sessions
                    WHERE user_id = $1 AND deleted_at IS NULL
                    ORDER BY updated_at DESC
                    LIMIT $2;
                """
                rows = await conn.fetch(sql, uuid.UUID(user_id), limit)
                for r in rows:
                    sessions.append(
                        ChatSessionResponse(
                            id=str(r["id"]),
                            user_id=str(r["user_id"]),
                            title=r["title"],
                            document_id=str(r["document_id"]) if r["document_id"] else None,
                            summary=r["summary"],
                            created_at=r["created_at"],
                            updated_at=r["updated_at"],
                        )
                    )
            except Exception as exc:
                logger.warning("list_chat_sessions_db_failed", error=str(exc))

    return ChatSessionListResponse(sessions=sessions, total=len(sessions))


@router.get(
    "/sessions/{session_id}",
    summary="Get conversation session and message history",
)
async def get_chat_session_details(
    session_id: str,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
):
    """Retrieves session details and its active message tree."""
    user_id = _extract_user_id(x_user_id)
    session_data: dict | None = None
    messages: list[ChatMessageResponse] = []

    async with get_db_connection() as conn:
        if conn:
            try:
                s_row = await conn.fetchrow(
                    """
                    SELECT id, user_id, document_id, title, summary,
                           created_at::text, updated_at::text
                    FROM public.chat_sessions
                    WHERE id = $1 AND deleted_at IS NULL;
                    """,
                    uuid.UUID(session_id),
                )
                if s_row:
                    session_data = {
                        "id": str(s_row["id"]),
                        "user_id": str(s_row["user_id"]),
                        "title": s_row["title"],
                        "document_id": str(s_row["document_id"]) if s_row["document_id"] else None,
                        "summary": s_row["summary"],
                        "created_at": s_row["created_at"],
                        "updated_at": s_row["updated_at"],
                    }

                    m_rows = await conn.fetch(
                        """
                        SELECT id, session_id, role, content, parent_message_id,
                               branch_index, is_active_branch, citations, thinking_text,
                               created_at::text
                        FROM public.chat_messages
                        WHERE session_id = $1 AND is_active_branch = true
                        ORDER BY created_at ASC;
                        """,
                        uuid.UUID(session_id),
                    )
                    for m in m_rows:
                        raw_cits = m["citations"]
                        cits_list = None
                        if raw_cits:
                            c_data = json.loads(raw_cits) if isinstance(raw_cits, str) else raw_cits
                            cits_list = [CitationItem(**c) for c in c_data]

                        messages.append(
                            ChatMessageResponse(
                                id=str(m["id"]),
                                session_id=str(m["session_id"]),
                                role=str(m["role"]),
                                content=m["content"],
                                parent_message_id=str(m["parent_message_id"])
                                if m["parent_message_id"]
                                else None,
                                branch_index=m["branch_index"],
                                is_active_branch=m["is_active_branch"],
                                citations=cits_list,
                                thinking_text=m["thinking_text"],
                                created_at=m["created_at"],
                            )
                        )
            except Exception as exc:
                logger.warning("get_chat_session_details_db_failed", error=str(exc))

    if not session_data:
        # Return transient fallback for tests/offline
        session_data = {
            "id": session_id,
            "user_id": user_id,
            "title": "Pharmacology Chat",
            "document_id": None,
            "summary": None,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    return {
        "session": session_data,
        "messages": messages,
    }


@router.post(
    "/sessions/{session_id}/stream",
    summary="Main Server-Sent Events (SSE) chat streaming endpoint with RAG",
)
async def stream_chat_session(
    session_id: str,
    payload: StreamChatRequest,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_university_id: str | None = Header(None, alias="X-University-Id"),
):
    """
    Core Server-Sent Events (SSE) endpoint:
    1. Pre-LLM Prompt Injection & Policy Guard
    2. Medical Acronym Normalizer
    3. RAG Retrieval via Supabase RPC (3072d dense vectors + sibling chunk expansion)
    4. Multi-tier LLM inference with transparent failover (Gemma 31B -> Gemma 26B -> Groq -> OpenRouter)
    5. SSE Token streaming: 'init' -> 'citations' -> 'text_chunk' -> 'done'
    6. Asynchronous persistence of user and assistant messages
    """
    user_id = _extract_user_id(x_user_id)
    university_id = x_university_id or DEV_DEFAULT_UNI_ID
    user_message_id = str(uuid.uuid4())
    assistant_message_id = str(uuid.uuid4())

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        # 1. Yield init event
        yield f"event: init\ndata: {json.dumps({'session_id': session_id, 'user_message_id': user_message_id, 'assistant_message_id': assistant_message_id})}\n\n"

        # 2. Pre-LLM Security Check
        is_safe, safety_reason = policy_guard.check_prompt_safety(payload.message)
        if not is_safe:
            err_msg = safety_reason or "Prompt blocked by clinical safety filter."
            yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"
            yield f"event: text_chunk\ndata: {json.dumps({'token': f'⚠️ Policy Guard Notice: {err_msg}', 'provider': 'guard'})}\n\n"
            yield f"event: done\ndata: {json.dumps({'full_text': err_msg, 'citations_count': 0})}\n\n"
            return

        # 3. Asynchronously record user message to DB
        async with get_db_connection() as conn:
            if conn:
                try:
                    await conn.execute(
                        """
                        INSERT INTO public.chat_messages (
                            id, session_id, parent_message_id, role, content
                        ) VALUES ($1, $2, $3, 'user', $4)
                        ON CONFLICT (id) DO NOTHING;
                        """,
                        uuid.UUID(user_message_id),
                        uuid.UUID(session_id),
                        uuid.UUID(payload.parent_message_id) if payload.parent_message_id else None,
                        payload.message,
                    )
                except Exception as exc:
                    logger.warning("save_user_message_failed", error=str(exc))

        # 4. RAG Retrieval & Context Assembly
        rag_context = None
        citations: list[CitationItem] = []
        if payload.enable_rag:
            try:
                rag_context, citations = await rag_engine.retrieve_context(
                    query=payload.message,
                    document_id=payload.document_id,
                    university_id=university_id,
                    course_code=payload.course_code,
                    match_count=4,
                    match_threshold=0.35,
                    expand_siblings=True,
                )
            except Exception as exc:
                logger.warning("rag_pipeline_execution_error", error=str(exc))

        # Yield retrieved citations if any exist
        if citations:
            cits_data = [c.model_dump() for c in citations]
            yield f"event: citations\ndata: {json.dumps(cits_data)}\n\n"

        # 5. Build Clinical System Prompt Grounded in Course Chunks
        system_prompt = policy_guard.build_system_prompt(rag_context)

        # 6. Stream tokens from Multi-tier LLM Engine
        collected_tokens: list[str] = []
        last_provider = "google"

        try:
            async for token, provider in llm_engine.stream_chat(
                system_prompt=system_prompt,
                user_message=payload.message,
                user_id=user_id,
                university_id=university_id,
            ):
                collected_tokens.append(token)
                last_provider = provider
                yield f"event: text_chunk\ndata: {json.dumps({'token': token, 'provider': provider})}\n\n"
        except Exception as exc:
            logger.error("stream_chat_unhandled_failure", error=str(exc))
            err_msg = "An unexpected error occurred while generating your answer. Please try again."
            yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"

        full_response_text = "".join(collected_tokens)

        # 7. Asynchronously save assistant message to DB
        async with get_db_connection() as conn:
            if conn:
                try:
                    cits_json = (
                        json.dumps([c.model_dump() for c in citations]) if citations else None
                    )
                    await conn.execute(
                        """
                        INSERT INTO public.chat_messages (
                            id, session_id, parent_message_id, role, content, citations
                        ) VALUES ($1, $2, $3, 'assistant', $4, $5::jsonb)
                        ON CONFLICT (id) DO NOTHING;
                        """,
                        uuid.UUID(assistant_message_id),
                        uuid.UUID(session_id),
                        uuid.UUID(user_message_id),
                        full_response_text,
                        cits_json,
                    )

                    # Update session title if default
                    auto_title = " ".join(payload.message.split()[:6])
                    await conn.execute(
                        """
                        UPDATE public.chat_sessions
                        SET title = CASE WHEN title = 'New Chat' THEN $2 ELSE title END,
                            updated_at = now()
                        WHERE id = $1;
                        """,
                        uuid.UUID(session_id),
                        auto_title,
                    )
                except Exception as exc:
                    logger.warning("save_assistant_message_failed", error=str(exc))

        # 8. Yield final done event
        yield f"event: done\ndata: {json.dumps({'full_text': full_response_text, 'citations_count': len(citations), 'provider': last_provider})}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )
