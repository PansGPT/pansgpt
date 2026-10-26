# ==============================================================================
# Document Ingestion Engine Orchestrator (Phase 5 - 8-Stage Pipeline)
# Multi-format, Batch Upsert Optimized, Intermediate Progress Telemetry
# ==============================================================================

from __future__ import annotations

import asyncio  # [IMAGE FIX]
import hashlib  # [IMAGES PHASE]
import io  # [IMAGES PHASE]
import json
import time  # [IMAGE FIX]
import uuid
from collections.abc import Callable
from typing import Any  # [NUL FIX]

import asyncpg
import fitz  # [IMAGES PHASE]
import structlog

from app.core.config import settings
from app.core.ids import uuid7  # [LEFTOVER FIX]
from app.engines.chunker import DocumentChunkItem, semantic_chunker
from app.engines.classifier import image_classifier
from app.engines.embedder import gemini_embedder
from app.engines.extractor import ExtractedPage, document_extractor
from app.engines.storage import storage_engine

logger = structlog.get_logger(__name__)

VISION_REQUEST_THROTTLE_SECONDS: float = 2.1  # [IMAGE FIX]


def _sanitize_for_db(value: Any) -> Any:  # [NUL FIX]
    """Recursively strip NUL (0x00) bytes and escaped \\u0000 sequences from strings and collections."""  # [NUL FIX]
    if isinstance(value, str):  # [NUL FIX]
        return value.replace("\x00", "").replace("\\u0000", "").replace("\\U0000", "")  # [NUL FIX]
    elif isinstance(value, dict):  # [NUL FIX]
        return {_sanitize_for_db(k): _sanitize_for_db(v) for k, v in value.items()}  # [NUL FIX]
    elif isinstance(value, list):  # [NUL FIX]
        return [_sanitize_for_db(item) for item in value]  # [NUL FIX]
    elif isinstance(value, tuple):  # [NUL FIX]
        return tuple(_sanitize_for_db(item) for item in value)  # [NUL FIX]
    return value  # [NUL FIX]


