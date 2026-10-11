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
    MAX_ASPECT_RATIO,  # [IMAGE FIX]
    MAX_IMAGES_PER_PAGE,  # [IMAGE FIX]
    MIN_IMAGE_SIDE,  # [IMAGE FIX]
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
        mock_doc1, mock_page1, 1, seen_hashes=seen_hashes, stats=stats  # [IMAGE FIX]
    )  # [IMAGE FIX]
    assert len(res1) == 1  # [IMAGE FIX]
    assert stats.images_sent == 1  # [IMAGE FIX]

    res2 = extractor.extract_embedded_images(  # [IMAGE FIX]
        mock_doc2, mock_page2, 2, seen_hashes=seen_hashes, stats=stats  # [IMAGE FIX]
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
