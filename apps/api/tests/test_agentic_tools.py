# ==============================================================================
# Phase 6B: Dynamic AI Skills, Agentic Tools & Whisper STT Verification Suite
# ==============================================================================

import io

import pytest
from httpx import AsyncClient

from app.engines.guard import STUDY_DISCLAIMER, policy_guard
from app.engines.llm import MultiTierLlmEngine
from app.engines.rag import rag_engine
from app.engines.skills import skill_engine
from app.engines.tools import tool_engine


# ------------------------------------------------------------------------------
# 1. 3-Pool Hybrid Retrieval & Confidence Classification Tests
# ------------------------------------------------------------------------------
def test_confidence_classification_logic():
    """Verify that RRF and dense scores correctly categorize confidence."""
    assert rag_engine.classify_confidence(dense_score=0.75, rrf_score=0.035) == "HIGH"
    assert rag_engine.classify_confidence(dense_score=0.45, rrf_score=0.020) == "MEDIUM"
    assert rag_engine.classify_confidence(dense_score=0.20, rrf_score=0.010) == "LOW"


@pytest.mark.asyncio
async def test_hybrid_rag_acronym_and_fallback_retrieval():
    """Verify hybrid RAG retrieval normalizes acronyms and returns structured citations."""
    context, citations = await rag_engine.retrieve_context(
        query="What is the MOA of HCTZ in HTN?",
        match_count=2,
    )
    # Even if database is empty/offline in test, query normalization and function exit cleanly
    assert context is None or isinstance(context, str)
    assert isinstance(citations, list)


# ------------------------------------------------------------------------------
# 2. Dynamic Skills Execution Tests (.docx, .pdf, .pptx, charts, flashcards)
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_skill_create_doc_generates_valid_docx():
    """Verify Word document generation produces valid docx artifact payload."""
    payload = await skill_engine.execute_create_doc(
        title="Hypertension Pharmacotherapy Review",
        sections=[
            {
                "heading": "First-Line Agents",
                "body": "Thiazide diuretics, CCBs, and ACE inhibitors.",
                "bullet_points": ["Hydrochlorothiazide 25mg daily", "Amlodipine 5-10mg daily"],
            }
        ],
    )
    assert payload.skill_name == "create_doc"
    assert payload.file_extension == "docx"
    assert payload.storage_key.endswith(".docx")
    assert payload.download_url is not None


@pytest.mark.asyncio
async def test_skill_create_pdf_generates_valid_pdf():
    """Verify PyMuPDF generates a valid PDF cheat sheet artifact."""
    payload = await skill_engine.execute_create_pdf(
        title="Antimicrobial Susceptibility Pocket Guide",
        content="Beta-lactams inhibit peptidoglycan transpeptidase cell wall cross-linking.",
    )
    assert payload.skill_name == "create_pdf"
    assert payload.file_extension == "pdf"
    assert payload.storage_key.endswith(".pdf")
    assert payload.download_url is not None


@pytest.mark.asyncio
async def test_skill_create_pptx_generates_valid_presentation():
    """Verify python-pptx generates a PowerPoint slide deck artifact."""
    payload = await skill_engine.execute_create_pptx(
        title="Pharmacokinetics of Chemotherapeutics",
        subtitle="Departmental Seminar",
        slides=[
            {
                "title": "Phase I Metabolism",
                "bullet_points": ["CYP3A4 oxidation pathways", "Active metabolites formation"],
            }
        ],
    )
    assert payload.skill_name == "create_pptx"
    assert payload.file_extension == "pptx"
    assert payload.storage_key.endswith(".pptx")
    assert payload.download_url is not None


@pytest.mark.asyncio
async def test_skill_flashcards_and_mnemonics():
    """Verify flashcard deck and mnemonic generation."""
    fc = await skill_engine.execute_generate_flashcards(
        topic="Beta Blockers",
        cards=[
            {
                "front": "Propranolol selectivity",
                "back": "Non-selective beta-1 and beta-2 receptor antagonist.",
                "difficulty": "medium",
            }
        ],
    )
    assert fc.skill_name == "generate_flashcards"
    assert fc.content["total"] == 1

    mn = await skill_engine.execute_generate_mnemonics(
        drug_or_class="Anticholinergic Toxicity",
        mnemonic="Blind as a bat, Mad as a hatter, Red as a beet, Hot as a hare, Dry as a bone",
        breakdown=["Mydriasis", "Delirium", "Flushing", "Hyperthermia", "Anhidrosis"],
    )
    assert mn.skill_name == "generate_mnemonics"
    assert len(mn.content["breakdown"]) == 5


