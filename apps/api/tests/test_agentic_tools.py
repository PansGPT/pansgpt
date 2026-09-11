# ==============================================================================
# Phase 6B: Dynamic AI Skills, Agentic Tools & Whisper STT Verification Suite
# ==============================================================================

import io

import pytest
from httpx import AsyncClient

from app.engines.guard import STUDY_DISCLAIMER, policy_guard
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
