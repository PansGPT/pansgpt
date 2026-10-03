# ==============================================================================
# PansGPT 2.0 Query Expansion & HyDE Engine (Roadmap 6B.6)
# Multi-Query Decomposition (3 Perspectives) + HyDE Synthetic Monograph Generation
# Ultra-low latency via Groq Llama 3.1 8B with Gemini Flash / Rule Fallbacks
# ==============================================================================

import asyncio
import json
import re
from typing import Any

import structlog

from app.core.config import settings
from app.engines.guard import policy_guard

logger = structlog.get_logger(__name__)


class QueryExpansionEngine:
    """
    Orchestrates intelligent query expansion and HyDE passage generation:
    - Zero-latency Fast-Path bypass for simple definitions and factoids
    - Concurrent 3-perspective query decomposition (Mechanism, Clinical, Toxicology)
    - Synthetic authoritative monograph generation for dense semantic matching (HyDE)
    - Strict 350ms circuit breaker with instant domain-aware heuristic fallback
    """

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.groq_expansion_model = getattr(
            settings, "GROQ_EXPANSION_MODEL", "qwen/qwen3.8-27b"
        )
        self.hyde_model = getattr(settings, "HYDE_GENERATION_MODEL", "gemma-4-31b-it")
        # Separate timeouts per provider. Groq Llama-8B needs ~500-800ms cold start;
        # Gemma via Google AI Studio needs ~800-1500ms.
        self.groq_timeout = getattr(settings, "QUERY_EXPANSION_GROQ_TIMEOUT_SECONDS", 5.0)
        self.hyde_timeout = getattr(settings, "QUERY_EXPANSION_HYDE_TIMEOUT_SECONDS", 10.0)
        self.circuit_breaker_timeout = self.groq_timeout  # legacy alias kept

    def should_bypass_expansion(self, query: str) -> bool:
        """
        Determines whether the query qualifies for Fast-Path retrieval bypass.
        Saves tokens and latency on trivial lookups.
        """
        cleaned = query.strip()
        words = cleaned.split()

        # 1. Short single-concept queries (<= 3 words without comparative terms)
        if len(words) <= 3 and not any(
            w.lower() in ("vs", "or", "and", "differ", "compare") for w in words
        ):
            return True

        # 2. Direct simple definitions
        lower_q = cleaned.lower()
        if re.match(
            r"^(what is|define|definition of|meaning of)\s+[a-zA-Z0-9\-\s]{2,25}$", lower_q
        ):
            return True

        # 3. Direct pharmacokinetic single-parameter query
        if re.match(
            r"^(half-life|bioavailability|volume of distribution|dose|clearance)\s+of\s+[a-zA-Z0-9\-]+$",
            lower_q,
        ):
            return True

        return False

    def generate_heuristic_expansions(self, query: str) -> list[str]:
        """
        Deterministic, zero-latency clinical domain fallback when LLMs time out or fail.
        Ensures 100% uptime even in offline or rate-limited environments.
        """
        norm = policy_guard.normalize_medical_acronyms(query)
        words = [w for w in norm.split() if len(w) > 2]
        core_terms = " ".join(words[:4]) if words else norm
        lower = norm.lower()

        if any(t in lower for t in ["mechanism", "moa", "action", "work", "pathway"]):
            return [
                norm,
                f"receptor molecular pharmacology mechanism of action {core_terms}",
                f"therapeutic biochemical signaling pathways {core_terms}",
            ]
        elif any(
            t in lower for t in ["side effect", "adverse", "toxicity", "adr", "contraindication"]
        ):
            return [
                norm,
                f"clinical toxicities adverse drug reactions contraindications {core_terms}",
                f"drug-drug interactions caution clinical monitoring {core_terms}",
            ]
        elif any(
            t in lower
            for t in ["dose", "dosing", "administration", "kinetics", "adme", "clearance"]
        ):
            return [
                norm,
                f"pharmacokinetics bioavailability half-life metabolism elimination {core_terms}",
                f"clinical dosage regimens therapeutic drug monitoring {core_terms}",
            ]
        else:
            return [
                norm,
                f"pharmacological mechanism indications adverse effects {core_terms}",
                f"clinical therapeutics pharmacy monograph {core_terms}",
            ]

    def generate_heuristic_hyde(self, query: str) -> str:
        """Deterministic synthetic monograph template fallback."""
        norm = policy_guard.normalize_medical_acronyms(query)
        return (
            f"Pharmacology Monograph Section: {norm}. "
            "Drug Class & Mechanism of Action: Target receptors and signaling pathways, molecular inhibition or activation, intracellular signaling cascade. "
            "Pharmacokinetics (ADME): Bioavailability, volume of distribution, hepatic CYP450 enzyme metabolism, renal clearance and half-life. "
            "Clinical Indications & Efficacy: Primary disease indications, evidence-based therapeutic guidelines, organ impairment adjustments. "
            "Adverse Drug Reactions & Contraindications: Common clinical toxicities, severe contraindications, drug-drug interactions."
        )

    async def _call_groq_json(self, prompt: str) -> dict[str, Any] | None:
        """Executes ultra-fast JSON completion on Groq."""
        if (
            not self.groq_key
            or "placeholder" in self.groq_key.lower()
            or "test" in self.groq_key.lower()
        ):
            return None

        try:
            from groq import AsyncGroq

            client = AsyncGroq(api_key=self.groq_key)

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=self.groq_expansion_model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a clinical pharmacology retrieval specialist. Always reply in valid JSON.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.2,
                    max_tokens=256,
                    response_format={"type": "json_object"},
                ),
                timeout=self.groq_timeout,
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as exc:
            logger.debug("groq_expansion_json_failed", error=str(exc))
            return None

    async def _call_hyde_generation(self, prompt: str) -> str | None:
        """Generates a synthetic monograph passage via Gemma (Google AI Studio)."""
        if (
            not self.gemini_key
            or "placeholder" in self.gemini_key.lower()
            or "test" in self.gemini_key.lower()
        ):
            return None

        try:
            from google import genai
            from google.genai.errors import ServerError as GoogleServerError

            client = genai.Client(api_key=self.gemini_key)

            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=self.hyde_model,
                        contents=prompt,
                    ),
                    timeout=self.hyde_timeout,
                )
            except GoogleServerError as gse:
                # Backend 500 — non-fatal, fall back to heuristic template
                logger.debug("hyde_generation_server_error", error=str(gse))
                return None
            return response.text.strip() if response.text else None
        except Exception as exc:
            logger.debug("hyde_generation_failed", error=str(exc))
            return None

    async def expand_multi_query(self, query: str) -> list[str]:
        """
        Asynchronously decomposes a student query into 3 targeted pharmacological perspectives.
        Falls back to deterministic clinical rules upon timeout or error.
        """
        norm_query = policy_guard.normalize_medical_acronyms(query)

        prompt = f"""Decompose the following pharmacy student query into EXACTLY 3 diverse search queries optimized for university lecture slides and monographs:
Query: "{norm_query}"

Provide 3 distinct angles:
1. Receptor mechanism / biochemical signaling pathway
2. Clinical therapeutics / disease indications
3. Adverse reactions / toxicity / drug interactions

Return ONLY JSON:
{{"queries": ["query 1", "query 2", "query 3"]}}"""

        try:
            res = await self._call_groq_json(prompt)
            if res and isinstance(res.get("queries"), list) and len(res["queries"]) >= 2:
                results = [norm_query] + [q.strip() for q in res["queries"] if q.strip()]
                return list(dict.fromkeys(results))[:4]
        except Exception as exc:
            logger.debug("multi_query_expansion_circuit_breaker_tripped", error=str(exc))

        return self.generate_heuristic_expansions(norm_query)

    async def generate_hyde_passage(self, query: str) -> str:
        """
        Asynchronously generates a synthetic authoritative lecture monograph passage.
        Falls back to deterministic template upon timeout or error.
        """
        norm_query = policy_guard.normalize_medical_acronyms(query)

        prompt = f"""Write an authoritative university pharmacology lecture slide monograph section that answers this topic:
"{norm_query}"

Structure with exact headings:
- Drug Class & Mechanism of Action
- Pharmacokinetics (ADME)
- Clinical Indications
- Adverse Drug Reactions & Contraindications

Keep it factual, dense, and between 100-140 words. Do NOT include conversational greetings."""

        try:
            passage = await self._call_hyde_generation(prompt)
            if passage and len(passage) > 80:
                return passage
        except Exception as exc:
            logger.debug("hyde_generation_circuit_breaker_tripped", error=str(exc))

        return self.generate_heuristic_hyde(norm_query)

    async def expand_and_generate_hyde(self, query: str) -> tuple[list[str], str]:
        """
        Executes Multi-Query decomposition and HyDE generation concurrently in parallel.
        Returns: (expanded_queries_list, hyde_passage)
        """
        if self.should_bypass_expansion(query):
            norm = policy_guard.normalize_medical_acronyms(query)
            return [norm], ""

        # Run both tasks concurrently with strict circuit breaker
        queries_task = asyncio.create_task(self.expand_multi_query(query))
        hyde_task = asyncio.create_task(self.generate_hyde_passage(query))

        try:
            expanded_queries, hyde_passage = await asyncio.gather(
                queries_task,
                hyde_task,
                return_exceptions=False,
            )
            return expanded_queries, hyde_passage
        except Exception as exc:
            logger.warning("expansion_and_hyde_gather_failed", error=str(exc))
            norm = policy_guard.normalize_medical_acronyms(query)
            return self.generate_heuristic_expansions(norm), self.generate_heuristic_hyde(norm)


query_expansion_engine = QueryExpansionEngine()
expansion_engine = query_expansion_engine
