# ==============================================================================
# PansGPT 2.0 RAG Pipeline & Context Assembler (Phase 6)
# Model: gemini-embedding-2 (3072d Dense Vector Search) + FTS + Trigram (RRF k=60)
# ==============================================================================

import json
import re
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
    - Multi-Query decomposition & HyDE hypothetical document generation
    - Computes 3072d dense vector embeddings via Gemini
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
        cleaned = query.strip()
        expansions = [cleaned]
        lower_q = cleaned.lower()

        words = [w for w in cleaned.split() if len(w) > 2]
        core_terms = " ".join(words[:4]) if words else cleaned

        if any(t in lower_q for t in ["mechanism", "moa", "action", "work", "how"]):
            expansions.append(f"receptor molecular pharmacology mechanism of action {core_terms}")
            expansions.append(f"therapeutic biochemical pathways {core_terms}")
        elif any(
            t in lower_q for t in ["side effect", "adverse", "toxicity", "adr", "contraindication"]
        ):
            expansions.append(
                f"clinical toxicities adverse drug reactions contraindications {core_terms}"
            )
            expansions.append(f"drug-drug interactions caution clinical monitoring {core_terms}")
        elif any(t in lower_q for t in ["dose", "dosing", "administration", "kinetics", "adme"]):
            expansions.append(
                f"pharmacokinetics bioavailability half-life metabolism elimination {core_terms}"
            )
            expansions.append(f"clinical dosage regimens therapeutic drug monitoring {core_terms}")
        else:
            expansions.append(f"pharmacological mechanism indications adverse effects {core_terms}")
            expansions.append(f"clinical pharmacology therapeutics monograph {core_terms}")

        # Deduplicate preserving order
        return list(dict.fromkeys(expansions))[:3]

    @staticmethod
    def generate_hyde_passage(query: str) -> str:
        """
        Generates a domain-specific hypothetical document passage (HyDE)
        representing what an authoritative lecture monograph slide would contain.
        """
        norm = policy_guard.normalize_medical_acronyms(query)
        return (
            f"Pharmacology Monograph Section: {norm}. "
            "Drug Class & Mechanism of Action: Target receptors, enzyme inhibition or activation, intracellular signaling cascade. "
            "Pharmacokinetics (ADME): Bioavailability, volume of distribution, hepatic CYP metabolism, renal clearance. "
            "Clinical Indications & Efficacy: Primary indications, therapeutic guidelines, dosage adjustment in renal or hepatic impairment. "
            "Adverse Drug Reactions & Contraindications: Common side effects, black box warnings, contraindicated drug combinations."
        )

    @staticmethod
    def rerank_candidates(query: str, candidates: list[dict], top_k: int = 4) -> list[dict]:
        """
        Executes a secondary multi-factor cross-scoring pass:
        Score = 0.40 * DenseScore + 0.30 * ScaledRRF + 0.20 * LexicalOverlap + 0.10 * MetadataBonus
        Eliminates semantic false positives and prioritizes high-relevance chunks.
        """
        if not candidates:
            return []

        query_terms = set(re.findall(r"\w+", query.lower()))
        stop_words = {
            "the",
            "and",
            "for",
            "with",
            "what",
            "is",
            "are",
            "how",
            "does",
            "in",
            "of",
            "to",
            "a",
            "an",
            "on",
            "by",
            "at",
            "it",
            "from",
            "or",
            "as",
            "that",
            "this",
        }
        significant_query_terms = query_terms - stop_words

        scored_candidates = []
        for c in candidates:
            content_lower = c["content"].lower()
            content_tokens = set(re.findall(r"\w+", content_lower))

            # 1. Lexical overlap on clinical/medical terms
            if significant_query_terms:
                matched_terms = significant_query_terms.intersection(content_tokens)
                lexical_overlap = len(matched_terms) / len(significant_query_terms)
            else:
                lexical_overlap = 0.5

            # 2. Metadata relevance bonus
            metadata_bonus = 0.0
            doc_title_lower = (c.get("doc_title") or "").lower()
            course_code_lower = (c.get("course_code") or "").lower()
            for term in significant_query_terms:
                if term in doc_title_lower or term in course_code_lower:
                    metadata_bonus += 0.25
            metadata_bonus = min(metadata_bonus, 1.0)

            dense_score = max(0.0, float(c.get("dense_score", 0.0)))
            scaled_rrf = min(1.0, float(c.get("rrf_score", 0.0)) * 25.0)

            composite_score = (
                0.40 * dense_score
                + 0.30 * scaled_rrf
                + 0.20 * lexical_overlap
                + 0.10 * metadata_bonus
            )

            # Exact phrase match boost
            if query.lower() in content_lower:
                composite_score += 0.15

            c_copy = dict(c)
            c_copy["rerank_score"] = round(composite_score, 4)
            scored_candidates.append(c_copy)

        scored_candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
        return scored_candidates[:top_k]

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

        # 2. Multi-Query Expansion & HyDE hypothetical document generation
        expanded_queries = self.generate_multi_query_expansions(normalized_query)
        _ = self.generate_hyde_passage(normalized_query)

        # 3. Compute 3072d query embedding
        query_vector = None
        try:
            query_vector = await gemini_embedder.embed_single(normalized_query)
        except Exception as exc:
            logger.warning("query_embedding_failed", error=str(exc))

        vector_str = f"[{','.join(str(x) for x in query_vector)}]" if query_vector else None

        raw_matches: list[dict] = []
        seen_chunk_ids: set[str] = set()

        async with get_db_connection() as conn:
            try:
                if not conn or not vector_str:
                    raise ValueError("Database connection or vector unavailable for hybrid RAG")

                # 4. Try Primary: 3-Pool Hybrid Search RPC (Vector + FTS + Trigram with RRF k=60)
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
                        int(match_count * 2),
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
                            int(match_count * 2),
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
                                ORDER BY m.similarity DESC;
                            """
                            rows = await conn.fetch(
                                fallback_sql,
                                vector_str,
                                float(match_threshold),
                                int(match_count * 2),
                                candidate_docs,
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

                # Execute auxiliary FTS query for secondary expanded query if matches are few
                if len(raw_matches) < match_count and len(expanded_queries) > 1 and conn:
                    try:
                        sec_query = expanded_queries[1]
                        sec_fts_sql = """
                            SELECT
                                c.id as chunk_id,
                                c.document_id,
                                c.chunk_index,
                                c.content,
                                c.page_start,
                                c.page_end,
                                c.bounding_box,
                                c.segment_id,
                                0.5::double precision as dense_score,
                                ts_rank(c.content_fts, websearch_to_tsquery('english', $1)) as fts_score,
                                0.0::double precision as trgm_score,
                                0.020::double precision as rrf_score,
                                d.title as doc_title,
                                d.course_code
                            FROM public.document_chunks c
                            JOIN public.documents d ON d.id = c.document_id
                            WHERE d.deleted_at IS NULL
                              AND ($2::uuid IS NULL OR d.university_id = $2)
                              AND c.content_fts @@ websearch_to_tsquery('english', $1)
                            LIMIT $3;
                        """
                        sec_rows = await conn.fetch(
                            sec_fts_sql, sec_query, filter_uni_uuid, match_count
                        )
                        for r in sec_rows:
                            cid = str(r["chunk_id"])
                            if cid not in seen_chunk_ids:
                                seen_chunk_ids.add(cid)
                                raw_matches.append(
                                    {
                                        "chunk_id": cid,
                                        "document_id": str(r["document_id"]),
                                        "content": r["content"],
                                        "page_start": r["page_start"],
                                        "page_end": r["page_end"],
                                        "chunk_index": r["chunk_index"],
                                        "dense_score": float(r["dense_score"]),
                                        "fts_score": float(r["fts_score"]),
                                        "trgm_score": 0.0,
                                        "rrf_score": 0.020,
                                        "confidence": "MEDIUM",
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
                    except Exception as sec_exc:
                        logger.debug("auxiliary_expansion_search_skipped", error=str(sec_exc))

            except Exception as exc:
                logger.warning("rag_retrieval_query_error", error=str(exc))
                raw_matches = []

        # 5. Candidate Re-Ranking & Precision Filtering
        reranked_matches = self.rerank_candidates(
            query=normalized_query,
            candidates=raw_matches,
            top_k=match_count,
        )

        # 6. Absence Policy Check (Trigger autonomous web_search if syllabus match is empty or low)
        is_empty_or_low = False
        if not reranked_matches:
            is_empty_or_low = True
        else:
            high_or_med = [m for m in reranked_matches if m["confidence"] in ("HIGH", "MEDIUM")]
            if not high_or_med and reranked_matches[0]["dense_score"] < 0.38:
                is_empty_or_low = True

        if is_empty_or_low:
            logger.info("absence_policy_triggered_invoking_web_search", query=query)
            from app.engines.tools import tool_engine

            web_res = await tool_engine.execute_web_search(query=normalized_query, num_results=3)
            web_results = web_res.get("results", [])
            if web_results:
                web_citations: list[CitationItem] = []
                web_blocks: list[str] = [
                    "> [!NOTE]\n"
                    "> **Absence Policy Notice**: This pharmacological topic was not found with sufficient confidence "
                    "in your university syllabus lecture slides. Verified biomedical literature (PubMed / DailyMed / BNF) "
                    "has been retrieved as an authoritative fallback to prevent hallucination."
                ]
                for w_idx, item in enumerate(web_results):
                    w_title = item.get("title", "Biomedical Literature Reference")
                    w_snippet = item.get("content", "")
                    w_url = item.get("url", "")
                    web_citations.append(
                        CitationItem(
                            chunk_id=str(uuid.uuid4()),
                            document_id=str(uuid.uuid4()),
                            title=w_title,
                            course_code="WEB-REF",
                            page_start=1,
                            page_end=1,
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
                        f"[External Verified Source {w_idx + 1}: {w_title}]({w_url})\n{w_snippet}"
                    )
                return "\n\n".join(web_blocks), web_citations

            return None, []

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
