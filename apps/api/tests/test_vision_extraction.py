# ==============================================================================
# Unit Tests for Vision Extraction and Image Classification  # [IMAGE FIX]
# ==============================================================================

import asyncio  # [IMAGE FIX]
import io  # [IMAGE FIX]
from unittest.mock import AsyncMock, MagicMock, patch  # [IMAGE FIX]

import pytest  # [IMAGE FIX]
from PIL import Image  # [IMAGE FIX]

from app.core.config import settings  # [IMAGE FIX]
from app.engines.classifier import VisionError, image_classifier  # [IMAGE FIX]
from app.engines.extractor import (  # [IMAGE FIX]
    MAX_IMAGES_PER_PAGE,  # [IMAGE FIX]
    DocumentExtractor,  # [IMAGE FIX]
    ExtractionStats,  # [IMAGE FIX]
)  # [IMAGE FIX]


def _create_png(width: int, height: int, color=(100, 150, 200)) -> bytes:  # [IMAGE FIX]
    """Generate in-memory valid PNG image bytes."""  # [IMAGE FIX]
    img = Image.new("RGB", (width, height), color=color)  # [IMAGE FIX]
    buf = io.BytesIO()  # [IMAGE FIX]
    img.save(buf, format="PNG")  # [IMAGE FIX]
    return buf.getvalue()  # [IMAGE FIX]


def _make_mock_page(images_info: list[dict], image_payloads: dict[int, dict]):  # [IMAGE FIX]
    """Create mock PyMuPDF Page and Document objects."""  # [IMAGE FIX]
    mock_doc = MagicMock()  # [IMAGE FIX]

    def extract_image_side_effect(xref):  # [IMAGE FIX]
        return image_payloads.get(xref)  # [IMAGE FIX]

    mock_doc.extract_image.side_effect = extract_image_side_effect  # [IMAGE FIX]

    mock_page = MagicMock()  # [IMAGE FIX]
    mock_page.get_image_info.return_value = images_info  # [IMAGE FIX]
    mock_page.parent = mock_doc  # [IMAGE FIX]
    return mock_doc, mock_page  # [IMAGE FIX]


def test_extract_embedded_images_ignores_xref_zero():  # [IMAGE FIX]
    """(a) extract_embedded_images ignores xref=0."""  # [IMAGE FIX]
    extractor = DocumentExtractor()  # [IMAGE FIX]
    stats = ExtractionStats()  # [IMAGE FIX]
    mock_doc, mock_page = _make_mock_page(  # [IMAGE FIX]
        images_info=[{"xref": 0}, {"xref": None}],  # [IMAGE FIX]
        image_payloads={},  # [IMAGE FIX]
    )  # [IMAGE FIX]

    res = extractor.extract_embedded_images(mock_doc, mock_page, 1, stats=stats)  # [IMAGE FIX]
    assert len(res) == 0  # [IMAGE FIX]
    assert stats.images_seen_total == 2  # [IMAGE FIX]
    assert stats.filtered_out == 2  # [IMAGE FIX]
    assert stats.images_sent == 0  # [IMAGE FIX]


def test_extract_embedded_images_filters_small_size():  # [IMAGE FIX]
    """(b) filters width < 100 or height < 100."""  # [IMAGE FIX]
    extractor = DocumentExtractor()  # [IMAGE FIX]
    stats = ExtractionStats()  # [IMAGE FIX]
    png_small = _create_png(50, 50)  # [IMAGE FIX]
    mock_doc, mock_page = _make_mock_page(  # [IMAGE FIX]
        images_info=[{"xref": 10}],  # [IMAGE FIX]
        image_payloads={  # [IMAGE FIX]
            10: {"image": png_small, "ext": "png", "width": 50, "height": 50}  # [IMAGE FIX]
        },  # [IMAGE FIX]
    )  # [IMAGE FIX]

    res = extractor.extract_embedded_images(mock_doc, mock_page, 1, stats=stats)  # [IMAGE FIX]
    assert len(res) == 0  # [IMAGE FIX]
    assert stats.filtered_out == 1  # [IMAGE FIX]


