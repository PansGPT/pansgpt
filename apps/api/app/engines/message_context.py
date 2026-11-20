"""Saved message selections with fresh authorization on every replay."""

import json
from typing import Any

from asyncpg import Connection
from fastapi import HTTPException

from app.core.dependencies import UserContext
from app.models.chat import ChatLibrarySource, ChatMessageContext, StreamChatRequest


def saved_message_context(metadata: object) -> ChatMessageContext | None:
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except ValueError:
            return None
    if not isinstance(metadata, dict) or not isinstance(metadata.get("message_context"), dict):
        return None
    try:
        return ChatMessageContext.model_validate(metadata["message_context"])
    except ValueError:
        return None


async def resolve_message_context(
    conn: Connection,
    payload: StreamChatRequest,
    user: UserContext,
    original: dict[str, Any] | None,
    path: list[dict[str, Any]],
    bound_document: str | None,
) -> ChatMessageContext:
    saved = saved_message_context(original.get("image_metadata")) if original else None
    replay = bool(payload.retry_message_id or payload.regenerate_message_id)
    if saved and (replay or "action_mode" not in payload.model_fields_set):
        payload.action_mode = saved.action_mode
    if saved and (replay or "document_id" not in payload.model_fields_set):
        payload.document_id = saved.library_document.id if saved.library_document else None
    elif not original and "document_id" not in payload.model_fields_set:
        for row in reversed(path):
            if str(row["role"]) == "user":
                previous = saved_message_context(row.get("image_metadata"))
                if previous:
                    payload.document_id = (
                        previous.library_document.id if previous.library_document else None
                    )
                break
    if bound_document:
        if payload.document_id and payload.document_id != bound_document:
            raise HTTPException(422, "This conversation is scoped to its original document.")
        payload.document_id = bound_document
    if payload.action_mode and not payload.enable_tools:
        raise HTTPException(422, "Enable study tools to use this action.")
    source = None
    if payload.document_id:
        import uuid

        try:
            identifier = uuid.UUID(payload.document_id)
        except ValueError as exc:
            raise HTTPException(404, "Document not found.") from exc
        row = await conn.fetchrow(
            "SELECT id, title FROM public.documents WHERE id = $1 AND university_id = $2 AND status = 'active' AND deleted_at IS NULL",
            identifier,
            user.university_id,
        )
        if row is None:
            raise HTTPException(404, "Document not found.")
        source = ChatLibrarySource(
            id=str(identifier), title=str(row.get("title") or "Library document")[:500]
        )
    return ChatMessageContext(action_mode=payload.action_mode, library_document=source)
