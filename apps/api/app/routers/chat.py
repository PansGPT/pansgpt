# ==============================================================================
# PansGPT 2.0 AI / Chat & RAG Streaming API Router (Phase 6)
# ==============================================================================

import asyncio  # [CHAT FIX]
import json
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import structlog
from asyncpg import QueryCanceledError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse

from app.core.authorization import (  # [TENANT FIX]
    check_document_scope,  # [TENANT FIX]
    require_owned_session,  # [TENANT FIX]
    require_university,  # [TENANT FIX]
)  # [TENANT FIX]
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.core.ids import uuid7  # [LEFTOVER FIX]
from app.engines.chat_images import analyze_image
from app.engines.chat_interactions import (
    attachment_context,
    prepare_turn,
    release_turn,
    select_path,
)
from app.engines.chat_progress import ChatProgress, public_progress_text
from app.engines.guard import policy_guard
from app.engines.intent_classifier import intent_classifier
from app.engines.llm import llm_engine
from app.engines.rag import ABSENCE_NOTICE, rag_engine  # [CHAT FIX 2]
from app.engines.thinking import ThinkingStreamParser, strip_thinking_tokens
from app.engines.web_grounding import WebSearchUnavailable, external_context, search_error
from app.engines.web_search import web_search_engine
from app.models.chat import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    CitationItem,
    StreamChatRequest,
    VoiceTranscribeResponse,
)
from app.models.presentation import PresentationSource
from app.models.progress import saved_public_progress
from app.models.web_search import WebSearchResponse

logger = structlog.get_logger(__name__)


class RequestDeadlineExceeded(TimeoutError):
    """Preserve an expired total deadline through generic generation handlers."""


router = APIRouter(prefix="/ai/chat", tags=["AI & Chat Engine"])


async def _deduct_user_credit(user_id: str, reference_id: str) -> int | None:
    """Atomically deduct one chat credit through the database ledger RPC."""
    try:
        async with get_db_connection(timeout=3.0) as conn:
            if not conn:
                raise HTTPException(status_code=503, detail="Credit storage is unavailable.")

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


async def _auto_generate_session_title(  # [TENANT FIX]
    session_id: str,  # [TENANT FIX]
    message: str,  # [TENANT FIX]
    user_id: str,  # [TENANT FIX]
) -> None:  # [TENANT FIX]
    """Use successful server-owned exchanges; never a first-words title."""
    from app.engines.chat_titles import generate_title

    await generate_title(session_id, user_id)


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation session",
)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    current_user: UserContext = Depends(get_current_user),
) -> ChatSessionResponse:
    """Creates a new chat session thread for the authenticated student."""
    user_id = str(current_user.id)  # [TENANT FIX]
    require_university(current_user)  # [TENANT FIX]
    session_id = str(uuid7())  # [LEFTOVER FIX]
    doc_uuid = uuid.UUID(payload.document_id) if payload.document_id else None  # [TENANT FIX]
    if payload.document_id:  # [TENANT FIX]
        await check_document_scope(  # [TENANT FIX]
            payload.document_id,  # [TENANT FIX]
            current_user,  # [TENANT FIX]
            active_only=True,  # [TENANT FIX]
        )  # [TENANT FIX]
    title = payload.title or "New Chat"

    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    async with get_db_connection() as conn:
        if conn is None and not current_user.dev_bypass:
            raise HTTPException(status_code=503, detail="Conversation storage is unavailable.")
        if conn:
            try:
                sql = """
                    INSERT INTO public.chat_sessions (
                        id, user_id, document_id, title, title_source
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING created_at::text, updated_at::text;
                """
                row = await conn.fetchrow(
                    sql,
                    uuid.UUID(session_id),
                    uuid.UUID(user_id),
                    doc_uuid,
                    title,
                    "manual"
                    if "title" in payload.model_fields_set and payload.title
                    else "pending",
                )
                if row:
                    now_str = row["created_at"]
            except Exception as exc:
                logger.warning("create_chat_session_db_failed", error=str(exc))
                raise HTTPException(
                    status_code=503, detail="The conversation could not be saved."
                ) from exc

    return ChatSessionResponse(
        id=session_id,
        user_id=user_id,
        title=title,
        title_source="manual"
        if "title" in payload.model_fields_set and payload.title
        else "pending",
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
    limit: int = Query(default=30, ge=1, le=100),
    archived: bool = Query(default=False),
    current_user: UserContext = Depends(get_current_user),
) -> ChatSessionListResponse:
    """Returns a list of conversation threads for the student."""
    user_id = str(current_user.id)  # [TENANT FIX]
    require_university(current_user)  # [TENANT FIX]
    sessions: list[ChatSessionResponse] = []

    async with get_db_connection() as conn:
        if conn is None and not current_user.dev_bypass:
            raise HTTPException(503, "Conversation storage is unavailable.")
        if conn:
            try:
                sql = """
                    SELECT id, user_id, document_id, title, summary,
                           created_at::text, updated_at::text, is_pinned, archived_at::text,title_source,last_message_at::text
                    FROM public.chat_sessions
                    WHERE user_id = $1 AND deleted_at IS NULL AND (archived_at IS NOT NULL) = $3
                    ORDER BY is_pinned DESC, coalesce(last_message_at,created_at) DESC, id DESC
                    LIMIT $2;
                """
                rows = await conn.fetch(sql, uuid.UUID(user_id), limit, archived)
                for r in rows:
                    sessions.append(
                        ChatSessionResponse(
                            id=str(r["id"]),
                            user_id=str(r["user_id"]),
                            title=r["title"],
                            is_pinned=r.get("is_pinned", False),
                            title_source=r.get("title_source", "pending"),
                            last_message_at=r.get("last_message_at"),
                            archived_at=r.get("archived_at"),
                            document_id=str(r["document_id"]) if r["document_id"] else None,
                            summary=r["summary"],
                            created_at=r["created_at"],
                            updated_at=r["updated_at"],
                        )
                    )
            except Exception as exc:
                logger.warning("list_chat_sessions_db_failed", error=str(exc))
                raise HTTPException(503, "Chat history could not be loaded. Please retry.") from exc

    return ChatSessionListResponse(sessions=sessions, total=len(sessions))


