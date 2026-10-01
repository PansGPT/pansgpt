# ==============================================================================
# PansGPT 2.0 Neural Candidate Re-Ranking Engine (Roadmap 6B.7)
# Primary: FlashRank In-Process ONNX (ms-marco-TinyBERT-L-2-v2) ($0 Budget Tier)
# Secondary: Cohere Rerank API (v3.5)
# Fallback: Multi-Factor Heuristic Scoring Pass with Circuit Breaker (<300ms SLA)
# ==============================================================================

import asyncio
import re
import time
from typing import Any

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class CandidateReranker:
    """
    Tiered precision candidate re-ranker for clinical pharmacy RAG:
    - Evaluates candidate chunks from 3-pool hybrid retrieval against user query.
    - Tier 1: In-process FlashRank ONNX cross-encoder (CPU-optimized, ~20-40ms).
    - Tier 1b: Cohere Rerank API v3.5 (opt-in via COHERE_API_KEY).
    - Tier 2: Resilient deterministic heuristic fallback on timeout (>300ms) or error.
    - Precision Threshold Filter: Prunes noise and irrelevant chunks (score < 0.38).
    """

    def __init__(self) -> None:
        self._flashrank_client: Any = None
        self._flashrank_lock = asyncio.Lock()
        self._initialized = False

    def _get_flashrank_client(self) -> Any:
        """Lazy thread-safe initialization of FlashRank Ranker model."""
        if self._flashrank_client is None:
            try:
                from flashrank import Ranker

                model_name = settings.RERANKER_MODEL or "ms-marco-TinyBERT-L-2-v2"
                self._flashrank_client = Ranker(model_name=model_name)
                logger.info("flashrank_model_loaded", model=model_name)
            except Exception as exc:
                logger.warning("flashrank_initialization_failed", error=str(exc))
                self._flashrank_client = False
        return self._flashrank_client if self._flashrank_client is not False else None

    @staticmethod
    def classify_confidence(score: float) -> str:
        """Classifies normalized neural relevance score into confidence brackets."""
        if score >= 0.60:
            return "HIGH"
        if score >= 0.38:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def fallback_heuristic_scoring(
        query: str, candidates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Deterministic multi-factor cross-scoring pass used when neural rerankers fail or timeout:
        Score = 0.40 * DenseScore + 0.30 * ScaledRRF + 0.20 * LexicalOverlap + 0.10 * MetadataBonus
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
        significant_terms = query_terms - stop_words

        scored = []
        for c in candidates:
            content_lower = c.get("content", "").lower()
            content_tokens = set(re.findall(r"\w+", content_lower))

            if significant_terms:
                matched_terms = significant_terms.intersection(content_tokens)
                lexical_overlap = len(matched_terms) / len(significant_terms)
            else:
                lexical_overlap = 0.5

            metadata_bonus = 0.0
            doc_title = (c.get("doc_title") or "").lower()
            course_code = (c.get("course_code") or "").lower()
            for term in significant_terms:
                if term in doc_title or term in course_code:
                    metadata_bonus += 0.25
            metadata_bonus = min(metadata_bonus, 1.0)

            dense_score = max(0.0, float(c.get("dense_score", 0.0)))
            scaled_rrf = min(1.0, float(c.get("rrf_score", 0.0)) * 25.0)

            composite = (
                0.40 * dense_score
                + 0.30 * scaled_rrf
                + 0.20 * lexical_overlap
                + 0.10 * metadata_bonus
            )

            if query.lower() in content_lower:
                composite += 0.15

            c_copy = dict(c)
            final_score = round(min(1.0, composite), 4)
            c_copy["rerank_score"] = final_score
            c_copy["confidence"] = CandidateReranker.classify_confidence(final_score)
            c_copy["reranker_provider"] = "heuristic_fallback"
            scored.append(c_copy)

        scored.sort(key=lambda x: x["rerank_score"], reverse=True)
        return scored

    async def _rerank_with_flashrank(
        self, query: str, candidates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Executes FlashRank cross-encoder in a background thread."""
        ranker = self._get_flashrank_client()
        if not ranker:
            raise RuntimeError("FlashRank model unavailable")

        from flashrank import RerankRequest

        passages = [
            {"id": idx, "text": c.get("content", ""), "meta": c} for idx, c in enumerate(candidates)
        ]

        rerank_req = RerankRequest(query=query, passages=passages)

        def _sync_rerank() -> list[dict[str, Any]]:
            return ranker.rerank(rerank_req)

        results = await asyncio.to_thread(_sync_rerank)

        scored_candidates: list[dict[str, Any]] = []
        for r in results:
            original_cand = dict(r.get("meta", {}))
            raw_score = float(r.get("score", 0.0))
            # FlashRank outputs logits or probabilities; clamp to [0.0, 1.0]
            normalized_score = round(max(0.0, min(1.0, raw_score)), 4)
            original_cand["rerank_score"] = normalized_score
            original_cand["confidence"] = self.classify_confidence(normalized_score)
            original_cand["reranker_provider"] = "flashrank"
            scored_candidates.append(original_cand)

        return scored_candidates

    async def _rerank_with_cohere(
        self, query: str, candidates: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Executes Cohere Rerank API v3 via async HTTP POST."""
        api_key = settings.COHERE_API_KEY
        if not api_key:
            raise ValueError("COHERE_API_KEY is not configured")

        url = "https://api.cohere.com/v2/rerank"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "PansGPT/2.0-Reranker",
        }
        docs = [c.get("content", "") for c in candidates]
        payload = {
            "model": settings.COHERE_RERANK_MODEL or "rerank-v3.5",
            "query": query,
            "documents": docs,
            "top_n": len(candidates),
            "return_documents": False,
        }

        async with httpx.AsyncClient(timeout=settings.RERANKER_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        results = data.get("results", [])
        scored_candidates: list[dict[str, Any]] = []
        for item in results:
            idx = item["index"]
            score = float(item["relevance_score"])
            original_cand = dict(candidates[idx])
            normalized_score = round(max(0.0, min(1.0, score)), 4)
            original_cand["rerank_score"] = normalized_score
            original_cand["confidence"] = self.classify_confidence(normalized_score)
            original_cand["reranker_provider"] = "cohere"
            scored_candidates.append(original_cand)

        return scored_candidates

    async def rerank(
        self,
        query: str,
        candidates: list[dict[str, Any]],
        top_k: int = 6,
        score_threshold: float = 0.38,
    ) -> list[dict[str, Any]]:
        """
        Reranks retrieved candidate chunks against the user query.
        Guarantees sub-300ms latency via asyncio.wait_for and circuit breaker fallback.
        Filters out candidates below score_threshold and returns top_k items.
        """
        if not candidates:
            return []

        start_time = time.perf_counter()
        timeout = settings.RERANKER_TIMEOUT_SECONDS or 0.30
        scored: list[dict[str, Any]] = []

        provider = settings.RERANKER_PROVIDER
        if settings.COHERE_API_KEY and not settings.COHERE_API_KEY.startswith(
            ("dummy", "placeholder", "test")
        ):
            provider = "cohere"

        try:
            if provider == "cohere":
                scored = await asyncio.wait_for(
                    self._rerank_with_cohere(query, candidates),
                    timeout=timeout,
                )
            elif provider == "flashrank":
                scored = await asyncio.wait_for(
                    self._rerank_with_flashrank(query, candidates),
                    timeout=timeout,
                )
            else:
                scored = self.fallback_heuristic_scoring(query, candidates)

        except TimeoutError:
            logger.warning(
                "reranker_timeout_fallback_engaged",
                provider=provider,
                timeout_s=timeout,
                query=query[:60],
            )
            scored = self.fallback_heuristic_scoring(query, candidates)
        except Exception as exc:
            logger.warning(
                "reranker_error_fallback_engaged",
                provider=provider,
                error=str(exc),
                query=query[:60],
            )
            scored = self.fallback_heuristic_scoring(query, candidates)

        # Sort descending by neural/composite score
        scored.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)

        # Apply Precision Relevance Threshold Filter
        filtered = [c for c in scored if c.get("rerank_score", 0.0) >= score_threshold]

        # If strict threshold filtered everything out, keep the single best candidate if available
        final_candidates = filtered if filtered else scored[:1]

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(
            "rerank_completed",
            provider=provider,
            latency_ms=latency_ms,
            candidates_in=len(candidates),
            candidates_passed=len(filtered),
            top_score=final_candidates[0].get("rerank_score") if final_candidates else 0.0,
        )

        return final_candidates[:top_k]


candidate_reranker = CandidateReranker()
reranker = candidate_reranker
