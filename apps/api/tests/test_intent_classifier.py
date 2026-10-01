# ==============================================================================
# Unit & Integration Tests: Intent Routing & Complexity Classifier (Roadmap 6B.20)
# ==============================================================================


from app.engines.intent_classifier import intent_classifier
from app.models.chat import (
    ComplexityLevel,
    IntentType,
    RouteType,
)


def test_intent_classifier_greetings_fast_path():
    """Verify greetings and pleasantries route to Fast Path with zero RAG and zero tools."""
    greetings = [
        "Hello",
        "hi there",
        "good morning!",
        "Thanks a lot",
        "thank you",
        "who are you?",
    ]
    for g in greetings:
        res = intent_classifier.classify(g)
        assert res.intent == IntentType.GREETING_CONVERSATIONAL, f"Failed for '{g}'"
        assert res.complexity == ComplexityLevel.SIMPLE
        assert res.route == RouteType.FAST_PATH
        assert res.requires_rag is False
        assert res.requires_tools is False
        assert res.confidence >= 0.90


def test_intent_classifier_direct_definitions_fast_path():
    """Verify concise definitions route to Fast Path when not anchored to a document."""
    queries = [
        "What is bioavailability?",
        "Define agonist",
        "What is clearance?",
        "explain the term volume of distribution",
    ]
    for q in queries:
        res = intent_classifier.classify(q)
        assert res.intent == IntentType.DIRECT_DEFINITION, f"Failed for '{q}'"
        assert res.complexity == ComplexityLevel.SIMPLE
        assert res.route == RouteType.FAST_PATH
        assert res.requires_rag is False
        assert res.requires_tools is False
        assert res.confidence >= 0.80


def test_intent_classifier_document_id_override():
    """Verify explicit document_id always forces Complex Path with RAG."""
    res = intent_classifier.classify(
        query="Hello",  # Even with greeting wording!
        document_id="018f3a30-0001-7000-8000-000000000001",
    )
    assert res.route == RouteType.COMPLEX_PATH
    assert res.requires_rag is True
    assert res.confidence == 1.0


def test_intent_classifier_skill_generation():
    """Verify presentation, document, and flashcard requests trigger tool loop."""
    skill_queries = [
        ("Please make a pptx on adrenergic receptors", "create_pptx"),
        ("Create a word document on penicillin", "create_doc"),
        ("Generate flashcards for autonomic nervous system", "generate_flashcards"),
        ("Give me a mnemonic for cholinergic toxidrome", "generate_mnemonics"),
        ("Show me the SMILES and chemical structure for aspirin", "draw_chemical_structure"),
    ]
    for q, expected_skill in skill_queries:
        res = intent_classifier.classify(q)
        assert res.intent == IntentType.SKILL_GENERATION, f"Failed for '{q}'"
        assert res.complexity == ComplexityLevel.COMPLEX
        assert res.route == RouteType.COMPLEX_PATH
        assert res.requires_tools is True
        assert expected_skill in res.suggested_skills


def test_intent_classifier_clinical_reasoning():
    """Verify clinical case studies and drug interactions enter Complex Path."""
    queries = [
        "A 65-year-old patient presents with severe asthma and hypertension. Compare beta blocker options.",
        "What is the drug interaction between warfarin and amiodarone?",
        "How do I adjust the dose of gentamicin in a patient with GFR of 30?",
    ]
    for q in queries:
        res = intent_classifier.classify(q)
        assert res.intent == IntentType.CLINICAL_REASONING, f"Failed for '{q}'"
        assert res.complexity == ComplexityLevel.COMPLEX
        assert res.route == RouteType.COMPLEX_PATH
        assert res.requires_rag is True


def test_intent_classifier_explicit_payload_disables():
    """Verify explicit user flags (enable_rag=False, enable_tools=False) are respected."""
    res = intent_classifier.classify(
        query="Explain slide 4 of PCL 301 lecture notes",
        user_enable_rag=False,
        user_enable_tools=False,
    )
    assert res.requires_rag is False
    assert res.requires_tools is False