class IngestionPipelineResult:
    def __init__(
        self,
        document_id: str,
        pages: list[dict],
        segments: list[dict],
        elements: list[dict],
        chunks: list[dict],
        images: list[dict] | None = None,  # [IMAGES PHASE]
    ) -> None:
        self.document_id = document_id
        self.pages = pages
        self.segments = segments
        self.elements = elements
        self.chunks = chunks
        self.images = images or []  # [IMAGES PHASE]


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
    8. Semantic Chunking & 1536d Vector Embeddings  # [DIM 1536]
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
        extracted_pages: list[ExtractedPage] = await asyncio.to_thread(
            document_extractor.process_document, file_bytes, file_format=file_format
        )
        total_images = sum(  # [IMAGE FIX]
            len(p.embedded_images) + (1 if p.full_page_render else 0)  # [IMAGE FIX]
            for p in extracted_pages  # [IMAGE FIX]
        )  # [IMAGE FIX]
        if progress_callback:  # [IMAGES PHASE]
            await progress_callback(10)  # [IMAGES PHASE]
            await progress_callback(20)  # [IMAGES PHASE]

        logger.info(  # [IMAGE FIX]
            "vision_images_queued",  # [IMAGE FIX]
            count=total_images,  # [IMAGE FIX]
            document_id=document_id,  # [IMAGE FIX]
        )  # [IMAGE FIX]
        phase1_start_time = time.monotonic()  # [IMAGES PHASE]

        # Stage 7 Preparation: Hierarchy & Topic Segmentation
        segments: list[dict] = []
        default_seg_id = str(uuid7())  # [LEFTOVER FIX]
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
        pending_images: list[dict] = []  # [IMAGES PHASE]
        seen_img_hashes: set[str] = set()  # [IMAGES PHASE]

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
                    segments[-1]["end_page"] = max(segments[-1]["start_page"], page.page_number - 1)
                    heading_title = lines[0]
                    new_seg_id = str(uuid7())  # [LEFTOVER FIX]
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
                    pass  # Continue the current segment; its heading is inherited.

                # Native text element
                el_id = str(uuid7())  # [LEFTOVER FIX]
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
                        "bounding_box": page.bounding_box,
                    }
                )
                element_order += 1

            # Stage 6 Native Tables
            for tab in page.tables:
                el_id = str(uuid7())  # [LEFTOVER FIX]
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
                        "bounding_box": tab.bounding_box,
                    }
                )
                element_order += 1

            # Stage 4 & 5: Embedded images or Scanned canvas queued for Phase 2 [IMAGES PHASE]
            for img in page.embedded_images:  # [IMAGES PHASE]
                img_hash = hashlib.md5(img.image_bytes).hexdigest()  # [IMAGES PHASE]
                if img_hash in seen_img_hashes:  # [IMAGES PHASE]
                    continue  # [IMAGES PHASE]
                seen_img_hashes.add(img_hash)  # [IMAGES PHASE]
                pending_images.append(  # [IMAGES PHASE]
                    {  # [IMAGES PHASE]
                        "document_id": document_id,  # [IMAGES PHASE]
                        "page_number": img.page_number,  # [IMAGES PHASE]
                        "content_hash": img_hash,  # [IMAGES PHASE]
                        "source": "embedded",  # [IMAGES PHASE]
                        "width": img.width,  # [IMAGES PHASE]
                        "height": img.height,  # [IMAGES PHASE]
                        "status": "pending",  # [IMAGES PHASE]
                    }  # [IMAGES PHASE]
                )  # [IMAGES PHASE]

            if page.full_page_render:  # [IMAGES PHASE]
                render_hash = hashlib.md5(page.full_page_render).hexdigest()  # [IMAGES PHASE]
                if render_hash not in seen_img_hashes:  # [IMAGES PHASE]
                    seen_img_hashes.add(render_hash)  # [IMAGES PHASE]
                    w = (
                        int(page.page_width * 150 / 72) if page.page_width > 0 else 1200
                    )  # [IMAGES PHASE]
                    h = (
                        int(page.page_height * 150 / 72) if page.page_height > 0 else 1600
                    )  # [IMAGES PHASE]
                    try:  # [IMAGES PHASE]
                        from PIL import Image  # [IMAGES PHASE]

                        pil_img = Image.open(io.BytesIO(page.full_page_render))  # [IMAGES PHASE]
                        w, h = pil_img.width, pil_img.height  # [IMAGES PHASE]
                    except Exception:  # [IMAGES PHASE]
                        pass  # [IMAGES PHASE]
                    pending_images.append(  # [IMAGES PHASE]
                        {  # [IMAGES PHASE]
                            "document_id": document_id,  # [IMAGES PHASE]
                            "page_number": page.page_number,  # [IMAGES PHASE]
                            "content_hash": render_hash,  # [IMAGES PHASE]
                            "source": "full_page",  # [IMAGES PHASE]
                            "width": w,  # [IMAGES PHASE]
                            "height": h,  # [IMAGES PHASE]
                            "status": "pending",  # [IMAGES PHASE]
                        }  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]

        if progress_callback:  # [IMAGES PHASE]
            await progress_callback(40)  # [IMAGES PHASE]

        # Stage 8: Semantic Chunking [IMAGES PHASE]
        chunk_items: list[DocumentChunkItem] = semantic_chunker.create_chunks_for_elements(
            elements_records
        )
        if progress_callback:
            await progress_callback(60)

        # Stage 8 (cont.): Batch Gemini Embeddings  # [EMBED FIX]
        chunks_records: list[dict] = []  # [EMBED FIX]
        if chunk_items:  # [IMAGES PHASE]
            texts_to_embed = [c.content for c in chunk_items]  # [EMBED FIX]
            embeddings = await gemini_embedder.embed_batch(  # [EMBED FIX]
                texts_to_embed,
                kind="document",
                titles=None,
                max_batch_size=32,  # [EMBED FIX]
            )  # [EMBED FIX]
            if len(embeddings) != len(chunk_items):  # [EMBED FIX]
                raise ValueError(  # [EMBED FIX]
                    f"Embeddings count ({len(embeddings)}) does not match chunk count ({len(chunk_items)})"  # [EMBED FIX]
                )  # [EMBED FIX]

            for idx, item in enumerate(chunk_items):  # [EMBED FIX]
                vec = embeddings[idx]  # [EMBED FIX]
                chunks_records.append(  # [EMBED FIX]
                    {  # [EMBED FIX]
                        "id": str(uuid7()),  # [EMBED FIX] [LEFTOVER FIX]
                        "document_id": document_id,  # [EMBED FIX]
                        "segment_id": item.segment_id,  # [EMBED FIX]
                        "element_id": item.element_id,  # [EMBED FIX]
                        "content": item.content,  # [EMBED FIX]
                        "page_start": item.page_start,  # [EMBED FIX]
                        "page_end": item.page_end,  # [EMBED FIX]
                        "chunk_index": item.chunk_index,  # [EMBED FIX]
                        "embedding": vec,  # [EMBED FIX]
                        "bounding_box": item.bounding_box,  # [EMBED FIX]
                    }  # [EMBED FIX]
                )  # [EMBED FIX]

        if progress_callback:
            await progress_callback(80)

        # Stage 8 end: pages without chunks & summary logging (Step 3e)  # [VISION FIX]
        all_page_nums = [p.page_number for p in extracted_pages]  # [VISION FIX]
        pages_with_chunks = {  # [VISION FIX]
            p  # [VISION FIX]
            for c in chunks_records  # [VISION FIX]
            for p in range(c["page_start"], c["page_end"] + 1)  # [VISION FIX]
        }  # [VISION FIX]
        pages_without_chunks = [
            p for p in all_page_nums if p not in pages_with_chunks
        ]  # [VISION FIX]
        elapsed_seconds = round(time.monotonic() - phase1_start_time, 2)  # [IMAGES PHASE]

        logger.info(  # [IMAGES PHASE]
            "ingestion_end_of_run_summary",  # [IMAGES PHASE]
            document_id=document_id,  # [IMAGES PHASE]
            images_queued=len(pending_images),  # [IMAGES PHASE]
            elapsed_seconds=elapsed_seconds,  # [IMAGES PHASE]
            pages_without_chunks=pages_without_chunks,  # [IMAGES PHASE]
        )  # [IMAGES PHASE]

        logger.info(
            "ingestion_pipeline_completed",
            document_id=document_id,
            pages=len(pages_records),
            segments=len(segments),
            elements=len(elements_records),
            chunks=len(chunks_records),
            images=len(pending_images),  # [IMAGES PHASE]
        )

        return IngestionPipelineResult(
            document_id=document_id,
            pages=pages_records,
            segments=segments,
            elements=elements_records,
            chunks=chunks_records,
            images=pending_images,  # [IMAGES PHASE]
        )

    async def ingest_document_from_r2(
        self, document_id: str, storage_key: str, worker_id: uuid.UUID | None = None
    ) -> bool:
        """
        Pulls file bytes from R2, runs 8-stage pipeline, and writes to database
        using optimized batch upsert queries.
        """
        phase1_start_time = time.monotonic()  # [IMAGES PHASE]
        logger.info("ingest_r2_started", document_id=document_id, key=storage_key)

        file_bytes = await storage_engine.download_bytes(storage_key)
        if not file_bytes:
            raise FileNotFoundError(f"Storage key '{storage_key}' not found in R2 bucket.")

        # Detect format from extension
        ext = storage_key.rsplit(".", 1)[-1].lower() if "." in storage_key else "pdf"

        # Intermediate progress callback persisting to DB
        async def db_progress_callback(pct: int) -> None:
            if not settings.DATABASE_URL:
                return
            try:
                conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
                await conn.execute(
                    """
                    UPDATE public.documents
                    SET embedding_progress = $2, updated_at = now()
                    WHERE id = $1 AND embedding_status = 'processing'
                      AND ($3::uuid IS NULL OR ingestion_lock_id=$3);
                    """,
                    uuid.UUID(document_id),
                    pct,
                    worker_id,
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
        if not result.chunks and not result.images:
            raise ValueError("The document contains no searchable text, tables, or images.")

        # ----------------------------------------------------------------------
        # Optimized Batch Upsert to Database (Roadmap 5.7)
        # ----------------------------------------------------------------------
        if settings.DATABASE_URL:
            conn = None
            try:
                conn = await asyncpg.connect(settings.DATABASE_URL, statement_cache_size=0)
                async with conn.transaction():
                    if worker_id is not None:
                        owns_lease = await conn.fetchval(
                            "SELECT 1 FROM public.documents WHERE id=$1 AND ingestion_lock_id=$2 AND status='active' AND deleted_at IS NULL FOR UPDATE;",
                            uuid.UUID(document_id),
                            worker_id,
                        )
                        if not owns_lease:
                            raise RuntimeError("Ingestion lease was lost")
                    # Publish replacement content atomically. A failed transaction keeps the old index.
                    await conn.execute(
                        "DELETE FROM public.document_chunks WHERE document_id=$1;",
                        uuid.UUID(document_id),
                    )
                    await conn.execute(
                        "DELETE FROM public.document_elements WHERE document_id=$1;",
                        uuid.UUID(document_id),
                    )
                    await conn.execute(
                        "DELETE FROM public.document_segments WHERE document_id=$1;",
                        uuid.UUID(document_id),
                    )
                    await conn.execute(
                        "DELETE FROM public.document_pages WHERE document_id=$1;",
                        uuid.UUID(document_id),
                    )
                    # 0. Delete existing document_images for this document on re-run [PHASE2 FIX]
                    await conn.execute(  # [PHASE2 FIX]
                        "DELETE FROM public.document_images WHERE document_id = $1;",  # [PHASE2 FIX]
                        uuid.UUID(document_id),  # [PHASE2 FIX]
                    )  # [PHASE2 FIX]

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
                            _sanitize_for_db(pages_args),  # [NUL FIX]
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
                            _sanitize_for_db(segments_args),  # [NUL FIX]
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
                                json.dumps(_sanitize_for_db(el["bounding_box"]))
                                if el.get("bounding_box")
                                else None,  # [NUL FIX]
                            )
                            for el in result.elements
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_elements (id, segment_id, document_id, page_number, content_type, extraction_method, raw_content, order_index, bounding_box)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            _sanitize_for_db(elements_args),  # [NUL FIX]
                        )

                    # 4. Batch Insert Chunks with vector(1536) and bounding_box  # [DIM 1536]
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
                                json.dumps(_sanitize_for_db(c["bounding_box"]))
                                if c.get("bounding_box")
                                else None,  # [NUL FIX]
                            )
                            for c in result.chunks
                        ]
                        await conn.executemany(
                            """
                            INSERT INTO public.document_chunks (id, document_id, segment_id, element_id, content, page_start, page_end, chunk_index, embedding, bounding_box)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10::jsonb)
                            ON CONFLICT (id) DO NOTHING;
                            """,
                            _sanitize_for_db(chunks_args),  # [NUL FIX]
                        )

                    # 5. Batch Insert Pending Images into document_images [IMAGES PHASE]
                    if result.images:  # [IMAGES PHASE]
                        images_args = [  # [IMAGES PHASE]
                            (  # [IMAGES PHASE]
                                uuid.UUID(img["document_id"]),  # [IMAGES PHASE]
                                img["page_number"],  # [IMAGES PHASE]
                                img["content_hash"],  # [IMAGES PHASE]
                                img["source"],  # [IMAGES PHASE]
                                img["width"],  # [IMAGES PHASE]
                                img["height"],  # [IMAGES PHASE]
                                img["status"],  # [IMAGES PHASE]
                            )  # [IMAGES PHASE]
                            for img in result.images  # [IMAGES PHASE]
                        ]  # [IMAGES PHASE]
                        await conn.executemany(  # [IMAGES PHASE]
                            """
                            INSERT INTO public.document_images (document_id, page_number, content_hash, source, width, height, status)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                            ON CONFLICT (document_id, content_hash, source) DO NOTHING;
                            """,  # [IMAGES PHASE]
                            _sanitize_for_db(images_args),  # [IMAGES PHASE]
                        )  # [IMAGES PHASE]
                        await conn.execute(
                            "INSERT INTO public.background_jobs(document_id,job_name,storage_key) VALUES($1,'describe_document_images_job',$2) ON CONFLICT(document_id,job_name) DO UPDATE SET id=CASE WHEN background_jobs.status IN ('completed','failed') THEN public.uuid_generate_v7() ELSE background_jobs.id END, status='pending', storage_key=EXCLUDED.storage_key, updated_at=now();",
                            uuid.UUID(document_id),
                            storage_key,
                        )

                    # 6. Mark document status: completed (or processing at 50 if 0 chunks and images pending) [IMAGES PHASE]
                    if len(result.chunks) == 0 and len(result.images) > 0:  # [IMAGES PHASE]
                        doc_status = "processing"  # [IMAGES PHASE]
                        doc_progress = 50  # [IMAGES PHASE]
                    else:  # [IMAGES PHASE]
                        doc_status = "completed"  # [IMAGES PHASE]
                        doc_progress = 100  # [IMAGES PHASE]

                    await conn.execute(  # [IMAGES PHASE]
                        """
                        UPDATE public.documents
                        SET embedding_status = $2,
                            embedding_progress = $3,
                            total_chunks = $4,
                            page_count = $5,
                            updated_at = now()
                        WHERE id = $1;
                        """,  # [IMAGES PHASE]
                        uuid.UUID(document_id),  # [IMAGES PHASE]
                        doc_status,  # [IMAGES PHASE]
                        doc_progress,  # [IMAGES PHASE]
                        len(result.chunks),  # [IMAGES PHASE]
                        len(result.pages),  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]

                elapsed_phase1 = round(time.monotonic() - phase1_start_time, 2)  # [IMAGES PHASE]
                logger.info(  # [IMAGES PHASE]
                    "phase1_summary",  # [IMAGES PHASE]
                    document_id=document_id,  # [IMAGES PHASE]
                    chunks=len(result.chunks),  # [IMAGES PHASE]
                    pages=len(result.pages),  # [IMAGES PHASE]
                    images_pending=len(result.images),  # [IMAGES PHASE]
                    seconds=elapsed_phase1,  # [IMAGES PHASE]
                )  # [IMAGES PHASE]

                await conn.close()
                return True
            except Exception as e:
                logger.error(
                    "database_ingestion_write_failed", error=str(e), document_id=document_id
                )
                raise e

            finally:
                if conn is not None:
                    await conn.close()

        return True

    async def process_pending_images(  # [IMAGES PHASE]
        self,  # [IMAGES PHASE]
        document_id: str,  # [IMAGES PHASE]
        storage_key: str | None = None,  # [IMAGES PHASE]
        max_consecutive_failures: int = 3,  # [IMAGES PHASE]
    ) -> str:  # [IMAGES PHASE]
        """# [IMAGES PHASE]
        Phase 2: Resumable background processor for pending document images and scanned canvases.  # [IMAGES PHASE]
        Re-extracts images from the PDF in R2, classifies via throttled vision cascade,  # [IMAGES PHASE]
        and commits elements, chunks, and embeddings atomically per successful image.  # [IMAGES PHASE]
        Returns 'completed' if all pending rows are processed, or 'paused' after 3 consecutive failures.  # [IMAGES PHASE]
        """  # [IMAGES PHASE]
        phase2_start_time = time.monotonic()  # [IMAGES PHASE]
        logger.info(  # [IMAGES PHASE]
            "phase2_process_pending_images_started",  # [IMAGES PHASE]
            document_id=document_id,  # [IMAGES PHASE]
            key=storage_key,  # [IMAGES PHASE]
        )  # [IMAGES PHASE]
        if not settings.DATABASE_URL:  # [IMAGES PHASE]
            logger.warning("database_not_configured_for_process_pending_images")  # [IMAGES PHASE]
            return "completed"  # [IMAGES PHASE]

        conn = await asyncpg.connect(
            settings.DATABASE_URL, statement_cache_size=0
        )  # [IMAGES PHASE]
        try:  # [IMAGES PHASE]
            # Check if converted_key or storage_key should be used  # [IMAGES PHASE]
            doc_row = await conn.fetchrow(  # [IMAGES PHASE]
                "SELECT id, storage_key, converted_key, embedding_status, ingestion_lock_id FROM public.documents WHERE id = $1 AND status='active' AND deleted_at IS NULL;",
                uuid.UUID(document_id),  # [IMAGES PHASE]
            )  # [IMAGES PHASE]
            if doc_row is None:
                return "superseded"
            generation = doc_row.get("ingestion_lock_id")
            if not storage_key and doc_row:  # [IMAGES PHASE]
                storage_key = (
                    doc_row["converted_key"] or doc_row["storage_key"] or ""
                )  # [IMAGES PHASE]
            elif doc_row and doc_row["converted_key"]:  # [IMAGES PHASE]
                storage_key = doc_row["converted_key"]  # [IMAGES PHASE]

            # Re-open PDF from R2  # [IMAGES PHASE]
            pdf_bytes = await storage_engine.download_bytes(storage_key)  # [IMAGES PHASE]
            if not pdf_bytes:  # [IMAGES PHASE]
                logger.error(  # [IMAGES PHASE]
                    "phase2_pdf_download_failed",  # [IMAGES PHASE]
                    document_id=document_id,  # [IMAGES PHASE]
                    key=storage_key,  # [IMAGES PHASE]
                )  # [IMAGES PHASE]
                return "failed"  # [IMAGES PHASE]

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")  # [IMAGES PHASE]

            # Query rows in status 'pending' (and 'failed' with attempts < 5) in page order  # [IMAGES PHASE]
            rows = await conn.fetch(  # [IMAGES PHASE]
                """
                SELECT id, page_number, content_hash, source, width, height, status, attempts
                FROM public.document_images
                WHERE document_id = $1 AND (status = 'pending' OR (status = 'failed' AND attempts < 5))
                ORDER BY page_number ASC, created_at ASC;
                """,  # [IMAGES PHASE]
                uuid.UUID(document_id),  # [IMAGES PHASE]
            )  # [IMAGES PHASE]

            # Fetch existing segments for segment_id lookup  # [IMAGES PHASE]
            segments_records = await conn.fetch(  # [IMAGES PHASE]
                """
                SELECT id, start_page, end_page, order_index
                FROM public.document_segments
                WHERE document_id = $1
                ORDER BY start_page ASC, order_index ASC;
                """,  # [IMAGES PHASE]
                uuid.UUID(document_id),  # [IMAGES PHASE]
            )  # [IMAGES PHASE]

            def get_segment_id_for_page(p_num: int) -> uuid.UUID | None:  # [IMAGES PHASE]
                matching = [  # [IMAGES PHASE]
                    s
                    for s in segments_records
                    if s["start_page"] <= p_num <= s["end_page"]  # [IMAGES PHASE]
                ]  # [IMAGES PHASE]
                if matching:  # [IMAGES PHASE]
                    matching.sort(
                        key=lambda s: (s["start_page"], s["order_index"]), reverse=True
                    )  # [IMAGES PHASE]
                    return matching[0]["id"]  # [IMAGES PHASE]
                return segments_records[0]["id"] if segments_records else None  # [IMAGES PHASE]

            consecutive_failures = 0  # [IMAGES PHASE]

            async def _ensure_db() -> asyncpg.Connection:  # [PHASE2 FIX]
                nonlocal conn  # [PHASE2 FIX]
                is_alive = False  # [PHASE2 FIX]
                if conn is not None and not (  # [PHASE2 FIX]
                    callable(getattr(conn, "is_closed", None)) and conn.is_closed()  # [PHASE2 FIX]
                ):  # [PHASE2 FIX]
                    try:  # [PHASE2 FIX]
                        await asyncio.wait_for(
                            conn.fetchval("SELECT 1;"), timeout=3.0
                        )  # [PHASE2 FIX]
                        is_alive = True  # [PHASE2 FIX]
                    except Exception:  # [PHASE2 FIX]
                        try:  # [PHASE2 FIX]
                            await conn.close()  # [PHASE2 FIX]
                        except Exception:  # [PHASE2 FIX]
                            pass  # [PHASE2 FIX]
                        conn = None  # [PHASE2 FIX]
                if not is_alive or conn is None:  # [PHASE2 FIX]
                    conn = await asyncpg.connect(  # [PHASE2 FIX]
                        settings.DATABASE_URL,  # [PHASE2 FIX]
                        statement_cache_size=0,  # [PHASE2 FIX]
                    )  # [PHASE2 FIX]
                return conn  # [PHASE2 FIX]

            for row in rows:  # [IMAGES PHASE]
                row_id = row["id"]  # [IMAGES PHASE]
                page_num = row["page_number"]  # [IMAGES PHASE]
                source = row["source"]  # [IMAGES PHASE]
                content_hash = row["content_hash"]  # [IMAGES PHASE]
                image_bytes: bytes | None = None  # [IMAGES PHASE]
                img_format: str = "png"  # [IMAGES PHASE]

                # Re-extract image: match page_number plus content_hash; for full_page re-render  # [IMAGES PHASE]
                if source == "full_page":  # [IMAGES PHASE]
                    if 1 <= page_num <= len(doc):  # [IMAGES PHASE]
                        p = doc[page_num - 1]  # [IMAGES PHASE]
                        image_bytes = p.get_pixmap(dpi=150).tobytes("png")  # [IMAGES PHASE]
                        img_format = "png"  # [IMAGES PHASE]
                else:  # embedded  # [IMAGES PHASE]
                    if 1 <= page_num <= len(doc):  # [IMAGES PHASE]
                        p = doc[page_num - 1]  # [IMAGES PHASE]
                        for img_info in p.get_image_info(xrefs=True):  # [IMAGES PHASE]
                            xref = img_info.get("xref")  # [IMAGES PHASE]
                            if not xref or xref <= 0:  # [IMAGES PHASE]
                                continue  # [IMAGES PHASE]
                            base_img = doc.extract_image(xref)  # [IMAGES PHASE]
                            if base_img and base_img.get("image"):  # [IMAGES PHASE]
                                raw_b = base_img["image"]  # [IMAGES PHASE]
                                if hashlib.md5(raw_b).hexdigest() == content_hash:  # [IMAGES PHASE]
                                    image_bytes = raw_b  # [IMAGES PHASE]
                                    img_format = base_img.get("ext", "png")  # [IMAGES PHASE]
                                    break  # [IMAGES PHASE]
                    if not image_bytes:  # [IMAGES PHASE]
                        # Scan whole document in case page offset shifted  # [IMAGES PHASE]
                        for p in doc:  # [IMAGES PHASE]
                            for img_info in p.get_image_info(xrefs=True):  # [IMAGES PHASE]
                                xref = img_info.get("xref")  # [IMAGES PHASE]
                                if not xref or xref <= 0:  # [IMAGES PHASE]
                                    continue  # [IMAGES PHASE]
                                base_img = doc.extract_image(xref)  # [IMAGES PHASE]
                                if base_img and base_img.get("image"):  # [IMAGES PHASE]
                                    raw_b = base_img["image"]  # [IMAGES PHASE]
                                    if (
                                        hashlib.md5(raw_b).hexdigest() == content_hash
                                    ):  # [IMAGES PHASE]
                                        image_bytes = raw_b  # [IMAGES PHASE]
                                        img_format = base_img.get("ext", "png")  # [IMAGES PHASE]
                                        break  # [IMAGES PHASE]
                            if image_bytes:  # [IMAGES PHASE]
                                break  # [IMAGES PHASE]

                if not image_bytes:  # [IMAGES PHASE]
                    await _ensure_db()  # [PHASE2 FIX]
                    await conn.execute(  # [IMAGES PHASE]
                        """
                        UPDATE public.document_images
                        SET status = 'skipped', last_error = 'Image bytes not found in PDF', attempts = attempts + 1, updated_at = now()
                        WHERE id = $1;
                        """,  # [IMAGES PHASE]
                        row_id,  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]
                    continue  # [IMAGES PHASE]

                # Throttle  # [IMAGES PHASE]
                if (
                    VISION_REQUEST_THROTTLE_SECONDS > 0 and not settings.VISION_FAKE_MODE
                ):  # [IMAGES PHASE]
                    await asyncio.sleep(VISION_REQUEST_THROTTLE_SECONDS)  # [IMAGES PHASE]

                # Call classifier  # [IMAGES PHASE]
                try:  # [IMAGES PHASE]
                    (
                        route,
                        processed_content,
                    ) = await image_classifier.classify_and_process(  # [IMAGES PHASE]
                        image_bytes,  # [IMAGES PHASE]
                        mime_type=f"image/{img_format}",  # [IMAGES PHASE]
                        page_number=page_num,  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]
                except Exception as exc:  # [IMAGES PHASE]
                    consecutive_failures += 1  # [IMAGES PHASE]
                    new_attempts = row["attempts"] + 1  # [IMAGES PHASE]
                    new_status = "failed" if new_attempts >= 5 else "pending"  # [IMAGES PHASE]
                    err_msg = str(exc)[:500]  # [IMAGES PHASE]
                    await _ensure_db()  # [PHASE2 FIX]
                    await conn.execute(  # [IMAGES PHASE]
                        """
                        UPDATE public.document_images
                        SET attempts = $2, last_error = $3, status = $4, updated_at = now()
                        WHERE id = $1;
                        """,  # [IMAGES PHASE]
                        row_id,  # [IMAGES PHASE]
                        new_attempts,  # [IMAGES PHASE]
                        err_msg,  # [IMAGES PHASE]
                        new_status,  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]
                    if consecutive_failures >= max_consecutive_failures:  # [IMAGES PHASE]
                        logger.warning(  # [IMAGES PHASE]
                            "phase2_paused_consecutive_failures",  # [IMAGES PHASE]
                            document_id=document_id,  # [IMAGES PHASE]
                            consecutive_failures=consecutive_failures,  # [IMAGES PHASE]
                            last_error=err_msg,  # [IMAGES PHASE]
                        )  # [IMAGES PHASE]
                        break  # [IMAGES PHASE]
                    continue  # [IMAGES PHASE]

                # Route is None handling: empty output, blocked, or invalid image [PHASE2 FIX]
                if route is None:  # [PHASE2 FIX]
                    consecutive_failures = 0  # [PHASE2 FIX]
                    await _ensure_db()  # [PHASE2 FIX]
                    if (
                        processed_content is None or processed_content == "invalid image (HTTP 400)"
                    ):  # [PHASE2 FIX]
                        await conn.execute(  # [PHASE2 FIX]
                            """
                            UPDATE public.document_images
                            SET attempts = attempts + 1, status = 'skipped', last_error = 'invalid image (HTTP 400)', updated_at = now()
                            WHERE id = $1;
                            """,  # [PHASE2 FIX]
                            row_id,  # [PHASE2 FIX]
                        )  # [PHASE2 FIX]
                    elif processed_content == "":  # [PHASE2 FIX]
                        await conn.execute(  # [PHASE2 FIX]
                            """
                            UPDATE public.document_images
                            SET attempts = attempts + 1, status = 'skipped', last_error = 'empty', updated_at = now()
                            WHERE id = $1;
                            """,  # [PHASE2 FIX]
                            row_id,  # [PHASE2 FIX]
                        )  # [PHASE2 FIX]
                    else:  # [PHASE2 FIX]
                        await conn.execute(  # [PHASE2 FIX]
                            """
                            UPDATE public.document_images
                            SET attempts = attempts + 1, status = 'skipped', last_error = $2, updated_at = now()
                            WHERE id = $1;
                            """,  # [PHASE2 FIX]
                            row_id,  # [PHASE2 FIX]
                            processed_content,  # [PHASE2 FIX]
                        )  # [PHASE2 FIX]
                    continue  # [PHASE2 FIX]

                # Success! In ONE transaction: insert element, chunks with embeddings, mark done, update total_chunks  # [IMAGES PHASE]
                consecutive_failures = 0  # [IMAGES PHASE]
                method_map = {  # [IMAGES PHASE]
                    "text_scan": "vision_transcription",  # [IMAGES PHASE]
                    "diagram": "vision_description",  # [IMAGES PHASE]
                    "table": "vision_table",  # [IMAGES PHASE]
                }  # [IMAGES PHASE]
                ctype = (
                    "text" if route == "text_scan" else ("table" if route == "table" else "diagram")
                )  # [IMAGES PHASE]
                el_id = uuid7()  # [IMAGES PHASE] [LEFTOVER FIX]
                seg_id = get_segment_id_for_page(page_num)  # [IMAGES PHASE]

                await _ensure_db()  # [PHASE2 FIX]
                async with conn.transaction():  # [IMAGES PHASE]
                    current = await conn.fetchval(
                        "SELECT 1 FROM public.documents d JOIN public.document_images i ON i.document_id=d.id WHERE d.id=$1 AND i.id=$2 AND i.status IN ('pending','failed') AND d.status='active' AND d.deleted_at IS NULL AND d.ingestion_lock_id IS NOT DISTINCT FROM $3::uuid AND d.embedding_status<>'pending' FOR UPDATE OF d,i;",
                        uuid.UUID(document_id),
                        row_id,
                        generation,
                    )
                    if not current:
                        return "superseded"
                    max_el_order = await conn.fetchval(  # [IMAGES PHASE]
                        "SELECT COALESCE(MAX(order_index), 0) FROM public.document_elements WHERE document_id = $1;",  # [IMAGES PHASE]
                        uuid.UUID(document_id),  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]
                    await conn.execute(  # [IMAGES PHASE]
                        """
                        INSERT INTO public.document_elements (id, segment_id, document_id, page_number, content_type, extraction_method, raw_content, order_index)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
                        """,  # [IMAGES PHASE]
                        el_id,  # [IMAGES PHASE]
                        seg_id,  # [IMAGES PHASE]
                        uuid.UUID(document_id),  # [IMAGES PHASE]
                        page_num,  # [IMAGES PHASE]
                        ctype,  # [IMAGES PHASE]
                        method_map.get(route, "vision_description"),  # [IMAGES PHASE]
                        _sanitize_for_db(processed_content),  # [IMAGES PHASE]
                        (max_el_order or 0) + 1,  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]

                    # Chunker creates chunks (diagram & table chunks atomic)  # [IMAGES PHASE]
                    el_dict = {  # [IMAGES PHASE]
                        "id": str(el_id),  # [IMAGES PHASE]
                        "segment_id": str(seg_id) if seg_id else None,  # [IMAGES PHASE]
                        "document_id": document_id,  # [IMAGES PHASE]
                        "page_number": page_num,  # [IMAGES PHASE]
                        "content_type": ctype,  # [IMAGES PHASE]
                        "raw_content": processed_content,  # [IMAGES PHASE]
                    }  # [IMAGES PHASE]
                    chunk_items = semantic_chunker.create_chunks_for_elements(
                        [el_dict]
                    )  # [IMAGES PHASE]
                    if chunk_items:  # [IMAGES PHASE]
                        texts_to_embed = [c.content for c in chunk_items]  # [IMAGES PHASE]
                        embeddings = await gemini_embedder.embed_batch(  # [IMAGES PHASE]
                            texts_to_embed,
                            kind="document",
                            max_batch_size=32,  # [IMAGES PHASE]
                        )  # [IMAGES PHASE]
                        max_chunk_idx = await conn.fetchval(  # [IMAGES PHASE]
                            "SELECT COALESCE(MAX(chunk_index), -1) FROM public.document_chunks WHERE document_id = $1;",  # [IMAGES PHASE]
                            uuid.UUID(document_id),  # [IMAGES PHASE]
                        )  # [IMAGES PHASE]
                        chunks_args = []  # [IMAGES PHASE]
                        for c_idx, chk in enumerate(chunk_items):  # [IMAGES PHASE]
                            chk_uuid = uuid7()  # [IMAGES PHASE] [LEFTOVER FIX]
                            chk_index = (max_chunk_idx or -1) + 1 + c_idx  # [IMAGES PHASE]
                            vec_str = (
                                "[" + ",".join(str(x) for x in embeddings[c_idx]) + "]"
                            )  # [IMAGES PHASE]
                            chunks_args.append(
                                (  # [IMAGES PHASE]
                                    chk_uuid,  # [IMAGES PHASE]
                                    uuid.UUID(document_id),  # [IMAGES PHASE]
                                    seg_id,  # [IMAGES PHASE]
                                    el_id,  # [IMAGES PHASE]
                                    chk.content,  # [IMAGES PHASE]
                                    page_num,  # [IMAGES PHASE]
                                    page_num,  # [IMAGES PHASE]
                                    chk_index,  # [IMAGES PHASE]
                                    vec_str,  # [IMAGES PHASE]
                                    None,  # [IMAGES PHASE]
                                )
                            )  # [IMAGES PHASE]
                        await conn.executemany(  # [IMAGES PHASE]
                            """
                            INSERT INTO public.document_chunks (id, document_id, segment_id, element_id, content, page_start, page_end, chunk_index, embedding, bounding_box)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, $10::jsonb);
                            """,  # [IMAGES PHASE]
                            _sanitize_for_db(chunks_args),  # [IMAGES PHASE]
                        )  # [IMAGES PHASE]

                    # Mark row 'done'  # [IMAGES PHASE]
                    await conn.execute(  # [IMAGES PHASE]
                        """
                        UPDATE public.document_images
                        SET status = 'done',
                            route = $2,
                            description = $3,
                            element_id = $4,
                            attempts = attempts + 1,
                            last_error = NULL,
                            updated_at = now()
                        WHERE id = $1;
                        """,  # [IMAGES PHASE]
                        row_id,  # [IMAGES PHASE]
                        route,  # [IMAGES PHASE]
                        _sanitize_for_db(processed_content),  # [IMAGES PHASE]
                        el_id,  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]

                    # Update documents.total_chunks  # [IMAGES PHASE]
                    await conn.execute(  # [IMAGES PHASE]
                        """
                        UPDATE public.documents
                        SET total_chunks = (SELECT count(*) FROM public.document_chunks WHERE document_id = $1),
                            updated_at = now()
                        WHERE id = $1;
                        """,  # [IMAGES PHASE]
                        uuid.UUID(document_id),  # [IMAGES PHASE]
                    )  # [IMAGES PHASE]

            doc.close()  # [IMAGES PHASE]

            # Final status counts and summary logging  # [IMAGES PHASE]
            await _ensure_db()  # [PHASE2 FIX]
            counts_rows = await conn.fetch(  # [IMAGES PHASE]
                """
                SELECT status, count(*)::int as count
                FROM public.document_images
                WHERE document_id = $1
                GROUP BY status;
                """,  # [IMAGES PHASE]
                uuid.UUID(document_id),  # [IMAGES PHASE]
            )  # [IMAGES PHASE]
            counts = {r["status"]: r["count"] for r in counts_rows}  # [IMAGES PHASE]
            pending_left = counts.get("pending", 0)  # [IMAGES PHASE]

            # If no pending rows left, ensure document embedding_status is completed  # [IMAGES PHASE]
            if pending_left == 0:  # [IMAGES PHASE]
                await _ensure_db()  # [PHASE2 FIX]
                await conn.execute(  # [IMAGES PHASE]
                    """
                    UPDATE public.documents
                    SET embedding_status = CASE WHEN total_chunks > 0 THEN 'completed' ELSE 'failed' END,
                        embedding_progress = CASE WHEN total_chunks > 0 THEN 100 ELSE 0 END,
                        updated_at = now()
                    WHERE id = $1 AND embedding_status = 'processing'
                      AND ingestion_lock_id IS NOT DISTINCT FROM $2::uuid;
                    """,  # [IMAGES PHASE]
                    uuid.UUID(document_id),  # [IMAGES PHASE]
                    generation,
                )  # [IMAGES PHASE]

            elapsed_phase2 = round(time.monotonic() - phase2_start_time, 2)  # [IMAGES PHASE]
            logger.info(  # [IMAGES PHASE]
                "phase2_summary",  # [IMAGES PHASE]
                document_id=document_id,  # [IMAGES PHASE]
                done=counts.get("done", 0),  # [IMAGES PHASE]
                pending=pending_left,  # [IMAGES PHASE]
                skipped=counts.get("skipped", 0),  # [IMAGES PHASE]
                failed=counts.get("failed", 0),  # [IMAGES PHASE]
                elapsed_seconds=elapsed_phase2,  # [IMAGES PHASE]
            )  # [IMAGES PHASE]

            if (
                consecutive_failures >= max_consecutive_failures or pending_left > 0
            ):  # [IMAGES PHASE]
                return "paused"  # [IMAGES PHASE]
            return "completed"  # [IMAGES PHASE]
        finally:  # [IMAGES PHASE]
            if conn is not None:  # [PHASE2 FIX]
                try:  # [PHASE2 FIX]
                    if not (
                        callable(getattr(conn, "is_closed", None)) and conn.is_closed()
                    ):  # [PHASE2 FIX]
                        await conn.close()  # [PHASE2 FIX]
                except Exception:  # [PHASE2 FIX]
                    pass  # [PHASE2 FIX]


document_ingestion_engine = DocumentIngestionEngine()
