# ==============================================================================
# PansGPT 2.0 RAG Pipeline & Context Assembler (Phase 6)
# Model: gemini-embedding-2 (3072d Dense Vector Search) + FTS + Trigram (RRF k=60)
# ==============================================================================

import json
import uuid

import structlog

from app.core.database import get_db_connection
from app.engines.embedder import gemini_embedder
from app.engines.guard import policy_guard
from app.models.chat import CitationItem

logger = structlog.get_logger(__name__)


class RagRetrievalEngine:
    """
    3-Pool Hybrid RAG Retrieval Engine:
    - Normalizes medical abbreviations with 200+ term clinical dictionary
    - Computes 3072d dense vector embeddings via Gemini
    - Executes PostgreSQL 3-Pool Hybrid Search (Vector + FTS + Trigram) with RRF (k=60)
    - Computes match confidence ('HIGH' | 'MEDIUM' | 'LOW')
    - Sibling & Full-Segment expansion for complete pharmacological contexts
    - Returns structured citations with page coordinates and assembled markdown context
    """

    @staticmethod
    def classify_confidence(dense_score: float, rrf_score: float) -> str:
        """Categorizes retrieval confidence based on RRF and dense cosine similarity."""
        if rrf_score >= 0.030 or dense_score >= 0.65:
            return "HIGH"
        if rrf_score >= 0.018 or dense_score >= 0.40:
            return "MEDIUM"
        return "LOW"

    async def retrieve_context(
        self,
        query: str,
        document_id: str | None = None,
        university_id: str | None = "01a07664-7a69-7ce0-ad6a-b219462cbde3",
        course_code: str | None = None,
        match_count: int = 4,
        match_threshold: float = 0.25,
        expand_siblings: bool = True,
        expand_full_segment: bool = False,
    ) -> tuple[str | None, list[CitationItem]]:
        """
        Retrieves top relevant chunks for a user query using 3-Pool Hybrid Search (RRF k=60).
        Returns: (assembled_context_markdown, list_of_citations)
        """
        # 1. Acronym Normalization (e.g., CVS -> Cardiovascular System, HCTZ -> Hydrochlorothiazide)
        normalized_query = policy_guard.normalize_medical_acronyms(query)

        # 2. Compute 3072d query embedding
        try:
            query_vector = await gemini_embedder.embed_single(normalized_query)
        except Exception as exc:
            logger.warning("query_embedding_failed", error=str(exc))
            return None, []

        vector_str = f"[{','.join(str(x) for x in query_vector)}]"

        raw_matches: list[dict] = []
        async with get_db_connection() as conn:
            if not conn:
                return None, []

            try:
                # 3. Try Primary: 3-Pool Hybrid Search RPC (Vector + FTS + Trigram with RRF k=60)
                filter_uni_uuid = uuid.UUID(university_id) if university_id else None
                filter_doc_uuids = [uuid.UUID(document_id)] if document_id else None

                # If course_code is provided without a document_id, resolve docs for that course
                if not filter_doc_uuids and course_code:
                    course_doc_rows = await conn.fetch(
                        "SELECT id FROM public.documents WHERE course_code = $1 AND deleted_at IS NULL",
                        course_code.upper().strip(),
                    )
                    if course_doc_rows:
                        filter_doc_uuids = [r["id"] for r in course_doc_rows]

                hybrid_sql = """
                    SELECT
                        m.chunk_id,
                        m.document_id,
                        m.chunk_index,
                        m.content,
                        m.content_type,
                        m.page_start,
                        m.page_end,
                        m.bounding_box,
                        m.section_id,
                        m.segment_id,
                        m.dense_score,
                        m.fts_score,
                        m.trgm_score,
                        m.rrf_score,
                        d.title as doc_title,
                        d.course_code
                    FROM public.match_documents_hybrid(
                        query_text := $1,
                        query_embedding := $2::vector,
                        match_threshold := $3,
                        match_count := $4,
                        filter_university_id := $5,
                        filter_doc_ids := $6
                    ) m
                    LEFT JOIN public.documents d ON d.id = m.document_id
                    ORDER BY m.rrf_score DESC;
                """
                try:
                    rows = await conn.fetch(
                        hybrid_sql,
                        normalized_query,
                        vector_str,
                        float(match_threshold),
                        int(match_count),
                        filter_uni_uuid,
                        filter_doc_uuids,
                    )
                except Exception as hybrid_exc:
                    logger.info("match_documents_hybrid_rpc_fallback", error=str(hybrid_exc))
                    # Fallback to legacy RPC if hybrid RPC is not present
                    if document_id:
                        fallback_sql = """
                            SELECT
                                m.id as chunk_id,
                                m.document_id,
                                m.content,
                                m.page_start,
                                m.page_end,
                                m.chunk_index,
                                m.similarity as dense_score,
                                0.0::double precision as fts_score,
                                0.0::double precision as trgm_score,
                                (1.0 / (60.0 + ROW_NUMBER() OVER (ORDER BY m.similarity DESC)))::double precision as rrf_score,
                                NULL::uuid as segment_id,
                                NULL::jsonb as bounding_box,
                                d.title as doc_title,
                                d.course_code
                            FROM public.match_document_chunks($1::vector, $2, $3, $4) m
                            LEFT JOIN public.documents d ON d.id = m.document_id
                            ORDER BY m.similarity DESC;
                        """
                        rows = await conn.fetch(
                            fallback_sql,
                            vector_str,
                            float(match_threshold),
                            int(match_count),
                            uuid.UUID(document_id),
                        )
                    else:
                        candidate_docs = filter_doc_uuids
                        if not candidate_docs:
                            doc_filter_sql = (
                                "SELECT id FROM public.documents WHERE deleted_at IS NULL"
                            )
                            params: list = []
                            if filter_uni_uuid:
                                doc_filter_sql += " AND university_id = $1"
                                params.append(filter_uni_uuid)
                            doc_rows = await conn.fetch(doc_filter_sql, *params)
                            candidate_docs = [r["id"] for r in doc_rows]

                        if not candidate_docs:
                            return None, []

                        fallback_sql = """
                            SELECT
                                m.id as chunk_id,
                                m.document_id,
                                m.content,
                                m.page_start,
                                m.page_end,
                                m.chunk_index,
                                m.similarity as dense_score,
                                0.0::double precision as fts_score,
                                0.0::double precision as trgm_score,
                                (1.0 / (60.0 + ROW_NUMBER() OVER (ORDER BY m.similarity DESC)))::double precision as rrf_score,
                                NULL::uuid as segment_id,
                                NULL::jsonb as bounding_box,
                                d.title as doc_title,
                                d.course_code
                            FROM public.match_documents_global($1::vector, $2, $3, $4::uuid[]) m
                            LEFT JOIN public.documents d ON d.id = m.document_id
                            ORDER BY m.similarity DESC;
                        """
                        rows = await conn.fetch(
                            fallback_sql,
                            vector_str,
                            float(match_threshold),
                            int(match_count),
                            candidate_docs,
                        )

                for r in rows:
                    d_score = float(r["dense_score"]) if r["dense_score"] is not None else 0.0
                    f_score = float(r["fts_score"]) if r["fts_score"] is not None else 0.0
                    t_score = float(r["trgm_score"]) if r["trgm_score"] is not None else 0.0
                    r_score = float(r["rrf_score"]) if r["rrf_score"] is not None else (1.0 / 61.0)
                    confidence = self.classify_confidence(d_score, r_score)

                    raw_matches.append(
                        {
                            "chunk_id": str(r["chunk_id"]),
                            "document_id": str(r["document_id"]),
                            "content": r["content"],
                            "page_start": r["page_start"],
                            "page_end": r["page_end"],
                            "chunk_index": r["chunk_index"],
                            "dense_score": d_score,
                            "fts_score": f_score,
                            "trgm_score": t_score,
                            "rrf_score": r_score,
                            "confidence": confidence,
                            "segment_id": str(r["segment_id"]) if r.get("segment_id") else None,
                            "bounding_box": json.loads(r["bounding_box"])
                            if isinstance(r.get("bounding_box"), str)
                            else r.get("bounding_box"),
                            "doc_title": r["doc_title"] or "Course Lecture Slide",
                            "course_code": r["course_code"] or "",
                        }
                    )

                # 4. Sibling or Full-Segment Expansion for Top Match
                if raw_matches and (expand_full_segment or expand_siblings):
                    top_chunk = raw_matches[0]
                    doc_uuid = uuid.UUID(top_chunk["document_id"])
                    c_idx = top_chunk["chunk_index"]
                    seg_id = top_chunk["segment_id"]

                    if expand_full_segment and seg_id:
                        seg_sql = """
                            SELECT content
                            FROM public.document_chunks
                            WHERE document_id = $1 AND segment_id = $2
                            ORDER BY chunk_index ASC;
                        """
                        seg_rows = await conn.fetch(seg_sql, doc_uuid, uuid.UUID(seg_id))
                        if seg_rows:
                            top_chunk["expanded_content"] = "\n\n".join(
                                r["content"].strip() for r in seg_rows
                            )
                    elif expand_siblings:
                        sibling_sql = """
                            SELECT id, document_id, content, page_start, page_end, chunk_index
                            FROM public.document_chunks
                            WHERE document_id = $1 AND chunk_index IN ($2, $3)
                            ORDER BY chunk_index ASC;
                        """
                        siblings = await conn.fetch(
                            sibling_sql, doc_uuid, max(0, c_idx - 1), c_idx + 1
                        )
                        before_text = ""
                        after_text = ""
                        for s in siblings:
                            if s["chunk_index"] == c_idx - 1:
                                before_text = s["content"].strip() + "\n...\n"
                            elif s["chunk_index"] == c_idx + 1:
                                after_text = "\n...\n" + s["content"].strip()

                        if before_text or after_text:
                            top_chunk["expanded_content"] = (
                                before_text + top_chunk["content"] + after_text
                            )

            except Exception as exc:
                logger.warning("rag_retrieval_query_error", error=str(exc))
                return None, []

        if not raw_matches:
            return None, []

        # 5. Format Citations & Assembled Context Blocks
        citations: list[CitationItem] = []
        context_blocks: list[str] = []

        for idx, match in enumerate(raw_matches):
            doc_title = match["doc_title"]
            course = match["course_code"]
            snippet = match["content"][:200].replace("\n", " ") + "..."
            sim = round(match["dense_score"] if match["dense_score"] > 0 else 0.5, 4)

            citations.append(
                CitationItem(
                    chunk_id=match["chunk_id"],
                    document_id=match["document_id"],
                    title=f"{course}: {doc_title}" if course else doc_title,
                    course_code=course,
                    page_start=match["page_start"],
                    page_end=match["page_end"],
                    similarity=sim,
                    snippet=snippet,
                    dense_score=round(match["dense_score"], 4),
                    fts_score=round(match["fts_score"], 4),
                    trgm_score=round(match["trgm_score"], 4),
                    rrf_score=round(match["rrf_score"], 5),
                    confidence=match["confidence"],
                    bounding_box=match["bounding_box"],
                )
            )

            chunk_text = match.get("expanded_content") or match["content"]
            block_header = (
                f"[Source {idx + 1}: {doc_title} (Course: {course}), "
                f"Pages {match['page_start']}-{match['page_end']}, "
                f"Confidence: {match['confidence']}, RRF: {match['rrf_score']:.4f}]"
            )
            context_blocks.append(f"{block_header}\n{chunk_text}")

        assembled_context = "\n\n".join(context_blocks)
        return assembled_context, citations


rag_engine = RagRetrievalEngine()
