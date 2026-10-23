# ==============================================================================
# PansGPT 2.0 RAG Pipeline & Context Assembler (Phase 6)
# Model: gemini-embedding-2 (1536d Dense Vector Search) + FTS + Trigram (RRF k=60)  # [DIM 1536]
# ==============================================================================

import json
import re
import uuid
from typing import Any
from urllib.parse import urlsplit  # [CHAT FIX 2]

import structlog

from app.core.config import settings
from app.core.database import get_db_connection
from app.engines.embedder import gemini_embedder
from app.engines.guard import policy_guard
from app.engines.query_expansion import query_expansion_engine
from app.engines.reranker import candidate_reranker
from app.models.chat import CitationItem

logger = structlog.get_logger(__name__)
ABSENCE_NOTICE = (  # [CHAT FIX 2]
    "This topic was not found in your course materials. No external web sources are available."  # [CHAT FIX 2]
)  # [CHAT FIX 2]


class RagRetrievalEngine:
    """
    3-Pool Hybrid RAG Retrieval Engine:
    - Normalizes medical abbreviations with 200+ term clinical dictionary
    - Multi-Query decomposition & HyDE hypothetical document generation
    - Computes 1536d dense vector embeddings via Gemini  # [DIM 1536]
    - Executes PostgreSQL 3-Pool Hybrid Search (Vector + FTS + Trigram) with RRF (k=60)
    - Multi-factor candidate re-ranking (Dense + RRF + Lexical Overlap + Metadata)
    - Absence Policy automated web search fallback for low/empty confidence
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

    @staticmethod
    def generate_multi_query_expansions(query: str) -> list[str]:
        """
        Decomposes student queries into 2-3 focused pharmacological sub-queries
        covering mechanisms, clinical indications, adverse effects, and kinetics.
        """
        return query_expansion_engine.generate_heuristic_expansions(query)

    @staticmethod
    def generate_hyde_passage(query: str) -> str:
        """
        Generates a domain-specific hypothetical document passage (HyDE)
        representing what an authoritative lecture monograph slide would contain.
        """
        return query_expansion_engine.generate_heuristic_hyde(query)

    @staticmethod
    def rerank_candidates(query: str, candidates: list[dict], top_k: int = 4) -> list[dict]:
        """
        Executes candidate re-ranking (heuristic pass for synchronous callers).
        """
        return candidate_reranker.fallback_heuristic_scoring(query, candidates)[:top_k]

    @staticmethod  # [CHAT FIX 2]
    async def _keyword_search(  # [CHAT FIX 2]
        conn: Any,  # [CHAT FIX 2]
        university: uuid.UUID,  # [CHAT FIX 2]
        documents: list[uuid.UUID] | None,  # [CHAT FIX 2]
        course: str | None,  # [CHAT FIX 2]
        query: str,  # [CHAT FIX 2]
        limit: int,  # [CHAT FIX 2]
    ) -> list:  # [CHAT FIX 2]
        sql = """ -- [CHAT FIX 2]
            WITH eligible AS ( -- [CHAT FIX 2]
                SELECT c.*, d.title AS doc_title, d.course_code -- [CHAT FIX 2]
                FROM public.document_chunks c -- [CHAT FIX 2]
                JOIN public.documents d ON d.id = c.document_id -- [CHAT FIX 2]
                WHERE d.university_id = $1 AND d.status = 'active' AND d.deleted_at IS NULL -- [CHAT FIX 2]
                  AND ($2::uuid[] IS NULL OR d.id = ANY($2)) -- [CHAT FIX 2]
                  AND ($3::text IS NULL OR d.course_code = $3) -- [CHAT FIX 2]
            ), fts AS ( -- [CHAT FIX 2]
                SELECT id, ts_rank_cd(content_fts, websearch_to_tsquery('english', $4)) AS score, -- [CHAT FIX 2]
                       row_number() OVER (ORDER BY ts_rank_cd(content_fts, websearch_to_tsquery('english', $4)) DESC) AS rank -- [CHAT FIX 2]
                FROM eligible WHERE content_fts @@ websearch_to_tsquery('english', $4) -- [CHAT FIX 2]
            ), trgm AS ( -- [CHAT FIX 2]
                SELECT id, word_similarity($4, content) AS score, -- [CHAT FIX 2]
                       row_number() OVER (ORDER BY word_similarity($4, content) DESC) AS rank -- [CHAT FIX 2]
                FROM eligible WHERE word_similarity($4, content) > 0.35 -- [CHAT FIX 2]
            ) -- [CHAT FIX 2]
            SELECT e.id AS chunk_id, e.document_id, e.content, e.chunk_index, e.page_start, -- [CHAT FIX 2]
                   e.page_end, e.segment_id, e.bounding_box, e.doc_title, e.course_code, -- [CHAT FIX 2]
                   0.0::float8 AS dense_score, COALESCE(f.score, 0.0) AS fts_score, -- [CHAT FIX 2]
                   COALESCE(t.score, 0.0) AS trgm_score, -- [CHAT FIX 2]
                   (COALESCE(1.0 / (60 + f.rank), 0.0) + COALESCE(1.0 / (60 + t.rank), 0.0)) AS rrf_score -- [CHAT FIX 2]
            FROM eligible e LEFT JOIN fts f ON f.id = e.id LEFT JOIN trgm t ON t.id = e.id -- [CHAT FIX 2]
            WHERE f.id IS NOT NULL OR t.id IS NOT NULL -- [CHAT FIX 2]
            ORDER BY rrf_score DESC LIMIT $5; -- [CHAT FIX 2]
        """  # [CHAT FIX 2]
        return await conn.fetch(  # [CHAT FIX 2]
            sql,  # [CHAT FIX 2]
            university,  # [CHAT FIX 2]
            documents,  # [CHAT FIX 2]
            course.upper().strip() if course else None,  # [CHAT FIX 2]
            query,  # [CHAT FIX 2]
            limit,  # [CHAT FIX 2]
        )  # [CHAT FIX 2]

    async def retrieve_context(
        self,
        query: str,
        document_id: str | None = None,
        university_id: str | None = None,  # [TENANT FIX]
        course_code: str | None = None,
        match_count: int = 4,
        match_threshold: float = 0.25,
        expand_siblings: bool = True,
        expand_full_segment: bool = False,
        conversation_history: list[dict[str, Any]] | None = None,
    ) -> tuple[str | None, list[CitationItem]]:
        """
        Retrieves top relevant chunks for a user query using 3-Pool Hybrid Search (RRF k=60).
        Supports contextual history rewriting for follow-up questions with pronouns.
        Returns: (assembled_context_markdown, list_of_citations)
        """
        if university_id is None:  # [TENANT FIX]
            raise ValueError("university_id is required for document retrieval.")  # [TENANT FIX]
        filter_uni_uuid = uuid.UUID(university_id)  # [TENANT FIX]
        if document_id:  # [TENANT FIX]
            async with get_db_connection() as scope_conn:  # [TENANT FIX]
                if scope_conn is None:  # [TENANT FIX]
                    return None, []  # [TENANT FIX]
                allowed = await scope_conn.fetchval(  # [TENANT FIX]
                    "SELECT id FROM public.documents WHERE id = $1 AND university_id = $2 "  # [TENANT FIX]
                    "AND status = 'active' AND deleted_at IS NULL;",  # [TENANT FIX]
                    uuid.UUID(document_id),  # [TENANT FIX]
                    filter_uni_uuid,  # [TENANT FIX]
                )  # [TENANT FIX]
                if allowed is None:  # [TENANT FIX]
                    return None, []  # [TENANT FIX]
        # 1. Acronym Normalization (e.g., CVS -> Cardiovascular System, HCTZ -> Hydrochlorothiazide)
        normalized_query = policy_guard.normalize_medical_acronyms(query)

        # 2. Contextual Query Rewriting for follow-up turns (e.g. "what are its side effects?")
        search_query = normalized_query
        if conversation_history:
            referential_words = {
                "it",
                "its",
                "they",
                "them",
                "this",
                "that",
                "these",
                "those",
                "the drug",
                "the mechanism",
                "the medication",
                "same",
                "above",
            }
            query_words = set(re.findall(r"\w+", normalized_query.lower()))
            if query_words.intersection(referential_words) or len(query_words) <= 4:
                last_user_query = None
                for h in reversed(conversation_history):
                    if h.get("role") == "user" and h.get("content"):
                        last_user_query = h["content"].strip()
                        break
                if last_user_query and last_user_query != normalized_query:
                    search_query = f"{last_user_query} {normalized_query}"

        # 3. Multi-Query Expansion & HyDE hypothetical document generation
        expanded_queries = [search_query]
        hyde_passage = ""
        if settings.ENABLE_QUERY_EXPANSION:
            try:
                (
                    expanded_queries,
                    hyde_passage,
                ) = await query_expansion_engine.expand_and_generate_hyde(search_query)
            except Exception as exp_exc:
                logger.warning("query_expansion_failed", error=str(exp_exc))
                expanded_queries = self.generate_multi_query_expansions(search_query)
                hyde_passage = self.generate_hyde_passage(search_query)

        # 4. Compute 1536d dense vector embeddings in batch  # [DIM 1536]
        query_texts = [search_query]  # [EMBED FIX]
        for eq in expanded_queries:  # [EMBED FIX]
            if eq != search_query and eq not in query_texts:  # [EMBED FIX]
                query_texts.append(eq)  # [EMBED FIX]
        has_hyde = bool(hyde_passage and len(hyde_passage.strip()) > 30)  # [EMBED FIX]
        embed_texts = list(query_texts)  # [EMBED FIX]
        if has_hyde:  # [EMBED FIX]
            embed_texts.append(hyde_passage)  # [EMBED FIX]

        embeddings: list[list[float]] = []  # [EMBED FIX]
        try:  # [EMBED FIX]
            # Embed search_query and expanded queries with kind="query"  # [EMBED FIX]
            query_embeddings = await gemini_embedder.embed_batch(  # [EMBED FIX]
                query_texts,
                kind="query",  # [EMBED FIX]
            )  # [EMBED FIX]
            embeddings.extend(query_embeddings)  # [EMBED FIX]

            if has_hyde:  # [EMBED FIX]
                # Embed HyDE passage with kind="document" (hypothetical document passage; to be benchmarked)  # [EMBED FIX]
                hyde_embeddings = await gemini_embedder.embed_batch(  # [EMBED FIX]
                    [hyde_passage],
                    kind="document",  # [EMBED FIX]
                )  # [EMBED FIX]
                embeddings.extend(hyde_embeddings)  # [EMBED FIX]
        except Exception as exc:  # [EMBED FIX]
            logger.warning(  # [CHAT FIX 2]
                "query_batch_embedding_failed_dense_retrieval_skipped",  # [EMBED FIX]
                error_type=type(exc).__name__,  # [CHAT FIX 2]
                error=str(exc) or repr(exc),  # [CHAT FIX 2]
                msg="Dense vector retrieval skipped due to embedding failure; proceeding with FTS/trigram only",  # [EMBED FIX]
            )  # [EMBED FIX]
            embeddings = []  # [EMBED FIX]

        query_vector = embeddings[0] if embeddings else None  # [EMBED FIX]
        vector_str = (
            f"[{','.join(str(x) for x in query_vector)}]" if query_vector else None
        )  # [EMBED FIX]

        raw_matches: list[dict] = []
        seen_chunk_ids: set[str] = set()

        async with get_db_connection() as conn:
            try:
                if not conn:  # [CHAT FIX 2]
                    raise ValueError("Database connection unavailable for RAG")  # [CHAT FIX 2]

                # 4. Try Primary: 3-Pool Hybrid Search RPC (Vector + FTS + Trigram with RRF k=60)
                filter_doc_uuids = [uuid.UUID(document_id)] if document_id else None

                # If course_code is provided without a document_id, resolve docs for that course
                if not filter_doc_uuids and course_code:
                    course_doc_rows = await conn.fetch(
                        "SELECT id FROM public.documents WHERE course_code = $1 AND university_id = $2 AND status = 'active' AND deleted_at IS NULL",  # [TENANT FIX]
                        course_code.upper().strip(),
                        filter_uni_uuid,  # [TENANT FIX]
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
                    WHERE d.university_id = $5 AND d.status = 'active' AND d.deleted_at IS NULL -- [TENANT FIX]
                      AND ($6::uuid[] IS NULL OR d.id = ANY($6)) -- [TENANT FIX]
                    ORDER BY m.rrf_score DESC;
                """
                try:
                    if not vector_str:  # [CHAT FIX 2]
                        rows = await self._keyword_search(  # [CHAT FIX 2]
                            conn,  # [CHAT FIX 2]
                            filter_uni_uuid,  # [CHAT FIX 2]
                            filter_doc_uuids,  # [CHAT FIX 2]
                            course_code,  # [CHAT FIX 2]
                            normalized_query,  # [CHAT FIX 2]
                            match_count * 2,  # [CHAT FIX 2]
                        )  # [CHAT FIX 2]
                    else:  # [CHAT FIX 2]
                        rows = await conn.fetch(  # [CHAT FIX 2]
                            hybrid_sql,  # [CHAT FIX 2]
                            normalized_query,  # [CHAT FIX 2]
                            vector_str,  # [CHAT FIX 2]
                            float(match_threshold),  # [CHAT FIX 2]
                            int(match_count * 2),  # [CHAT FIX 2]
                            filter_uni_uuid,  # [CHAT FIX 2]
                            filter_doc_uuids,  # [CHAT FIX 2]
                        )  # [CHAT FIX 2]
                except Exception as hybrid_exc:
                    if not vector_str:  # [CHAT FIX 2]
                        raise  # [CHAT FIX 2]
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
                            WHERE d.university_id = $5 AND d.status = 'active' AND d.deleted_at IS NULL -- [TENANT FIX]
                            ORDER BY m.similarity DESC;
                        """
                        rows = await conn.fetch(
                            fallback_sql,
                            vector_str,
                            float(match_threshold),
                            int(match_count * 2),
                            uuid.UUID(document_id),
                            filter_uni_uuid,  # [TENANT FIX]
                        )
                    else:
                        candidate_docs = filter_doc_uuids
                        if not candidate_docs:
                            doc_filter_sql = "SELECT id FROM public.documents WHERE deleted_at IS NULL AND status = 'active' AND university_id = $1"  # [TENANT FIX]
                            params: list[uuid.UUID] = [filter_uni_uuid]  # [TENANT FIX]
                            doc_rows = await conn.fetch(doc_filter_sql, *params)
                            candidate_docs = [r["id"] for r in doc_rows]

                        if not candidate_docs:
                            rows = []
                        else:
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
                                WHERE d.university_id = $5 AND d.status = 'active' AND d.deleted_at IS NULL -- [TENANT FIX]
                                  AND d.id = ANY($4) -- [TENANT FIX]
                                ORDER BY m.similarity DESC;
                            """
                            rows = await conn.fetch(
                                fallback_sql,
                                vector_str,
                                float(match_threshold),
                                int(match_count * 2),
                                candidate_docs,
                                filter_uni_uuid,  # [TENANT FIX]
                            )

                for r in rows:
                    cid = str(r["chunk_id"])
                    if cid in seen_chunk_ids:
                        continue
                    seen_chunk_ids.add(cid)

                    d_score = float(r["dense_score"]) if r["dense_score"] is not None else 0.0
                    f_score = float(r["fts_score"]) if r["fts_score"] is not None else 0.0
                    t_score = float(r["trgm_score"]) if r["trgm_score"] is not None else 0.0
                    r_score = float(r["rrf_score"]) if r["rrf_score"] is not None else (1.0 / 61.0)
                    confidence = self.classify_confidence(d_score, r_score)

                    raw_matches.append(
                        {
                            "chunk_id": cid,
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

                # 4b. Multi-Query & HyDE 3-Pool Retrieval
                for idx_exp, exp_q in enumerate(embed_texts[1:], start=1):
                    if idx_exp < len(embeddings) and len(raw_matches) < match_count * 4:
                        exp_vec_str = f"[{','.join(str(x) for x in embeddings[idx_exp])}]"
                        try:
                            is_hyde = idx_exp == len(embed_texts) - 1 and has_hyde
                            weight = 0.85 if is_hyde else 0.65
                            exp_rows = await conn.fetch(
                                hybrid_sql,
                                exp_q[:120],
                                exp_vec_str,
                                float(match_threshold),
                                int(match_count),
                                filter_uni_uuid,
                                filter_doc_uuids,
                            )
                            for r in exp_rows:
                                cid = str(r["chunk_id"])
                                if cid not in seen_chunk_ids:
                                    seen_chunk_ids.add(cid)
                                    d_score = (
                                        float(r["dense_score"])
                                        if r["dense_score"] is not None
                                        else 0.0
                                    )
                                    f_score = (
                                        float(r["fts_score"]) if r["fts_score"] is not None else 0.0
                                    )
                                    t_score = (
                                        float(r["trgm_score"])
                                        if r["trgm_score"] is not None
                                        else 0.0
                                    )
                                    r_score = (
                                        float(r["rrf_score"])
                                        if r["rrf_score"] is not None
                                        else 0.015
                                    ) * weight
                                    confidence = self.classify_confidence(d_score, r_score)
                                    raw_matches.append(
                                        {
                                            "chunk_id": cid,
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
                                            "segment_id": str(r["segment_id"])
                                            if r.get("segment_id")
                                            else None,
                                            "bounding_box": json.loads(r["bounding_box"])
                                            if isinstance(r.get("bounding_box"), str)
                                            else r.get("bounding_box"),
                                            "doc_title": r["doc_title"] or "Course Lecture Slide",
                                            "course_code": r["course_code"] or "",
                                        }
                                    )
                        except Exception as exp_err:
                            logger.debug("expansion_retrieval_skipped", error=str(exp_err))

            except Exception as exc:
                logger.warning("rag_retrieval_query_error", error=str(exc))
                raw_matches = []

        # 5. Neural Candidate Re-Ranking & Precision Relevance Filtering
        reranked_matches = await candidate_reranker.rerank(
            query=normalized_query,
            candidates=raw_matches,
            top_k=match_count,
            score_threshold=settings.RERANKER_MIN_SCORE_THRESHOLD,
        )

        # 6. Absence Policy Check (Trigger autonomous web_search if syllabus match is empty or low)
        is_empty_or_low = False
        if not reranked_matches:
            is_empty_or_low = True
        else:
            high_or_med = [m for m in reranked_matches if m["confidence"] in ("HIGH", "MEDIUM")]
            if not high_or_med or reranked_matches[0]["rerank_score"] < 0.38:
                is_empty_or_low = True

        if is_empty_or_low:
            if not settings.WEB_SEARCH_ENABLED:  # [CHAT FIX 2]
                return ABSENCE_NOTICE, []  # [CHAT FIX 2]
            logger.info("absence_policy_triggered_invoking_web_search", query=query)
            from app.engines.tools import tool_engine

            web_res = await tool_engine.execute_web_search(query=normalized_query, num_results=3)
            web_results = [  # [CHAT FIX 2]
                item  # [CHAT FIX 2]
                for item in web_res.get("results", [])  # [CHAT FIX 2]
                if isinstance(item.get("url"), str)  # [CHAT FIX 2]
                and urlsplit(item["url"]).scheme in {"https", "http"}  # [CHAT FIX 2]
                and urlsplit(item["url"]).netloc  # [CHAT FIX 2]
                and isinstance(item.get("content"), str)  # [CHAT FIX 2]
                and item["content"].strip()  # [CHAT FIX 2]
            ]  # [CHAT FIX 2]
            if web_results:
                web_citations: list[CitationItem] = []
                web_blocks: list[str] = [
                    "> [!NOTE]\n"
                    "> **Absence Policy Notice**: This topic was not found in your course materials. "  # [CHAT FIX 2]
                    "**Outside the lecture materials**: the following real web search results are external references."  # [CHAT FIX 2]
                ]
                for w_idx, item in enumerate(web_results):
                    w_title = item.get("title", "Biomedical Literature Reference")
                    w_snippet = item.get("content", "")
                    w_url = item.get("url", "")
                    web_citations.append(
                        CitationItem(
                            source_type="web",  # [CHAT FIX 2]
                            url=w_url,  # [CHAT FIX 2]
                            title=w_title,
                            course_code="WEB-REF",
                            page_start=None,  # [CHAT FIX 2]
                            page_end=None,  # [CHAT FIX 2]
                            similarity=0.75,
                            snippet=w_snippet[:200] + "..." if len(w_snippet) > 200 else w_snippet,
                            dense_score=0.75,
                            fts_score=0.8,
                            trgm_score=0.8,
                            rrf_score=0.033,
                            confidence="WEB_FALLBACK",
                            bounding_box=None,
                        )
                    )
                    web_blocks.append(
                        f"[External Web Source {w_idx + 1}: {w_title}]({w_url})\n{w_snippet}"  # [CHAT FIX 2]
                    )
                return "\n\n".join(web_blocks), web_citations

            return None, []  # [CHAT FIX 2]

        # 7. Sibling or Full-Segment Expansion for Top Match
        if reranked_matches and (expand_full_segment or expand_siblings):
            top_chunk = reranked_matches[0]
            try:
                async with get_db_connection() as conn:
                    if conn:
                        doc_uuid = uuid.UUID(top_chunk["document_id"])
                        c_idx = top_chunk["chunk_index"]
                        seg_id = top_chunk["segment_id"]

                        if expand_full_segment and seg_id:
                            seg_sql = """
                                SELECT content
                                FROM public.document_chunks
                                WHERE document_id = $1 AND segment_id = $2 -- [TENANT FIX]
                                  AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.university_id = $3 AND d.status = 'active' AND d.deleted_at IS NULL) -- [TENANT FIX]
                                ORDER BY chunk_index ASC;
                            """
                            seg_rows = await conn.fetch(  # [TENANT FIX]
                                seg_sql,  # [TENANT FIX]
                                doc_uuid,  # [TENANT FIX]
                                uuid.UUID(seg_id),  # [TENANT FIX]
                                filter_uni_uuid,  # [TENANT FIX]
                            )  # [TENANT FIX]
                            if seg_rows:
                                top_chunk["expanded_content"] = "\n\n".join(
                                    r["content"].strip() for r in seg_rows
                                )
                        elif expand_siblings:
                            sibling_sql = """
                                SELECT id, document_id, content, page_start, page_end, chunk_index
                                FROM public.document_chunks
                                WHERE document_id = $1 AND chunk_index IN ($2, $3) -- [TENANT FIX]
                                  AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.university_id = $4 AND d.status = 'active' AND d.deleted_at IS NULL) -- [TENANT FIX]
                                ORDER BY chunk_index ASC;
                            """
                            siblings = await conn.fetch(
                                sibling_sql,  # [TENANT FIX]
                                doc_uuid,  # [TENANT FIX]
                                max(0, c_idx - 1),  # [TENANT FIX]
                                c_idx + 1,  # [TENANT FIX]
                                filter_uni_uuid,  # [TENANT FIX]
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
            except Exception as exp_err:
                logger.debug("sibling_expansion_failed", error=str(exp_err))

        # 8. Format Citations & Assembled Context Blocks
        citations: list[CitationItem] = []
        context_blocks: list[str] = []

        for idx, match in enumerate(reranked_matches):
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
                f"Confidence: {match['confidence']}, RRF: {match['rrf_score']:.4f}, "
                f"RerankScore: {match.get('rerank_score', 0.0):.4f}]"
            )
            context_blocks.append(f"{block_header}\n{chunk_text}")

        assembled_context = "\n\n".join(context_blocks)
        return assembled_context, citations


rag_engine = RagRetrievalEngine()
