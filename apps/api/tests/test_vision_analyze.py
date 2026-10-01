# ==============================================================================
# Unit & Integration Tests: Multimodal Vision Analysis Engine (Section 7)
# ==============================================================================

import base64

import pytest

from app.engines.tools import tool_engine
from app.engines.vision import (
    VisionAnalysisEngine,
    resolve_image_bytes,
    sniff_image_mime_type,
    vision_engine,
)

# Minimal 1x1 valid transparent PNG
TINY_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)

# Minimal 1x1 valid JPEG
TINY_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05"
    b"\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c"
    b" $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4"
    b"\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05"
    b"\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
)


@pytest.fixture(autouse=True)
def isolated_vision_keys(monkeypatch):
    """Isolate vision tests to deterministic mode without live cloud API calls."""
    monkeypatch.setattr(vision_engine, "gemini_key", None)
    monkeypatch.setattr(vision_engine, "openrouter_key", None)
    monkeypatch.setattr(vision_engine, "groq_key", None)


# ------------------------------------------------------------------------------
# 1. Byte Sniffing & Ingestion Tests
# ------------------------------------------------------------------------------
def test_sniff_image_mime_type():
    """Verify raw byte signature identification for standard image formats."""
    assert sniff_image_mime_type(TINY_PNG_BYTES) == "image/png"
    assert sniff_image_mime_type(TINY_JPEG_BYTES) == "image/jpeg"
    assert sniff_image_mime_type(b"GIF89a\x01\x00\x01\x00\x80\x00\x00") == "image/gif"
    assert sniff_image_mime_type(b"RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00") == "image/webp"
    assert sniff_image_mime_type(b"not an image file content") is None
    assert sniff_image_mime_type(b"short") is None


@pytest.mark.asyncio
async def test_resolve_image_bytes_base64_data_uri():
    """Verify base64 data URI decoding and hash calculation."""
    b64_str = base64.b64encode(TINY_PNG_BYTES).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"

    raw_bytes, mime, sha256_hex = await resolve_image_bytes(data_uri)
    assert raw_bytes == TINY_PNG_BYTES
    assert mime == "image/png"
    assert len(sha256_hex) == 64


@pytest.mark.asyncio
async def test_resolve_image_bytes_size_limit_rejection():
    """Verify files larger than 10MB ceiling are rejected."""
    # Create artificial 11MB header
    fake_large_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * (11 * 1024 * 1024)
    b64_large = base64.b64encode(fake_large_png).decode("utf-8")

    with pytest.raises(ValueError, match="exceeds maximum ceiling"):
        await resolve_image_bytes(f"data:image/png;base64,{b64_large}")


# ------------------------------------------------------------------------------
# 2. Visual Intent Classification Tests
# ------------------------------------------------------------------------------
def test_visual_intent_classification():
    """Verify prompt intent routes to specialized medical prompt instructions."""
    engine = VisionAnalysisEngine()

    cat1, inst1 = engine.classify_visual_intent(
        "Examine this liver biopsy H&E stain histology slide"
    )
    assert cat1 == "HISTOLOGY"
    assert "pathologist and histologist" in inst1

    cat2, inst2 = engine.classify_visual_intent(
        "What is the SMILES and pharmacophore structure of this molecule?"
    )
    assert cat2 == "CHEMICAL_STRUCTURE"
    assert "medicinal chemist" in inst2

    cat3, inst3 = engine.classify_visual_intent(
        "Estimate Cmax, AUC, and elimination half-life from this PK curve graph"
    )
    assert cat3 == "PHARMACOKINETIC_GRAPH"
    assert "pharmacometrician" in inst3

    cat4, inst4 = engine.classify_visual_intent(
        "Identify the anatomical nerve landmarks on this axial scan"
    )
    assert cat4 == "GROSS_ANATOMY"
    assert "anatomical" in inst4

    cat5, inst5 = engine.classify_visual_intent("Explain this pharmacy lecture diagram")
    assert cat5 == "GENERAL_PHARMACY"
    assert "clinical pharmacy" in inst5


# ------------------------------------------------------------------------------
# 3. Vision Analysis Engine Execution & Caching Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_vision_engine_offline_deterministic_fallback():
    """Verify deterministic fallback produces structured clinical report when offline."""
    b64_str = base64.b64encode(TINY_PNG_BYTES).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"

    res = await vision_engine.analyze(
        image_input=data_uri,
        prompt="Analyze this histological renal biopsy specimen",
        user_id="user-test-01",
    )
    assert res["status"] == "success"
    assert res["mime_type"] == "image/png"
    assert res["category"] == "HISTOLOGY"
    assert res["cached"] is False
    assert "Histopathological Analysis Report" in res["analysis"]


@pytest.mark.asyncio
async def test_vision_engine_sha256_result_caching():
    """Verify subsequent requests with identical image return cached results."""
    b64_str = base64.b64encode(TINY_JPEG_BYTES).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64_str}"

    res1 = await vision_engine.analyze(
        image_input=data_uri,
        prompt="Analyze pharmacokinetic drug plasma concentration graph",
    )
    assert res1["status"] == "success"
    assert res1["cached"] is False

    # Second call with identical payload
    res2 = await vision_engine.analyze(
        image_input=data_uri,
        prompt="Analyze pharmacokinetic drug plasma concentration graph",
    )
    assert res2["status"] == "success"
    assert res2["cached"] is True
    assert res2["sha256"] == res1["sha256"]


# ------------------------------------------------------------------------------
# 4. Tool Engine Dispatch Integration
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_tool_engine_dispatch_vision_analyze():
    """Verify tool_engine.dispatch_tool cleanly executes vision_analyze."""
    b64_str = base64.b64encode(TINY_PNG_BYTES).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"

    payload = await tool_engine.dispatch_tool(
        tool_name="vision_analyze",
        arguments={
            "image_key": data_uri,
            "prompt": "Evaluate chemical structure and SAR of this inhibitor",
        },
        user_id="user-123",
    )
    assert payload["status"] == "success"
    assert payload["category"] == "CHEMICAL_STRUCTURE"
    assert "Medicinal Chemistry" in payload["analysis"]
