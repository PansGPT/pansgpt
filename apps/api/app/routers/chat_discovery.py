"""Server-wide owner-scoped conversation search and retained deletion recovery."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.authorization import require_university
from app.core.database import get_db_connection
from app.core.dependencies import UserContext, get_current_user
from app.engines.chat_interactions import identifier
from app.models.chat import (
    ChatSearchResponse,
    ChatSearchResult,
    ChatSessionResponse,
    ChatTrashResponse,
    DeletedChatSession,
)
from app.routers.chat_sessions import METADATA_COLUMNS

router = APIRouter(prefix="/ai/chat", tags=["Chat discovery"])

SEARCH_SQL = """WITH needle AS (SELECT websearch_to_tsquery('english'::regconfig,$3) AS query)
SELECT s.id::text AS session_id,s.title,hit.id::text AS message_id,
 coalesce(hit.content,s.title) AS content,(s.archived_at IS NOT NULL) AS is_archived,s.last_message_at::text
FROM public.chat_sessions s JOIN public.users u ON u.id=s.user_id CROSS JOIN needle n
LEFT JOIN LATERAL (
 SELECT m.id,m.content,ts_rank_cd(m.search_vector,n.query) AS rank
 FROM public.chat_messages m WHERE m.session_id=s.id AND m.is_active_branch
 AND m.role IN ('user','assistant') AND (m.search_vector @@ n.query OR m.content ILIKE $4)
 ORDER BY rank DESC,m.created_at DESC,m.id DESC LIMIT 1
) hit ON true
WHERE s.user_id=$1 AND u.university_id=$2 AND u.deleted_at IS NULL AND s.deleted_at IS NULL
 AND ($5::boolean OR s.archived_at IS NULL)
 AND (s.search_vector @@ n.query OR s.title ILIKE $4 OR hit.id IS NOT NULL)
ORDER BY (s.search_vector @@ n.query OR s.title ILIKE $4) DESC,coalesce(hit.rank,0) DESC,
 coalesce(s.last_message_at,s.created_at) DESC,s.id DESC LIMIT $6 OFFSET $7"""


def excerpt(content: str, query: str) -> str:
    position = content.lower().find(query.lower())
    start = max(0, position - 75) if position >= 0 else 0
    return (
        ("…" if start else "")
        + " ".join(content[start : start + 240].split())
        + ("…" if len(content) > start + 240 else "")
    )


@router.get("/search", response_model=ChatSearchResponse)
async def search_conversations(
    q: str = Query(min_length=2, max_length=200),
    include_archived: bool = False,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0, le=100000),
    user: UserContext = Depends(get_current_user),
) -> ChatSearchResponse:
    require_university(user)
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Enter at least two characters.")
    pattern = "%" + query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    try:
        async with asyncio.timeout(10), get_db_connection(timeout=3) as conn:
            if conn is None:
                raise HTTPException(503, "Conversation search is unavailable.")
            rows = await conn.fetch(
                SEARCH_SQL,
                user.id,
                user.university_id,
                query,
                pattern,
                include_archived,
                limit + 1,
                offset,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Conversation search is unavailable. Please retry.") from exc
    return ChatSearchResponse(
        results=[
            ChatSearchResult(
                session_id=row["session_id"],
                title=row["title"],
                message_id=row["message_id"],
                snippet=excerpt(row["content"], query),
                is_archived=row["is_archived"],
                last_message_at=row["last_message_at"],
            )
            for row in rows[:limit]
        ],
        next_offset=offset + limit if len(rows) > limit else None,
    )


@router.get("/trash", response_model=ChatTrashResponse)
async def deleted_conversations(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=100000),
    user: UserContext = Depends(get_current_user),
) -> ChatTrashResponse:
    require_university(user)
    async with get_db_connection(timeout=3) as conn:
        if conn is None:
            raise HTTPException(503, "Deleted chats are unavailable.")
        rows = await conn.fetch(
            f"SELECT {METADATA_COLUMNS},deleted_at::text FROM public.chat_sessions WHERE user_id=$1 AND deleted_at>now()-interval '30 days' AND EXISTS(SELECT 1 FROM public.users WHERE id=$1 AND university_id=$2 AND deleted_at IS NULL) ORDER BY deleted_at DESC,id DESC LIMIT $3 OFFSET $4",
            user.id,
            user.university_id,
            limit + 1,
            offset,
        )
    return ChatTrashResponse(
        sessions=[DeletedChatSession(**dict(row)) for row in rows[:limit]],
        next_offset=offset + limit if len(rows) > limit else None,
    )


@router.post("/sessions/{session_id}/restore", response_model=ChatSessionResponse)
async def restore_conversation(
    session_id: str, user: UserContext = Depends(get_current_user)
) -> ChatSessionResponse:
    require_university(user)
    async with get_db_connection(timeout=3) as conn:
        if conn is None:
            raise HTTPException(503, "Conversation storage is unavailable.")
        row = await conn.fetchrow(
            f"UPDATE public.chat_sessions SET deleted_at=NULL WHERE id=$1 AND user_id=$2 AND deleted_at>now()-interval '30 days' AND EXISTS(SELECT 1 FROM public.users WHERE id=$2 AND university_id=$3 AND deleted_at IS NULL) RETURNING {METADATA_COLUMNS}",
            identifier(session_id),
            user.id,
            user.university_id,
        )
    if row is None:
        raise HTTPException(
            404, "This conversation is unavailable or its recovery period has ended."
        )
    return ChatSessionResponse(**dict(row))
