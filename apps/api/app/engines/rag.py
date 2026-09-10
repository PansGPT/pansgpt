# ==============================================================================
# PansGPT 2.0 RAG Pipeline & Context Assembler (Phase 6)
# Model: gemini-embedding-2 (3072d Dense Vector Search)
# ==============================================================================

import uuid

import structlog

from app.core.database import get_db_connection
from app.engines.embedder import gemini_embedder
from app.engines.guard import policy_guard
from app.models.chat import CitationItem

logger = structlog.get_logger(__name__)


class RagRetrievalEngine:
    """
    RAG Context Assembler:
    - Normalizes medical abbreviations
    - Computes 3072d dense vector embeddings via Gemini
    - Executes Supabase RPC vector similarity search (HNSW halfvec cosine index)
    - Expands sibling chunks (chunk_index ± 1) for seamless pharmacological context
    - Returns formatted citations and structured markdown context blocks
    """

    async def retrieve_context(
        self,
        query: str,
        document_id: str | None = None,
        university_id: str | None = "01a07664-7a69-7ce0-ad6a-b219462cbde3",
        course_code: str | None = None,
        match_count: int = 4,
        match_threshold: float = 0.35,
        expand_siblings: bool = True,
    ) -> tuple[str | None, list[CitationItem]]:
        """
        Retrieves top relevant chunks for a user query.
        Returns: (assembled_context_markdown, list_of_citations)
        """
        # 1. Acronym Normalization (e.g., CVS -> Cardiovascular System)
        normalized_query = policy_guard.normalize_medical_acronyms(query)

        # 2. Compute 3072d query embedding
        try:
            query_vector = await gemini_embedder.embed_single(normalized_query)
        except Exception as exc:
            logger.warning("query_embedding_failed", error=str(exc))
            return None, []

        vector_str = f"[{','.join(str(x) for x in query_vector)}]"

        # 3. Query Supabase RPC
        raw_matches: list[dict] = []
        async with get_db_connection() as conn:
            if not conn:
                return None, []

            try:
                if document_id:
                    # Single document scoped search
                    sql = """
                        SELECT
                            m.id as chunk_id,
                            m.document_id,
                            m.content,
                            m.page_start,
                            m.page_end,
                            m.chunk_index,
                            m.similarity,
                            d.title as doc_title,
                            d.course_code
                        FROM public.match_document_chunks($1::vector, $2, $3, $4) m
                        LEFT JOIN public.documents d ON d.id = m.document_id
                        ORDER BY m.similarity DESC;
                    """
                    rows = await conn.fetch(
                        sql,
                        vector_str,
                        float(match_threshold),
                        int(match_count),
                        uuid.UUID(document_id),
                    )
                else:
                    # University / Course-wide multi-document search
                    doc_filter_sql = "SELECT id FROM public.documents WHERE deleted_at IS NULL"
                    params: list = []
                    if university_id:
                        doc_filter_sql += " AND university_id = $1"
                        params.append(uuid.UUID(university_id))
                    if course_code:
                        param_idx = len(params) + 1
                        doc_filter_sql += f" AND course_code = ${param_idx}"
                        params.append(course_code.upper().strip())

                    doc_rows = await conn.fetch(doc_filter_sql, *params)
                    candidate_doc_ids = [r["id"] for r in doc_rows]

                    if not candidate_doc_ids:
                        return None, []

                    sql = """
                        SELECT
                            m.id as chunk_id,
                            m.document_id,
                            m.content,
                            m.page_start,
                            m.page_end,
                            m.chunk_index,
                            m.similarity,
                            d.title as doc_title,
                            d.course_code
                        FROM public.match_documents_global($1::vector, $2, $3, $4::uuid[]) m
                        LEFT JOIN public.documents d ON d.id = m.document_id
                        ORDER BY m.similarity DESC;
                    """
                    rows = await conn.fetch(
                        sql,
                        vector_str,
                        float(match_threshold),
                        int(match_count),
                        candidate_doc_ids,
                    )

                for r in rows:
                    raw_matches.append(
                        {
                            "chunk_id": str(r["chunk_id"]),
                            "document_id": str(r["document_id"]),
                            "content": r["content"],
                            "page_start": r["page_start"],
                            "page_end": r["page_end"],
                            "chunk_index": r["chunk_index"],
                            "similarity": float(r["similarity"]),
                            "doc_title": r["doc_title"] or "Course Lecture Slide",
                            "course_code": r["course_code"] or "",
                        }
                    )

                # 4. Sibling Chunk Expansion (chunk_index ± 1) for top matches
                if expand_siblings and raw_matches:
                    top_chunk = raw_matches[0]
                    c_idx = top_chunk["chunk_index"]
                    doc_uuid = uuid.UUID(top_chunk["document_id"])

                    sibling_sql = """
                        SELECT id, document_id, content, page_start, page_end, chunk_index
                        FROM public.document_chunks
                        WHERE document_id = $1 AND chunk_index IN ($2, $3)
                        ORDER BY chunk_index ASC;
                    """
                    siblings = await conn.fetch(sibling_sql, doc_uuid, max(0, c_idx - 1), c_idx + 1)

                    # Merge sibling content into top chunk context if found
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

        # 5. Format Citations & Assembled Context
        citations: list[CitationItem] = []
        context_blocks: list[str] = []

        for idx, match in enumerate(raw_matches):
            doc_title = match["doc_title"]
            course = match["course_code"]
            snippet = match["content"][:200].replace("\n", " ") + "..."

            citations.append(
                CitationItem(
                    chunk_id=match["chunk_id"],
                    document_id=match["document_id"],
                    title=f"{course}: {doc_title}" if course else doc_title,
                    course_code=course,
                    page_start=match["page_start"],
                    page_end=match["page_end"],
                    similarity=round(match["similarity"], 4),
                    snippet=snippet,
                )
            )

            chunk_text = match.get("expanded_content") or match["content"]
            block_header = f"[Source {idx + 1}: {doc_title} (Course: {course}), Pages {match['page_start']}-{match['page_end']}, Relevance: {match['similarity']:.2f}]"
            context_blocks.append(f"{block_header}\n{chunk_text}")

        assembled_context = "\n\n".join(context_blocks)
        return assembled_context, citations


rag_engine = RagRetrievalEngine()