def test_extract_embedded_images_filters_aspect_ratio():  # [IMAGE FIX]
    """(c) filters aspect ratio > 5 or < 0.2."""  # [IMAGE FIX]
    extractor = DocumentExtractor()  # [IMAGE FIX]
    stats = ExtractionStats()  # [IMAGE FIX]
    png_wide = _create_png(600, 100)  # aspect ratio 6.0 > 5  # [IMAGE FIX]
    png_tall = _create_png(100, 600)  # aspect ratio 0.166 < 0.2  # [IMAGE FIX]
    mock_doc, mock_page = _make_mock_page(  # [IMAGE FIX]
        images_info=[{"xref": 20}, {"xref": 21}],  # [IMAGE FIX]
        image_payloads={  # [IMAGE FIX]
            20: {"image": png_wide, "ext": "png", "width": 600, "height": 100},  # [IMAGE FIX]
            21: {"image": png_tall, "ext": "png", "width": 100, "height": 600},  # [IMAGE FIX]
        },  # [IMAGE FIX]
    )  # [IMAGE FIX]

    res = extractor.extract_embedded_images(mock_doc, mock_page, 1, stats=stats)  # [IMAGE FIX]
    assert len(res) == 0  # [IMAGE FIX]
    assert stats.filtered_out == 2  # [IMAGE FIX]


def test_extract_embedded_images_caps_max_images_per_page():  # [IMAGE FIX]
    """(d) caps at MAX_IMAGES_PER_PAGE = 3."""  # [IMAGE FIX]
    extractor = DocumentExtractor()  # [IMAGE FIX]
    stats = ExtractionStats()  # [IMAGE FIX]
    info = []  # [IMAGE FIX]
    payloads = {}  # [IMAGE FIX]
    for i in range(1, 6):  # 5 distinct valid images  # [IMAGE FIX]
        png_data = _create_png(200, 200, color=(i * 20, 100, 100))  # [IMAGE FIX]
        info.append({"xref": i})  # [IMAGE FIX]
        payloads[i] = {"image": png_data, "ext": "png", "width": 200, "height": 200}  # [IMAGE FIX]

    mock_doc, mock_page = _make_mock_page(images_info=info, image_payloads=payloads)  # [IMAGE FIX]
    res = extractor.extract_embedded_images(mock_doc, mock_page, 1, stats=stats)  # [IMAGE FIX]
    assert len(res) == MAX_IMAGES_PER_PAGE  # [IMAGE FIX]
    assert stats.images_sent == 3  # [IMAGE FIX]
    assert stats.capped_out == 2  # [IMAGE FIX]
    assert stats.images_seen_total == 5  # [IMAGE FIX]


