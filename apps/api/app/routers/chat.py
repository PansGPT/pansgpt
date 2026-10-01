# ==============================================================================
# PansGPT 2.0 AI / Chat & RAG Streaming API Router (Phase 6)
# ==============================================================================

import json
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.engines.guard import policy_guard
from app.engines.intent_classifier import intent_classifier
from app.engines.llm import llm_engine
from app.engines.rag import rag_engine
from app.engines.thinking import strip_thinking_tokens
from app.models.chat import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    CitationItem,
    StreamChatRequest,
    VoiceTranscribeResponse,
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


async def _deduct_user_credit(user_id: str, reference_id: str) -> int | None:
    """Atomically deduct one chat credit through the database ledger RPC."""
    try:
        async with get_db_connection(timeout=3.0) as conn:
            if not conn:
                return None

            return await conn.fetchval(
                """
                SELECT public.deduct_user_credits(
                    $1::uuid,
                    'ai_chat_turn',
                    $2::text,
                    $3::jsonb
                );
                """,
                uuid.UUID(user_id),
                reference_id,
                json.dumps({"source": "chat_sse"}),
            )
    except Exception as exc:
        detail = str(exc)
        logger.warning("credit_deduction_failed", error=detail)
        if "insufficient credits" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits for this AI chat turn.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify credits before starting chat stream.",
        ) from exc


