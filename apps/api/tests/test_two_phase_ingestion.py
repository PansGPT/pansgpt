# ==============================================================================
# Unit Tests for Two-Phase Ingestion Pipeline [IMAGES PHASE]
# ==============================================================================

import hashlib  # [IMAGES PHASE]
import io  # [IMAGES PHASE]
import uuid  # [IMAGES PHASE]
from unittest.mock import AsyncMock, MagicMock, patch  # [IMAGES PHASE]

import fitz  # [IMAGES PHASE]
import pytest  # [IMAGES PHASE]
from PIL import Image  # [IMAGES PHASE]

from app.core.config import settings  # [IMAGES PHASE]
from app.engines.classifier import VisionError, image_classifier  # [IMAGES PHASE]
from app.engines.extractor import (
    ExtractedPage,
)  # [IMAGES PHASE]
from app.engines.ingestion import (
    document_ingestion_engine,
)  # [IMAGES PHASE]


def _create_test_pdf_with_image() -> bytes:  # [IMAGES PHASE]
    """Create a minimal PDF with 1 page of text and 1 embedded image."""  # [IMAGES PHASE]
    doc = fitz.open()  # [IMAGES PHASE]
    page = doc.new_page(width=600, height=800)  # [IMAGES PHASE]
    page.insert_text(
        fitz.Point(50, 50), "Pharmacology of cardiac glycosides and antiarrhythmic agents."
    )  # [IMAGES PHASE]

    # Create 300x300 image
    img = Image.new("RGB", (300, 300), color=(100, 150, 200))  # [IMAGES PHASE]
    buf = io.BytesIO()  # [IMAGES PHASE]
    img.save(buf, format="PNG")  # [IMAGES PHASE]
    page.insert_image(fitz.Rect(50, 100, 350, 400), stream=buf.getvalue())  # [IMAGES PHASE]

    pdf_bytes = doc.tobytes()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]
    return pdf_bytes  # [IMAGES PHASE]


class MockTransaction:  # [IMAGES PHASE]
    async def __aenter__(self):  # [IMAGES PHASE]
        return self  # [IMAGES PHASE]

    async def __aexit__(self, exc_type, exc_val, exc_tb):  # [IMAGES PHASE]
        pass  # [IMAGES PHASE]


