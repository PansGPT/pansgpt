# ==============================================================================
# Unit Tests for PDF Bounding Box Coordinates & Citations (Roadmap 6B.8)
# ==============================================================================

import fitz  # PyMuPDF

from app.engines.chunker import semantic_chunker
from app.engines.extractor import DocumentExtractor
from app.models.chat import BoundingBoxCoordinates, CitationItem


def test_bounding_box_coordinates_schema_validation():
    """Verify BoundingBoxCoordinates validates normalized rectangle geometry."""
    coords = BoundingBoxCoordinates(
        page=3,
        page_width=595.0,
        page_height=842.0,
        bbox=[0.10, 0.20, 0.90, 0.45],
        rects=[[0.10, 0.20, 0.90, 0.25], [0.10, 0.26, 0.85, 0.31]],
    )
    assert coords.page == 3
    assert len(coords.bbox) == 4
    assert all(0.0 <= c <= 1.0 for c in coords.bbox)
    assert len(coords.rects) == 2


def test_citation_item_accepts_typed_and_dict_bounding_box():
    """Verify CitationItem model accepts both typed BoundingBoxCoordinates and dict."""
    typed_coords = BoundingBoxCoordinates(page=1, bbox=[0.05, 0.05, 0.95, 0.95])
    citation1 = CitationItem(
        chunk_id="chunk-123",
        document_id="doc-456",
        snippet="Lisinopril is an ACE inhibitor...",
        bounding_box=typed_coords,
    )
    assert citation1.bounding_box.page == 1

    dict_coords = {"page": 2, "bbox": [0.1, 0.1, 0.8, 0.8]}
    citation2 = CitationItem(
        chunk_id="chunk-789",
        document_id="doc-456",
        snippet="Losartan is an ARB...",
        bounding_box=dict_coords,
    )
    assert (
        citation2.bounding_box.page
        if isinstance(citation2.bounding_box, BoundingBoxCoordinates)
        else citation2.bounding_box["page"]
    ) == 2


def test_pymupdf_normalized_bounding_box_extraction():
    """Verify DocumentExtractor extracts normalized bounding boxes from a generated PDF."""
    # Create an in-memory PDF with sample lecture text using PyMuPDF
    doc = fitz.open()
    page = doc.new_page(width=600, height=800)
    rect = fitz.Rect(50, 100, 550, 200)
    page.insert_textbox(
        rect, "Clinical Pharmacology: Pharmacokinetics of Digoxin and therapeutic range."
    )
    pdf_bytes = doc.tobytes()
    doc.close()

    extractor = DocumentExtractor()
    pages = extractor.process_pdf(pdf_bytes)

    assert len(pages) == 1
    p = pages[0]
    assert p.page_number == 1
    assert p.has_text_layer is True
    assert p.bounding_box is not None
    assert p.bounding_box["page"] == 1
    assert p.bounding_box["page_width"] == 600.0
    assert p.bounding_box["page_height"] == 800.0

    # Ensure coordinates are normalized between 0.0 and 1.0
    bbox = p.bounding_box["bbox"]
    assert len(bbox) == 4
    assert 0.0 <= bbox[0] <= 1.0
    assert 0.0 <= bbox[1] <= 1.0
    assert 0.0 <= bbox[2] <= 1.0
    assert 0.0 <= bbox[3] <= 1.0
    assert bbox[0] < bbox[2]  # x0 < x1
    assert bbox[1] < bbox[3]  # y0 < y1


def test_chunker_propagates_bounding_box():
    """Verify semantic chunker preserves bounding_box geometry on created chunks."""
    bbox_meta = {"page": 5, "bbox": [0.1, 0.2, 0.9, 0.6]}
    elements = [
        {
            "content_type": "text",
            "raw_content": "Beta-blockers reduce myocardial oxygen demand by lowering heart rate.",
            "page_number": 5,
            "bounding_box": bbox_meta,
        },
        {
            "content_type": "table",
            "raw_content": "| Drug | Class |\n|---|---|\n| Atenolol | Beta-1 selective |",
            "page_number": 5,
            "bounding_box": bbox_meta,
        },
    ]

    chunks = semantic_chunker.create_chunks_for_elements(elements)
    assert len(chunks) == 2
    for chunk in chunks:
        assert chunk.bounding_box == bbox_meta