def test_extract_embedded_images_deduplicates_by_md5():  # [IMAGE FIX]
    """(e) deduplicates identical images across pages by MD5."""  # [IMAGE FIX]
    extractor = DocumentExtractor()  # [IMAGE FIX]
    stats = ExtractionStats()  # [IMAGE FIX]
    seen_hashes: set[str] = set()  # [IMAGE FIX]

    png_identical = _create_png(300, 300, color=(50, 100, 150))  # [IMAGE FIX]
    mock_doc1, mock_page1 = _make_mock_page(  # [IMAGE FIX]
        images_info=[{"xref": 101}],  # [IMAGE FIX]
        image_payloads={  # [IMAGE FIX]
            101: {"image": png_identical, "ext": "png", "width": 300, "height": 300}  # [IMAGE FIX]
        },  # [IMAGE FIX]
    )  # [IMAGE FIX]
    mock_doc2, mock_page2 = _make_mock_page(  # [IMAGE FIX]
        images_info=[{"xref": 102}],  # [IMAGE FIX]
        image_payloads={  # [IMAGE FIX]
            102: {"image": png_identical, "ext": "png", "width": 300, "height": 300}  # [IMAGE FIX]
        },  # [IMAGE FIX]
    )  # [IMAGE FIX]

    res1 = extractor.extract_embedded_images(  # [IMAGE FIX]
        mock_doc1,
        mock_page1,
        1,
        seen_hashes=seen_hashes,
        stats=stats,  # [IMAGE FIX]
    )  # [IMAGE FIX]
    assert len(res1) == 1  # [IMAGE FIX]
    assert stats.images_sent == 1  # [IMAGE FIX]

    res2 = extractor.extract_embedded_images(  # [IMAGE FIX]
        mock_doc2,
        mock_page2,
        2,
        seen_hashes=seen_hashes,
        stats=stats,  # [IMAGE FIX]
    )  # [IMAGE FIX]
    assert len(res2) == 0  # [IMAGE FIX]
    assert stats.duplicates_skipped == 1  # [IMAGE FIX]
    assert stats.images_sent == 1  # [IMAGE FIX]


@pytest.mark.asyncio  # [IMAGE FIX]
async def test_classifier_fake_mode_returns_mock_description(monkeypatch):  # [IMAGE FIX]
    """(f) classifies with fake mode returns mock description."""  # [IMAGE FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", True)  # [IMAGE FIX]
    png_data = _create_png(150, 150)  # [IMAGE FIX]
    route, content = await image_classifier.classify_and_process(png_data)  # [IMAGE FIX]
    assert route == "diagram"  # [IMAGE FIX]
    assert "Mock pharmacology diagram" in content  # [IMAGE FIX]


@pytest.mark.asyncio  # [IMAGE FIX]
async def test_classifier_429_retries_and_raises_vision_error(monkeypatch):  # [IMAGE FIX]
    """(g) 429 retries with backoff and raises VisionError on exhaustion."""  # [IMAGE FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [IMAGE FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [IMAGE FIX]

    sleep_mock = AsyncMock()  # [IMAGE FIX]
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)  # [IMAGE FIX]

    mock_client = MagicMock()  # [IMAGE FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [IMAGE FIX]
        side_effect=Exception("429 RESOURCE_EXHAUSTED quota exceeded retry in 1s")  # [IMAGE FIX]
    )  # [IMAGE FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [IMAGE FIX]
        png_data = _create_png(150, 150)  # [IMAGE FIX]
        with pytest.raises(VisionError) as exc_info:  # [IMAGE FIX]
            await image_classifier.classify_and_process(png_data)  # [IMAGE FIX]
        assert "rate limit exhausted" in str(exc_info.value).lower()  # [IMAGE FIX]
        assert sleep_mock.call_count == 4  # 4 retries before 5th attempt exhausts  # [IMAGE FIX]