class MockDBConnection:  # [IMAGES PHASE]
    def __init__(self, pending_rows=None, segments=None, doc_row=None):  # [IMAGES PHASE]
        self.pending_rows = pending_rows or []  # [IMAGES PHASE]
        self.segments = segments or [  # [IMAGES PHASE]
            {  # [IMAGES PHASE]
                "id": uuid.uuid4(),  # [IMAGES PHASE]
                "start_page": 1,  # [IMAGES PHASE]
                "end_page": 10,  # [IMAGES PHASE]
                "order_index": 0,  # [IMAGES PHASE]
            }  # [IMAGES PHASE]
        ]  # [IMAGES PHASE]
        self.doc_row = doc_row or {  # [IMAGES PHASE]
            "id": uuid.uuid4(),  # [IMAGES PHASE]
            "converted_key": None,  # [IMAGES PHASE]
            "embedding_status": "completed",  # [IMAGES PHASE]
        }  # [IMAGES PHASE]
        self.execute_calls = []  # [IMAGES PHASE]
        self.executemany_calls = []  # [IMAGES PHASE]
        self.fetch_calls = []  # [IMAGES PHASE]

    def transaction(self):  # [IMAGES PHASE]
        return MockTransaction()  # [IMAGES PHASE]

    async def fetchrow(self, query, *args):  # [IMAGES PHASE]
        self.fetch_calls.append((query, args))  # [IMAGES PHASE]
        if "FROM public.documents" in query:  # [IMAGES PHASE]
            return self.doc_row  # [IMAGES PHASE]
        return None  # [IMAGES PHASE]

    async def fetchval(self, query, *args):  # [IMAGES PHASE]
        if "FOR UPDATE OF d,i" in query:
            return 1
        if "MAX(order_index)" in query:  # [IMAGES PHASE]
            return 1  # [IMAGES PHASE]
        if "MAX(chunk_index)" in query:  # [IMAGES PHASE]
            return 5  # [IMAGES PHASE]
        return None  # [IMAGES PHASE]

    async def fetch(self, query, *args):  # [IMAGES PHASE]
        self.fetch_calls.append((query, args))  # [IMAGES PHASE]
        if (
            "FROM public.document_images" in query and "SELECT id, page_number" in query
        ):  # [IMAGES PHASE]
            return self.pending_rows  # [IMAGES PHASE]
        if "FROM public.document_segments" in query:  # [IMAGES PHASE]
            return self.segments  # [IMAGES PHASE]
        if "GROUP BY status" in query:  # [IMAGES PHASE]
            return [  # [IMAGES PHASE]
                {"status": "done", "count": 1},  # [IMAGES PHASE]
                {"status": "pending", "count": 0},  # [IMAGES PHASE]
            ]  # [IMAGES PHASE]
        return []  # [IMAGES PHASE]

    async def execute(self, query, *args):  # [IMAGES PHASE]
        self.execute_calls.append((query, args))  # [IMAGES PHASE]

    async def executemany(self, query, args):  # [IMAGES PHASE]
        self.executemany_calls.append((query, args))  # [IMAGES PHASE]

    async def close(self):  # [IMAGES PHASE]
        pass  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_phase1_makes_no_vision_calls_and_inserts_pending_rows(monkeypatch):  # [IMAGES PHASE]
    """(1) Phase 1 makes NO vision call and inserts pending rows into document_images."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]

    mock_db = MockDBConnection()  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]

    with patch.object(
        image_classifier, "classify_and_process", new_callable=AsyncMock
    ) as mock_classify:  # [IMAGES PHASE]
        success = await document_ingestion_engine.ingest_document_from_r2(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert success is True  # [IMAGES PHASE]
        # Assert NO vision calls made in Phase 1
        mock_classify.assert_not_called()  # [IMAGES PHASE]

    # Verify document_images insert was called with pending status
    img_inserts = [
        args for q, args in mock_db.executemany_calls if "INSERT INTO public.document_images" in q
    ]  # [IMAGES PHASE]
    assert len(img_inserts) == 1  # [IMAGES PHASE]
    inserted_rows = img_inserts[0]  # [IMAGES PHASE]
    assert len(inserted_rows) >= 1  # [IMAGES PHASE]
    assert inserted_rows[0][6] == "pending"  # status is pending  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_phase2_writes_element_chunk_and_done_row(monkeypatch):  # [IMAGES PHASE]
    """(2) Phase 2 writes element, chunk and 'done' row with the right page."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    img_info = doc[0].get_image_info(xrefs=True)[0]  # [IMAGES PHASE]
    raw_img = doc.extract_image(img_info["xref"])["image"]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    row_id = uuid.uuid4()  # [IMAGES PHASE]
    pending_row = {  # [IMAGES PHASE]
        "id": row_id,  # [IMAGES PHASE]
        "page_number": 1,  # [IMAGES PHASE]
        "content_hash": content_hash,  # [IMAGES PHASE]
        "source": "embedded",  # [IMAGES PHASE]
        "width": 300,  # [IMAGES PHASE]
        "height": 300,  # [IMAGES PHASE]
        "status": "pending",  # [IMAGES PHASE]
        "attempts": 0,  # [IMAGES PHASE]
    }  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=[pending_row])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # [IMAGES PHASE]

    mock_desc = "[Visual Description: Diagram of cardiac conduction system showing SA node]"  # [IMAGES PHASE]
    with (  # [IMAGES PHASE]
        patch.object(
            image_classifier,
            "classify_and_process",
            new_callable=AsyncMock,
            return_value=("diagram", mock_desc),
        ),  # [IMAGES PHASE]
        patch(
            "app.engines.embedder.gemini_embedder.embed_batch",
            new_callable=AsyncMock,
            return_value=[[0.1] * 1536],
        ),  # [IMAGES PHASE]
    ):  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert result == "completed"  # [IMAGES PHASE]

    # Verify element was inserted
    el_inserts = [
        args for q, args in mock_db.execute_calls if "INSERT INTO public.document_elements" in q
    ]  # [IMAGES PHASE]
    assert len(el_inserts) == 1  # [IMAGES PHASE]
    assert el_inserts[0][3] == 1  # page_number 1  # [IMAGES PHASE]
    assert el_inserts[0][4] == "diagram"  # content_type  # [IMAGES PHASE]
    assert el_inserts[0][5] == "vision_description"  # extraction_method  # [IMAGES PHASE]

    # Verify chunk was inserted with page_start = 1, page_end = 1
    chk_inserts = [
        args for q, args in mock_db.executemany_calls if "INSERT INTO public.document_chunks" in q
    ]  # [IMAGES PHASE]
    assert len(chk_inserts) == 1  # [IMAGES PHASE]
    assert chk_inserts[0][0][5] == 1  # page_start  # [IMAGES PHASE]
    assert chk_inserts[0][0][6] == 1  # page_end  # [IMAGES PHASE]

    # Verify row marked 'done'
    done_updates = [
        args
        for q, args in mock_db.execute_calls
        if "UPDATE public.document_images" in q and "SET status = 'done'" in q
    ]  # [IMAGES PHASE]
    assert len(done_updates) == 1  # [IMAGES PHASE]
    assert done_updates[0][0] == row_id  # [IMAGES PHASE]
    assert done_updates[0][1] == "diagram"  # route  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_second_run_only_processes_remaining_rows(monkeypatch):  # [IMAGES PHASE]
    """(3) A second run only processes remaining rows."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]

    # Second run: DB returns 0 pending rows
    mock_db = MockDBConnection(pending_rows=[])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]

    with patch.object(
        image_classifier, "classify_and_process", new_callable=AsyncMock
    ) as mock_classify:  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert result == "completed"  # [IMAGES PHASE]
        mock_classify.assert_not_called()  # Nothing processed  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_three_consecutive_failures_pauses_without_fake(monkeypatch):  # [IMAGES PHASE]
    """(4) Three consecutive failures return 'paused', rows stay 'pending' and nothing fake is stored."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    rows = [  # [IMAGES PHASE]
        {  # [IMAGES PHASE]
            "id": uuid.uuid4(),  # [IMAGES PHASE]
            "page_number": 1,  # [IMAGES PHASE]
            "content_hash": content_hash,  # [IMAGES PHASE]
            "source": "embedded",  # [IMAGES PHASE]
            "width": 300,  # [IMAGES PHASE]
            "height": 300,  # [IMAGES PHASE]
            "status": "pending",  # [IMAGES PHASE]
            "attempts": 0,  # [IMAGES PHASE]
        }  # [IMAGES PHASE]
        for _ in range(4)  # [IMAGES PHASE]
    ]  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=rows)  # [IMAGES PHASE]
    # In fetch for GROUP BY status, report 4 pending  # [IMAGES PHASE]
    orig_fetch = mock_db.fetch  # [IMAGES PHASE]

    async def mock_fetch(query, *args):  # [IMAGES PHASE]
        if "GROUP BY status" in query:  # [IMAGES PHASE]
            return [{"status": "pending", "count": 4}]  # [IMAGES PHASE]
        return await orig_fetch(query, *args)  # [IMAGES PHASE]

    mock_db.fetch = mock_fetch  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # [IMAGES PHASE]

    with patch.object(  # [IMAGES PHASE]
        image_classifier,
        "classify_and_process",
        side_effect=VisionError("Google API 500 Server Error"),  # [IMAGES PHASE]
    ):  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf", max_consecutive_failures=3
        )  # [IMAGES PHASE]
        assert result == "paused"  # [IMAGES PHASE]

    # Verify rows updated with last_error and status='pending'
    failure_updates = [
        args
        for q, args in mock_db.execute_calls
        if "SET attempts = $2, last_error = $3, status = $4" in q
    ]  # [IMAGES PHASE]
    assert len(failure_updates) == 3  # stopped exactly at 3 consecutive failures  # [IMAGES PHASE]
    for upd in failure_updates:  # [IMAGES PHASE]
        assert upd[3] == "pending"  # status stays pending  # [IMAGES PHASE]
        assert "500 Server Error" in upd[2]  # last_error recorded  # [IMAGES PHASE]

    # Verify NO element or chunk was inserted (nothing fake)
    el_inserts = [
        q for q, _ in mock_db.execute_calls if "INSERT INTO public.document_elements" in q
    ]  # [IMAGES PHASE]
    assert len(el_inserts) == 0  # [IMAGES PHASE]
    chk_inserts = [
        q for q, _ in mock_db.executemany_calls if "INSERT INTO public.document_chunks" in q
    ]  # [IMAGES PHASE]
    assert len(chk_inserts) == 0  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_http_400_skips_image(monkeypatch):  # [IMAGES PHASE]
    """(5) HTTP 400 invalid image -> status 'skipped' with last_error."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    row_id = uuid.uuid4()  # [IMAGES PHASE]
    pending_row = {  # [IMAGES PHASE]
        "id": row_id,  # [IMAGES PHASE]
        "page_number": 1,  # [IMAGES PHASE]
        "content_hash": content_hash,  # [IMAGES PHASE]
        "source": "embedded",  # [IMAGES PHASE]
        "width": 300,  # [IMAGES PHASE]
        "height": 300,  # [IMAGES PHASE]
        "status": "pending",  # [IMAGES PHASE]
        "attempts": 0,  # [IMAGES PHASE]
    }  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=[pending_row])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # [IMAGES PHASE]

    # HTTP 400 returns (None, None) in classify_and_process
    with patch.object(
        image_classifier, "classify_and_process", new_callable=AsyncMock, return_value=(None, None)
    ):  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert result == "completed"  # [IMAGES PHASE]

    skipped_updates = [
        args
        for q, args in mock_db.execute_calls
        if "status = 'skipped'" in q and "invalid image (HTTP 400)" in q
    ]  # [IMAGES PHASE]
    assert len(skipped_updates) == 1  # [IMAGES PHASE]
    assert skipped_updates[0][0] == row_id  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_empty_output_retries_once_then_skips(monkeypatch):  # [IMAGES PHASE]
    """(6) Empty output retries once then 'skipped' with last_error 'empty'."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    row_id = uuid.uuid4()  # [IMAGES PHASE]
    pending_row = {  # [IMAGES PHASE]
        "id": row_id,  # [IMAGES PHASE]
        "page_number": 1,  # [IMAGES PHASE]
        "content_hash": content_hash,  # [IMAGES PHASE]
        "source": "embedded",  # [IMAGES PHASE]
        "width": 300,  # [IMAGES PHASE]
        "height": 300,  # [IMAGES PHASE]
        "status": "pending",  # [IMAGES PHASE]
        "attempts": 0,  # [IMAGES PHASE]
    }  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=[pending_row])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # [IMAGES PHASE]

    # Empty output returns (None, "") in classify_and_process
    with patch.object(
        image_classifier, "classify_and_process", new_callable=AsyncMock, return_value=(None, "")
    ):  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert result == "completed"  # [IMAGES PHASE]

    empty_updates = [
        args
        for q, args in mock_db.execute_calls
        if "status = 'skipped'" in q and "last_error = 'empty'" in q
    ]  # [IMAGES PHASE]
    assert len(empty_updates) == 1  # [IMAGES PHASE]
    assert empty_updates[0][0] == row_id  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_scanned_doc_without_text_stays_processing_until_phase2(
    monkeypatch,
):  # [IMAGES PHASE]
    """(7) A scanned document without text stays 'processing' until phase 2."""  # [IMAGES PHASE]
    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]

    # Scanned page: has_text_layer=False, 0 native text, 1 full-page render
    scanned_page = ExtractedPage(  # [IMAGES PHASE]
        page_number=1,  # [IMAGES PHASE]
        has_text_layer=False,  # [IMAGES PHASE]
        native_text="",  # [IMAGES PHASE]
        extraction_method="scanned_canvas",  # [IMAGES PHASE]
        full_page_render=b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRmock",  # [IMAGES PHASE]
        page_width=600.0,  # [IMAGES PHASE]
        page_height=800.0,  # [IMAGES PHASE]
    )  # [IMAGES PHASE]

    mock_db = MockDBConnection()  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=b"%PDF-mock")
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.extractor.document_extractor.process_document",
        MagicMock(return_value=[scanned_page]),
    )  # [IMAGES PHASE]

    # Phase 1
    await document_ingestion_engine.ingest_document_from_r2(doc_id, "scan.pdf")  # [IMAGES PHASE]

    # Verify Phase 1 kept embedding_status='processing' and progress=50
    status_updates = [
        args
        for q, args in mock_db.execute_calls
        if "UPDATE public.documents" in q and "SET embedding_status = $2" in q
    ]  # [IMAGES PHASE]
    assert len(status_updates) == 1  # [IMAGES PHASE]
    assert status_updates[0][1] == "processing"  # embedding_status is processing  # [IMAGES PHASE]
    assert status_updates[0][2] == 50  # progress is 50  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_phase2_writes_strip_nul_characters(monkeypatch):  # [IMAGES PHASE]
    """(8) Phase-2 writes strip NUL characters."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    row_id = uuid.uuid4()  # [IMAGES PHASE]
    pending_row = {  # [IMAGES PHASE]
        "id": row_id,  # [IMAGES PHASE]
        "page_number": 1,  # [IMAGES PHASE]
        "content_hash": content_hash,  # [IMAGES PHASE]
        "source": "embedded",  # [IMAGES PHASE]
        "width": 300,  # [IMAGES PHASE]
        "height": 300,  # [IMAGES PHASE]
        "status": "pending",  # [IMAGES PHASE]
        "attempts": 0,  # [IMAGES PHASE]
    }  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=[pending_row])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr("asyncio.sleep", AsyncMock())  # [IMAGES PHASE]

    # Description with NUL characters
    desc_with_nul = (
        "[Visual Description: Mechanism of \x00Digitalis\u0000 toxicity]"  # [IMAGES PHASE]
    )
    with (  # [IMAGES PHASE]
        patch.object(
            image_classifier,
            "classify_and_process",
            new_callable=AsyncMock,
            return_value=("diagram", desc_with_nul),
        ),  # [IMAGES PHASE]
        patch(
            "app.engines.embedder.gemini_embedder.embed_batch",
            new_callable=AsyncMock,
            return_value=[[0.1] * 1536],
        ),  # [IMAGES PHASE]
    ):  # [IMAGES PHASE]
        await document_ingestion_engine.process_pending_images(doc_id, "mock.pdf")  # [IMAGES PHASE]

    # Verify no NUL bytes in document_elements insert
    el_inserts = [
        args for q, args in mock_db.execute_calls if "INSERT INTO public.document_elements" in q
    ]  # [IMAGES PHASE]
    assert len(el_inserts) == 1  # [IMAGES PHASE]
    raw_content = el_inserts[0][6]  # [IMAGES PHASE]
    assert "\x00" not in raw_content  # [IMAGES PHASE]
    assert "\\u0000" not in raw_content  # [IMAGES PHASE]
    assert "Digitalis toxicity" in raw_content  # [IMAGES PHASE]


@pytest.mark.asyncio  # [IMAGES PHASE]
async def test_vision_fake_mode_still_works(monkeypatch):  # [IMAGES PHASE]
    """(9) VISION_FAKE_MODE still works in Phase 2."""  # [IMAGES PHASE]
    pdf_bytes = _create_test_pdf_with_image()  # [IMAGES PHASE]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [IMAGES PHASE]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]

    doc_id = str(uuid.uuid4())  # [IMAGES PHASE]
    row_id = uuid.uuid4()  # [IMAGES PHASE]
    pending_row = {  # [IMAGES PHASE]
        "id": row_id,  # [IMAGES PHASE]
        "page_number": 1,  # [IMAGES PHASE]
        "content_hash": content_hash,  # [IMAGES PHASE]
        "source": "embedded",  # [IMAGES PHASE]
        "width": 300,  # [IMAGES PHASE]
        "height": 300,  # [IMAGES PHASE]
        "status": "pending",  # [IMAGES PHASE]
        "attempts": 0,  # [IMAGES PHASE]
    }  # [IMAGES PHASE]

    mock_db = MockDBConnection(pending_rows=[pending_row])  # [IMAGES PHASE]

    async def mock_connect(*args, **kwargs):  # [IMAGES PHASE]
        return mock_db  # [IMAGES PHASE]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [IMAGES PHASE]
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock"
    )  # [IMAGES PHASE]
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )  # [IMAGES PHASE]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", True)  # [IMAGES PHASE]

    with patch(
        "app.engines.embedder.gemini_embedder.embed_batch",
        new_callable=AsyncMock,
        return_value=[[0.1] * 1536],
    ):  # [IMAGES PHASE]
        result = await document_ingestion_engine.process_pending_images(
            doc_id, "mock.pdf"
        )  # [IMAGES PHASE]
        assert result == "completed"  # [IMAGES PHASE]

    # Verify done update received mock description
    done_updates = [
        args
        for q, args in mock_db.execute_calls
        if "UPDATE public.document_images" in q and "SET status = 'done'" in q
    ]  # [IMAGES PHASE]
    assert len(done_updates) == 1  # [IMAGES PHASE]
    assert "Mock pharmacology diagram" in done_updates[0][2]  # [IMAGES PHASE]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_describe_document_images_job_returns_completed(monkeypatch):  # [PHASE2 FIX]
    """(a) describe_document_images_job returns 'completed'."""  # [PHASE2 FIX]
    from workers.tasks import describe_document_images_job  # [PHASE2 FIX]

    with patch.object(  # [PHASE2 FIX]
        document_ingestion_engine,  # [PHASE2 FIX]
        "process_pending_images",  # [PHASE2 FIX]
        new_callable=AsyncMock,  # [PHASE2 FIX]
        return_value="completed",  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        res = await describe_document_images_job({}, str(uuid.uuid4()), "dummy.pdf")  # [PHASE2 FIX]
        assert res == "completed"  # [PHASE2 FIX]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_describe_document_images_job_raises_retry_on_paused(monkeypatch):  # [PHASE2 FIX]
    """(b) it raises Retry(defer=300) when process_pending_images returns 'paused' with pending rows and job_try < 6."""  # [PHASE2 FIX]
    from arq import Retry  # [PHASE2 FIX]

    from workers.tasks import describe_document_images_job  # [PHASE2 FIX]

    with (  # [PHASE2 FIX]
        patch.object(  # [PHASE2 FIX]
            document_ingestion_engine,  # [PHASE2 FIX]
            "process_pending_images",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value="paused",  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.get_image_status",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={"pending": 2},  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        with pytest.raises(Retry) as exc_info:  # [PHASE2 FIX]
            await describe_document_images_job(  # [PHASE2 FIX]
                {"job_try": 2},
                str(uuid.uuid4()),
                "dummy.pdf",  # [PHASE2 FIX]
            )  # [PHASE2 FIX]
        assert exc_info.value.defer_score in (300, 300000)  # [PHASE2 FIX]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_enqueue_passes_converted_key_and_skips_when_no_pending(monkeypatch):  # [PHASE2 FIX]
    """(c) the enqueue after phase 1 passes the CONVERTED key for an Office document and is skipped when no images are pending."""  # [PHASE2 FIX]
    from workers.tasks import ingest_document_job  # [PHASE2 FIX]

    doc_id = str(uuid.uuid4())  # [PHASE2 FIX]
    conv_key = f"universities/1/courses/c1/converted/{doc_id}.pdf"  # [PHASE2 FIX]

    # Subcase 1: With pending images -> enqueues converted key
    mock_redis = MagicMock()  # [PHASE2 FIX]
    mock_redis.enqueue_job = AsyncMock(return_value="job-1")  # [PHASE2 FIX]
    ctx = {"redis": mock_redis}  # [PHASE2 FIX]

    with (  # [PHASE2 FIX]
        patch(
            "workers.tasks._claim_document", new_callable=AsyncMock, return_value=True
        ),  # [PHASE2 FIX]
        patch("workers.tasks._update_document_status", new_callable=AsyncMock),  # [PHASE2 FIX]
        patch(  # [LEFTOVER FIX]
            "workers.tasks.storage_engine.get_object_size",  # [LEFTOVER FIX]
            new_callable=AsyncMock,  # [LEFTOVER FIX]
            return_value=1024,  # [LEFTOVER FIX]
        ),  # [LEFTOVER FIX]
        patch(
            "workers.tasks.storage_engine.object_exists", new_callable=AsyncMock, return_value=True
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks._get_document_meta",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={  # [PHASE2 FIX]
                "mime_type": (  # [PHASE2 FIX]
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # [PHASE2 FIX]
                ),  # [PHASE2 FIX]
                "converted_key": conv_key,  # [PHASE2 FIX]
                "page_count": 10,  # [PHASE2 FIX]
            },  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.document_ingestion_engine.ingest_document_from_r2",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value=True,  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.get_image_status",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={"pending": 3},  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        from workers.settings import PICTURE_QUEUE_NAME  # [QUEUE SPLIT]

        await ingest_document_job(ctx, doc_id, "original.docx")  # [QUEUE SPLIT]
        mock_redis.enqueue_job.assert_awaited_once_with(  # [QUEUE SPLIT]
            "describe_document_images_job",  # [QUEUE SPLIT]
            doc_id,  # [QUEUE SPLIT]
            conv_key,  # [QUEUE SPLIT]
            _queue_name=PICTURE_QUEUE_NAME,  # [QUEUE SPLIT]
            _job_id="018f3a30-0001-7000-8000-000000000001",
        )  # [QUEUE SPLIT]

    # Subcase 2: When no images are pending -> skipped
    mock_redis_empty = MagicMock()  # [PHASE2 FIX]
    mock_redis_empty.enqueue_job = AsyncMock()  # [PHASE2 FIX]
    with (  # [PHASE2 FIX]
        patch(
            "workers.tasks._claim_document", new_callable=AsyncMock, return_value=True
        ),  # [PHASE2 FIX]
        patch("workers.tasks._update_document_status", new_callable=AsyncMock),  # [PHASE2 FIX]
        patch(  # [LEFTOVER FIX]
            "workers.tasks.storage_engine.get_object_size",  # [LEFTOVER FIX]
            new_callable=AsyncMock,  # [LEFTOVER FIX]
            return_value=1024,  # [LEFTOVER FIX]
        ),  # [LEFTOVER FIX]
        patch(
            "workers.tasks.storage_engine.object_exists", new_callable=AsyncMock, return_value=True
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks._get_document_meta",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={  # [PHASE2 FIX]
                "mime_type": (  # [PHASE2 FIX]
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # [PHASE2 FIX]
                ),  # [PHASE2 FIX]
                "converted_key": conv_key,  # [PHASE2 FIX]
                "page_count": 10,  # [PHASE2 FIX]
            },  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.document_ingestion_engine.ingest_document_from_r2",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value=True,  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.get_image_status",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={"pending": 0},  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        await ingest_document_job(
            {"redis": mock_redis_empty}, doc_id, "original.docx"
        )  # [PHASE2 FIX]
        mock_redis_empty.enqueue_job.assert_not_called()  # [PHASE2 FIX]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_failed_enqueue_logs_error_and_does_not_fail_phase1(monkeypatch):  # [PHASE2 FIX]
    """(d) a failed enqueue logs phase2_enqueue_failed and does not fail phase 1."""  # [PHASE2 FIX]
    from workers.tasks import ingest_document_job  # [PHASE2 FIX]

    doc_id = str(uuid.uuid4())  # [PHASE2 FIX]
    mock_redis = MagicMock()  # [PHASE2 FIX]
    mock_redis.enqueue_job = AsyncMock(  # [PHASE2 FIX]
        side_effect=RuntimeError("Redis connection dropped")  # [PHASE2 FIX]
    )  # [PHASE2 FIX]

    with (  # [PHASE2 FIX]
        patch(
            "workers.tasks._claim_document", new_callable=AsyncMock, return_value=True
        ),  # [PHASE2 FIX]
        patch("workers.tasks._update_document_status", new_callable=AsyncMock),  # [PHASE2 FIX]
        patch(  # [LEFTOVER FIX]
            "workers.tasks.storage_engine.get_object_size",  # [LEFTOVER FIX]
            new_callable=AsyncMock,  # [LEFTOVER FIX]
            return_value=1024,  # [LEFTOVER FIX]
        ),  # [LEFTOVER FIX]
        patch(
            "workers.tasks._get_document_meta", new_callable=AsyncMock, return_value=None
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.document_ingestion_engine.ingest_document_from_r2",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value=True,  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch(  # [PHASE2 FIX]
            "workers.tasks.get_image_status",  # [PHASE2 FIX]
            new_callable=AsyncMock,  # [PHASE2 FIX]
            return_value={"pending": 2},  # [PHASE2 FIX]
        ),  # [PHASE2 FIX]
        patch("workers.tasks.logger.error") as mock_log_err,  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        success = await ingest_document_job(  # [PHASE2 FIX]
            {"redis": mock_redis},
            doc_id,
            "mock.pdf",  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        assert success is True  # Phase 1 does not fail  # [PHASE2 FIX]
        assert any(  # [PHASE2 FIX]
            call.args[0] == "phase2_enqueue_failed"
            for call in mock_log_err.call_args_list  # [PHASE2 FIX]
        )  # [PHASE2 FIX]


def test_worker_settings_registers_describe_job():  # [QUEUE SPLIT]
    """(e) PictureWorkerSettings registers describe_document_images_job with timeout >= 3600 and max_tries=8."""  # [QUEUE SPLIT]
    from workers.settings import PictureWorkerSettings, WorkerSettings  # [QUEUE SPLIT]

    # Main worker settings does NOT list picture job [QUEUE SPLIT]
    main_job_names = [  # [QUEUE SPLIT]
        getattr(f, "name", getattr(f, "__name__", str(f)))  # [QUEUE SPLIT]
        for f in WorkerSettings.functions  # [QUEUE SPLIT]
    ]  # [QUEUE SPLIT]
    assert "describe_document_images_job" not in main_job_names  # [QUEUE SPLIT]

    # Picture worker settings lists only describe_document_images_job [QUEUE SPLIT]
    pic_job_names = [  # [QUEUE SPLIT]
        getattr(f, "name", getattr(f, "__name__", str(f)))  # [QUEUE SPLIT]
        for f in PictureWorkerSettings.functions  # [QUEUE SPLIT]
    ]  # [QUEUE SPLIT]
    assert "describe_document_images_job" in pic_job_names  # [QUEUE SPLIT]
    assert len(pic_job_names) == 1  # [QUEUE SPLIT]

    for f in PictureWorkerSettings.functions:  # [QUEUE SPLIT]
        if getattr(f, "name", None) == "describe_document_images_job":  # [QUEUE SPLIT]
            assert getattr(f, "timeout_s", 0) >= 3600  # [QUEUE SPLIT]
            assert getattr(f, "max_tries", 0) == 8  # [QUEUE SPLIT]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_rerunning_phase1_deletes_existing_document_images(monkeypatch):  # [PHASE2 FIX]
    """(f) re-running phase 1 on a document that already has document_images rows replaces them."""  # [PHASE2 FIX]
    pdf_bytes = _create_test_pdf_with_image()  # [PHASE2 FIX]
    doc_id = str(uuid.uuid4())  # [PHASE2 FIX]
    mock_db = MockDBConnection()  # [PHASE2 FIX]

    async def mock_connect(*args, **kwargs):  # [PHASE2 FIX]
        return mock_db  # [PHASE2 FIX]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [PHASE2 FIX]
    monkeypatch.setattr(  # [PHASE2 FIX]
        settings,
        "DATABASE_URL",
        "postgresql://mock:mock@localhost/mock",  # [PHASE2 FIX]
    )  # [PHASE2 FIX]
    monkeypatch.setattr(  # [PHASE2 FIX]
        "app.engines.ingestion.storage_engine.download_bytes",  # [PHASE2 FIX]
        AsyncMock(return_value=pdf_bytes),  # [PHASE2 FIX]
    )  # [PHASE2 FIX]

    success = await document_ingestion_engine.ingest_document_from_r2(  # [PHASE2 FIX]
        doc_id,
        "mock.pdf",  # [PHASE2 FIX]
    )  # [PHASE2 FIX]
    assert success is True  # [PHASE2 FIX]

    # Verify DELETE FROM public.document_images was executed inside transaction
    delete_calls = [  # [PHASE2 FIX]
        args  # [PHASE2 FIX]
        for q, args in mock_db.execute_calls  # [PHASE2 FIX]
        if "DELETE FROM public.document_images WHERE document_id = $1" in q  # [PHASE2 FIX]
    ]  # [PHASE2 FIX]
    assert len(delete_calls) == 1  # [PHASE2 FIX]
    assert delete_calls[0][0] == uuid.UUID(doc_id)  # [PHASE2 FIX]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_max_tokens_escalation(monkeypatch):  # [PHASE2 FIX]
    """(g) MAX_TOKENS escalates to 4096 then 8192."""  # [PHASE2 FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [PHASE2 FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-key")  # [PHASE2 FIX]
    token_limits_seen = []  # [PHASE2 FIX]

    def mock_resp(max_tok):  # [PHASE2 FIX]
        cand = MagicMock()  # [PHASE2 FIX]
        cand.finish_reason = "MAX_TOKENS"  # [PHASE2 FIX]
        resp = MagicMock()  # [PHASE2 FIX]
        resp.candidates = [cand]  # [PHASE2 FIX]
        resp.prompt_feedback = None  # [PHASE2 FIX]
        resp.usage_metadata = MagicMock(  # [PHASE2 FIX]
            prompt_token_count=100,  # [PHASE2 FIX]
            candidates_token_count=max_tok,  # [PHASE2 FIX]
            thoughts_token_count=200,  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        resp.text = ""  # [PHASE2 FIX]
        return resp  # [PHASE2 FIX]

    async def mock_generate_content(*args, **kwargs):  # [PHASE2 FIX]
        config = kwargs.get("config")  # [PHASE2 FIX]
        max_tok = getattr(config, "max_output_tokens", None)  # [PHASE2 FIX]
        token_limits_seen.append(max_tok)  # [PHASE2 FIX]
        return mock_resp(max_tok)  # [PHASE2 FIX]

    mock_client = MagicMock()  # [PHASE2 FIX]
    mock_client.aio.models.generate_content = mock_generate_content  # [PHASE2 FIX]

    with (  # [PHASE2 FIX]
        patch("google.genai.Client", return_value=mock_client),  # [PHASE2 FIX]
        patch("asyncio.sleep", AsyncMock()),  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        route, content = await image_classifier.classify_and_process(  # [PHASE2 FIX]
            b"fake_image_bytes",
            page_number=1,  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        assert route is None  # [PHASE2 FIX]
        assert content == "empty:MAX_TOKENS"  # [PHASE2 FIX]
        assert token_limits_seen == [1024, 4096, 8192]  # [PHASE2 FIX]


@pytest.mark.asyncio  # [PHASE2 FIX]
async def test_safety_block_skipped_without_retry(monkeypatch):  # [PHASE2 FIX]
    """(h) a SAFETY block is skipped without retry and stores 'blocked:...'; stores in last_error."""  # [PHASE2 FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [PHASE2 FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-key")  # [PHASE2 FIX]
    call_count = 0  # [PHASE2 FIX]

    def mock_safety_resp():  # [PHASE2 FIX]
        nonlocal call_count  # [PHASE2 FIX]
        call_count += 1  # [PHASE2 FIX]
        cand = MagicMock()  # [PHASE2 FIX]
        cand.finish_reason = "SAFETY"  # [PHASE2 FIX]
        resp = MagicMock()  # [PHASE2 FIX]
        resp.candidates = [cand]  # [PHASE2 FIX]
        resp.prompt_feedback = MagicMock(block_reason="SAFETY")  # [PHASE2 FIX]
        resp.usage_metadata = MagicMock(  # [PHASE2 FIX]
            prompt_token_count=50,  # [PHASE2 FIX]
            candidates_token_count=0,  # [PHASE2 FIX]
            thoughts_token_count=0,  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        resp.text = ""  # [PHASE2 FIX]
        return resp  # [PHASE2 FIX]

    mock_client = MagicMock()  # [PHASE2 FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [PHASE2 FIX]
        side_effect=lambda *args, **kwargs: mock_safety_resp()  # [PHASE2 FIX]
    )  # [PHASE2 FIX]

    with (  # [PHASE2 FIX]
        patch("google.genai.Client", return_value=mock_client),  # [PHASE2 FIX]
        patch("asyncio.sleep", AsyncMock()) as mock_sleep,  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        route, content = await image_classifier.classify_and_process(  # [PHASE2 FIX]
            b"fake_image_bytes",
            page_number=1,  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        assert route is None  # [PHASE2 FIX]
        assert content == "blocked:SAFETY"  # [PHASE2 FIX]
        assert call_count == 1  # No retry!  # [PHASE2 FIX]
        mock_sleep.assert_not_called()  # [PHASE2 FIX]

    # Test that process_pending_images stores 'blocked:SAFETY' in last_error
    pdf_bytes = _create_test_pdf_with_image()  # [PHASE2 FIX]
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [PHASE2 FIX]
    raw_img = doc.extract_image(doc[0].get_image_info(xrefs=True)[0]["xref"])[
        "image"
    ]  # [PHASE2 FIX]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [PHASE2 FIX]
    doc.close()  # [PHASE2 FIX]

    doc_id = str(uuid.uuid4())  # [PHASE2 FIX]
    row_id = uuid.uuid4()  # [PHASE2 FIX]
    pending_row = {  # [PHASE2 FIX]
        "id": row_id,  # [PHASE2 FIX]
        "page_number": 1,  # [PHASE2 FIX]
        "content_hash": content_hash,  # [PHASE2 FIX]
        "source": "embedded",  # [PHASE2 FIX]
        "width": 300,  # [PHASE2 FIX]
        "height": 300,  # [PHASE2 FIX]
        "status": "pending",  # [PHASE2 FIX]
        "attempts": 0,  # [PHASE2 FIX]
    }  # [PHASE2 FIX]
    mock_db = MockDBConnection(pending_rows=[pending_row])  # [PHASE2 FIX]

    async def mock_connect(*args, **kwargs):  # [PHASE2 FIX]
        return mock_db  # [PHASE2 FIX]

    monkeypatch.setattr("asyncpg.connect", mock_connect)  # [PHASE2 FIX]
    monkeypatch.setattr(  # [PHASE2 FIX]
        settings,
        "DATABASE_URL",
        "postgresql://mock:mock@localhost/mock",  # [PHASE2 FIX]
    )  # [PHASE2 FIX]
    monkeypatch.setattr(  # [PHASE2 FIX]
        "app.engines.ingestion.storage_engine.download_bytes",  # [PHASE2 FIX]
        AsyncMock(return_value=pdf_bytes),  # [PHASE2 FIX]
    )  # [PHASE2 FIX]

    with patch.object(  # [PHASE2 FIX]
        image_classifier,  # [PHASE2 FIX]
        "classify_and_process",  # [PHASE2 FIX]
        new_callable=AsyncMock,  # [PHASE2 FIX]
        return_value=(None, "blocked:SAFETY"),  # [PHASE2 FIX]
    ):  # [PHASE2 FIX]
        res = await document_ingestion_engine.process_pending_images(  # [PHASE2 FIX]
            doc_id,
            "mock.pdf",  # [PHASE2 FIX]
        )  # [PHASE2 FIX]
        assert res == "completed"  # [PHASE2 FIX]

    skipped_updates = [  # [PHASE2 FIX]
        args  # [PHASE2 FIX]
        for q, args in mock_db.execute_calls  # [PHASE2 FIX]
        if "status = 'skipped'" in q and "last_error = $2" in q  # [PHASE2 FIX]
    ]  # [PHASE2 FIX]
    assert len(skipped_updates) == 1  # [PHASE2 FIX]
    assert skipped_updates[0][1] == "blocked:SAFETY"  # [PHASE2 FIX]


@pytest.fixture(autouse=True)
def isolated_worker_outbox(monkeypatch):
    from unittest.mock import AsyncMock

    from workers import tasks

    monkeypatch.setattr(
        tasks, "record_job", AsyncMock(return_value="018f3a30-0001-7000-8000-000000000001")
    )
    monkeypatch.setattr(tasks, "finish_job", AsyncMock())
    monkeypatch.setattr(tasks, "_release_document_for_retry", AsyncMock())
