# ==============================================================================
# Document Ingestion Engine Orchestrator (Phase 5 - 8-Stage Pipeline)
# Multi-format, Batch Upsert Optimized, Intermediate Progress Telemetry
# ==============================================================================

from __future__ import annotations

import uuid
from collections.abc import Callable

import asyncpg
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
    2. Per-Page Text Layer Check (zero-cost check)
    3a. Native Text Extraction + Image Scan
    3b. Scanned Canvas Render (Image route with local OCR-first)
    4. Universal Image Classifier (Text Scan / Diagram / Table)
    5. Text-Image Verbatim Transcription (Clinical Safety Rule)
    6. Dual-Path Table Extraction (Structural geometry vs Vision)
    7. Hierarchy & Segmentation (Single pass with explicit/synthesized/inherited titles)
    8. Semantic Chunking & 3072d Vector Embeddings
    """

    async def run_pipeline_on_bytes(
        self,
        file_bytes: bytes,
        document_id: str,
        file_format: str = "pdf",
        progress_callback: Callable | None = None,
    ) -> IngestionPipelineResult:
        """
        Runs the full 8-stage pipeline on in-memory bytes.
        Pure processing logic used by both the background worker and automated test suite.
        """
        logger.info(
            "ingestion_pipeline_started",
            document_id=document_id,
            size=len(file_bytes),
            format=file_format,
        )

        # Stage 2 & 3: Extract pages, native text, tables, and images
        extracted_pages: list[ExtractedPage] = document_extractor.process_document(
            file_bytes, file_format=file_format
        )
        if progress_callback:
            await progress_callback(20)

        # Stage 7 Preparation: Hierarchy & Topic Segmentation
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
        active_seg_id = default_seg_id

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
                # Check first lines for uppercase / title-case heading
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
                    # Page continues existing topic -> ensure title_source = 'inherited' on continuation
                    if (
                        page.page_number > 1
                        and active_seg_id == default_seg_id
                        and len(segments) > 1
                    ):
                        cont_seg_id = str(uuid.uuid4())
                        segments.append(
                            {
                                "id": cont_seg_id,
                                "document_id": document_id,
                                "title": f"Continued: {segments[-1]['title']}",
                                "title_source": "inherited",
                                "start_page": page.page_number,
                                "end_page": len(extracted_pages),
                                "order_index": len(segments),
                            }
                        )
                        active_seg_id = cont_seg_id

                # Native text element
                el_id = str(uuid.uuid4())
                elements_records.append(
                    {
                        "id": el_id,
                        "segment_id": active_seg_id,
                        "document_id": document_id,
                        "page_number": page.page_number,
                        "content_type": "text",
                        "extraction_method": page.extraction_method,
                        "raw_content": page.native_text,
                        "order_index": element_order,
                    }
                )
                element_order += 1

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
                ctype = (
                    "text" if route == "text_scan" else ("table" if route == "table" else "diagram")
                )
                elements_records.append(
                    {
                        "id": el_id,
                        "segment_id": active_seg_id,
                        "document_id": document_id,
                        "page_number": img.page_number,
                        "content_type": ctype,
                        "extraction_method": method_map.get(route, "vision_description"),
                        "raw_content": processed_content,
                        "order_index": element_order,
                    }
                )
                element_order += 1

        if progress_callback:
            await progress_callback(40)

        # Stage 8: Semantic Chunking
        chunk_items: list[DocumentChunkItem] = semantic_chunker.create_chunks_for_elements(
            elements_records
        )
        if progress_callback:
            await progress_callback(60)

        # Stage 8 (cont.): Batch Gemini Embeddings
        texts_to_embed = [c.content for c in chunk_items]
        embeddings = await gemini_embedder.embed_batch(texts_to_embed, max_batch_size=32)

        chunks_records: list[dict] = []
        for idx, item in enumerate(chunk_items):
            vec = (
                embeddings[idx]
                if idx < len(embeddings)
                else gemini_embedder._generate_deterministic_vector(item.content)
            )
            chunks_records.append(
                {
                    "id": str(uuid.uuid4()),
                    "document_id": document_id,
                    "segment_id": item.segment_id,
                    "element_id": item.element_id,
                    "content": item.content,
                    "page_start": item.page_start,
                    "page_end": item.page_end,
                    "chunk_index": item.chunk_index,
                    "embedding": vec,
                }
            )

        if progress_callback:
            await progress_callback(80)

        logger.info(
            "ingestion_pipeline_completed",
            document_id=document_id,
            pages=len(pages_records),
            segments=len(segments),
            elements=len(elements_records),
            chunks=len(chunks_records),
        )

        return IngestionPipelineResult(
            document_id=document_id,
            pages=pages_records,
            segments=segments,
            elements=elements_records,
            chunks=chunks_records,
        )

    async def ingest_document_from_r2(self, document_id: str, storage_key: str) -> bool:
        """
        Pulls file bytes from R2, runs 8-stage pipeline, and writes to database
        using optimized batch upsert queries.
        """
        logger.info("ingest_r2_started", document_id=document_id, key=storage_key)

        file_bytes = await storage_engine.download_bytes(storage_key)
        if not file_bytes:
            raise FileNotFoundError(f"Storage key '{storage_key}' not found in R2 bucket.")

        # Detect format from extension
        ext = storage_key.rsplit(".", 1)[-1].lower() if "." in storage_key else "pdf"

        # Intermediate progress callback persisting to DB
        async def db_progress_callback(pct: int):
            if not settings.DATABASE_URL:
                return
            try:
                conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
                await conn.execute(
                    """
                    UPDATE public.documents
                    SET embedding_progress = $2, updated_at = now()
                    WHERE id = $1 AND embedding_status = 'processing';
                    """,
                    uuid.UUID(document_id),
                    pct,
                )
                await conn.close()
            except Exception:
                pass

        result = await self.run_pipeline_on_bytes(
            file_bytes=file_bytes,
            document_id=document_id,
            file_format=ext,
            progress_callback=db_progress_callback,
        )

        # ----------------------------------------------------------------------
        # Optimized Batch Upsert to Database (Roadmap 5.7)
        # ----------------------------------------------------------------------
        if settings.DATABASE_URL:
            try:
                conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
                async with conn.transaction():
                    # 1. Batch Insert Pages
                    if result.pages:
                        pages_args = [
                            (uuid.UUID(p["document_id"]), p["page_number"], p["has_text_layer"])
                            for p in result.pages
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_pages (document_id, page_number, has_text_layer)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (document_id, page_number) DO NOTHING;
                            """,
                            pages_args,
                        )

                    # 2. Batch Insert Segments
                    if result.segments:
                        segments_args = [
                            (
                                uuid.UUID(s["id"]),
                                uuid.UUID(s["document_id"]),
                                s["title"],
                                s["title_source"],
                                s["start_page"],
                                s["end_page"],
                                s["order_index"],
                            )
                            for s in result.segments
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_segments (id, document_id, title, title_source, start_page, end_page, order_index)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            segments_args,
                        )

                    # 3. Batch Insert Elements
                    if result.elements:
                        elements_args = [
                            (
                                uuid.UUID(el["id"]),
                                uuid.UUID(el["segment_id"]) if el.get("segment_id") else None,
                                uuid.UUID(el["document_id"]),
                                el["page_number"],
                                el["content_type"],
                                el["extraction_method"],
                                el["raw_content"],
                                el["order_index"],
                            )
                            for el in result.elements
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_elements (id, segment_id, document_id, page_number, content_type, extraction_method, raw_content, order_index)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            elements_args,
                        )

                    # 4. Batch Insert Chunks with vector(3072)
                    if result.chunks:
                        chunks_args = [
                            (
                                uuid.UUID(c["id"]),
                                uuid.UUID(c["document_id"]),
                                uuid.UUID(c["segment_id"]) if c.get("segment_id") else None,
                                uuid.UUID(c["element_id"]) if c.get("element_id") else None,
                                c["content"],
                                c["page_start"],
                                c["page_end"],
                                c["chunk_index"],
                                "[" + ",".join(str(x) for x in c["embedding"]) + "]",
                            )
                            for c in result.chunks
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_chunks (id, document_id, segment_id, element_id, content, page_start, page_end, chunk_index, embedding)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            chunks_args,
                        )

                    # 5. Mark document as completed with 100% progress
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