@pytest.mark.asyncio  # [IMAGE FIX]
async def test_classifier_400_logs_warning_and_returns_none(monkeypatch):  # [IMAGE FIX]
    """(h) 400 logs warning and returns (None, None)."""  # [IMAGE FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [IMAGE FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [IMAGE FIX]

    mock_client = MagicMock()  # [IMAGE FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [IMAGE FIX]
        side_effect=Exception("400 INVALID_ARGUMENT: unsupported image encoding")  # [IMAGE FIX]
    )  # [IMAGE FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [IMAGE FIX]
        png_data = _create_png(150, 150)  # [IMAGE FIX]
        route, content = await image_classifier.classify_and_process(png_data)  # [IMAGE FIX]
        assert route is None  # [IMAGE FIX]
        assert content is None  # [IMAGE FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_classifier_connection_error_retries_and_succeeds(monkeypatch):  # [VISION FIX]
    """(a) a DNS/connection error retries with the backoff list and then succeeds."""  # [VISION FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [VISION FIX]

    sleep_mock = AsyncMock()  # [VISION FIX]
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)  # [VISION FIX]

    success_resp = MagicMock()  # [VISION FIX]
    success_resp.text = (
        "CLASSIFICATION: DIAGRAM\n---CONTENT---\n[Visual Description: cell pathway]"  # [VISION FIX]
    )

    mock_client = MagicMock()  # [VISION FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [VISION FIX]
        side_effect=[  # [VISION FIX]
            OSError("getaddrinfo failed"),  # [VISION FIX]
            ConnectionError("Cannot connect to host"),  # [VISION FIX]
            success_resp,  # [VISION FIX]
        ]  # [VISION FIX]
    )  # [VISION FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [VISION FIX]
        png_data = _create_png(150, 150)  # [VISION FIX]
        route, content = await image_classifier.classify_and_process(
            png_data, page_number=1
        )  # [VISION FIX]
        assert route == "diagram"  # [VISION FIX]
        assert "cell pathway" in content  # [VISION FIX]
        assert sleep_mock.call_count == 2  # [VISION FIX]
        assert sleep_mock.call_args_list[0][0][0] == 5.0  # [VISION FIX]
        assert sleep_mock.call_args_list[1][0][0] == 10.0  # [VISION FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_classifier_five_connection_errors_raise_vision_error(monkeypatch):  # [VISION FIX]
    """(b) five connection errors raise VisionError and store nothing."""  # [VISION FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [VISION FIX]

    sleep_mock = AsyncMock()  # [VISION FIX]
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)  # [VISION FIX]

    mock_client = MagicMock()  # [VISION FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [VISION FIX]
        side_effect=ConnectionError("Cannot connect to host")  # [VISION FIX]
    )  # [VISION FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [VISION FIX]
        png_data = _create_png(150, 150)  # [VISION FIX]
        with pytest.raises(VisionError) as exc_info:  # [VISION FIX]
            await image_classifier.classify_and_process(png_data)  # [VISION FIX]
        assert "connection failed after 5 attempts" in str(exc_info.value).lower()  # [VISION FIX]
        assert sleep_mock.call_count == 4  # [VISION FIX]
        assert [call[0][0] for call in sleep_mock.call_args_list] == [
            5.0,
            10.0,
            20.0,
            40.0,
        ]  # [VISION FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_classifier_429_with_retry_delay_waits(monkeypatch):  # [VISION FIX]
    """(c) a 429 with retryDelay waits that long + 1s."""  # [VISION FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [VISION FIX]

    sleep_mock = AsyncMock()  # [VISION FIX]
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)  # [VISION FIX]

    success_resp = MagicMock()  # [VISION FIX]
    success_resp.text = (
        "CLASSIFICATION: TEXT_SCAN\n---CONTENT---\nTranscribed notes"  # [VISION FIX]
    )

    mock_client = MagicMock()  # [VISION FIX]
    mock_client.aio.models.generate_content = AsyncMock(  # [VISION FIX]
        side_effect=[  # [VISION FIX]
            Exception("429 RESOURCE_EXHAUSTED retryDelay: '15s'"),  # [VISION FIX]
            success_resp,  # [VISION FIX]
        ]  # [VISION FIX]
    )  # [VISION FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [VISION FIX]
        png_data = _create_png(150, 150)  # [VISION FIX]
        route, content = await image_classifier.classify_and_process(png_data)  # [VISION FIX]
        assert route == "text_scan"  # [VISION FIX]
        assert "Transcribed notes" in content  # [VISION FIX]
        assert sleep_mock.call_count == 1  # [VISION FIX]
        assert sleep_mock.call_args_list[0][0][0] == 16.0  # 15s + 1s  # [VISION FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_classifier_empty_output_retries_once_then_skips(monkeypatch):  # [VISION FIX]
    """(e) empty output retries once then skips with warning."""  # [VISION FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [VISION FIX]

    sleep_mock = AsyncMock()  # [VISION FIX]
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)  # [VISION FIX]

    empty_resp = MagicMock()  # [VISION FIX]
    empty_resp.text = ""  # [VISION FIX]

    mock_client = MagicMock()  # [VISION FIX]
    mock_client.aio.models.generate_content = AsyncMock(return_value=empty_resp)  # [VISION FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [VISION FIX]
        png_data = _create_png(150, 150)  # [VISION FIX]
        route, content = await image_classifier.classify_and_process(
            png_data, page_number=5
        )  # [VISION FIX]
        assert route is None  # [VISION FIX]
        assert content == "empty:UNKNOWN"  # [PHASE2 FIX]
        assert (
            mock_client.aio.models.generate_content.call_count == 2
        )  # initial + 1 retry  # [VISION FIX]


