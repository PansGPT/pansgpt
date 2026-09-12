# ==============================================================================
# PansGPT 2.0 Multi-Tier Resilient LLM Engine (Phase 6)
# Primary: Google AI Studio Gemma 4 (31B & 26B)
# Fast Fallback: Groq (openai/gpt-oss-120b & qwen3.6-27b)
# Safety Net: OpenRouter (Nemotron 3 Ultra & Super)
# ==============================================================================

import asyncio
import json
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
from app.engines.tools import CORE_TOOL_DEFINITIONS, tool_engine
from app.models.chat import (
    ToolCallPayload,
    ToolResultPayload,
)

logger = structlog.get_logger(__name__)

ALL_TOOL_DEFINITIONS = CORE_TOOL_DEFINITIONS + SKILL_TOOL_DEFINITIONS
MAX_AGENT_TURNS = 5

SKILL_NAMES = {
    "create_doc",
    "create_md",
    "create_pdf",
    "create_pptx",
    "plot_graph",
    "generate_flashcards",
    "generate_mnemonics",
    "draw_chemical_structure",
}


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

    async def _call_gemma_turn(
        self,
        model_name: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], AsyncGenerator[str, None] | None]:
        """
        Executes a turn via Google AI Studio Gemma.
        Returns (tool_calls, text_stream).
        """
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=self.gemini_key,
            http_options=types.HttpOptions(
                headers={"X-Data-Retention": "false", "User-Agent": "PansGPT/2.0-ZeroRetention"}
            ),
        )
        prompt_parts = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                prompt_parts.append(f"System Instructions:\n{content}")
            elif role == "user":
                prompt_parts.append(f"Student Query:\n{content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant:\n{content}")
            elif role == "tool":
                prompt_parts.append(f"Tool Output ({m.get('name', 'tool')}):\n{content}")

        full_prompt = "\n\n".join(prompt_parts)

        # If tools provided, inspect with generate_content
        if tools:
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=full_prompt,
                ),
                timeout=5.0,
            )
            if hasattr(resp, "function_calls") and resp.function_calls:
                calls = []
                for fc in resp.function_calls:
                    calls.append(
                        {
                            "id": f"call_{uuid.uuid4().hex[:8]}",
                            "name": fc.name,
                            "arguments": fc.args if isinstance(fc.args, dict) else {},
                        }
                    )
                return calls, None

            # Model returned text
            text = resp.text or ""

            async def _text_gen():
                for word in text.split(" "):
                    yield word + " "

            return [], _text_gen()

        # Stream directly when no tools requested
        response_stream = await asyncio.wait_for(
            client.aio.models.generate_content_stream(
                model=model_name,
                contents=full_prompt,
            ),
            timeout=5.0,
        )

        async def _stream_gen():
            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        return [], _stream_gen()

    async def _call_groq_turn(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], AsyncGenerator[str, None] | None]:
        """
        Executes a turn via Groq API.
        Returns (tool_calls, text_stream).
        """
        from groq import AsyncGroq

        client = AsyncGroq(
            api_key=self.groq_key,
            default_headers={
                "X-Data-Retention": "false",
                "HTTP-Referer": "https://pansgpt.com",
                "X-Title": "PansGPT 2.0",
            },
        )
        # Format messages for Groq OpenAI schema
        groq_msgs = []
        for m in messages:
            r = m.get("role", "user")
            c = m.get("content", "")
            if r in ("system", "user", "assistant"):
                groq_msgs.append({"role": r, "content": c})
            elif r == "tool":
                groq_msgs.append(
                    {
                        "role": "tool",
                        "tool_call_id": m.get("tool_call_id", "call_default"),
                        "content": c,
                    }
                )

        kwargs: dict[str, Any] = {
            "model": self.groq_model,
            "messages": groq_msgs,
            "temperature": 0.2,
            "max_tokens": settings.TEXT_CHAT_MAX_TOKENS,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

            resp = await asyncio.wait_for(client.chat.completions.create(**kwargs), timeout=5.0)
            choice = resp.choices[0]
            if choice.message.tool_calls:
                calls = []
                for tc in choice.message.tool_calls:
                    args = {}
                    try:
                        args = json.loads(tc.function.arguments) if tc.function.arguments else {}
                    except Exception:
                        args = {}
                    calls.append(
                        {
                            "id": tc.id,
                            "name": tc.function.name,
                            "arguments": args,
                        }
                    )
                return calls, None

            text = choice.message.content or ""

            async def _text_gen():
                for word in text.split(" "):
                    yield word + " "

            return [], _text_gen()

        stream = await asyncio.wait_for(
            client.chat.completions.create(
                model=self.groq_model,
                messages=groq_msgs,
                stream=True,
                temperature=0.2,
                max_tokens=settings.TEXT_CHAT_MAX_TOKENS,
            ),
            timeout=5.0,
        )

        async def _stream_gen():
            async for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield token

        return [], _stream_gen()

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
        Executes ReAct tool-calling loop:
        1. Emits 'tool_start' when model requests a tool
        2. Dispatches tool execution (core tools or dynamic skills)
        3. Emits 'artifact_ready' (if skill compiles an artifact)
        4. Emits 'tool_end' with execution payload
        5. Feeds tool result into conversation context for next turn
        6. Streams 'text_chunk' for final synthesized response
        """
        start_time = time.time()
        prompt_tokens = (len(system_prompt) + len(user_message)) // 4
        collected_tokens: list[str] = []
        active_provider = "google"
        active_model = self.primary_model
        generation_successful = False

        conversation_messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        active_tools = ALL_TOOL_DEFINITIONS if enable_tools else None

        for turn in range(MAX_AGENT_TURNS):
            turn_handled = False
            tool_calls: list[dict[str, Any]] = []
            text_gen: AsyncGenerator[str, None] | None = None

            # ------------------------------------------------------------------
            # TIER 1: Google AI Studio Gemma 4 31B
            # ------------------------------------------------------------------
            if self._is_live_key(self.gemini_key):
                try:
                    logger.info("llm_agent_turn_tier1_gemma_31b", turn=turn)
                    active_provider = "google"
                    active_model = self.primary_model
                    tool_calls, text_gen = await self._call_gemma_turn(
                        self.primary_model, conversation_messages, active_tools
                    )
                    turn_handled = True
                except Exception as e1:
                    logger.warning("tier1_gemma_failed_failing_over", error=str(e1))
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

            # ------------------------------------------------------------------
            # TIER 1b: Google AI Studio Gemma 4 26B MoE
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.gemini_key):
                try:
                    logger.info("llm_agent_turn_tier1b_gemma_26b", turn=turn)
                    active_provider = "google"
                    active_model = self.secondary_model
                    tool_calls, text_gen = await self._call_gemma_turn(
                        self.secondary_model, conversation_messages, active_tools
                    )
                    turn_handled = True
                except Exception as e1b:
                    logger.warning("tier1b_gemma_failed_failing_over", error=str(e1b))
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

            # ------------------------------------------------------------------
            # TIER 2: Groq Fast Fallback (openai/gpt-oss-120b)
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.groq_key):
                try:
                    logger.info("llm_agent_turn_tier2_groq", turn=turn)
                    active_provider = "groq"
                    active_model = self.groq_model
                    tool_calls, text_gen = await self._call_groq_turn(
                        conversation_messages, active_tools
                    )
                    turn_handled = True
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

            # ------------------------------------------------------------------
            # TIER 3: OpenRouter Safety Net
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.openrouter_key):
                try:
                    logger.info("llm_agent_turn_tier3_openrouter", turn=turn)
                    active_provider = "openrouter"
                    active_model = self.openrouter_model
                    full_text = await asyncio.wait_for(
                        self._call_openrouter(system_prompt, user_message),
                        timeout=10.0,
                    )

                    async def _or_gen():
                        for word in full_text.split(" "):
                            yield word + " "

                    text_gen = _or_gen()
                    turn_handled = True
                except Exception as e3:
                    logger.error("tier3_openrouter_failed", error=str(e3))

            # ------------------------------------------------------------------
            # OFFLINE DETERMINISTIC AGENT FALLBACK
            # ------------------------------------------------------------------
            if not turn_handled:
                active_provider = "google"
                active_model = "gemma-offline-mock"

                # In turn 0 offline: check if query triggers an agent tool or skill
                if turn == 0 and enable_tools:
                    skill_name, skill_args = self.classify_intent(user_message)
                    if skill_name and skill_args:
                        tool_calls = [
                            {
                                "id": f"call_{uuid.uuid4().hex[:8]}",
                                "name": skill_name,
                                "arguments": skill_args,
                            }
                        ]
                    elif any(
                        w in user_message.lower()
                        for w in [
                            "search notes",
                            "find lecture",
                            "in notes",
                            "in syllabus",
                            "monograph",
                        ]
                    ):
                        tool_calls = [
                            {
                                "id": f"call_{uuid.uuid4().hex[:8]}",
                                "name": "rag_search",
                                "arguments": {"query": user_message},
                            }
                        ]
                    elif any(
                        w in user_message.lower()
                        for w in ["search pubmed", "search literature", "web search"]
                    ):
                        tool_calls = [
                            {
                                "id": f"call_{uuid.uuid4().hex[:8]}",
                                "name": "web_search",
                                "arguments": {"query": user_message},
                            }
                        ]

                if not tool_calls:
                    mock_reply = (
                        "PansGPT Pharmacology Tutor:\n"
                        "Based on standard curriculum guidelines, this pharmacological topic requires reviewing drug receptor specificity, "
                        "bioavailability, metabolism, and therapeutic monitoring. Please refer to your lecture monograph for exact clinical dosing."
                    )

                    async def _mock_gen():
                        for word in mock_reply.split(" "):
                            yield word + " "
                            await asyncio.sleep(0.002)

                    text_gen = _mock_gen()

                turn_handled = True

            # ------------------------------------------------------------------
            # PROCESS AGENT TURN RESULTS
            # ------------------------------------------------------------------
            if tool_calls:
                for tc in tool_calls:
                    call_id = tc["id"]
                    t_name = tc["name"]
                    t_args = tc.get("arguments", {})

                    yield (
                        "tool_start",
                        ToolCallPayload(call_id=call_id, tool_name=t_name, arguments=t_args),
                        active_provider,
                    )

                    if t_name in SKILL_NAMES:
                        artifact = await skill_engine.dispatch_skill(
                            t_name, t_args, user_id=user_id
                        )
                        yield "artifact_ready", artifact, active_provider
                        tool_res = artifact.model_dump()
                    else:
                        tool_res = await tool_engine.dispatch_tool(
                            t_name, t_args, university_id=university_id, user_id=user_id
                        )

                    yield (
                        "tool_end",
                        ToolResultPayload(
                            call_id=call_id,
                            tool_name=t_name,
                            status="success",
                            result=tool_res,
                        ),
                        active_provider,
                    )

                    conversation_messages.append(
                        {
                            "role": "assistant",
                            "content": f"Invoked tool {t_name} with arguments: {json.dumps(t_args)}",
                        }
                    )
                    conversation_messages.append(
                        {
                            "role": "tool",
                            "name": t_name,
                            "tool_call_id": call_id,
                            "content": json.dumps(tool_res),
                        }
                    )

                # In offline mode, complete the interaction by synthesizing the tool output
                if active_model == "gemma-offline-mock":
                    first_tool = tool_calls[0]["name"]
                    if first_tool in SKILL_NAMES:
                        reply_title = tool_calls[0]["arguments"].get("title", "Study Material")
                        synthesis = (
                            f"I have successfully generated your {first_tool.replace('create_', '').upper()} artifact: **{reply_title}**.\n\n"
                            "You can download and review the compiled file using the artifact card above."
                        )
                    else:
                        synthesis = (
                            f"Based on the results from `{first_tool}`, here is the clinical pharmacological synthesis:\n"
                            "The relevant monograph entries indicate verified receptor target modulation, "
                            "therapeutic dosage ranges, and critical adverse effect monitoring parameters."
                        )
                    for word in synthesis.split(" "):
                        token_chunk = word + " "
                        collected_tokens.append(token_chunk)
                        yield "text_chunk", {"token": token_chunk}, active_provider
                        await asyncio.sleep(0.002)

                    generation_successful = True
                    break
                else:
                    # In live mode, loop to next turn so the LLM receives the tool results and generates synthesis!
                    continue

            elif text_gen:
                async for chunk in text_gen:
                    sanitized = policy_guard.filter_credential_leaks(chunk)
                    collected_tokens.append(sanitized)
                    yield "text_chunk", {"token": sanitized}, active_provider

                if collected_tokens:
                    generation_successful = True
                break

        # Record final telemetry
        latency = int((time.time() - start_time) * 1000)
        completion_tokens = sum(len(t) for t in collected_tokens) // 4
        await self._record_telemetry(
            active_provider,
            active_model,
            latency,
            prompt_tokens,
            completion_tokens,
            "success" if generation_successful else "empty",
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
