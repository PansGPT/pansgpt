"""Supporting uploads are real evidence without changing the open PDF boundary."""

import io
import json
import subprocess
import uuid
import zipfile
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock
from xml.etree.ElementTree import ParseError

import pytest
from httpx import AsyncClient
from pptx import Presentation

from app.engines import chat_documents, reader_snips
from app.engines.chat_document_worker import DOCX, PPTX, extract_document
from app.engines.chat_interactions import ChatTurn, attachment_citations
from app.routers import chat, chat_interactions
from tests.conftest import TenantTestState


def slides() -> bytes:
    deck = Presentation()
    for text in ("Synthetic receptor notes", "Synthetic supporting comparison"):
        slide = deck.slides.add_slide(deck.slide_layouts[1])
        slide.shapes.title.text = text
    stream = io.BytesIO()
    deck.save(stream)
    return stream.getvalue()


def notes(text: str = "Synthetic supporting notes") -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "word/document.xml",
            f'<w:document xmlns:w="urn:test"><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:document>',
        )
    return stream.getvalue()


@pytest.mark.parametrize("kind", [PPTX, DOCX])
async def test_office_uploads_are_extracted_in_a_real_bounded_subprocess(kind: str) -> None:
    text = await chat_documents.document_text(slides() if kind == PPTX else notes(), kind)
    assert "Synthetic" in text
    if kind == PPTX:
        assert text.index("[Slide 1]") < text.index("[Slide 2]")
        assert "receptor notes" in text and "supporting comparison" in text


@pytest.mark.parametrize(
    "data,kind",
    [(b"not a zip", PPTX), (notes(""), DOCX), (notes("a" * 40001), DOCX), (notes("&bad;"), DOCX)],
)
def test_invalid_or_oversized_office_content_is_rejected(data: bytes, kind: str) -> None:
    with pytest.raises((ValueError, zipfile.BadZipFile, ParseError)):
        extract_document(data, kind)


@pytest.mark.parametrize("encoding", ["utf-8", "utf-16"])
def test_zip_expansion_and_xml_entities_are_rejected(encoding: str) -> None:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"x" * (21 * 1024 * 1024))
    with pytest.raises(ValueError, match="package limits"):
        extract_document(stream.getvalue(), DOCX)
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr(
            "word/document.xml", '<!DOCTYPE x [<!ENTITY y "unsafe">]><x>&y;</x>'.encode(encoding)
        )
    with pytest.raises(ValueError, match="declarations"):
        extract_document(stream.getvalue(), DOCX)


async def test_parser_timeout_kills_the_child(monkeypatch: pytest.MonkeyPatch) -> None:
    process = MagicMock()
    process.wait.side_effect = [subprocess.TimeoutExpired("parser", 12), 1]
    process.poll.return_value = None
    monkeypatch.setattr(chat_documents.subprocess, "Popen", MagicMock(return_value=process))
    with pytest.raises(TimeoutError):
        await chat_documents.document_text(b"synthetic", "text/plain")
    process.kill.assert_called_once()


@pytest.mark.parametrize("kind", ["text/plain", PPTX, DOCX])
async def test_bound_chat_accepts_real_supporting_uploads_with_private_storage(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, kind: str
) -> None:
    session = next(iter(tenant_state.sessions))
    tenant_state.sessions[session]["document_id"] = next(iter(tenant_state.documents))
    conn = MagicMock(fetchval=AsyncMock(return_value=0), execute=AsyncMock())

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    monkeypatch.setattr(chat_interactions, "get_db_connection", database)
    upload = AsyncMock()
    monkeypatch.setattr(chat_interactions.storage_engine, "upload_bytes", upload)
    data = slides() if kind == PPTX else notes() if kind == DOCX else b"Synthetic supporting note"
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/attachments",
        files={"file": ("supporting-material", data, kind)},
    )
    assert response.status_code == 201, response.text
    values = conn.execute.call_args.args
    assert values[2] == session and values[3] == tenant_state.user.id
    assert "Synthetic" in values[8]
    assert upload.call_args.args[0].startswith(
        f"chat/{tenant_state.user.university_id}/{tenant_state.user.id}/{session}/"
    )
    assert "extracted_text" not in response.json() and "object_key" not in response.json()


@pytest.mark.parametrize("kind", ["text/plain", "image/png"])
async def test_pdf_and_supporting_evidence_both_reach_generation_with_distinct_saved_sources(
    client: AsyncClient, tenant_state: TenantTestState, monkeypatch: pytest.MonkeyPatch, kind: str
) -> None:
    session = next(iter(tenant_state.sessions))
    document = next(iter(tenant_state.documents))
    tenant_state.sessions[session]["document_id"] = document
    attachment_id = str(uuid.uuid4())
    row = {
        "id": attachment_id,
        "filename": "supporting-note.txt" if kind == "text/plain" else "supporting-diagram.png",
        "content_type": kind,
        "extracted_text": "Synthetic uploaded fact" if kind == "text/plain" else "",
        "byte_size": 100,
    }
    conn = MagicMock(fetch=AsyncMock(return_value=[row]))

    @asynccontextmanager
    async def database() -> AsyncIterator[MagicMock]:
        yield conn

    monkeypatch.setattr(reader_snips, "get_db_connection", database)
    turn = ChatTurn(
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        str(uuid.uuid4()),
        None,
        "Compare the PDF with my supporting material",
        [],
        [row],
        False,
    )
    monkeypatch.setattr(chat, "prepare_turn", AsyncMock(return_value=turn))
    monkeypatch.setattr(chat, "release_turn", AsyncMock())
    monkeypatch.setattr(
        chat, "analyze_image", AsyncMock(return_value="Synthetic uploaded image fact")
    )
    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session}/stream",
        json={"message": turn.prompt, "attachment_ids": [attachment_id]},
    )
    assert response.status_code == 200, response.text
    tenant_state.retrieval.assert_awaited_once()
    assert tenant_state.retrieval.call_args.kwargs["document_id"] == str(document)
    assert tenant_state.retrieval.call_args.kwargs["allow_web_search"] is False
    prompt = tenant_state.ai.call_args.kwargs["system_prompt"]
    assert "University A content" in prompt and "Synthetic uploaded" in prompt
    assert "Do not add page tags" in prompt and "Never attribute" in prompt
    assert '"source_type": "attachment"' in response.text
    assert attachment_id in response.text
    saved = [
        call.args
        for call in tenant_state.connection.execute.call_args_list
        if "INSERT INTO public.chat_messages" in call.args[0]
    ]
    assert any('"source_type": "attachment"' in str(values) for values in saved)


def test_snips_remain_pdf_sources_and_uploads_cannot_claim_the_pdf() -> None:
    document = str(uuid.uuid4())
    rows = [
        {
            "id": str(uuid.uuid4()),
            "filename": "notes.txt",
            "content_type": "text/plain",
            "extracted_text": "Uploaded text",
        },
        {
            "id": str(uuid.uuid4()),
            "filename": "Page 2 snip.png",
            "content_type": "image/png",
            "extracted_text": json.dumps(
                {
                    "source": "reader_snip_v1",
                    "document_id": document,
                    "page_number": 2,
                    "rect": {"x": 0, "y": 0, "width": 0.5, "height": 0.5},
                }
            ),
        },
    ]
    upload, snip = attachment_citations(rows, document)
    assert upload.source_type == "attachment" and upload.document_id is None
    assert snip.source_type == "document" and snip.document_id == document and snip.page_start == 2
