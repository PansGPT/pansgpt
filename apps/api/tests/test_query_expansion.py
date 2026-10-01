# ==============================================================================
# Unit Tests for Query Expansion & HyDE Engine (Roadmap 6B.6)
# ==============================================================================

import pytest

from app.engines.query_expansion import query_expansion_engine


def test_expansion_bypass_short_queries():
    """Verify short queries (<= 3 words) without comparative terms bypass expansion."""
    assert query_expansion_engine.should_bypass_expansion("metformin") is True
    assert query_expansion_engine.should_bypass_expansion("aspirin dose") is True
    assert query_expansion_engine.should_bypass_expansion("ACE inhibitors") is True
    # Comparative queries should NOT bypass
    assert query_expansion_engine.should_bypass_expansion("lisinopril vs losartan") is False
    assert query_expansion_engine.should_bypass_expansion("aspirin and warfarin") is False


def test_expansion_bypass_definitions():
    """Verify simple definition queries bypass expansion to minimize latency."""
    assert query_expansion_engine.should_bypass_expansion("what is bioavailability") is True
    assert query_expansion_engine.should_bypass_expansion("define pharmacodynamics") is True
    assert query_expansion_engine.should_bypass_expansion("meaning of clearance") is True


def test_expansion_bypass_single_pk_parameter():
    """Verify direct pharmacokinetic parameter queries bypass expansion."""
    assert query_expansion_engine.should_bypass_expansion("half-life of amiodarone") is True
    assert query_expansion_engine.should_bypass_expansion("bioavailability of digoxin") is True
    assert query_expansion_engine.should_bypass_expansion("clearance of gentamicin") is True


def test_heuristic_expansions_mechanism_perspective():
    """Verify heuristic decomposition produces 3 targeted pharmacological perspectives."""
    query = "How does metformin work in type 2 diabetes mellitus?"
    expansions = query_expansion_engine.generate_heuristic_expansions(query)
    assert len(expansions) >= 3
    # Check perspectives
    assert any("mechanism of action" in e or "receptor" in e for e in expansions)
    assert any("pathway" in e or "signaling" in e for e in expansions)


def test_heuristic_expansions_toxicology_perspective():
    """Verify adverse effect queries generate toxicology and interaction perspectives."""
    query = "What are the adverse effects and contraindications of gentamicin?"
    expansions = query_expansion_engine.generate_heuristic_expansions(query)
    assert len(expansions) >= 3
    assert any("toxicities" in e or "adverse" in e for e in expansions)
    assert any("interactions" in e or "caution" in e for e in expansions)


def test_heuristic_hyde_structure():
    """Verify HyDE monograph template contains all required clinical monograph headings."""
    query = "lisinopril in diabetic nephropathy"
    passage = query_expansion_engine.generate_heuristic_hyde(query)
    assert "Pharmacology Monograph Section" in passage
    assert "Mechanism of Action" in passage
    assert "Pharmacokinetics (ADME)" in passage
    assert "Clinical Indications & Efficacy" in passage
    assert "Adverse Drug Reactions & Contraindications" in passage


@pytest.mark.asyncio
async def test_expand_and_generate_hyde_concurrency():
    """Verify expand_and_generate_hyde returns both query variants and a monograph passage."""
    query = "Compare efficacy and renal safety of lisinopril and losartan"
    expanded_queries, hyde_passage = await query_expansion_engine.expand_and_generate_hyde(query)
    assert isinstance(expanded_queries, list)
    assert len(expanded_queries) >= 2
    assert isinstance(hyde_passage, str)
    assert len(hyde_passage) > 50


@pytest.mark.asyncio
async def test_expand_and_generate_hyde_bypass_path():
    """Verify bypassed queries return a single normalized query and empty HyDE passage."""
    query = "what is pharmacokinetics"
    expanded_queries, hyde_passage = await query_expansion_engine.expand_and_generate_hyde(query)
    assert len(expanded_queries) == 1
    assert hyde_passage == ""
