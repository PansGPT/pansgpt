# ==============================================================================
# Document Ingestion Engine Orchestrator (Phase 5 - 8-Stage Pipeline)
# ==============================================================================

from __future__ import annotations

import uuid
from collections.abc import Callable

import structlog

from app.core.config import settings
from app.engines.chunker import DocumentChunkItem, semantic_chunker
from app.engines.classifier import image_classifier
from app.engines.embedder import gemini_embedder
from app.engines.extractor import ExtractedPage, document_extractor
from app.engines.storage import storage_engine

logger = structlog.get_logger(__name__)


class IngestionPipelineResult:
    def __init__(
        self,
        document_id: str,
        pages: list[dict],
        segments: list[dict],
        elements: list[dict],
        chunks: list[dict],
    ):
        self.document_id = document_id
        self.pages = pages
        self.segments = segments
        self.elements = elements
        self.chunks = chunks


class DocumentIngestionEngine:
    """
    Executes the 8-stage document processing pipeline:
    1. Upload & Immutable R2 Storage (Retrieved via storage_engine)
    2. Per-Page Text Layer Check (fitz zero-cost check)
    3a. Native Text Extraction + Image Scan
    3b. Scanned Canvas Render (Image route)
    4. Universal Image Classifier (Text Scan / Diagram / Table)
    5. Text-Image Verbatim Transcription (Clinical Safety Rule)
    6. Dual-Path Table Extraction (Structural geometry vs Vision)
    7. Hierarchy & Segmentation (Single pass)
    8. Semantic Chunking & 3072d Vector Embeddings
    """

    async def run_pipeline_on_bytes(
        self,
        pdf_bytes: bytes,
        document_id: str,
        progress_callback: Callable | None = None,
    ) -> IngestionPipelineResult:
        """
        Runs the full 8-stage pipeline on in-memory PDF bytes.
        Pure processing logic used by both the background worker and automated test suite.
        """
        logger.info("ingestion_pipeline_started", document_id=document_id, size=len(pdf_bytes))

        # Stage 2 & 3: Extract pages, native text, tables, and images
        extracted_pages: list[ExtractedPage] = document_extractor.process_document(pdf_bytes)
        if progress_callback:
            await progress_callback(30)

        # Stage 7 Preparation: Simple initial hierarchy breakdown by heading or topic
        # Create default root segment if no explicit headings found
        segments: list[dict] = []
        default_seg_id = str(uuid.uuid4())
        segments.append(
            {
                "id": default_seg_id,
                "document_id": document_id,
                "title": "General Monograph Curriculum",
                "title_source": "synthesized",
                "start_page": 1,
                "end_page": len(extracted_pages) or 1,
                "order_index": 0,
            }
        )

        pages_records: list[dict] = []
        elements_records: list[dict] = []
        element_order = 0

        # Stage 4, 5, 6: Process elements across all pages
        for page in extracted_pages:
            pages_records.append(
                {
                    "document_id": document_id,
                    "page_number": page.page_number,
                    "has_text_layer": page.has_text_layer,
                }
            )

            # Check if page has explicit heading candidates to create new segment
            if page.native_text:
                lines = [line.strip() for line in page.native_text.split("\n") if line.strip()]
                # Check first 2 lines for uppercase title
                if lines and len(lines[0]) < 80 and (lines[0].isupper() or lines[0].istitle()):
                    heading_title = lines[0]
                    new_seg_id = str(uuid.uuid4())
                    segments.append(
                        {
                            "id": new_seg_id,
                            "document_id": document_id,
                            "title": heading_title,
                            "title_source": "explicit",
                            "start_page": page.page_number,
                            "end_page": len(extracted_pages),
                            "order_index": len(segments),
                        }
                    )
                    active_seg_id = new_seg_id
                else:
                    active_seg_id = segments[-1]["id"]

                # Native text element
                el_id = str(uuid.uuid4())
                elements_records.append(
                    {
                        "id": el_id,
                        "segment_id": active_seg_id,
                        "document_id": document_id,
                        "page_number": page.page_number,
                        "content_type": "text",
                        "extraction_method": "native",
                        "raw_content": page.native_text,
                        "order_index": element_order,
                    }
                )
                element_order += 1
            else:
                active_seg_id = segments[-1]["id"]

            # Stage 6 Native Tables
            for tab in page.tables:
                el_id = str(uuid.uuid4())
                elements_records.append(
                    {
                        "id": el_id,
                        "segment_id": active_seg_id,
                        "document_id": document_id,
                        "page_number": page.page_number,
                        "content_type": "table",
                        "extraction_method": "structural_table",
                        "raw_content": tab.markdown,
                        "table_data": {"headers": tab.headers, "rows": tab.rows},
                        "order_index": element_order,
                    }
                )
                element_order += 1

            # Stage 4 & 5: Embedded images or Scanned canvas
            images_to_process = list(page.embedded_images)
            if page.full_page_render:
                from app.engines.extractor import ExtractedImage

                images_to_process.append(
                    ExtractedImage(
                        page_number=page.page_number,
                        image_bytes=page.full_page_render,
                        format="png",
                    )
                )

            for img in images_to_process:
                route, processed_content = await image_classifier.classify_and_process(
                    img.image_bytes,
                    mime_type=f"image/{img.format}",
                )
                el_id = str(uuid.uuid4())
                method_map = {
                    "text_scan": "vision_transcription",
                    "diagram": "vision_description",
                    "table": "vision_table",
                }
                ctype_map = {
                    "text_scan": "text",
                    "diagram": "diagram",
                    "table": "table",
                }
                elements_records.append(
                    {
                        "id": el_id,
                        "segment_id": active_seg_id,
                        "document_id": document_id,
                        "page_number": page.page_number,
                        "content_type": ctype_map[route],
                        "extraction_method": method_map[route],
                        "raw_content": processed_content,
                        "order_index": element_order,
                    }
                )
                element_order += 1

        if progress_callback:
            await progress_callback(60)

        # Stage 8: Semantic Chunking (Atomic tables/diagrams + 512-tok text splits)
        chunk_items: list[DocumentChunkItem] = semantic_chunker.create_chunks_for_elements(
            elements_records
        )

        if progress_callback:
            await progress_callback(75)

        # Stage 8: Generate 3072d Dense Vector Embeddings via Gemini
        chunk_texts = [item.content for item in chunk_items]
        embeddings = await gemini_embedder.embed_batch(chunk_texts)

        final_chunks: list[dict] = []
        for idx, (item, vec) in enumerate(zip(chunk_items, embeddings)):
            final_chunks.append(
                {
                    "id": str(uuid.uuid4()),
                    "document_id": document_id,
                    "segment_id": item.segment_id,
                    "element_id": item.element_id,
                    "content": item.content,
                    "page_start": item.page_start,
                    "page_end": item.page_end,
                    "chunk_index": idx,
                    "embedding": vec,
                }
            )

        if progress_callback:
            await progress_callback(100)

        logger.info(
            "ingestion_pipeline_completed",
            document_id=document_id,
            pages_count=len(pages_records),
            elements_count=len(elements_records),
            chunks_count=len(final_chunks),
        )

        return IngestionPipelineResult(
            document_id=document_id,
            pages=pages_records,
            segments=segments,
            elements=elements_records,
            chunks=final_chunks,
        )

    async def ingest_document_from_r2(self, document_id: str, storage_key: str) -> bool:
        """
        Worker task entrypoint: Downloads PDF from R2, runs 8-stage pipeline,
        and saves results to Supabase PostgreSQL.
        """
        logger.info("fetching_document_from_r2", document_id=document_id, key=storage_key)
        pdf_bytes = await storage_engine.download_bytes(storage_key)

        result = await self.run_pipeline_on_bytes(pdf_bytes, document_id)

        # Save to database using asyncpg if configured
        if settings.DATABASE_URL:
            try:
                import asyncpg

                conn = await asyncpg.connect(
                    settings.DATABASE_URL, timeout=10.0, statement_cache_size=0
                )
                async with conn.transaction():
                    # 1. Insert pages
                    for p in result.pages:
                        await conn.execute(
                            """
                            INSERT INTO public.document_pages (document_id, page_number, has_text_layer)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (document_id, page_number) DO UPDATE
                            SET has_text_layer = EXCLUDED.has_text_layer;
                            """,
                            uuid.UUID(p["document_id"]),
                            p["page_number"],
                            p["has_text_layer"],
                        )

                    # 2. Insert segments
                    for s in result.segments:
                        await conn.execute(
                            """
                            INSERT INTO public.document_segments (id, document_id, title, title_source, start_page, end_page, order_index)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            uuid.UUID(s["id"]),
                            uuid.UUID(s["document_id"]),
                            s["title"],
                            s["title_source"],
                            s["start_page"],
                            s["end_page"],
                            s["order_index"],
                        )

                    # 3. Insert elements
                    for el in result.elements:
                        await conn.execute(
                            """
                            INSERT INTO public.document_elements (id, segment_id, document_id, page_number, content_type, extraction_method, raw_content, order_index)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            uuid.UUID(el["id"]),
                            uuid.UUID(el["segment_id"]) if el.get("segment_id") else None,
                            uuid.UUID(el["document_id"]),
                            el["page_number"],
                            el["content_type"],
                            el["extraction_method"],
                            el["raw_content"],
                            el["order_index"],
                        )

                    # 4. Insert chunks with vector(3072)
                    for c in result.chunks:
                        vec_str = "[" + ",".join(str(x) for x in c["embedding"]) + "]"
                        await conn.execute(
                            """
                            INSERT INTO public.document_chunks (id, document_id, segment_id, element_id, content, page_start, page_end, chunk_index, embedding)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            uuid.UUID(c["id"]),
                            uuid.UUID(c["document_id"]),
                            uuid.UUID(c["segment_id"]) if c.get("segment_id") else None,
                            uuid.UUID(c["element_id"]) if c.get("element_id") else None,
                            c["content"],
                            c["page_start"],
                            c["page_end"],
                            c["chunk_index"],
                            vec_str,
                        )

                    # 5. Mark document as completed
                    await conn.execute(
                        """
                        UPDATE public.documents
                        SET embedding_status = 'completed',
                            embedding_progress = 100,
                            total_chunks = $2,
                            page_count = $3,
                            updated_at = now()
                        WHERE id = $1;
                        """,
                        uuid.UUID(document_id),
                        len(result.chunks),
                        len(result.pages),
                    )

                await conn.close()
                return True
            except Exception as e:
                logger.error(
                    "database_ingestion_write_failed", error=str(e), document_id=document_id
                )
                raise e

        return True


document_ingestion_engine = DocumentIngestionEngine()
