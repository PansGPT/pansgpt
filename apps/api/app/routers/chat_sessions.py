"""Owner-authorized session metadata and reversible organization controls."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response

from app.core.authorization import require_owned_session, require_university
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.engines.chat_interactions import identifier
from app.models.chat import ChatSessionResponse, ChatSessionUpdateRequest

router = APIRouter(prefix="/ai/chat", tags=["Chat sessions"])
METADATA_COLUMNS = """id::text,user_id::text,document_id::text,title,summary,
created_at::text,updated_at::text,is_pinned,archived_at::text,title_source,last_message_at::text"""


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
