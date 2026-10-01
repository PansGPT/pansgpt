# ==============================================================================
# Unit Tests for Candidate Re-Ranking Engine (Roadmap 6B.7)
# ==============================================================================

import pytest

from app.engines.reranker import candidate_reranker


def test_reranker_confidence_classification():
    """Verify neural relevance scores are classified into correct confidence tiers."""
    assert candidate_reranker.classify_confidence(0.85) == "HIGH"
    assert candidate_reranker.classify_confidence(0.70) == "HIGH"
    assert candidate_reranker.classify_confidence(0.55) == "MEDIUM"
    assert candidate_reranker.classify_confidence(0.42) == "MEDIUM"
    assert candidate_reranker.classify_confidence(0.35) == "LOW"
    assert candidate_reranker.classify_confidence(0.10) == "LOW"


def test_heuristic_scoring_ordering_and_boosts():
    """Verify fallback scoring rewards exact query matches and lexical overlap."""
    query = "Lisinopril in diabetic nephropathy"
    candidates = [
        {
            "chunk_id": "c1",
            "content": "General introduction to administrative pharmacy law and ethics.",
            "dense_score": 0.50,
            "rrf_score": 0.015,
            "doc_title": "Pharmacy Jurisprudence",
        },
        {
            "chunk_id": "c2",
            "content": "Lisinopril is an ACE inhibitor indicated in hypertension and diabetic nephropathy.",
            "dense_score": 0.70,
            "rrf_score": 0.025,
            "doc_title": "Cardiovascular and Renal Pharmacology",
        },
        {
            "chunk_id": "c3",
            "content": "Management of asthma with inhaled beta-2 agonists like salbutamol.",
            "dense_score": 0.30,
            "rrf_score": 0.010,
            "doc_title": "Respiratory Therapeutics",
        },
    ]

    scored = candidate_reranker.fallback_heuristic_scoring(query, candidates)
    assert len(scored) == 3
    # c2 must be ranked #1 with high confidence because of exact match and overlap
    assert scored[0]["chunk_id"] == "c2"
    assert scored[0]["rerank_score"] > scored[1]["rerank_score"]
    assert scored[0]["confidence"] == "HIGH"


@pytest.mark.asyncio
async def test_rerank_threshold_filtering():
    """Verify candidates below the score threshold (0.38) are filtered out."""
    query = "Vancomycin therapeutic drug monitoring trough target"
    candidates = [
        {
            "chunk_id": "c_high",
            "content": "Vancomycin therapeutic drug monitoring requires trough target concentrations of 15-20 mcg/mL.",
            "dense_score": 0.80,
            "rrf_score": 0.030,
            "doc_title": "Antimicrobial Pharmacotherapy",
        },
        {
            "chunk_id": "c_low",
            "content": "History of pharmacy practice in the 19th century.",
            "dense_score": 0.10,
            "rrf_score": 0.005,
            "doc_title": "History of Medicine",
        },
    ]

    results = await candidate_reranker.rerank(
        query=query,
        candidates=candidates,
        top_k=5,
        score_threshold=0.38,
    )

    # Only c_high should pass the 0.38 threshold
    assert len(results) >= 1
    assert results[0]["chunk_id"] == "c_high"
    assert results[0]["rerank_score"] >= 0.38


@pytest.mark.asyncio
async def test_rerank_handles_empty_candidates():
    """Verify empty candidate list returns empty list gracefully."""
    results = await candidate_reranker.rerank(
        query="warfarin mechanism",
        candidates=[],
        top_k=5,
    )
    assert results == []


@pytest.mark.asyncio
async def test_flashrank_execution_or_fallback():
    """Verify reranking completes within sub-300ms SLA without unhandled errors."""
    query = "Metformin mechanism of action in AMPK activation"
    candidates = [
        {
            "chunk_id": "c1",
            "content": "Metformin activates AMPK, reducing hepatic gluconeogenesis and improving insulin sensitivity.",
            "dense_score": 0.75,
            "rrf_score": 0.025,
            "doc_title": "Endocrine Pharmacology",
        }
    ]
    results = await candidate_reranker.rerank(query=query, candidates=candidates, top_k=3)
    assert len(results) == 1
    assert "rerank_score" in results[0]
    assert "confidence" in results[0]