@router.get(
    "/sessions/{session_id}",
    summary="Get conversation session and message history",
)
async def get_chat_session_details(
    session_id: str,
    include_branches: bool = Query(default=False),
    current_user: UserContext = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieves session details and its active message tree."""
    require_university(current_user)  # [TENANT FIX]
    await require_owned_session(session_id, current_user)  # [TENANT FIX]
    session_data: dict | None = None
    messages: list[ChatMessageResponse] = []

    async with get_db_connection() as conn:
        if conn:
            try:
                s_row = await conn.fetchrow(
                    """
                    SELECT id, user_id, document_id, title, summary,
                           created_at::text, updated_at::text, is_pinned, archived_at::text,title_source,last_message_at::text
                    FROM public.chat_sessions
                    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL; -- [TENANT FIX]
                    """,
                    uuid.UUID(session_id),
                    current_user.id,  # [TENANT FIX]
                )
                if s_row:
                    session_data = {
                        "id": str(s_row["id"]),
                        "user_id": str(s_row["user_id"]),
                        "title": s_row["title"],
                        "is_pinned": s_row.get("is_pinned", False),
                        "title_source": s_row.get("title_source", "pending"),
                        "last_message_at": s_row.get("last_message_at"),
                        "archived_at": s_row.get("archived_at"),
                        "document_id": str(s_row["document_id"]) if s_row["document_id"] else None,
                        "summary": s_row["summary"],
                        "created_at": s_row["created_at"],
                        "updated_at": s_row["updated_at"],
                    }

                    m_rows = await conn.fetch(
                        """
                        SELECT id, session_id, role, content, parent_message_id,
                               branch_index, is_active_branch, citations, thinking_text,
                               tool_calls, image_metadata, created_at::text,
                               (SELECT f.rating FROM public.chat_message_feedback f
                                WHERE f.message_id=chat_messages.id AND f.user_id=$3) AS feedback
                        FROM public.chat_messages
                        WHERE session_id = $1 AND ($2 OR is_active_branch = true)
                        ORDER BY created_at ASC, id ASC LIMIT 5000;
                        """,
                        uuid.UUID(session_id),
                        include_branches,
                        current_user.id,
                    )
                    for m in m_rows:
                        raw_cits = m["citations"]
                        cits_list = None
                        if raw_cits:
                            c_data = json.loads(raw_cits) if isinstance(raw_cits, str) else raw_cits
                            cits_list = [CitationItem(**c) for c in c_data]

                        extra_parts = (
                            json.loads(m["tool_calls"])
                            if isinstance(m["tool_calls"], str)
                            else m["tool_calls"]
                        )
                        public_updates = saved_public_progress(extra_parts)
                        if isinstance(extra_parts, dict) and "public_progress" in extra_parts:
                            extra_parts = {
                                **extra_parts,
                                "public_progress": [item.model_dump() for item in public_updates],
                            }
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
                                thinking_text=public_progress_text(m["thinking_text"]) or None,
                                public_progress=public_updates,
                                feedback=m.get("feedback"),
                                created_at=m["created_at"],
                                extra_parts=extra_parts,
                                attachment_metadata=json.loads(m["image_metadata"])
                                if isinstance(m["image_metadata"], str)
                                else m["image_metadata"],
                            )
                        )
            except Exception as exc:
                logger.warning("get_chat_session_details_db_failed", error=str(exc))
                raise HTTPException(
                    503, "Conversation history could not be loaded. Please retry."
                ) from exc

    if not session_data:  # [TENANT FIX]
        raise HTTPException(status_code=404, detail="Conversation not found.")  # [TENANT FIX]

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
    current_user: UserContext = Depends(get_current_user),
) -> StreamingResponse:
    """
    Core Server-Sent Events (SSE) endpoint:
    1. Pre-LLM Prompt Injection & Policy Guard
    2. Medical Acronym Normalizer
    3. RAG Retrieval via Supabase RPC (1536d dense vectors + sibling & segment expansion)  # [DIM 1536]
    4. Multi-turn Agentic Tool Loop & Multi-tier LLM inference
    5. SSE Token streaming with 15s keep-alive heartbeat and disconnect abort
    6. Asynchronous persistence of user and assistant messages + telemetry
    """
    user_id = str(current_user.id)  # [TENANT FIX]
    university_id = str(require_university(current_user))  # [TENANT FIX]
    await require_owned_session(session_id, current_user, payload.parent_message_id)  # [TENANT FIX]
    if payload.document_id:  # [TENANT FIX]
        await check_document_scope(  # [TENANT FIX]
            payload.document_id,  # [TENANT FIX]
            current_user,  # [TENANT FIX]
            active_only=True,  # [TENANT FIX]
        )  # [TENANT FIX]
    turn = await prepare_turn(session_id, payload, current_user)
    user_message_id = turn.user_id
    assistant_message_id = turn.assistant_id
    credit_reserved = False
    credit_settled = False
    try:
        if not current_user.dev_bypass and policy_guard.check_prompt_safety(turn.prompt)[0]:
            await _deduct_user_credit(user_id, assistant_message_id)
            credit_reserved = True
    except BaseException:
        await release_turn(session_id, turn.run_id)
        raise

    model_started = False  # [CHAT FIX 2]
    stream_deadline = 0.0

    async def client_disconnected() -> bool:
        # A cancelled receive scope can consume a simultaneous outer cancellation.
        if stream_deadline and time.monotonic() >= stream_deadline:
            raise RequestDeadlineExceeded("Chat request deadline exceeded")
        disconnected = await request.is_disconnected()
        if stream_deadline and time.monotonic() >= stream_deadline:
            raise RequestDeadlineExceeded("Chat request deadline exceeded")
        return disconnected

    persisted_parts: dict[str, list[Any]] = {"tools": [], "artifacts": []}
    progress = ChatProgress()

    async def save_assistant_message(  # [CHAT FIX 2]
        text: str, citations: list[CitationItem], thinking: str | None = None
    ) -> None:
        """Persist retrieval notices and model answers through the same path."""
        async with get_db_connection() as conn:
            if conn is None:
                if current_user.dev_bypass:
                    return
                raise RuntimeError("Message storage is unavailable")
            if conn:
                try:
                    async with conn.transaction():
                        lease = await conn.fetchrow(
                            """SELECT id FROM public.chat_sessions WHERE id=$1 AND user_id=$2
                            AND active_run_id=$3 AND deleted_at IS NULL FOR UPDATE""",
                            uuid.UUID(session_id),
                            current_user.id,
                            uuid.UUID(turn.run_id),
                        )
                        if lease is None:
                            raise RuntimeError("The conversation run has been replaced")
                        await conn.execute(
                            """INSERT INTO public.chat_messages(
                            id,session_id,parent_message_id,role,content,citations,thinking_text,tool_calls)
                            VALUES($1,$2,$3,'assistant',$4,$5::jsonb,$6,$7::jsonb) ON CONFLICT(id) DO NOTHING""",
                            uuid.UUID(assistant_message_id),
                            uuid.UUID(session_id),
                            uuid.UUID(user_message_id),
                            text,
                            json.dumps([c.model_dump() for c in citations]) if citations else None,
                            progress.text or public_progress_text(thinking) or None,
                            json.dumps(
                                {
                                    **persisted_parts,
                                    "public_progress": [
                                        item.model_dump() for item in progress.updates
                                    ],
                                }
                            ),
                        )
                        await select_path(conn, session_id, assistant_message_id)
                except Exception as exc:
                    logger.warning(
                        "save_assistant_message_failed",
                        error_type=type(exc).__name__,
                        error=repr(exc),
                    )
                    raise

    async def sse_event_generator() -> AsyncGenerator[str, None]:
        nonlocal model_started, credit_settled  # [CHAT FIX 2]
        last_heartbeat = time.time()

        # 1. Yield init event
        yield f"event: init\ndata: {json.dumps({'session_id': session_id, 'user_message_id': user_message_id, 'assistant_message_id': assistant_message_id})}\n\n"
        if update := progress.emit("reviewing_request"):
            yield update

        # 2. Pre-LLM Security Check
        is_safe, safety_reason = policy_guard.check_prompt_safety(turn.prompt)
        if not is_safe:
            err_msg = safety_reason or "Prompt blocked by clinical safety filter."
            yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"
            yield f"event: text_chunk\ndata: {json.dumps({'token': f'⚠️ Policy Guard Notice: {err_msg}', 'provider': 'guard'})}\n\n"
            yield f"event: done\ndata: {json.dumps({'full_text': err_msg, 'citations_count': 0})}\n\n"
            return

        image_attachments = [
            row for row in turn.attachments if str(row.get("content_type", "")).startswith("image/")
        ]
        if image_attachments:
            if update := progress.emit("analysing_image"):
                yield update
            try:
                async with asyncio.timeout(settings.VISION_OVERALL_TIMEOUT_SECONDS):
                    for image in image_attachments:
                        image["extracted_text"] = await analyze_image(
                            image, turn.prompt, session_id, user_id, university_id
                        )
            except Exception as exc:
                logger.warning("chat_image_analysis_failed", error_type=type(exc).__name__)
                error = {
                    "error": "The image could not be analysed right now. Please try again.",
                    "code": "IMAGE_ANALYSIS_UNAVAILABLE",
                    "retryable": True,
                }
                yield f"event: error\ndata: {json.dumps(error)}\n\n"
                yield 'event: done\ndata: {"full_text":""}\n\n'
                return

        # Only server-owned ancestors may enter model history; client-supplied history is ignored.
        history_turns = turn.history
        if not turn.regenerate:
            async with get_db_connection() as conn:
                if conn is None:
                    raise RuntimeError("Message storage is unavailable")
                async with conn.transaction():
                    await conn.execute(
                        """INSERT INTO public.chat_messages(
                        id,session_id,parent_message_id,role,content,is_active_branch,image_metadata,extracted_image_text)
                        VALUES($1,$2,$3,'user',$4,false,$5::jsonb,$6) ON CONFLICT(id) DO NOTHING""",
                        uuid.UUID(user_message_id),
                        uuid.UUID(session_id),
                        uuid.UUID(turn.parent_id) if turn.parent_id else None,
                        turn.prompt,
                        json.dumps(
                            {
                                "attachment_ids": [str(row["id"]) for row in turn.attachments],
                                "attachments": [
                                    {
                                        "id": str(row["id"]),
                                        "name": row["filename"],
                                        "content_type": row["content_type"],
                                        "size": row["byte_size"],
                                    }
                                    for row in turn.attachments
                                ],
                            }
                        ),
                        attachment_context(turn.attachments) or None,
                    )
                    if turn.attachments:
                        await conn.execute(
                            """UPDATE public.chat_attachments SET message_id=COALESCE(message_id,$2)
                            WHERE session_id=$1 AND id=ANY($3::uuid[])""",
                            uuid.UUID(session_id),
                            uuid.UUID(user_message_id),
                            [row["id"] for row in turn.attachments],
                        )

        # 3b. Intent & Complexity Classification (Fast Path vs. Complex Path)
        model_started = True
        classification = await intent_classifier.classify(
            query=turn.prompt,
            history=history_turns,
            document_id=payload.document_id,
            course_code=payload.course_code,
            user_enable_rag=payload.enable_rag,
            user_enable_tools=payload.enable_tools,
            has_attachments=bool(turn.attachments),
        )
        if await client_disconnected():
            return
        if classification.routing_source == "fallback":
            logger.warning(
                "chat_routing_unavailable",
                retryable=True,
                routing_latency_ms=classification.routing_latency_ms,
            )
            error = {
                "error": "PansGPT could not start a response right now. Please try again.",
                "code": "AI_ROUTING_UNAVAILABLE",
                "retryable": True,
            }
            yield f"event: error\ndata: {json.dumps(error)}\n\n"
            yield 'event: done\ndata: {"full_text":"","citations_count":0}\n\n'
            return

        progress.configure(classification.public_progress)
        logger.info(
            "query_classified",
            intent=classification.intent.value,
            route=classification.route.value,
            requires_rag=classification.requires_rag,
            requires_web=classification.requires_web,
            search_scope=classification.search_scope,
            requires_tools=classification.requires_tools,
            confidence=classification.confidence,
            routing_source=classification.routing_source,
            routing_provider=classification.routing_provider,
            routing_model=classification.routing_model,
        )
        if classification.requires_tools and (
            classification.intent.value == "skill_generation"
            or classification.presentation is not None
        ):
            if update := progress.emit(
                "planning_presentation" if classification.presentation else "creating_materials"
            ):
                yield update

        if classification.routing_source == "model":
            background_tasks.add_task(
                llm_engine._record_telemetry,
                classification.routing_provider or "google",
                classification.routing_model or "unknown",
                classification.routing_latency_ms,
                classification.routing_prompt_tokens,
                classification.routing_completion_tokens,
                "success",
                user_id,
                university_id,
            )

        # 4. RAG Retrieval & Context Assembly (with pronoun and context history resolution)
        rag_context = None
        citations: list[CitationItem] = []
        web_context: str | None = None
        web_citations: list[CitationItem] = []
        if classification.requires_web:
            if not payload.enable_tools:
                web_result = WebSearchResponse(
                    status="tools_disabled",
                    message="Web search is disabled for this message. Enable tools to verify current information.",
                )
            else:
                if update := progress.emit("searching_sources"):
                    yield update
                web_result = WebSearchResponse.model_validate(
                    await web_search_engine.search(
                        query=classification.retrieval_query or "",
                        user_id=user_id,
                        role=current_user.role,
                        scope=classification.search_scope,
                        current_information=classification.current_information,
                        public_query=classification.public_search_query
                        and not bool(
                            turn.attachments or payload.document_id or payload.course_code
                        ),
                    )
                )
            if web_result.status != "success" or not web_result.results:
                if web_result.status == "success":
                    web_result = WebSearchResponse(
                        status="empty",
                        message="I could not verify this request from reliable web results.",
                    )
                error = search_error(web_result)
                yield f"event: error\ndata: {json.dumps(error)}\n\n"
                yield 'event: done\ndata: {"full_text":"","citations_count":0}\n\n'
                return
            web_context, web_citations = external_context(web_result)
        if classification.requires_rag and not image_attachments:
            if update := progress.emit("checking_materials"):
                yield update
            try:
                async with asyncio.timeout(settings.CHAT_RETRIEVAL_TIMEOUT_S):
                    rag_context, citations = await rag_engine.retrieve_context(
                        query=classification.retrieval_query or turn.prompt,
                        document_id=payload.document_id,
                        university_id=university_id,
                        course_code=payload.course_code,
                        match_count=4,
                        match_threshold=0.25,
                        expand_siblings=True,
                        expand_full_segment=payload.expand_full_segment,
                        conversation_history=history_turns,
                        user_id=user_id,
                        role=current_user.role,
                        levels=[current_user.current_level] if current_user.current_level else None,
                        public_web_query=classification.retrieval_query
                        if classification.public_search_query and not turn.attachments
                        else None,
                        allow_web_search=payload.enable_tools and not classification.requires_web,
                    )
            except WebSearchUnavailable as exc:
                error = search_error(exc.result)
                yield f"event: error\ndata: {json.dumps(error)}\n\n"
                yield 'event: done\ndata: {"full_text":"","citations_count":0}\n\n'
                return
            except Exception as exc:
                timed_out = isinstance(exc, (TimeoutError, QueryCanceledError))
                logger.warning(
                    "rag_pipeline_execution_error",
                    error_type=type(exc).__name__,
                    timed_out=timed_out,
                )
                error = {
                    "error": "The course-material search timed out. Please try again."
                    if timed_out
                    else "Course materials could not be searched right now. Please try again.",
                    "code": "RETRIEVAL_TIMEOUT" if timed_out else "RETRIEVAL_UNAVAILABLE",
                    "retryable": True,
                }
                yield f"event: error\ndata: {json.dumps(error)}\n\n"
                yield 'event: done\ndata: {"full_text":"","citations_count":0}\n\n'
                return

        if web_context:
            rag_context = "\n\n".join(part for part in [rag_context, web_context] if part)
            citations.extend(web_citations)
        # Yield retrieved citations if any exist
        if citations:
            cits_data = [c.model_dump() for c in citations]
            yield f"event: citations\ndata: {json.dumps(cits_data)}\n\n"

        # 5. Build Clinical System Prompt Grounded in Course Chunks
        if (  # [CHAT FIX 2]
            classification.requires_rag
            and not turn.attachments  # [CHAT FIX 2]
            and not citations  # [CHAT FIX 2]
            and (  # [CHAT FIX 2]
                not rag_context  # [CHAT FIX 2]
                or "not found in your course materials" in rag_context  # [CHAT FIX 2]
            )  # [CHAT FIX 2]
        ):  # [CHAT FIX 2]
            rag_context = ABSENCE_NOTICE  # [CHAT FIX 2]
            yield f"event: text_chunk\ndata: {json.dumps({'token': rag_context, 'delta': rag_context, 'provider': 'retrieval'})}\n\n"  # [CHAT FIX 2]
            await save_assistant_message(rag_context, [])  # [CHAT FIX 2]
            background_tasks.add_task(
                _auto_generate_session_title, session_id, turn.prompt, user_id
            )
            yield f"event: done\ndata: {json.dumps({'full_text': rag_context, 'citations_count': 0, 'provider': 'retrieval'})}\n\n"  # [CHAT FIX 2]
            return  # [CHAT FIX 2]
        system_prompt = policy_guard.build_system_prompt(
            rag_context,
            intent=classification.intent,
            general=classification.search_scope == "general",
            has_web_sources=any(item.source_type == "web" for item in citations),
        ) + attachment_context(turn.attachments)

        if image_attachments:
            system_prompt += (
                "\nThe authorized image observations in USER ATTACHMENTS are source evidence for this turn. "
                "Answer the question from those observations; do not claim the image was absent from course material. "
                "If a requested detail is unclear, request a clearer crop rather than inventing it."
            )

        # 6. Stream tokens and agentic events from Multi-tier LLM Engine with full history
        collected_tokens: list[str] = []
        output_parser = ThinkingStreamParser()
        is_fast_path = classification.route.value == "fast_path"
        last_provider = "groq" if is_fast_path else "google"

        async def response_events() -> AsyncGenerator[tuple[str, Any, str], None]:
            if classification.direct_answer is not None:
                # Reuse the route-or-answer completion, never generate a second simple reply.
                parser = ThinkingStreamParser()
                visible, _ = parser.feed(classification.direct_answer)
                tail, _ = parser.flush()
                _, answer = policy_guard.check_output_safety(visible + tail)
                answer = policy_guard.filter_credential_leaks(answer)
                if not answer.strip():
                    yield (
                        "error",
                        {
                            "error": "The response could not be completed. Please retry.",
                            "code": "EMPTY_ANSWER",
                            "retryable": True,
                        },
                        "router",
                    )
                    return
                yield "text_chunk", {"token": answer}, classification.routing_provider or "router"
                return
            async for event in llm_engine.stream_agentic_chat(
                system_prompt=system_prompt,
                user_message=turn.prompt,
                history=history_turns,
                user_id=user_id,
                university_id=university_id,
                enable_tools=classification.requires_tools,
                role=current_user.role,
                levels=[current_user.current_level] if current_user.current_level else None,
                fast_path=is_fast_path
                or (
                    classification.requires_web
                    and classification.search_scope == "general"
                    and not classification.requires_tools
                ),
                web_search_scope=classification.search_scope,
                public_web_search=classification.public_search_query
                and not bool(turn.attachments or payload.document_id or payload.course_code),
                current_information=classification.current_information,
                presentation_request=classification.presentation is not None,
                validate_presentation_request=True,
                presentation_slide_count=classification.presentation.slide_count
                if classification.presentation
                else None,
                presentation_sources=[
                    PresentationSource(
                        title=item.title[:200], url=item.url if item.source_type == "web" else None
                    )
                    for item in citations
                ],
                session_id=session_id,
            ):
                yield event

        try:
            model_started = True  # [CHAT FIX 2]
            async for event_type, data, provider in response_events():
                # Check client disconnect abort
                if await client_disconnected():
                    logger.info("stream_chat_client_disconnected_aborting", session_id=session_id)
                    break

                # 15s keep-alive heartbeat
                now = time.time()
                if now - last_heartbeat >= 15.0:
                    yield ": keep-alive\n\n"
                    last_heartbeat = now

                last_provider = provider

                if event_type == "text_chunk":
                    token, _ = output_parser.feed(data.get("token") or data.get("delta", ""))
                    if token:
                        if not any(
                            item.get("skill_name") == "create_pptx"
                            for item in persisted_parts["artifacts"]
                        ):
                            if update := progress.emit("writing_response"):
                                yield update
                        collected_tokens.append(token)
                        yield f"event: text_chunk\ndata: {json.dumps({'token': token, 'delta': token, 'provider': provider})}\n\n"
                elif event_type == "thinking_chunk":
                    # Provider reasoning is untrusted private scratchpad, not a public progress update.
                    continue
                elif event_type == "tool_start":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else dict(data)
                    model_label = dumped.pop("public_status", None)
                    if update := progress.for_tool(
                        str(dumped.get("tool_name", "")),
                        model_label if isinstance(model_label, str) else None,
                    ):
                        yield update
                    persisted_parts["tools"].append({**dumped, "status": "running"})
                    yield f"event: tool_start\ndata: {json.dumps(dumped)}\n\n"
                elif event_type == "tool_end":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else data
                    persisted_parts["tools"] = [
                        {**item, **dumped} if item.get("call_id") == dumped.get("call_id") else item
                        for item in persisted_parts["tools"]
                    ]
                    yield f"event: tool_end\ndata: {json.dumps(dumped)}\n\n"
                elif event_type == "artifact_ready":
                    dumped = data.model_dump() if hasattr(data, "model_dump") else data
                    persisted_parts["artifacts"].append(dumped)
                    if dumped.get("skill_name") == "create_pptx":
                        if update := progress.emit("presentation_ready"):
                            yield update
                    yield f"event: artifact_ready\ndata: {json.dumps(dumped)}\n\n"
                elif event_type == "error":  # [CHAT FIX]
                    yield f"event: error\ndata: {json.dumps(data)}\n\n"  # [CHAT FIX 2]
                    if data.get("code"):  # [CHAT FIX 2]
                        yield f"event: done\ndata: {json.dumps({'full_text': ''.join(collected_tokens), 'citations_count': len(citations), 'provider': provider})}\n\n"  # [CHAT FIX 2]
                    return  # [CHAT FIX 2]

            tail, _ = output_parser.flush()
            if tail:
                if update := progress.emit("writing_response"):
                    yield update
                collected_tokens.append(tail)
                yield f"event: text_chunk\ndata: {json.dumps({'token': tail, 'delta': tail, 'provider': last_provider})}\n\n"

        except RequestDeadlineExceeded:
            raise
        except Exception as exc:
            logger.error("stream_chat_unhandled_failure", error_type=type(exc).__name__)
            err_msg = "An unexpected error occurred while generating your answer. Please try again."
            yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"
            yield f"event: done\ndata: {json.dumps({'full_text': ''.join(collected_tokens)})}\n\n"
            return

        raw_response_text = "".join(collected_tokens)
        clean_visible, _ = strip_thinking_tokens(raw_response_text)

        is_safe_output, sanitized_output = policy_guard.check_output_safety(clean_visible)
        full_response_text = sanitized_output
        full_thinking_text = progress.text or None

        # 7. Asynchronously save assistant message to DB
        await save_assistant_message(
            full_response_text, citations, full_thinking_text
        )  # [CHAT FIX 2]

        credit_settled = True
        await _finish_chat_credit(user_id, assistant_message_id, refund=False)
        if full_response_text.strip():
            background_tasks.add_task(
                _auto_generate_session_title, session_id, turn.prompt, user_id
            )
        # 8. Yield final done event
        yield f"event: done\ndata: {json.dumps({'full_text': full_response_text, 'citations_count': len(citations), 'provider': last_provider})}\n\n"

    async def bounded_sse_events() -> AsyncGenerator[str, None]:  # [CHAT FIX]
        nonlocal stream_deadline
        stream_deadline = time.monotonic() + settings.CHAT_TOTAL_TIMEOUT_S
        try:  # [CHAT FIX]
            async with asyncio.timeout(settings.CHAT_TOTAL_TIMEOUT_S):  # [CHAT FIX]
                async for event in sse_event_generator():  # [CHAT FIX]
                    yield event  # [CHAT FIX]
        except TimeoutError as exc:  # [CHAT FIX]
            logger.warning(  # [CHAT FIX]
                "chat_request_deadline_exceeded",  # [CHAT FIX]
                deadline="total",  # [CHAT FIX]
                timeout_s=settings.CHAT_TOTAL_TIMEOUT_S,  # [CHAT FIX]
                error_type=type(exc).__name__,  # [CHAT FIX]
                error=repr(exc),  # [CHAT FIX]
            )  # [CHAT FIX]
            message = {"error": "The answer timed out. Please try again."}  # [CHAT FIX 2]
            if model_started:  # [CHAT FIX 2]
                message.update(code="TIMEOUT", retryable=True)  # [CHAT FIX 2]
            yield f"event: error\ndata: {json.dumps(message)}\n\n"  # [CHAT FIX]
            if model_started:  # [CHAT FIX 2]
                yield f"event: done\ndata: {json.dumps({'full_text': '', 'citations_count': 0})}\n\n"  # [CHAT FIX 2]

    async def transport_events() -> AsyncGenerator[str, None]:
        queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=8)

        async def produce() -> None:
            try:
                async for event in bounded_sse_events():
                    await queue.put(event)
            except Exception:
                logger.exception("chat_stream_producer_failed")
                await queue.put(
                    'event: error\ndata: {"error":"The answer could not be saved. Please retry."}\n\n'
                )
            else:
                await queue.put(None)
                return
            await queue.put(None)

        producer = asyncio.create_task(produce())
        last_ping = time.monotonic()
        try:
            while True:
                if await request.is_disconnected():
                    return
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1)
                except TimeoutError:
                    if time.monotonic() - last_ping >= 15:
                        yield ": keep-alive\n\n"
                        last_ping = time.monotonic()
                    continue
                if event is None:
                    return
                yield event
                last_ping = time.monotonic()
        finally:
            producer.cancel()
            await asyncio.gather(producer, return_exceptions=True)
            try:
                if credit_reserved and not credit_settled:
                    await _finish_chat_credit(user_id, assistant_message_id, refund=True)
            finally:
                await release_turn(session_id, turn.run_id)

    return StreamingResponse(
        transport_events(),  # [CHAT FIX]
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
) -> VoiceTranscribeResponse:
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
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,  # [LEFTOVER FIX]
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


async def _finish_chat_credit(user_id: str, reference: str, refund: bool) -> None:
    try:
        async with get_db_connection() as conn:
            if conn is None:
                return  # The durable reconciliation job handles a missed finalization.
            if refund:
                await conn.execute(
                    "SELECT public.refund_chat_credit($1,$2);", uuid.UUID(user_id), reference
                )
            else:
                await conn.execute(
                    "UPDATE public.credit_ledger SET metadata=metadata || '{\"state\":\"settled\"}'::jsonb WHERE user_id=$1 AND reference_id=$2 AND tx_type='ai_chat';",
                    uuid.UUID(user_id),
                    reference,
                )
    except Exception as exc:
        logger.warning("credit_finalization_deferred", error_type=type(exc).__name__)