async def _auto_generate_session_title(session_id: str, message: str) -> None:
    """Background task to set session title from user prompt if still default."""
    try:
        words = message.strip().split()
        title = " ".join(words[:6])
        if len(title) > 60:
            title = title[:57] + "..."

        async with get_db_connection(timeout=3.0) as conn:
            if conn:
                await conn.execute(
                    """
                    UPDATE public.chat_sessions
                    SET title = CASE WHEN title = 'New Chat' THEN $2 ELSE title END,
                        updated_at = now()
                    WHERE id = $1;
                    """,
                    uuid.UUID(session_id),
                    title,
                )
    except Exception as exc:
        logger.warning("background_title_update_failed", error=str(exc))


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    current_user: UserContext = Depends(get_current_user),
):
    """Creates a new chat session thread for the authenticated student."""
    user_id = x_user_id or str(current_user.id)
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
    current_user: UserContext = Depends(get_current_user),
):
    """Returns a list of conversation threads for the student."""
    user_id = x_user_id or str(current_user.id)
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
    current_user: UserContext = Depends(get_current_user),
):
    """Retrieves session details and its active message tree."""
    user_id = x_user_id or str(current_user.id)
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
    request: Request,
    session_id: str,
    payload: StreamChatRequest,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_university_id: str | None = Header(None, alias="X-University-Id"),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Core Server-Sent Events (SSE) endpoint:
    1. Pre-LLM Prompt Injection & Policy Guard
    2. Medical Acronym Normalizer
    3. RAG Retrieval via Supabase RPC (3072d dense vectors + sibling & segment expansion)
    4. Multi-turn Agentic Tool Loop & Multi-tier LLM inference
    5. SSE Token streaming with 15s keep-alive heartbeat and disconnect abort
    6. Asynchronous persistence of user and assistant messages + telemetry
    """
    user_id = x_user_id or str(current_user.id)
    university_id = (
        x_university_id
        or (str(current_user.university_id) if current_user.university_id else None)
        or DEV_DEFAULT_UNI_ID
    )
    user_message_id = str(uuid.uuid4())
    assistant_message_id = str(uuid.uuid4())

    if not current_user.dev_bypass:
        await _deduct_user_credit(user_id, assistant_message_id)

    # Queue background operations
    background_tasks.add_task(_auto_generate_session_title, session_id, payload.message)

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        last_heartbeat = time.time()

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

        # 3. Load active conversation history from payload or database
        history_turns: list[dict[str, Any]] = []
        if payload.history:
            history_turns = payload.history
        else:
            async with get_db_connection() as conn:
                if conn:
                    try:
                        h_rows = await conn.fetch(
                            """
                            SELECT role, content
                            FROM public.chat_messages
                            WHERE session_id = $1
                              AND is_active_branch = true
                            ORDER BY created_at DESC
                            LIMIT 10;
                            """,
                            uuid.UUID(session_id),
                        )
                        for hr in reversed(h_rows):
                            history_turns.append(
                                {"role": str(hr["role"]), "content": str(hr["content"])}
                            )
                    except Exception as h_err:
                        logger.warning("fetch_chat_history_db_failed", error=str(h_err))

        # Asynchronously record user message to DB
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

        # 3b. Intent & Complexity Classification (Fast Path vs. Complex Path)
        classification = intent_classifier.classify(
            query=payload.message,
            history=history_turns,
            document_id=payload.document_id,
            course_code=payload.course_code,
            user_enable_rag=payload.enable_rag,
            user_enable_tools=payload.enable_tools,
        )
        logger.info(
            "query_classified",
            intent=classification.intent.value,
            route=classification.route.value,
            requires_rag=classification.requires_rag,
            requires_tools=classification.requires_tools,
            confidence=classification.confidence,
        )

        # 4. RAG Retrieval & Context Assembly (with pronoun and context history resolution)
        rag_context = None
        citations: list[CitationItem] = []
        if classification.requires_rag:
            try:
                rag_context, citations = await rag_engine.retrieve_context(
                    query=payload.message,
                    document_id=payload.document_id,
                    university_id=university_id,
                    course_code=payload.course_code,
                    match_count=4,
                    match_threshold=0.25,
                    expand_siblings=True,
                    expand_full_segment=payload.expand_full_segment,
                    conversation_history=history_turns,
                )
            except Exception as exc:
                logger.warning("rag_pipeline_execution_error", error=str(exc))

        # Yield retrieved citations if any exist
        if citations:
            cits_data = [c.model_dump() for c in citations]
            yield f"event: citations\ndata: {json.dumps(cits_data)}\n\n"

        # 5. Build Clinical System Prompt Grounded in Course Chunks
        system_prompt = policy_guard.build_system_prompt(rag_context)

        # 6. Stream tokens and agentic events from Multi-tier LLM Engine with full history
        collected_tokens: list[str] = []
        collected_thinking: list[str] = []
        last_provider = "google"

        try:
            async for event_type, data, provider in llm_engine.stream_agentic_chat(
                system_prompt=system_prompt,
                user_message=payload.message,
                history=history_turns,
                user_id=user_id,
                university_id=university_id,
                enable_tools=classification.requires_tools,
            ):
                # Check client disconnect abort
                if await request.is_disconnected():
                    logger.info("stream_chat_client_disconnected_aborting", session_id=session_id)
                    break

                # 15s keep-alive heartbeat
                now = time.time()
                if now - last_heartbeat >= 15.0:
                    yield ": keep-alive\n\n"
                    last_heartbeat = now

                last_provider = provider

                if event_type == "text_chunk":
                    token = data.get("token") or data.get("delta", "")
                    collected_tokens.append(token)
                    yield f"event: text_chunk\ndata: {json.dumps({'token': token, 'delta': token, 'provider': provider})}\n\n"
                elif event_type == "thinking_chunk":
                    delta = data.get("delta") or data.get("token", "")
                    collected_thinking.append(delta)
                    yield f"event: thinking_chunk\ndata: {json.dumps({'delta': delta, 'token': delta})}\n\n"
                elif event_type == "tool_start":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else data
                    yield f"event: tool_start\ndata: {json.dumps(dumped)}\n\n"
                elif event_type == "tool_end":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else data
                    yield f"event: tool_end\ndata: {json.dumps(dumped)}\n\n"
                elif event_type == "artifact_ready":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else data
                    yield f"event: artifact_ready\ndata: {json.dumps(dumped)}\n\n"

        except Exception as exc:
            logger.error("stream_chat_unhandled_failure", error=str(exc))
            err_msg = "An unexpected error occurred while generating your answer. Please try again."
            yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"

        raw_response_text = "".join(collected_tokens)
        clean_visible, residual_thinking = strip_thinking_tokens(raw_response_text)
        if residual_thinking:
            collected_thinking.append(residual_thinking)

        is_safe_output, sanitized_output = policy_guard.check_output_safety(clean_visible)
        full_response_text = policy_guard.append_study_disclaimer(sanitized_output)
        full_thinking_text = "".join(collected_thinking).strip() or None

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
                            id, session_id, parent_message_id, role, content, citations, thinking_text
                        ) VALUES ($1, $2, $3, 'assistant', $4, $5::jsonb, $6)
                        ON CONFLICT (id) DO NOTHING;
                        """,
                        uuid.UUID(assistant_message_id),
                        uuid.UUID(session_id),
                        uuid.UUID(user_message_id),
                        full_response_text,
                        cits_json,
                        full_thinking_text,
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


@router.post(
    "/transcribe",
    response_model=VoiceTranscribeResponse,
    summary="Transcribe student voice question via Groq Whisper",
)
async def transcribe_voice_audio(
    file: UploadFile | None = File(None),
    audio: UploadFile | None = File(None),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Transcribes student microphone audio to text using Groq Whisper.
    Supports both 'file' and 'audio' multipart form fields with full validation.
    """
    target_file = file or audio
    if target_file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An audio recording file must be provided via 'file' or 'audio' multipart field.",
        )

    audio_bytes = await target_file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio recording file is empty.",
        )

    if len(audio_bytes) > settings.WHISPER_MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds maximum allowed size of {settings.WHISPER_MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    content_type = target_file.content_type or "audio/webm"
    base_mime = content_type.split(";")[0].strip().lower()
    if base_mime not in settings.WHISPER_ALLOWED_MIME_TYPES:
        logger.warning(
            "unsupported_audio_mime_type",
            content_type=content_type,
            allowed=settings.WHISPER_ALLOWED_MIME_TYPES,
        )
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported media type '{base_mime}'. Audio recording must be one of {settings.WHISPER_ALLOWED_MIME_TYPES}.",
        )

    return await llm_engine.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=target_file.filename or "recording.webm",
        mime_type=content_type,
        language="en",
    )