def test_table_empty_shell_dropped_real_kept():  # [VISION FIX]
    """(g) an empty-shell table is dropped and a real table is kept."""  # [VISION FIX]
    extractor = DocumentExtractor()  # [VISION FIX]

    # Mock empty shell table (< 4 alnum cells)
    mock_tab_shell = MagicMock()  # [VISION FIX]
    mock_tab_shell.extract.return_value = [  # [VISION FIX]
        ["", "•"],  # [VISION FIX]
        ["-", ""],  # [VISION FIX]
    ]  # [VISION FIX]
    mock_tab_shell.bbox = (10, 10, 100, 100)  # [VISION FIX]

    # Mock real table (>= 4 alnum cells)
    mock_tab_real = MagicMock()  # [VISION FIX]
    mock_tab_real.extract.return_value = [  # [VISION FIX]
        ["Drug", "Dose"],  # [VISION FIX]
        ["Amlodipine", "5mg"],  # [VISION FIX]
    ]  # [VISION FIX]
    mock_tab_real.bbox = (10, 110, 100, 200)  # [VISION FIX]

    mock_finder = MagicMock()  # [VISION FIX]
    mock_finder.tables = [mock_tab_shell, mock_tab_real]  # [VISION FIX]

    mock_page = MagicMock()  # [VISION FIX]
    mock_page.rect.width = 500.0  # [VISION FIX]
    mock_page.rect.height = 700.0  # [VISION FIX]
    mock_page.find_tables.return_value = mock_finder  # [VISION FIX]

    tables = extractor.extract_tables_from_page(mock_page, 1)  # [VISION FIX]
    assert len(tables) == 1  # [VISION FIX]
    assert tables[0].headers == ["Drug", "Dose"]  # [VISION FIX]
    assert "Amlodipine" in tables[0].markdown  # [VISION FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_classifier_thinking_off_and_model_passed(monkeypatch):  # [VISION FIX]
    """(h) the thinking-off setting is passed on the vision call."""  # [VISION FIX]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [VISION FIX]
    monkeypatch.setattr(settings, "GEMINI_VISION_MODEL", "gemma-4-26b-a4b-it")  # [VISION FIX]

    success_resp = MagicMock()  # [VISION FIX]
    success_resp.text = (
        "CLASSIFICATION: DIAGRAM\n---CONTENT---\n[Visual Description: ok]"  # [VISION FIX]
    )

    mock_client = MagicMock()  # [VISION FIX]
    mock_client.aio.models.generate_content = AsyncMock(return_value=success_resp)  # [VISION FIX]

    with patch("google.genai.Client", return_value=mock_client):  # [VISION FIX]
        png_data = _create_png(150, 150)  # [VISION FIX]
        await image_classifier.classify_and_process(png_data)  # [VISION FIX]

        call_args = mock_client.aio.models.generate_content.call_args  # [VISION FIX]
        assert call_args.kwargs["model"] == "gemma-4-26b-a4b-it"  # [VISION FIX]
        contents = call_args.kwargs["contents"]  # [VISION FIX]
        assert contents[1].startswith("/nothink\n")  # [VISION FIX]
        config = call_args.kwargs["config"]  # [VISION FIX]
        assert config.max_output_tokens == 1024  # [VISION FIX]


