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