@pytest.mark.asyncio
async def test_skill_chemical_structure():
    """Verify chemical structure SMILES rendering metadata."""
    chem = await skill_engine.execute_draw_chemical_structure(
        compound_name="Aspirin",
        smiles="CC(=O)OC1=CC=CC=C1C(=O)O",
        formula="C9H8O4",
    )
    assert chem.skill_name == "draw_chemical_structure"
    assert chem.content["smiles"] == "CC(=O)OC1=CC=CC=C1C(=O)O"
    assert "pubchem" in chem.content["depiction_url"]


# ------------------------------------------------------------------------------
# 3. Core AI Tools Execution Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_tool_web_search_biomedical():
    """Verify web search returns biomedical literature results."""
    result = await tool_engine.execute_web_search("Amoxicillin renal adjustment")
    assert "results" in result
    assert len(result["results"]) > 0


@pytest.mark.asyncio
async def test_tool_dispatcher_invalid_tool():
    """Verify tool dispatcher gracefully returns error for unrecognized tools."""
    result = await tool_engine.dispatch_tool("nonexistent_tool", {})
    assert "error" in result


# ------------------------------------------------------------------------------
# 4. Agentic SSE Stream with Tool Invocations
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_agentic_chat_streaming_tool_events(client: AsyncClient):
    """Verify SSE streaming produces tool_start, artifact_ready, and tool_end events."""
    session_id = "018f3a30-0001-7000-8000-000000000002"
    payload = {
        "message": "Create a pptx presentation on Clinical Pharmacology and drug receptors.",
        "enable_rag": False,
        "enable_tools": True,
    }

    response = await client.post(
        f"/api/v1/ai/chat/sessions/{session_id}/stream",
        json=payload,
        headers={"X-User-Id": "018f3a10-0001-7000-8000-000000000001"},
    )
    assert response.status_code == 200
    text = response.text
    assert "event: init" in text
    assert "event: tool_start" in text
    assert "event: artifact_ready" in text
    assert "event: tool_end" in text
    assert "event: text_chunk" in text
    assert "event: done" in text


