# ==============================================================================
# PansGPT 2.0 Intent & Complexity Classifier Engine (Phase 6)
# High-speed deterministic classifier for intelligent traffic routing
# ==============================================================================

import re
from typing import Any

import structlog

from app.models.chat import (
    ComplexityLevel,
    IntentType,
    QueryClassification,
    RouteType,
)

logger = structlog.get_logger(__name__)

# Minimum confidence required to authorize Fast Path execution
CONFIDENCE_FAST_PATH_THRESHOLD = 0.80

# ------------------------------------------------------------------------------
# Pattern Catalogs for Fast Zero-Latency Heuristic Classification
# ------------------------------------------------------------------------------
GREETING_PATTERNS = [
    re.compile(
        r"^(hi(\s+there)?|hello(\s+there)?|hey(\s+there)?|greetings|howdy|sup|good\s+(morning|afternoon|evening|day))[\s\.\!\?]*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(thanks(\s+a\s+lot)?|thank\s+you(\s+so\s+much|\s+very\s+much)?|much\s+appreciated|thx)[\s\.\!\?]*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|help)[\s\.\!\?]*$",
        re.IGNORECASE,
    ),
    re.compile(r"^(bye|goodbye|see\s+you|have\s+a\s+good\s+day)[\s\.\!\?]*$", re.IGNORECASE),
]

SKILL_PATTERNS: dict[str, list[re.Pattern]] = {
    "create_pptx": [
        re.compile(r"\b(pptx|presentation|slide\s*deck|slides|powerpoint)\b", re.IGNORECASE),
    ],
    "create_doc": [
        re.compile(
            r"\b(docx|word\s*document|monograph\s*document|written\s*report)\b", re.IGNORECASE
        ),
    ],
    "create_pdf": [
        re.compile(
            r"\b(pdf|cheat\s*sheet|pocket\s*guide|clinical\s*summary\s*pdf)\b", re.IGNORECASE
        ),
    ],
    "generate_flashcards": [
        re.compile(r"\b(flashcard|flashcards|study\s*cards|anki)\b", re.IGNORECASE),
    ],
    "generate_mnemonics": [
        re.compile(r"\b(mnemonic|mnemonics|memory\s*aid|acronym\s*guide)\b", re.IGNORECASE),
    ],
    "draw_chemical_structure": [
        re.compile(
            r"\b(smiles|chemical\s*structure|molecular\s*structure|chemical\s*formula)\b",
            re.IGNORECASE,
        ),
    ],
}

COURSE_RETRIEVAL_PATTERNS = [
    re.compile(
        r"\b(in\s+(the\s+)?(slides|notes|lecture|syllabus|coursework|monograph))\b", re.IGNORECASE
    ),
    re.compile(r"\b(slide\s*\d+|page\s*\d+|lecture\s*\d+|module\s*\d+)\b", re.IGNORECASE),
    re.compile(
        r"\b(according\s+to\s+(the\s+)?(lecturer|professor|dr|slides|notes))\b", re.IGNORECASE
    ),
    re.compile(r"\b(exam\s*(question|material|prep)|past\s*questions)\b", re.IGNORECASE),
]

CLINICAL_REASONING_PATTERNS = [
    re.compile(
        r"\b(patient\s+presents|clinical\s+case|case\s+study|admitted\s+with)\b", re.IGNORECASE
    ),
    re.compile(
        r"\b(drug\s+interaction|contraindicated\s+in|adverse\s+reaction\s+to)\b", re.IGNORECASE
    ),
    re.compile(
        r"\b(compare\s+(and\s+contrast\s+)?(mechanism|pharmacokinetics|efficacy))\b", re.IGNORECASE
    ),
    re.compile(
        r"\b(dose\s+(calculation|adjustment)|adjust\s+(the\s+)?dose|dose\s+adjust|creatinine\s+clearance|gfr(\s+adjustment)?|gfr\s+of\s+\d+)\b",
        re.IGNORECASE,
    ),
]

DEFINITION_PREFIX_PATTERNS = [
    re.compile(
        r"^(what\s+is|what\s+are|define|explain\s+the\s+term|meaning\s+of)\s+([a-zA-Z0-9\s\-]+)[\?\.]*$",
        re.IGNORECASE,
    ),
]


