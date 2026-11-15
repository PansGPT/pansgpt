"""Server-rendered crops of an authorized PDF, isolated from the API process."""

import asyncio
import json
import os
import subprocess
import sys
import tempfile
from collections.abc import Mapping, Sequence
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.database import get_db_connection
from app.core.dependencies import UserContext
from app.models.reader import ReaderSnipOrigin, ReaderSnipRequest

_slots = asyncio.Semaphore(2)


def validate_snip_origins(attachments: Sequence[Mapping[str, object]], document_id: str) -> None:
    for attachment in attachments:
        try:
            raw = attachment.get("extracted_text")
            if attachment.get("content_type") != "image/png" or not isinstance(raw, str):
                raise ValueError("Not a document snip")
            origin = ReaderSnipOrigin.model_validate_json(raw)
            if origin.document_id != document_id:
                raise ValueError("Different study document")
        except (ValidationError, ValueError) as exc:
            raise HTTPException(
                422, "Use a general chat to ask about additional attachments."
            ) from exc


def validate_study_attachments(
    attachments: Sequence[Mapping[str, object]], document_id: str
) -> None:
    """Uploads supplement the PDF; only server-marked snips claim PDF provenance."""
    for attachment in attachments:
        raw = attachment.get("extracted_text")
        if attachment.get("content_type") == "image/png" and isinstance(raw, str):
            try:
                marker = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if isinstance(marker, dict) and marker.get("source") == "reader_snip_v1":
                validate_snip_origins([attachment], document_id)


async def require_reader_attachments(
    session_id: str, document_id: str, attachment_ids: list[str], user: UserContext
) -> None:
    from app.engines.chat_interactions import identifier

    async with get_db_connection() as conn:
        if conn is None:
            raise HTTPException(503, "Attachment storage is unavailable.")
        rows = await conn.fetch(
            "SELECT content_type,extracted_text FROM public.chat_attachments WHERE session_id=$1 AND user_id=$2 AND id=ANY($3::uuid[])",
            identifier(session_id),
            user.id,
            [identifier(value) for value in attachment_ids],
        )
    if len(rows) != len(attachment_ids):
        raise HTTPException(404, "An attachment is unavailable in this conversation.")
    validate_study_attachments(rows, document_id)


def render(source: Path, target: Path, request: ReaderSnipRequest) -> None:
    from app.engines.reader_snip_worker import render as render_crop

    rect = request.rect
    render_crop(source, target, request.page_number, (rect.x, rect.y, rect.width, rect.height))


async def document_snip(key: str, request: ReaderSnipRequest) -> bytes:
    from app.engines.storage import storage_engine

    async with asyncio.timeout(35), _slots:
        source = await storage_engine.download_bytes(key, max_bytes=50 * 1024 * 1024)
        with tempfile.TemporaryDirectory(prefix="pansgpt-snip-") as directory:
            input_path, output_path = Path(directory) / "source.pdf", Path(directory) / "snip.png"
            input_path.write_bytes(source)
            process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "app.engines.reader_snip_worker",
                    str(input_path),
                    str(output_path),
                    str(request.page_number),
                    json.dumps(
                        [request.rect.x, request.rect.y, request.rect.width, request.rect.height]
                    ),
                ],
                cwd=Path(__file__).resolve().parents[2],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                await asyncio.to_thread(process.wait, timeout=12)
            except subprocess.TimeoutExpired as exc:
                raise TimeoutError("PDF snip rendering timed out") from exc
            finally:
                if process.poll() is None:
                    process.kill()
                    await asyncio.to_thread(process.wait)
            if process.returncode != 0 or not output_path.is_file():
                raise ValueError("This PDF area could not be snipped.")
            if output_path.stat().st_size > 10 * 1024 * 1024:
                raise ValueError("Choose a smaller area.")
            return output_path.read_bytes()
