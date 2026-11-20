"""Owner-authorized session metadata and reversible organization controls."""

import asyncio
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core.authorization import require_owned_session, require_university
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.engines.chat_interactions import identifier
from app.engines.chat_runs import chat_runs
from app.models.chat import ChatSessionResponse, ChatSessionUpdateRequest
from app.models.chat_runs import ChatRunSnapshot

router = APIRouter(prefix="/ai/chat", tags=["Chat sessions"])
METADATA_COLUMNS = """id::text,user_id::text,document_id::text,title,summary,
created_at::text,updated_at::text,is_pinned,archived_at::text,title_source,last_message_at::text"""


@router.get("/sessions/{session_id}/run", response_model=ChatRunSnapshot)
async def run_snapshot(
    session_id: str, response: Response, user: UserContext = Depends(get_current_user)
) -> ChatRunSnapshot:
    university = str(require_university(user))
    await require_owned_session(session_id, user)
    response.headers["Cache-Control"] = "private, no-store"
    run = chat_runs.get(session_id, str(user.id), university)
    if run and run.snapshot.status == "running":
        return run.snapshot.model_copy(deep=True)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Conversation state is unavailable.")
        row = await conn.fetchrow(
            """SELECT active_run_id,active_run_started_at > now()-($3 * interval '1 second') AS busy,
            (SELECT m.id FROM public.chat_messages m WHERE m.session_id=$1 AND m.role='user' AND m.is_active_branch AND NOT EXISTS(SELECT 1 FROM public.chat_messages a WHERE a.parent_message_id=m.id AND a.role='assistant') ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS question_id,
            (SELECT coalesce((m.image_metadata->>'retry_blocked')::boolean,false) FROM public.chat_messages m WHERE m.session_id=$1 AND m.role='user' AND m.is_active_branch AND NOT EXISTS(SELECT 1 FROM public.chat_messages a WHERE a.parent_message_id=m.id AND a.role='assistant') ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS tool_started
            FROM public.chat_sessions WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL""",
            identifier(session_id),
            user.id,
            settings.CHAT_TOTAL_TIMEOUT_S + 30,
        )
    if (
        row
        and row.get("active_run_id")
        and (not run or str(row["active_run_id"]) != run.snapshot.run_id)
    ):
        # Another worker may still own it. Never clear its lease or replay its
        # tools. Polling history will pick up its committed result.
        return ChatRunSnapshot(
            run_id=str(row["active_run_id"]),
            status="running" if row.get("busy") else "interrupted",
            error_code=None if row.get("busy") else "RUN_INTERRUPTED",
            user_message_id=str(row["question_id"]) if row.get("question_id") else None,
            assistant_message_id=str(row["active_run_id"]) if row.get("question_id") else None,
            tool_started=bool(row.get("tool_started")),
            retry_blocked=bool(row.get("tool_started")),
            retryable=not bool(row.get("tool_started")),
        )
    if run:
        return run.snapshot.model_copy(
            deep=True, update={"elapsed_ms": round((time.monotonic() - run.started) * 1000)}
        )
    return ChatRunSnapshot()


@router.post("/sessions/{session_id}/runs/{run_id}/cancel", response_model=ChatRunSnapshot)
async def cancel_run(
    session_id: str, run_id: str, response: Response, user: UserContext = Depends(get_current_user)
) -> ChatRunSnapshot:
    university = str(require_university(user))
    identifier(run_id)
    await require_owned_session(session_id, user)
    response.headers["Cache-Control"] = "private, no-store"
    run = chat_runs.get(session_id, str(user.id), university)
    if run is None or run.snapshot.run_id != run_id:
        raise HTTPException(409, "The response has changed. Reopen the conversation.")
    if run.task and not run.task.done() and run.snapshot.status == "running":
        await run.ready.wait()
        run.task.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(run.task), 25)
        except TimeoutError:
            raise HTTPException(503, "The response is still stopping. Please retry.") from None
    return run.snapshot.model_copy(deep=True)


async def metadata(session_id: str, user: UserContext) -> ChatSessionResponse:
    await require_owned_session(session_id, user)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Conversation storage is unavailable.")
        row = await conn.fetchrow(
            f"SELECT {METADATA_COLUMNS} FROM public.chat_sessions "
            "WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
            identifier(session_id),
            user.id,
        )
        if row is None:
            raise HTTPException(404, "Conversation not found.")
        return ChatSessionResponse(**dict(row))


@router.get("/sessions/{session_id}/metadata", response_model=ChatSessionResponse)
async def get_metadata(
    session_id: str, user: UserContext = Depends(get_current_user)
) -> ChatSessionResponse:
    require_university(user)
    return await metadata(session_id, user)


async def mutate_session(
    session_id: str, user: UserContext, payload: ChatSessionUpdateRequest | None
) -> ChatSessionResponse | None:
    require_university(user)
    await require_owned_session(session_id, user)
    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Conversation storage is unavailable.")
        async with conn.transaction():
            row = await conn.fetchrow(
                """SELECT id,active_run_id, active_run_started_at > now()-($3 * interval '1 second') AS busy
                FROM public.chat_sessions WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL FOR UPDATE""",
                identifier(session_id),
                user.id,
                settings.CHAT_TOTAL_TIMEOUT_S + 30,
            )
            if row is None:
                raise HTTPException(404, "Conversation not found.")
            if (
                (payload is None or payload.archived is not None)
                and row["active_run_id"]
                and row["busy"]
            ):
                raise HTTPException(409, "Stop the current response before archiving or deleting.")
            if payload is None:
                await conn.execute(
                    "UPDATE public.chat_sessions SET deleted_at=now(),active_run_id=NULL,active_run_started_at=NULL WHERE id=$1 AND user_id=$2",
                    identifier(session_id),
                    user.id,
                )
                return None
            # Fixed SQL clauses only; values never become identifiers or SQL text.
            values: list[Any] = [identifier(session_id), user.id]
            clauses: list[str] = []
            for field in ("title", "is_pinned"):
                if field in payload.model_fields_set:
                    values.append(getattr(payload, field))
                    clauses.append(f"{field}=${len(values)}")
            if "title" in payload.model_fields_set:
                clauses.append("title_source='manual'")
            if "archived" in payload.model_fields_set:
                values.append(payload.archived)
                clauses.append(
                    f"archived_at=CASE WHEN ${len(values)}::boolean THEN now() ELSE NULL END"
                )
            updated = await conn.fetchrow(
                f"UPDATE public.chat_sessions SET {','.join(clauses)} WHERE id=$1 AND user_id=$2 RETURNING {METADATA_COLUMNS}",
                *values,
            )
            return ChatSessionResponse(**dict(updated))


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(
    session_id: str,
    payload: ChatSessionUpdateRequest,
    user: UserContext = Depends(get_current_user),
) -> ChatSessionResponse:
    result = await mutate_session(session_id, user, payload)
    assert result is not None
    return result


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str, user: UserContext = Depends(get_current_user)
) -> Response:
    await mutate_session(session_id, user, None)
    return Response(status_code=204)