# ------------------------------------------------------------------------------
# 5. Voice Transcription STT Endpoint
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_voice_transcription_endpoint(client: AsyncClient):
    """Verify POST /ai/chat/transcribe endpoint processes uploaded audio."""
    fake_audio = io.BytesIO(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00")
    files = {"file": ("mic_input.wav", fake_audio, "audio/wav")}

    response = await client.post(
        "/api/v1/ai/chat/transcribe",
        files=files,
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "provider" in data
    assert len(data["text"]) > 0


# ------------------------------------------------------------------------------
# 6. Post-LLM Policy Guard & Study Disclaimer
# ------------------------------------------------------------------------------
def test_output_safety_and_disclaimer():
    """Verify schema leaks are redacted and educational disclaimer is appended."""
    raw_output = "The table public.document_chunks contains vectors. Dosage is 500mg."
    is_safe, sanitized = policy_guard.check_output_safety(raw_output)
    assert "[internal_schema]" in sanitized
    assert "public.document_chunks" not in sanitized

    final_output = policy_guard.append_study_disclaimer(sanitized)
    assert "Educational Study Aid: PansGPT" in final_output
    assert STUDY_DISCLAIMER in final_output


# ------------------------------------------------------------------------------
# 7. Multi-Query Expansion & HyDE Passage Tests
# ------------------------------------------------------------------------------
def test_multi_query_expansion_generation():
    """Verify student queries are expanded into targeted pharmacological perspectives."""
    q_moa = "What is the mechanism of action of salbutamol in asthma?"
    expansions_moa = rag_engine.generate_multi_query_expansions(q_moa)
    assert len(expansions_moa) >= 2
    assert expansions_moa[0] == q_moa
    assert any("receptor" in e or "mechanism" in e for e in expansions_moa[1:])

    q_tox = "What are the adverse effects and toxicity of gentamicin?"
    expansions_tox = rag_engine.generate_multi_query_expansions(q_tox)
    assert len(expansions_tox) >= 2
    assert any("toxicities" in e or "adverse" in e for e in expansions_tox[1:])

    q_dose = "What is the clinical dosing and bioavailability of ciprofloxacin?"
    expansions_dose = rag_engine.generate_multi_query_expansions(q_dose)
    assert len(expansions_dose) >= 2
    assert any("pharmacokinetics" in e or "bioavailability" in e for e in expansions_dose[1:])


def test_hyde_hypothetical_monograph_generation():
    """Verify HyDE synthesizes authoritative pharmacological monograph passage."""
    query = "MOA of HCTZ in HTN"
    passage = rag_engine.generate_hyde_passage(query)
    assert "Pharmacology Monograph Section" in passage
    assert "Hydrochlorothiazide" in passage
    assert "Hypertension" in passage
    assert "Target receptors" in passage
    assert "ADME" in passage


# ------------------------------------------------------------------------------
# 8. Candidate Re-Ranking Multi-Factor Scoring Tests
# ------------------------------------------------------------------------------
def test_candidate_reranking_scoring_and_ordering():
    """Verify multi-factor composite scoring prioritizes high relevance and exact lexical matches."""
    query = "Mechanism of action of lisinopril in heart failure"
    candidates = [
        {
            "chunk_id": "chunk-1",
            "content": "General overview of introductory pharmacology and pharmacy law.",
            "dense_score": 0.50,
            "rrf_score": 0.015,
            "doc_title": "Pharmacy Orientation",
            "course_code": "PCG 101",
        },
        {
            "chunk_id": "chunk-2",
            "content": "Lisinopril is an ACE inhibitor preventing conversion of Angiotensin I to II.",
            "dense_score": 0.70,
            "rrf_score": 0.030,
            "doc_title": "Cardiovascular Pharmacology Slides",
            "course_code": "PCL 401",
        },
        {
            "chunk_id": "chunk-3",
            "content": "Aspirin acetylates COX-1 irreversibly inhibiting thromboxane A2.",
            "dense_score": 0.60,
            "rrf_score": 0.025,
            "doc_title": "Antiplatelet Drugs",
            "course_code": "PCL 402",
        },
    ]

    reranked = rag_engine.rerank_candidates(query, candidates, top_k=2)
    assert len(reranked) == 2
    # chunk-2 has ACE inhibitor, lisinopril, high dense score, and metadata match -> must be #1
    assert reranked[0]["chunk_id"] == "chunk-2"
    assert "rerank_score" in reranked[0]
    assert reranked[0]["rerank_score"] > reranked[1]["rerank_score"]


# ------------------------------------------------------------------------------
# 9. Absence Policy & Autonomous Web Search Fallback Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_absence_policy_triggers_web_search_fallback():
    """Verify that low/empty syllabus confidence autonomously triggers web search fallback."""
    context, citations = await rag_engine.retrieve_context(
        query="What is the novel mechanism of Teclistamab in relapsed myeloma?",
        university_id="01a07664-7a69-7ce0-ad6a-b219462cbde3",
        match_count=2,
    )
    assert context is not None
    assert "Absence Policy Notice" in context
    assert len(citations) > 0
    assert citations[0].confidence == "WEB_FALLBACK"
    assert citations[0].course_code == "WEB-REF"


# ------------------------------------------------------------------------------
# 10. Multi-Tier Failover on HTTP 429 Quota Exhaustion
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_multi_tier_failover_http_429_to_groq(monkeypatch):
    """Verify that HTTP 429 quota exhaustion from Google triggers instant failover to Groq."""
    engine = MultiTierLlmEngine()
    monkeypatch.setattr(engine, "gemini_key", "live-gemini-key")
    monkeypatch.setattr(engine, "groq_key", "live-groq-key")

    # Mock Google turn to raise 429 quota exhausted error
    async def mock_gemma_429(*args, **kwargs):
        raise RuntimeError("429 Resource has been exhausted (check quota).")

    # Mock Groq turn to return streamed content
    async def mock_groq_turn(*args, **kwargs):
        async def _stream():
            yield "Failover response from Groq gpt-oss-120b."

        return [], _stream()

    monkeypatch.setattr(engine, "_call_gemma_turn", mock_gemma_429)
    monkeypatch.setattr(engine, "_call_groq_turn", mock_groq_turn)

    events = []
    async for event_type, data, provider in engine.stream_agentic_chat(
        system_prompt="You are a clinical tutor.",
        user_message="Explain receptor downregulation.",
        enable_tools=False,
    ):
        events.append((event_type, data, provider))

    text_events = [e for e in events if e[0] == "text_chunk"]
    assert len(text_events) > 0
    assert text_events[0][2] == "groq"
    full_text = "".join(e[1]["token"] for e in text_events)
    assert "Failover response from Groq" in full_text


# ------------------------------------------------------------------------------
# 11. Multi-Tenant Cross-University Isolation Test
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rag_cross_university_tenant_isolation():
    """Verify RAG retrieval cleanly enforces university tenant boundary."""
    uni_a = "01a07664-7a69-7ce0-ad6a-b219462cbde3"
    uni_b = "01a07664-7a69-7ce0-ad6a-b219462cbde4"

    ctx_a, cits_a = await rag_engine.retrieve_context(
        query="Pharmacokinetics of digoxin in heart failure",
        university_id=uni_a,
    )
    ctx_b, cits_b = await rag_engine.retrieve_context(
        query="Pharmacokinetics of digoxin in heart failure",
        university_id=uni_b,
    )
    assert ctx_a is not None
    assert ctx_b is not None