@pytest.mark.asyncio  # [VISION FIX]
async def test_end_of_run_summary_pages_without_chunks(monkeypatch):  # [VISION FIX]
    """(f) the end-of-run summary lists pages_without_chunks correctly."""  # [VISION FIX]
    from app.engines.extractor import ExtractedPage  # [VISION FIX]
    from app.engines.ingestion import document_ingestion_engine  # [VISION FIX]

    monkeypatch.setattr(settings, "VISION_FAKE_MODE", True)  # [VISION FIX]

    # 3 pages: page 1 and page 2 have text, page 3 has no text and no images
    page1 = ExtractedPage(
        page_number=1, has_text_layer=True, native_text="Page 1 text content"
    )  # [VISION FIX]
    page2 = ExtractedPage(
        page_number=2, has_text_layer=True, native_text="Page 2 text content"
    )  # [VISION FIX]
    page3 = ExtractedPage(page_number=3, has_text_layer=False, native_text="")  # [VISION FIX]

    with (  # [VISION FIX]
        patch(
            "app.engines.extractor.document_extractor.process_document",
            return_value=[page1, page2, page3],
        ),  # [VISION FIX]
        patch(
            "app.engines.embedder.gemini_embedder.embed_batch",
            return_value=[[0.1] * 1536, [0.2] * 1536],
        ),  # [VISION FIX]
    ):  # [VISION FIX]
        res = await document_ingestion_engine.run_pipeline_on_bytes(
            b"dummy", "doc-123", file_format="pdf"
        )  # [VISION FIX]
        assert len(res.chunks) > 0  # [VISION FIX]
        chunk_pages = {c["page_start"] for c in res.chunks}  # [VISION FIX]
        assert 3 not in chunk_pages  # Page 3 produced no chunks  # [VISION FIX]


