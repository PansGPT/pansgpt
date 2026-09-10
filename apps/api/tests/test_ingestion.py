# ==============================================================================
# Phase 5 Document Ingestion Engine Verification Suite
# ==============================================================================

import fitz  # PyMuPDF
import pytest

from app.engines.chunker import semantic_chunker
from app.engines.embedder import gemini_embedder
from app.engines.ingestion import document_ingestion_engine
from app.engines.storage import build_document_storage_key


def create_synthetic_test_pdf() -> bytes:
    """Helper to generate a clean, multi-page synthetic pharmacology lecture PDF."""
    doc = fitz.open()

    # Page 1: Native Text Page with Headings and Content
    page1 = doc.new_page(width=595, height=842)
    text_content = (
        "PHARMACOLOGY OF ADRENERGIC RECEPTORS\n\n"
        "Epinephrine and Norepinephrine are endogenous catecholamines acting on alpha and beta adrenoceptors.\n"
        "Alpha-1 receptors are predominantly located in vascular smooth muscle where activation causes vasoconstriction.\n"
        "Beta-1 receptors are predominantly located in cardiac tissue where activation increases heart rate and contractility.\n"
        "Beta-2 receptors are located in bronchial smooth muscle where activation causes bronchodilation.\n"
    )
    page1.insert_text((50, 50), text_content, fontsize=11)

    # Page 2: Second Topic Page with Long Paragraphs for Chunking
    page2 = doc.new_page(width=595, height=842)
    page2_text = (
        "CLINICAL INDICATIONS AND CONTRAINDICATIONS\n\n"
        "Anaphylactic shock requires immediate administration of intramuscular epinephrine at a dose of 0.3 to 0.5 mg.\n"
        "Beta-blockers such as propranolol are contraindicated in severe asthma due to risk of bronchospasm.\n"
        "Selective beta-1 blockers like atenolol and metoprolol have lower risk of bronchoconstriction at therapeutic doses.\n"
    )
    page2.insert_text((50, 50), page2_text, fontsize=11)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_storage_key_generation():
    """Verify canonical R2 path format."""
    uni_id = "018f3a10-0001-7000-8000-000000000001"
    doc_id = "018f3a30-0001-7000-8000-000000000001"
    key = build_document_storage_key(
        university_id=uni_id,
        course_code="PCL 401",
        document_id=doc_id,
        file_extension="pdf",
    )
    assert key == f"universities/{uni_id}/courses/pcl_401/original/{doc_id}.pdf"


def test_chunker_atomic_rules():
    """Verify tables and diagrams are NEVER split (1 element = 1 chunk)."""
    elements = [
        {
            "content_type": "table",
            "raw_content": "| Drug | Receptor | Indication |\n|---|---|---|\n| Epinephrine | Alpha/Beta | Anaphylaxis |",
            "page_number": 1,
            "segment_id": "seg-1",
            "element_id": "el-1",
        },
        {
            "content_type": "diagram",
            "raw_content": "[Visual Description: Diagram of G-protein coupled receptor activation cascade]",
            "page_number": 1,
            "segment_id": "seg-1",
            "element_id": "el-2",
        },
    ]
    chunks = semantic_chunker.create_chunks_for_elements(elements)
    assert len(chunks) == 2
    assert chunks[0].content_type == "table"
    assert chunks[0].content == elements[0]["raw_content"]
    assert chunks[1].content_type == "diagram"
    assert chunks[1].content == elements[1]["raw_content"]


def test_chunker_text_recursive_splitting():
    """Verify long text splits respect segment boundaries and max token lengths."""
    long_para = "This is a detailed pharmacological explanation of drug receptor kinetics. " * 60
    elements = [
        {
            "content_type": "text",
            "raw_content": long_para,
            "page_number": 2,
            "segment_id": "seg-2",
            "element_id": "el-3",
        }
    ]
    chunks = semantic_chunker.create_chunks_for_elements(elements)
    assert len(chunks) >= 2
    for c in chunks:
        assert c.content_type == "text"
        assert c.page_start == 2
        assert c.segment_id == "seg-2"
        # Each chunk should be within the max tokens bound
        assert semantic_chunker.count_tokens(c.content) <= 512


@pytest.mark.asyncio
async def test_embedder_vector_dimensions():
    """Verify gemini_embedder produces dense vectors with exactly 3072 dimensions."""
    test_texts = [
        "Pharmacokinetics and bioavailability of amoxicillin capsules.",
        "Mechanism of action of ACE inhibitors in essential hypertension.",
    ]
    vectors = await gemini_embedder.embed_batch(test_texts)
    assert len(vectors) == 2
    for vec in vectors:
        assert len(vec) == 3072
        assert isinstance(vec[0], float)


@pytest.mark.asyncio
async def test_upload_endpoint_generates_presigned_url(client):
    """Verify POST /api/v1/library/upload generates 201 Created and signed URL."""
    payload = {
        "title": "Adrenergic Pharmacology Lecture 1",
        "course_code": "PCL 401",
        "course_title": "Autonomic Nervous System Pharmacology",
        "topic": "Adrenergic Agonists",
        "lecturer_name": "Dr. O. Adeleke",
        "file_name": "pcl401_lecture1.pdf",
        "file_size_bytes": 1048576,
        "mime_type": "application/pdf",
        "target_levels": ["400"],
    }
    response = await client.post("/api/v1/library/upload", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "document_id" in data
    assert "storage_key" in data
    assert "presigned_upload_url" in data
    assert data["expires_in_seconds"] == 900
    assert "pcl_401" in data["storage_key"]


@pytest.mark.asyncio
async def test_pdf_stream_url_endpoint(client):
    """Verify GET /api/v1/library/{id}/pdf-url returns valid streaming URL."""
    test_id = "018f3a30-0001-7000-8000-000000000001"
    response = await client.get(f"/api/v1/library/{test_id}/pdf-url")
    assert response.status_code == 200
    data = response.json()
    assert data["document_id"] == test_id
    assert "presigned_url" in data
    assert data["expires_in_seconds"] == 900


@pytest.mark.asyncio
async def test_full_8stage_pipeline_execution():
    """
    End-to-End Test: Run synthetic PDF through all 8 stages of DocumentIngestionEngine.
    Confirms page layer detection, hierarchy creation, atomic chunking, and 3072d vector generation.
    """
    pdf_bytes = create_synthetic_test_pdf()
    doc_id = "018f3a30-0001-7000-8000-000000000099"

    result = await document_ingestion_engine.run_pipeline_on_bytes(
        pdf_bytes=pdf_bytes,
        document_id=doc_id,
    )

    # 1. Verify Pages (Stage 2 & 3)
    assert len(result.pages) == 2
    for page in result.pages:
        assert page["has_text_layer"] is True
        assert page["document_id"] == doc_id

    # 2. Verify Segments (Stage 7)
    assert len(result.segments) >= 1
    for seg in result.segments:
        assert seg["document_id"] == doc_id
        assert seg["title_source"] in ("explicit", "synthesized", "inherited")

    # 3. Verify Elements (Stage 3a / 4 / 5 / 6)
    assert len(result.elements) >= 2
    for el in result.elements:
        assert el["content_type"] in ("text", "table", "diagram")
        assert len(el["raw_content"]) > 0

    # 4. Verify Chunks & 3072d Vector Embeddings (Stage 8)
    assert len(result.chunks) >= 2
    for chunk in result.chunks:
        assert chunk["document_id"] == doc_id
        assert len(chunk["embedding"]) == 3072
        assert isinstance(chunk["chunk_index"], int)