class IntentClassifier:
    """
    Intelligent Intent Routing and Complexity Classifier Engine.
    Evaluates incoming queries upfront to route traffic between Fast Path and Complex Path.
    """

    def classify(
        self,
        query: str,
        history: list[dict[str, Any]] | None = None,
        document_id: str | None = None,
        course_code: str | None = None,
        user_enable_rag: bool = True,
        user_enable_tools: bool = True,
    ) -> QueryClassification:
        cleaned = query.strip()
        q_lower = cleaned.lower()

        # ----------------------------------------------------------------------
        # 1. Deterministic Bypass Rules & Pinned Documents
        # ----------------------------------------------------------------------
        if document_id:
            logger.info("intent_routing_pinned_document_override", document_id=document_id)
            return QueryClassification(
                intent=IntentType.COURSE_RETRIEVAL,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=user_enable_rag,
                requires_tools=user_enable_tools,
                confidence=1.0,
                bypass_reason="Explicit document_id pinned to request",
            )

        # ----------------------------------------------------------------------
        # 2. Greeting & Pure Conversational (Fast Path Candidate)
        # ----------------------------------------------------------------------
        for pat in GREETING_PATTERNS:
            if pat.match(cleaned):
                return QueryClassification(
                    intent=IntentType.GREETING_CONVERSATIONAL,
                    complexity=ComplexityLevel.SIMPLE,
                    route=RouteType.FAST_PATH,
                    requires_rag=False,
                    requires_tools=False,
                    confidence=0.99,
                    bypass_reason="Conversational greeting/courtesy",
                )

        # ----------------------------------------------------------------------
        # 3. Dynamic Skills & Artifact Generation
        # ----------------------------------------------------------------------
        matched_skills: list[str] = []
        for skill_name, patterns in SKILL_PATTERNS.items():
            if any(p.search(cleaned) for p in patterns):
                matched_skills.append(skill_name)

        if matched_skills:
            extracted_topic = None
            for marker in ("on ", "about ", "for "):
                if marker in q_lower:
                    extracted_topic = (
                        cleaned[q_lower.find(marker) + len(marker) :].split(".")[0].strip()
                    )
                    break

            return QueryClassification(
                intent=IntentType.SKILL_GENERATION,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=user_enable_rag,
                requires_tools=user_enable_tools,
                confidence=0.95,
                suggested_skills=matched_skills,
                extracted_topic=extracted_topic,
            )

        # ----------------------------------------------------------------------
        # 4. Explicit Course Retrieval Cues
        # ----------------------------------------------------------------------
        if any(pat.search(cleaned) for pat in COURSE_RETRIEVAL_PATTERNS) or course_code:
            return QueryClassification(
                intent=IntentType.COURSE_RETRIEVAL,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=user_enable_rag,
                requires_tools=user_enable_tools,
                confidence=0.90,
            )

        # ----------------------------------------------------------------------
        # 5. Clinical Reasoning & Multi-step Comparative Pharmacology
        # ----------------------------------------------------------------------
        if any(pat.search(cleaned) for pat in CLINICAL_REASONING_PATTERNS):
            return QueryClassification(
                intent=IntentType.CLINICAL_REASONING,
                complexity=ComplexityLevel.COMPLEX,
                route=RouteType.COMPLEX_PATH,
                requires_rag=user_enable_rag,
                requires_tools=user_enable_tools,
                confidence=0.88,
            )

        # ----------------------------------------------------------------------
        # 6. Direct Definition / Short Factual Explanations (< 15 words)
        # ----------------------------------------------------------------------
        word_count = len(cleaned.split())
        for def_pat in DEFINITION_PREFIX_PATTERNS:
            match = def_pat.match(cleaned)
            if match and word_count <= 15:
                extracted_term = match.group(2).strip()
                return QueryClassification(
                    intent=IntentType.DIRECT_DEFINITION,
                    complexity=ComplexityLevel.SIMPLE,
                    route=RouteType.FAST_PATH,
                    requires_rag=False,
                    requires_tools=False,
                    confidence=0.85,
                    extracted_topic=extracted_term,
                    bypass_reason="Concise direct definition query",
                )

        # ----------------------------------------------------------------------
        # 7. Safe Default Fallback (Complex Path with RAG)
        # ----------------------------------------------------------------------
        return QueryClassification(
            intent=IntentType.UNCERTAIN,
            complexity=ComplexityLevel.COMPLEX,
            route=RouteType.COMPLEX_PATH,
            requires_rag=user_enable_rag,
            requires_tools=user_enable_tools,
            confidence=0.50,
            bypass_reason="Query requires full multi-pool RAG grounding",
        )


intent_classifier = IntentClassifier()
