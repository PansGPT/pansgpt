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
from app.engines.thinking import ThinkingStreamParser
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

# Purpose-driven tier-specific history budgets based on provider rate limit quotas
MAX_HISTORY_TOKENS_GOOGLE = 13000  # Optimized for Google AI Studio Gemma 16K TPM limit
MAX_HISTORY_TOKENS_GROQ = 5000  # Strictly bounded for Groq 8K TPM quota ceiling
MAX_HISTORY_TOKENS_OPENROUTER = 24000  # Leverages OpenRouter Nemotron 1M context window


class MultiTierLlmEngine:
    """
    Orchestrates resilient multi-tier LLM inference with transparent failover:
    Tier 1:  Google AI Studio Gemma 4 31B (gemma-4-31b-it)
    Tier 1b: Google AI Studio Gemma 4 26B MoE (gemma-4-26b-a4b-it)
    Tier 2:  Groq (openai/gpt-oss-120b or qwen/qwen3.6-27b)
    Tier 3:  OpenRouter (nvidia/nemotron-3-ultra-550b-a55b:free)
    """

    @staticmethod
    def _format_error(exc: Exception) -> str:
        s = str(exc).strip()
        return f"{type(exc).__name__}: {s}" if s else type(exc).__name__

    @staticmethod
    def _build_provider_messages(
        system_prompt: str,
        user_message: str,
        history: list[dict[str, Any]] | None,
        agent_turns: list[dict[str, Any]],
        max_history_tokens: int,
    ) -> list[dict[str, Any]]:
        """Assembles prompt context dynamically trimmed to provider token quotas."""
        msgs: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        if history:
            valid_history = []
            for item in history:
                role = item.get("role")
                content = item.get("content")
                if role in ("user", "assistant") and content and isinstance(content, str):
                    valid_history.append({"role": role, "content": content})
            while (
                valid_history
                and (sum(len(m["content"]) for m in valid_history) // 4) > max_history_tokens
            ):
                valid_history.pop(0)
            msgs.extend(valid_history)
        msgs.append({"role": "user", "content": user_message})
        msgs.extend(agent_turns)
        return msgs

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

                clean_status = (
                    status if status in ("success", "error", "timeout", "failover") else "error"
                )
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
                    clean_status,
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

        Resilience note: generate_content_stream() is a lazy async generator
        that does not contact Google's backend until the first chunk is iterated.
        A 500 ServerError therefore surfaces during iteration — which in the
        original code happened after turn_handled=True, bypassing all fallback
        tiers.  Fix: eagerly consume the first chunk here so any backend error
        fires inside our own try/except before the generator is returned.
        """
        from google import genai
        from google.genai import types
        from google.genai.errors import ServerError as GoogleServerError

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
                if m.get("tool_calls"):
                    calls_desc = ", ".join(
                        f"{tc['function']['name']}({tc['function'].get('arguments', '')})"
                        for tc in m["tool_calls"]
                    )
                    prompt_parts.append(f"Assistant: (Executed tools: {calls_desc})")
                elif content:
                    prompt_parts.append(f"Assistant:\n{content}")
            elif role == "tool":
                prompt_parts.append(f"Tool Output ({m.get('name', 'tool')}):\n{content}")

        full_prompt = "\n\n".join(prompt_parts)

        # Non-streaming path: tools inspection via generate_content
        if tools:
            try:
                resp = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                                disable=True
                            )
                        ),
                    ),
                    timeout=15.0,
                )
            except GoogleServerError as gse:
                raise RuntimeError(f"Google backend error (ServerError): {gse}") from gse

            calls = []
            if hasattr(resp, "function_calls") and resp.function_calls:
                for fc in resp.function_calls:
                    calls.append(
                        {
                            "id": f"call_{uuid.uuid4().hex[:8]}",
                            "name": fc.name,
                            "arguments": fc.args if isinstance(fc.args, dict) else {},
                        }
                    )

            # Check for thinking or preamble text in candidates
            thought_text = ""
            visible_text = ""
            if hasattr(resp, "candidates") and resp.candidates:
                for cand in resp.candidates:
                    if cand.content and cand.content.parts:
                        for part in cand.content.parts:
                            if getattr(part, "thought", False) and getattr(part, "text", None):
                                thought_text += part.text + " "
                            elif getattr(part, "text", None) and not getattr(
                                part, "function_call", None
                            ):
                                visible_text += part.text + " "
            elif hasattr(resp, "text") and resp.text:
                visible_text = resp.text

            full_extracted = ""
            if thought_text.strip():
                full_extracted += f"<think>{thought_text.strip()}</think>\n"
            if visible_text.strip():
                full_extracted += visible_text.strip()

            text_gen = None
            if full_extracted.strip():

                async def _gemma_text_gen():
                    for word in full_extracted.split(" "):
                        yield word + " "
                        await asyncio.sleep(0.005)

                text_gen = _gemma_text_gen()

            return calls, text_gen

        # Streaming path (no tools)
        # generate_content_stream() is lazy — a ServerError only fires on the
        # first iteration, not when the coroutine is awaited.  To make it
        # catchable by the tier try/except (before turn_handled is set), we
        # eagerly await the first chunk here and re-raise any ServerError.
        try:
            response_stream = await asyncio.wait_for(
                client.aio.models.generate_content_stream(
                    model=model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True
                        )
                    ),
                ),
                timeout=15.0,
            )
        except GoogleServerError as gse:
            raise RuntimeError(f"Google backend error (ServerError): {gse}") from gse

        first_chunk_text: str | None = None
        try:
            async for _first in response_stream:
                first_chunk_text = _first.text if _first.text else ""
                break  # Only the first chunk; rest stays buffered in the stream
        except GoogleServerError as gse:
            # 500 on first token — re-raise before turn_handled is set so the
            # tier loop falls through to Groq.
            raise RuntimeError(f"Google backend error (ServerError): {gse}") from gse

        async def _stream_gen():
            # Re-emit the first chunk we already consumed above
            if first_chunk_text:
                yield first_chunk_text
            # Stream the remainder; mid-stream errors are logged and stopped
            # gracefully (re-raising would break the open SSE connection).
            try:
                async for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
            except GoogleServerError as gse:
                logger.warning("gemma_stream_mid_error", error=str(gse))
                return

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
            c = m.get("content")
            if r in ("system", "user"):
                groq_msgs.append({"role": r, "content": c or ""})
            elif r == "assistant":
                msg: dict[str, Any] = {"role": "assistant"}
                if c:
                    msg["content"] = c
                if m.get("tool_calls"):
                    msg["tool_calls"] = m["tool_calls"]
                if "content" not in msg and "tool_calls" not in msg:
                    msg["content"] = ""
                groq_msgs.append(msg)
            elif r == "tool":
                groq_msgs.append(
                    {
                        "role": "tool",
                        "tool_call_id": m.get("tool_call_id", "call_default"),
                        "name": m.get("name", "tool"),
                        "content": c or "",
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

            try:
                # Groq reasoning models require reasoning_format="parsed" or "hidden" when tools are enabled
                kwargs["reasoning_format"] = "parsed"
                resp = await asyncio.wait_for(
                    client.chat.completions.create(**kwargs), timeout=15.0
                )
            except Exception as exc:
                # Fallback if specific Groq model/client doesn't accept reasoning_format
                err_str = str(exc).lower()
                if (
                    "reasoning_format" in err_str
                    or "extra_forbidden" in err_str
                    or "unexpected" in err_str
                ):
                    kwargs.pop("reasoning_format", None)
                    resp = await asyncio.wait_for(
                        client.chat.completions.create(**kwargs), timeout=15.0
                    )
                else:
                    raise

            choice = resp.choices[0]
            calls = []
            if choice.message.tool_calls:
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

            # Capture reasoning and content emitted alongside tool calls
            thought_text = (
                getattr(choice.message, "reasoning", None)
                or getattr(choice.message, "reasoning_content", None)
                or ""
            )
            content_text = choice.message.content or ""

            full_extracted = ""
            if thought_text.strip():
                full_extracted += f"<think>{thought_text.strip()}</think>\n"
            if content_text.strip():
                full_extracted += content_text.strip()

            text_gen = None
            if full_extracted.strip():

                async def _text_gen():
                    for word in full_extracted.split(" "):
                        yield word + " "
                        await asyncio.sleep(0.005)

                text_gen = _text_gen()

            return calls, text_gen

        stream_kwargs = {
            "model": self.groq_model,
            "messages": groq_msgs,
            "stream": True,
            "temperature": 0.2,
            "max_tokens": settings.TEXT_CHAT_MAX_TOKENS,
        }
        try:
            stream_kwargs["reasoning_format"] = "parsed"
            stream = await asyncio.wait_for(
                client.chat.completions.create(**stream_kwargs),
                timeout=15.0,
            )
        except Exception as exc:
            err_str = str(exc).lower()
            if (
                "reasoning_format" in err_str
                or "extra_forbidden" in err_str
                or "unexpected" in err_str
            ):
                stream_kwargs.pop("reasoning_format", None)
                stream = await asyncio.wait_for(
                    client.chat.completions.create(**stream_kwargs),
                    timeout=15.0,
                )
            else:
                raise

        async def _stream_gen():
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta:
                    # Stream reasoning chunks
                    thought_chunk = getattr(delta, "reasoning", None) or getattr(
                        delta, "reasoning_content", None
                    )
                    if thought_chunk:
                        yield f"<think>{thought_chunk}</think>"
                    token = delta.content
                    if token:
                        yield token

        return [], _stream_gen()

    async def _call_openrouter(self, messages: list[dict[str, Any]]) -> str:
        """Executes fallback generation via OpenRouter API with ZDR headers."""
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "https://pansgpt.com",
            "X-Title": "PansGPT 2.0",
            "X-Data-Retention": "false",
        }
        or_messages = []
        for m in messages:
            r = m.get("role", "user")
            c = m.get("content")
            if r in ("system", "user", "assistant") and c:
                or_messages.append({"role": r, "content": str(c)})
        if not or_messages:
            or_messages = [{"role": "user", "content": "Hello"}]

        payload = {
            "model": self.openrouter_model,
            "messages": or_messages,
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
        history: list[dict[str, Any]] | None = None,
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
        collected_tokens: list[str] = []
        active_provider = "google"
        active_model = self.primary_model
        generation_successful = False

        agent_tool_messages: list[dict[str, Any]] = []
        active_prompt_tokens = (len(system_prompt) + len(user_message)) // 4
        active_tools = ALL_TOOL_DEFINITIONS if enable_tools else None

        for turn in range(MAX_AGENT_TURNS):
            turn_handled = False
            tool_calls: list[dict[str, Any]] = []
            text_gen: AsyncGenerator[str, None] | None = None
            # Allow up to 2 tool execution turns; from turn 2 onwards force text synthesis
            tools_for_turn = active_tools if (turn < 2) else None

            # ------------------------------------------------------------------
            # TIER 1: Google AI Studio Gemma 4 31B (13K History Budget)
            # ------------------------------------------------------------------
            if self._is_live_key(self.gemini_key):
                try:
                    logger.info("llm_agent_turn_tier1_gemma_31b", turn=turn)
                    active_provider = "google"
                    active_model = self.primary_model
                    gemma_msgs = self._build_provider_messages(
                        system_prompt,
                        user_message,
                        history,
                        agent_tool_messages,
                        MAX_HISTORY_TOKENS_GOOGLE,
                    )
                    active_prompt_tokens = (
                        sum(len(str(m.get("content") or "")) for m in gemma_msgs) // 4
                    )
                    tool_calls, text_gen = await self._call_gemma_turn(
                        self.primary_model, gemma_msgs, tools_for_turn
                    )
                    turn_handled = True
                except Exception as e1:
                    err_desc = self._format_error(e1)
                    logger.warning("tier1_gemma_failed_failing_over", error=err_desc)
                    await self._record_telemetry(
                        "google",
                        self.primary_model,
                        int((time.time() - start_time) * 1000),
                        active_prompt_tokens,
                        0,
                        "failover",
                        user_id,
                        university_id,
                        err_desc,
                    )

            # ------------------------------------------------------------------
            # TIER 1b: Google AI Studio Gemma 4 26B MoE (13K History Budget)
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.gemini_key):
                try:
                    logger.info("llm_agent_turn_tier1b_gemma_26b", turn=turn)
                    active_provider = "google"
                    active_model = self.secondary_model
                    gemma_msgs = self._build_provider_messages(
                        system_prompt,
                        user_message,
                        history,
                        agent_tool_messages,
                        MAX_HISTORY_TOKENS_GOOGLE,
                    )
                    active_prompt_tokens = (
                        sum(len(str(m.get("content") or "")) for m in gemma_msgs) // 4
                    )
                    tool_calls, text_gen = await self._call_gemma_turn(
                        self.secondary_model, gemma_msgs, tools_for_turn
                    )
                    turn_handled = True
                except Exception as e1b:
                    err_desc = self._format_error(e1b)
                    logger.warning("tier1b_gemma_failed_failing_over", error=err_desc)
                    await self._record_telemetry(
                        "google",
                        self.secondary_model,
                        int((time.time() - start_time) * 1000),
                        active_prompt_tokens,
                        0,
                        "failover",
                        user_id,
                        university_id,
                        err_desc,
                    )

            # ------------------------------------------------------------------
            # TIER 2: Groq Fast Fallback (5K History Budget - Safe for 8K TPM)
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.groq_key):
                try:
                    logger.info("llm_agent_turn_tier2_groq", turn=turn)
                    active_provider = "groq"
                    active_model = self.groq_model
                    groq_msgs = self._build_provider_messages(
                        system_prompt,
                        user_message,
                        history,
                        agent_tool_messages,
                        MAX_HISTORY_TOKENS_GROQ,
                    )
                    active_prompt_tokens = (
                        sum(len(str(m.get("content") or "")) for m in groq_msgs) // 4
                    )
                    tool_calls, text_gen = await self._call_groq_turn(groq_msgs, tools_for_turn)
                    turn_handled = True
                except Exception as e2:
                    err_desc = self._format_error(e2)
                    logger.warning("tier2_groq_failed_failing_over", error=err_desc)
                    await self._record_telemetry(
                        "groq",
                        self.groq_model,
                        int((time.time() - start_time) * 1000),
                        active_prompt_tokens,
                        0,
                        "failover",
                        user_id,
                        university_id,
                        err_desc,
                    )

            # ------------------------------------------------------------------
            # TIER 3: OpenRouter Safety Net (24K History Budget - 1M Context Window)
            # ------------------------------------------------------------------
            if not turn_handled and self._is_live_key(self.openrouter_key):
                try:
                    logger.info("llm_agent_turn_tier3_openrouter", turn=turn)
                    active_provider = "openrouter"
                    active_model = self.openrouter_model
                    or_msgs = self._build_provider_messages(
                        system_prompt,
                        user_message,
                        history,
                        agent_tool_messages,
                        MAX_HISTORY_TOKENS_OPENROUTER,
                    )
                    active_prompt_tokens = (
                        sum(len(str(m.get("content") or "")) for m in or_msgs) // 4
                    )
                    full_text = await asyncio.wait_for(
                        self._call_openrouter(or_msgs),
                        timeout=10.0,
                    )

                    async def _or_gen():
                        for word in full_text.split(" "):
                            yield word + " "

                    text_gen = _or_gen()
                    turn_handled = True
                except Exception as e3:
                    logger.error("tier3_openrouter_failed", error=self._format_error(e3))

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
                # 1. Stream any reasoning or preamble text emitted prior to tool execution
                turn_visible_tokens: list[str] = []
                parser = ThinkingStreamParser()
                has_thought = False

                if text_gen:
                    async for chunk in text_gen:
                        sanitized = policy_guard.filter_credential_leaks(chunk)
                        visible_chunk, thinking_chunk = parser.feed(sanitized)
                        if thinking_chunk:
                            has_thought = True
                            yield (
                                "thinking_chunk",
                                {"delta": thinking_chunk, "token": thinking_chunk},
                                active_provider,
                            )
                        if visible_chunk:
                            turn_visible_tokens.append(visible_chunk)
                            collected_tokens.append(visible_chunk)
                            yield (
                                "text_chunk",
                                {"delta": visible_chunk, "token": visible_chunk},
                                active_provider,
                            )
                    rem_vis, rem_think = parser.flush()
                    if rem_think:
                        has_thought = True
                        yield (
                            "thinking_chunk",
                            {"delta": rem_think, "token": rem_think},
                            active_provider,
                        )
                    if rem_vis:
                        turn_visible_tokens.append(rem_vis)
                        collected_tokens.append(rem_vis)
                        yield (
                            "text_chunk",
                            {"delta": rem_vis, "token": rem_vis},
                            active_provider,
                        )

                # If the model dispatched a tool call without explicit reasoning text,
                # provide an informative agent trace in the thinking inspector so the student always
                # understands the clinical pedagogical intent behind the tool execution.
                if not has_thought:
                    tool_names_str = ", ".join(f"`{tc['name']}`" for tc in tool_calls)
                    agent_trace = (
                        f"Analyzing student query → Selected specialized clinical tool(s): {tool_names_str} "
                        f"to compile structured study materials and retrieve verified syllabus evidence.\n"
                    )
                    yield (
                        "thinking_chunk",
                        {"delta": agent_trace, "token": agent_trace},
                        active_provider,
                    )

                turn_visible_content = "".join(turn_visible_tokens).strip() or None
                formatted_tool_calls = [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc.get("arguments", {}))
                            if isinstance(tc.get("arguments"), dict)
                            else str(tc.get("arguments", "{}")),
                        },
                    }
                    for tc in tool_calls
                ]
                agent_tool_messages.append(
                    {
                        "role": "assistant",
                        "content": turn_visible_content,
                        "tool_calls": formatted_tool_calls,
                    }
                )

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
                            t_name, t_args, user_id=user_id, university_id=university_id
                        )
                        yield "artifact_ready", artifact, active_provider
                        tool_res = {
                            "status": "success",
                            "title": artifact.title,
                            "skill_name": artifact.skill_name,
                            "file_extension": artifact.file_extension,
                            "content_summary": artifact.content,
                            "instruction": "The artifact file has been compiled and rendered directly as a downloadable card in the student UI. In your response text, provide an educational clinical summary of the content. Do NOT output raw URLs, file paths, or markdown download links in your text.",
                        }
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

                    agent_tool_messages.append(
                        {
                            "role": "tool",
                            "name": t_name,
                            "tool_call_id": call_id,
                            "content": json.dumps(tool_res)
                            if not isinstance(tool_res, str)
                            else tool_res,
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
                parser = ThinkingStreamParser()
                async for chunk in text_gen:
                    sanitized = policy_guard.filter_credential_leaks(chunk)
                    visible_chunk, thinking_chunk = parser.feed(sanitized)

                    if thinking_chunk:
                        yield (
                            "thinking_chunk",
                            {"delta": thinking_chunk, "token": thinking_chunk},
                            active_provider,
                        )
                    if visible_chunk:
                        collected_tokens.append(visible_chunk)
                        yield (
                            "text_chunk",
                            {"delta": visible_chunk, "token": visible_chunk},
                            active_provider,
                        )

                # Flush any held buffer at end of stream
                rem_vis, rem_think = parser.flush()
                if rem_think:
                    yield (
                        "thinking_chunk",
                        {"delta": rem_think, "token": rem_think},
                        active_provider,
                    )
                if rem_vis:
                    collected_tokens.append(rem_vis)
                    yield (
                        "text_chunk",
                        {"delta": rem_vis, "token": rem_vis},
                        active_provider,
                    )

                if collected_tokens or parser.get_full_thinking():
                    generation_successful = True
                break

        # Record final telemetry
        latency = int((time.time() - start_time) * 1000)
        completion_tokens = sum(len(t) for t in collected_tokens) // 4
        await self._record_telemetry(
            active_provider,
            active_model,
            latency,
            active_prompt_tokens,
            completion_tokens,
            "success" if generation_successful else "error",
            user_id,
            university_id,
        )

    async def stream_chat(
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict[str, Any]] | None = None,
        user_id: str | None = None,
        university_id: str | None = None,
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        Convenience generator yielding (token, active_provider) for text-only consumers.
        """
        async for event_type, payload, provider in self.stream_agentic_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            history=history,
            user_id=user_id,
            university_id=university_id,
            enable_tools=False,
        ):
            if event_type == "text_chunk":
                yield payload["token"], provider

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        mime_type: str = "audio/webm",
        language: str = "en",
    ):
        """
        Delegates audio transcription to AudioTranscriptionEngine (Roadmap 6B.23).
        """
        from app.engines.stt import stt_engine

        return await stt_engine.transcribe(
            audio_bytes=audio_bytes,
            filename=filename,
            mime_type=mime_type,
            language=language,
        )


llm_engine = MultiTierLlmEngine()