def test_no_text_cutoff_scenarios():  # [IMAGES PHASE]
    """# [IMAGES PHASE]
    Tests for Step 4 no-text cutoff:  # [IMAGES PHASE]
    (a) 17 alnum chars + 800x400 image: native text kept, embedded image extracted, no full-page render.  # [IMAGES PHASE]
    (b) no text + scan image: full_page_render.  # [IMAGES PHASE]
    (c) 34 alnum chars + no image: native, nothing for vision.  # [IMAGES PHASE]
    """  # [IMAGES PHASE]
    import fitz  # [IMAGES PHASE]

    extractor = DocumentExtractor()  # [IMAGES PHASE]

    # Scenario (a): 17 alnum chars + 800x400 image  # [IMAGES PHASE]
    doc_a = fitz.open()  # [IMAGES PHASE]
    page_a = doc_a.new_page(width=800, height=600)  # [IMAGES PHASE]
    page_a.insert_text(fitz.Point(50, 50), "12345678901234567")  # 17 alnum chars  # [IMAGES PHASE]
    img_a_bytes = _create_png(800, 400)  # [IMAGES PHASE]
    page_a.insert_image(fitz.Rect(50, 100, 450, 300), stream=img_a_bytes)  # [IMAGES PHASE]
    pages_a = extractor.process_pdf(doc_a.tobytes())  # [IMAGES PHASE]
    doc_a.close()  # [IMAGES PHASE]

    assert len(pages_a) == 1  # [IMAGES PHASE]
    p_a = pages_a[0]  # [IMAGES PHASE]
    assert p_a.has_text_layer is True  # [IMAGES PHASE]
    assert p_a.extraction_method == "native"  # [IMAGES PHASE]
    assert "12345678901234567" in p_a.native_text  # [IMAGES PHASE]
    assert len(p_a.embedded_images) == 1  # [IMAGES PHASE]
    assert p_a.embedded_images[0].width == 800  # [IMAGES PHASE]
    assert p_a.embedded_images[0].height == 400  # [IMAGES PHASE]
    assert p_a.full_page_render is None  # [IMAGES PHASE]

    # Scenario (b): no text + scan image -> full_page_render  # [IMAGES PHASE]
    doc_b = fitz.open()  # [IMAGES PHASE]
    page_b = doc_b.new_page(width=800, height=600)  # [IMAGES PHASE]
    page_b.insert_image(fitz.Rect(0, 0, 800, 600), stream=img_a_bytes)  # [IMAGES PHASE]
    pages_b = extractor.process_pdf(doc_b.tobytes())  # [IMAGES PHASE]
    doc_b.close()  # [IMAGES PHASE]

    assert len(pages_b) == 1  # [IMAGES PHASE]
    p_b = pages_b[0]  # [IMAGES PHASE]
    assert p_b.has_text_layer is False  # [IMAGES PHASE]
    assert p_b.extraction_method == "scanned_canvas"  # [IMAGES PHASE]
    assert p_b.native_text == ""  # [IMAGES PHASE]
    assert len(p_b.embedded_images) == 0  # [IMAGES PHASE]
    assert p_b.full_page_render is not None  # [IMAGES PHASE]

    # Scenario (c): 34 alnum chars + no image -> native, nothing for vision  # [IMAGES PHASE]
    doc_c = fitz.open()  # [IMAGES PHASE]
    page_c = doc_c.new_page(width=800, height=600)  # [IMAGES PHASE]
    text_34 = "abcdefghijklmnopqrstuvwxyz12345678"  # 34 alnum chars  # [IMAGES PHASE]
    page_c.insert_text(fitz.Point(50, 50), text_34)  # [IMAGES PHASE]
    pages_c = extractor.process_pdf(doc_c.tobytes())  # [IMAGES PHASE]
    doc_c.close()  # [IMAGES PHASE]

    assert len(pages_c) == 1  # [IMAGES PHASE]
    p_c = pages_c[0]  # [IMAGES PHASE]
    assert p_c.has_text_layer is True  # [IMAGES PHASE]
    assert p_c.extraction_method == "native"  # [IMAGES PHASE]
    assert text_34 in p_c.native_text  # [IMAGES PHASE]
    assert len(p_c.embedded_images) == 0  # [IMAGES PHASE]
    assert p_c.full_page_render is None  # [IMAGES PHASE]


def test_ocr_failure_caching():  # [IMAGES PHASE]
    """Local OCR failure is cached at class level so it is not retried repeatedly."""  # [IMAGES PHASE]
    import fitz  # [IMAGES PHASE]

    doc = fitz.open()  # [IMAGES PHASE]
    page = doc.new_page(width=400, height=400)  # [IMAGES PHASE]
    extractor = DocumentExtractor()  # [IMAGES PHASE]

    DocumentExtractor._ocr_available = None  # Reset cache  # [IMAGES PHASE]
    with patch.object(
        page, "get_textpage_ocr", side_effect=RuntimeError("Tesseract not found")
    ) as mock_ocr:  # [IMAGES PHASE]
        has_text, method, _ = extractor.check_page_text_layer(page)  # [IMAGES PHASE]
        assert has_text is False  # [IMAGES PHASE]
        assert method == "scanned_canvas"  # [IMAGES PHASE]
        assert DocumentExtractor._ocr_available is False  # [IMAGES PHASE]
        assert mock_ocr.call_count == 1  # [IMAGES PHASE]

        # Call again on next page - should NOT retry get_textpage_ocr  # [IMAGES PHASE]
        has_text2, method2, _ = extractor.check_page_text_layer(page)  # [IMAGES PHASE]
        assert has_text2 is False  # [IMAGES PHASE]
        assert method2 == "scanned_canvas"  # [IMAGES PHASE]
        assert mock_ocr.call_count == 1  # Still 1, call skipped  # [IMAGES PHASE]
    doc.close()  # [IMAGES PHASE]
