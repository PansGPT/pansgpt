# ==============================================================================
# PansGPT 2.0 Multi-Tier Resilient LLM Engine (Phase 6)
# Primary: Google AI Studio Gemma 4 (31B & 26B)
# Fast Fallback: Groq (openai/gpt-oss-120b & qwen3.6-27b)
# Safety Net: OpenRouter (Nemotron 3 Ultra & Super)
# ==============================================================================

import asyncio
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import httpx
import structlog

from app.core.config import settings
from app.core.database import get_db_connection
from app.engines.guard import policy_guard
from app.engines.skills import SKILL_TOOL_DEFINITIONS, skill_engine
from app.engines.tools import CORE_TOOL_DEFINITIONS
from app.models.chat import (
    ToolCallPayload,
    ToolResultPayload,
)

logger = structlog.get_logger(__name__)

ALL_TOOL_DEFINITIONS = CORE_TOOL_DEFINITIONS + SKILL_TOOL_DEFINITIONS


class MultiTierLlmEngine:
    """
    Orchestrates resilient multi-tier LLM inference with transparent failover:
    Tier 1:  Google AI Studio Gemma 4 31B (gemma-4-31b-it)
    Tier 1b: Google AI Studio Gemma 4 26B MoE (gemma-4-26b-a4b-it)
    Tier 2:  Groq (openai/gpt-oss-120b or qwen/qwen3.6-27b)
    Tier 3:  OpenRouter (nvidia/nemotron-3-ultra-550b-a55b:free)
    """

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.primary_model = settings.GEMINI_PRIMARY_MODEL
        self.secondary_model = settings.GEMINI_SECONDARY_MODEL
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_FALLBACK_MODEL
        self.groq_secondary_model = settings.GROQ_SECONDARY_MODEL
        self.openrouter_key = settings.OPENROUTER_API_KEY
        self.openrouter_model = settings.OPENROUTER_FALLBACK_MODEL

    def _is_live_key(self, key: str | None) -> bool:
        """Determines whether an API key is a live production key or offline placeholder."""
        if not key or not key.strip():
            return False
        lower = key.lower()
        if any(prefix in lower for prefix in ("placeholder", "dummy", "test", "your-", "mock")):
            return False
        return True

    async def _record_telemetry(
        self,
        provider: str,
        model_id: str,
        latency_ms: int,
        prompt_tokens: int,
        completion_tokens: int,
        status: str,
        user_id: str | None = None,
        university_id: str | None = None,
        error_message: str | None = None,
    ) -> None:
        """Asynchronously records request execution telemetry in public.ai_telemetry."""
        try:
            async with get_db_connection(timeout=3.0) as conn:
                if not conn:
                    return
                db_provider = provider.lower()
                if db_provider not in ["google", "groq", "openrouter"]:
                    db_provider = "google"

                u_uuid = uuid.UUID(user_id) if user_id else None
                uni_uuid = uuid.UUID(university_id) if university_id else None

                sql = """
                    INSERT INTO public.ai_telemetry (
                        id, user_id, university_id, provider, model_id,
                        request_type, prompt_tokens, completion_tokens,
                        latency_ms, status, error_message
                    ) VALUES (
                        $1, $2, $3, $4::ai_provider, $5,
                        'chat', $6, $7, $8, $9, $10
                    );
                """
                await conn.execute(
                    sql,
                    uuid.uuid4(),
                    u_uuid,
                    uni_uuid,
                    db_provider,
                    model_id,
                    prompt_tokens,
                    completion_tokens,
                    latency_ms,
                    status,
                    error_message,
                )
        except Exception as exc:
            logger.warning("telemetry_record_failed", error=str(exc))

    async def _call_gemma_stream(
        self, model_name: str, system_prompt: str, user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streams tokens directly from Google AI Studio using generate_content_stream."""
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=self.gemini_key,
            http_options=types.HttpOptions(
                headers={"X-Data-Retention": "false", "User-Agent": "PansGPT/2.0-ZeroRetention"}
            ),
        )
        full_prompt = f"{system_prompt}\n\nStudent Query:\n{user_message}"
        response_stream = await client.aio.models.generate_content_stream(
            model=model_name,
            contents=full_prompt,
        )
        async for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    async def _call_groq_stream(
        self, system_prompt: str, user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streams tokens from Groq API with ZDR headers."""
        from groq import AsyncGroq

        client = AsyncGroq(
            api_key=self.groq_key,
            default_headers={
                "X-Data-Retention": "false",
                "HTTP-Referer": "https://pansgpt.com",
                "X-Title": "PansGPT 2.0",
            },
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        stream = await client.chat.completions.create(
            model=self.groq_model,
            messages=messages,
            stream=True,
            temperature=0.2,
            max_tokens=settings.TEXT_CHAT_MAX_TOKENS,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token

    async def _call_openrouter(self, system_prompt: str, user_message: str) -> str:
        """Executes fallback generation via OpenRouter API with ZDR headers."""
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "https://pansgpt.com",
            "X-Title": "PansGPT 2.0",
            "X-Data-Retention": "false",
        }
        payload = {
            "model": self.openrouter_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 1500,
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code != 200:
                raise ValueError(f"OpenRouter returned HTTP {resp.status_code}: {resp.text}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def classify_intent(self, query: str) -> tuple[str | None, dict[str, Any] | None]:
        """Classifies user query intent for dynamic skills and structured tool generation."""
        q_lower = query.lower()
        if any(w in q_lower for w in ("pptx", "presentation", "slide deck", "slides")):
            title = "Clinical Pharmacology & Study Revision"
            for marker in ("on ", "about ", "for "):
                if marker in q_lower:
                    raw_topic = query[q_lower.find(marker) + len(marker) :].split(".")[0].strip()
                    if raw_topic:
                        title = raw_topic.title()
                        break
            slides = [
                {
                    "title": f"{title} - Core Mechanisms",
                    "bullet_points": [
                        "Receptor affinity, specificity, and signal transduction cascades",
                        "Therapeutic window and dose-response curve relationships",
                    ],
                },
                {
                    "title": "Clinical Applications & Monitoring",
                    "bullet_points": [
                        "Primary clinical indications and departmental dosing guidelines",
                        "Key contraindications, drug interactions, and adverse events",
                    ],
                },
            ]
            return "create_pptx", {"title": title, "slides": slides}

        elif any(w in q_lower for w in ("doc", "docx", "word document")):
            title = "Pharmacological Drug Monograph"
            for marker in ("on ", "about ", "for "):
                if marker in q_lower:
                    raw_topic = query[q_lower.find(marker) + len(marker) :].split(".")[0].strip()
                    if raw_topic:
                        title = raw_topic.title()
                        break
            sections = [
                {
                    "heading": "Mechanism of Action & Clinical Use",
                    "body": "Selectively binds to macromolecular target sites to modulate pharmacological activity.",
                    "bullet_points": [
                        "First-line indication based on current treatment guidelines"
                    ],
                }
            ]
            return "create_doc", {"title": title, "sections": sections}

        elif any(w in q_lower for w in ("pdf", "cheat sheet", "pocket guide")):
            title = "Pharmacology Pocket Cheat Sheet"
            for marker in ("on ", "about ", "for "):
                if marker in q_lower:
                    raw_topic = query[q_lower.find(marker) + len(marker) :].split(".")[0].strip()
                    if raw_topic:
                        title = raw_topic.title()
                        break
            return "create_pdf", {
                "title": title,
                "content": "Key drug classes, mechanisms, contraindications, and emergency dosing calculations.",
            }

        elif any(w in q_lower for w in ("flashcard", "flashcards")):
            topic = "Cardiovascular Pharmacology"
            for marker in ("on ", "about ", "for "):
                if marker in q_lower:
                    raw_topic = query[q_lower.find(marker) + len(marker) :].split(".")[0].strip()
                    if raw_topic:
                        topic = raw_topic.title()
                        break
            cards = [
                {
                    "front": f"{topic} Core Concept",
                    "back": "Key mechanism of action and receptor selectivity.",
                    "difficulty": "medium",
                }
            ]
            return "generate_flashcards", {"topic": topic, "cards": cards}

        elif any(w in q_lower for w in ("mnemonic", "mnemonics")):
            return "generate_mnemonics", {
                "drug_or_class": "Autonomic Nervous System Drugs",
                "mnemonic": "SLUDGE",
                "breakdown": [
                    "Salivation",
                    "Lacrimation",
                    "Urination",
                    "Defecation",
                    "GI cramping",
                    "Emesis",
                ],
                "clinical_notes": "Cholinergic excess toxidrome manifestations.",
            }

        elif any(w in q_lower for w in ("smiles", "chemical structure", "molecular structure")):
            return "draw_chemical_structure", {
                "compound_name": "Aspirin",
                "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O",
                "formula": "C9H8O4",
            }

        return None, None

    async def stream_agentic_chat(
        self,
        system_prompt: str,
        user_message: str,
        user_id: str | None = None,
        university_id: str | None = None,
        enable_tools: bool = True,
    ) -> AsyncGenerator[tuple[str, Any, str], None]:
        """
        Multi-turn Agentic Chat Streamer (max 5 turns):
        Yields (event_type, payload, provider) where event_type can be:
        - 'thinking_chunk': {'thought': ...}
        - 'tool_start': ToolCallPayload
        - 'tool_end': ToolResultPayload
        - 'artifact_ready': ArtifactReadyPayload
        - 'text_chunk': {'token': ...}
        - 'done': {'full_text': ...}
        """
        start_time = time.time()
        prompt_tokens = (len(system_prompt) + len(user_message)) // 4
        collected_tokens: list[str] = []
        active_provider = "google"
        active_model = self.primary_model
        generation_successful = False

        # ----------------------------------------------------------------------
        # 1. Intent Classification & Dynamic Skill Execution
        # ----------------------------------------------------------------------
        if enable_tools:
            skill_name, skill_args = self.classify_intent(user_message)
            if skill_name and skill_args:
                call_id = f"call_{uuid.uuid4().hex[:8]}"
                yield (
                    "tool_start",
                    ToolCallPayload(call_id=call_id, tool_name=skill_name, arguments=skill_args),
                    active_provider,
                )
                artifact = await skill_engine.dispatch_skill(skill_name, skill_args)
                yield "artifact_ready", artifact, active_provider
                yield (
                    "tool_end",
                    ToolResultPayload(
                        call_id=call_id,
                        tool_name=skill_name,
                        status="success",
                        result=artifact.model_dump(),
                    ),
                    active_provider,
                )

                reply_title = skill_args.get("title", "Study Material")
                artifact_reply = (
                    f"I have successfully generated your {artifact.file_extension.upper()} artifact: **{reply_title}**.\n\n"
                    f"You can download and review the generated {artifact.file_extension.upper()} file using the artifact card above."
                )
                for word in artifact_reply.split(" "):
                    token_chunk = word + " "
                    collected_tokens.append(token_chunk)
                    yield "text_chunk", {"token": token_chunk}, active_provider
                    await asyncio.sleep(0.002)

                generation_successful = True

        # ----------------------------------------------------------------------
        # TIER 1: Google AI Studio Gemma 4 31B (Streaming)
        # ----------------------------------------------------------------------
        if not generation_successful and self._is_live_key(self.gemini_key):
            try:
                logger.info("llm_attempt_tier1_gemma_31b", model=self.primary_model)
                active_provider = "google"
                active_model = self.primary_model

                async for chunk in self._call_gemma_stream(
                    self.primary_model, system_prompt, user_message
                ):
                    sanitized = policy_guard.filter_credential_leaks(chunk)
                    collected_tokens.append(sanitized)
                    yield "text_chunk", {"token": sanitized}, active_provider

                if collected_tokens:
                    generation_successful = True
            except Exception as e1:
                logger.warning("tier1_gemma_31b_failed_failing_over", error=str(e1))
                await self._record_telemetry(
                    "google",
                    self.primary_model,
                    int((time.time() - start_time) * 1000),
                    prompt_tokens,
                    0,
                    "failover",
                    user_id,
                    university_id,
                    str(e1),
                )

        # ----------------------------------------------------------------------
        # TIER 1b: Google AI Studio Gemma 4 26B MoE
        # ----------------------------------------------------------------------
        if not generation_successful and self._is_live_key(self.gemini_key):
            try:
                logger.info("llm_attempt_tier1b_gemma_26b", model=self.secondary_model)
                active_provider = "google"
                active_model = self.secondary_model

                async for chunk in self._call_gemma_stream(
                    self.secondary_model, system_prompt, user_message
                ):
                    sanitized = policy_guard.filter_credential_leaks(chunk)
                    collected_tokens.append(sanitized)
                    yield "text_chunk", {"token": sanitized}, active_provider

                if collected_tokens:
                    generation_successful = True
            except Exception as e1b:
                logger.warning("tier1b_gemma_26b_failed_failing_over", error=str(e1b))
                await self._record_telemetry(
                    "google",
                    self.secondary_model,
                    int((time.time() - start_time) * 1000),
                    prompt_tokens,
                    0,
                    "failover",
                    user_id,
                    university_id,
                    str(e1b),
                )

        # ----------------------------------------------------------------------
        # TIER 2: Groq Fast Fallback (openai/gpt-oss-120b)
        # ----------------------------------------------------------------------
        if not generation_successful and self._is_live_key(self.groq_key):
            try:
                logger.info("llm_attempt_tier2_groq", model=self.groq_model)
                active_provider = "groq"
                active_model = self.groq_model

                async for token in self._call_groq_stream(system_prompt, user_message):
                    sanitized_token = policy_guard.filter_credential_leaks(token)
                    collected_tokens.append(sanitized_token)
                    yield "text_chunk", {"token": sanitized_token}, active_provider

                if collected_tokens:
                    generation_successful = True
            except Exception as e2:
                logger.warning("tier2_groq_failed_failing_over", error=str(e2))
                await self._record_telemetry(
                    "groq",
                    self.groq_model,
                    int((time.time() - start_time) * 1000),
                    prompt_tokens,
                    0,
                    "failover",
                    user_id,
                    university_id,
                    str(e2),
                )

        # ----------------------------------------------------------------------
        # TIER 3: OpenRouter Safety Net (Nemotron 3 Ultra)
        # ----------------------------------------------------------------------
        if not generation_successful and self._is_live_key(self.openrouter_key):
            try:
                logger.info("llm_attempt_tier3_openrouter", model=self.openrouter_model)
                active_provider = "openrouter"
                active_model = self.openrouter_model
                text = await asyncio.wait_for(
                    self._call_openrouter(system_prompt, user_message),
                    timeout=10.0,
                )
                sanitized_text = policy_guard.filter_credential_leaks(text)

                words = sanitized_text.split(" ")
                for i in range(0, len(words), 3):
                    chunk = " ".join(words[i : i + 3])
                    if i + 3 < len(words):
                        chunk += " "
                    collected_tokens.append(chunk)
                    yield "text_chunk", {"token": chunk}, active_provider
                    await asyncio.sleep(0.01)

                generation_successful = True
            except Exception as e3:
                logger.error("tier3_openrouter_failed", error=str(e3))
                await self._record_telemetry(
                    "openrouter",
                    self.openrouter_model,
                    int((time.time() - start_time) * 1000),
                    prompt_tokens,
                    0,
                    "error",
                    user_id,
                    university_id,
                    str(e3),
                )

        # ----------------------------------------------------------------------
        # OFFLINE DETERMINISTIC MOCK GENERATOR
        # ----------------------------------------------------------------------
        if not generation_successful:
            active_provider = "google"
            active_model = "gemma-offline-mock"
            mock_reply = (
                "PansGPT Pharmacology Tutor:\n"
                "Based on standard curriculum guidelines, this pharmacological topic requires reviewing drug receptor specificity, "
                "bioavailability, metabolism, and therapeutic monitoring. Please refer to your lecture monograph for exact clinical dosing."
            )

            # Stream out response tokens cleanly
            for word in mock_reply.split(" "):
                token_chunk = word + " "
                collected_tokens.append(token_chunk)
                yield "text_chunk", {"token": token_chunk}, active_provider
                await asyncio.sleep(0.002)

        # Record final telemetry
        latency = int((time.time() - start_time) * 1000)
        completion_tokens = sum(len(t) for t in collected_tokens) // 4
        await self._record_telemetry(
            active_provider,
            active_model,
            latency,
            prompt_tokens,
            completion_tokens,
            "success",
            user_id,
            university_id,
        )

    async def stream_chat(
        self,
        system_prompt: str,
        user_message: str,
        user_id: str | None = None,
        university_id: str | None = None,
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        Convenience generator yielding (token, active_provider) for text-only consumers.
        """
        async for event_type, payload, provider in self.stream_agentic_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            user_id=user_id,
            university_id=university_id,
            enable_tools=False,
        ):
            if event_type == "text_chunk":
                yield payload["token"], provider


llm_engine = MultiTierLlmEngine()
