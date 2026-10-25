# ==============================================================================
# PansGPT 2.0 Multi-Tier Resilient LLM Engine (Phase 6)
# Primary: Google AI Studio Gemma 4 (31B & 26B)
# Fast Fallback: Groq (llama-3.3-70b-versatile & qwen3.8-27b)
# Safety Net: OpenRouter (Nemotron 3 Ultra & Super)
# ==============================================================================
import asyncio
import json
import time
import uuid
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable  # [CHAT FIX]
from typing import Any

import structlog
from fastapi import HTTPException

from app.core.config import settings
from app.core.database import get_db_connection
from app.core.ids import uuid7  # [LEFTOVER FIX]
from app.engines.presentation_completion import (
    merge_presentation_sources,
    presentation_confirmation,
)
from app.engines.skills import SKILL_TOOL_DEFINITIONS, skill_engine
from app.engines.thinking import ThinkingStreamParser  # [CHAT FIX]  # [CHAT FIX 2]
from app.engines.tools import CORE_TOOL_DEFINITIONS, tool_engine
from app.models.chat import (
    ToolCallPayload,
    ToolResultPayload,
    VoiceTranscribeResponse,
)
from app.models.presentation import PresentationSource
from app.models.web_search import SearchScope

logger = structlog.get_logger(__name__)

ALL_TOOL_DEFINITIONS = CORE_TOOL_DEFINITIONS + SKILL_TOOL_DEFINITIONS
MAX_AGENT_TURNS = 5


class ChatDeadlineError(TimeoutError):  # [CHAT FIX 2]
    def __init__(self, model: str, deadline: str, seconds: float) -> None:  # [CHAT FIX 2]
        super().__init__(  # [CHAT FIX 2]
            f"{model} exceeded the {deadline} deadline ({seconds:g}s)."  # [CHAT FIX 2]
        )  # [CHAT FIX 2]
        self.deadline = deadline  # [CHAT FIX 2]
        self.timeout_s = seconds  # [CHAT FIX 2]


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

    def __init__(self) -> None:
        from app.engines.circuit import ModelCircuits

        self.circuits = ModelCircuits()
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

    @staticmethod
    def _log_provider_usage(provider: str, model: str, usage: Any) -> None:  # [CHAT FIX 2]
        """Log reported token counts only; absent provider measurements remain unknown."""
        if usage is None:
            return

        def field(value: Any, name: str) -> Any:
            return value.get(name) if isinstance(value, dict) else getattr(value, name, None)

        def count(*names: str) -> int | None:
            for name in names:
                value = field(usage, name)
                if type(value) is int and value >= 0:
                    return value
            return None

        thinking = count("thoughts_token_count")
        details = field(usage, "completion_tokens_details")
        if thinking is None and details is not None:
            reported = field(details, "reasoning_tokens")
            if type(reported) is int and reported >= 0:
                thinking = reported
        prompt = count("prompt_token_count", "prompt_tokens")
        completion = count("candidates_token_count", "completion_tokens")
        if any(value is not None for value in (prompt, completion, thinking)):
            logger.info(
                "chat_provider_usage",
                provider=provider,
                model=model,
                prompt_tokens=prompt,
                completion_tokens=completion,
                thinking_tokens=thinking,
            )

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
                        latency_ms, status, error_message, usage_source
                    ) VALUES (
                        $1, $2, $3, $4::ai_provider, $5,
                        'chat', $6, $7, $8, $9, $10, 'estimated'
                    );
                """
                await conn.execute(
                    sql,
                    uuid7(),  # [LEFTOVER FIX]
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
    ) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
        from app.engines.provider_adapters import google_turn

        return await google_turn(self.gemini_key, model_name, messages, tools)

    async def _call_groq_turn(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model_name: str | None = None,
    ) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
        from app.engines.provider_adapters import groq_turn

        return await groq_turn(self.groq_key, model_name or self.groq_model, messages, tools)

    async def _call_openrouter(self, messages: list[dict[str, Any]]) -> str:
        calls, stream = await self._openrouter_turn(messages)
        return "".join([chunk async for chunk in stream])

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
        self,  # [CHAT FIX]
        system_prompt: str,  # [CHAT FIX]
        user_message: str,  # [CHAT FIX]
        history: list[dict[str, Any]] | None = None,  # [CHAT FIX]
        user_id: str | None = None,  # [CHAT FIX]
        university_id: str | None = None,  # [CHAT FIX]
        enable_tools: bool = True,  # [CHAT FIX]
        role: str = "student",
        levels: list[str] | None = None,
        fast_path: bool = False,
        session_id: str | None = None,
        presentation_slide_count: int | None = None,
        presentation_sources: list[PresentationSource] | None = None,
        presentation_request: bool = False,
        validate_presentation_request: bool = False,
        web_search_scope: SearchScope = "biomedical",
        public_web_search: bool = False,
        current_information: bool = False,
    ) -> AsyncGenerator[tuple[str, Any, str], None]:  # [CHAT FIX]
        attempt_state = {"model": "unknown"}  # [CHAT FIX]
        try:  # [CHAT FIX]
            async with asyncio.timeout(settings.CHAT_TOTAL_TIMEOUT_S):  # [CHAT FIX]
                async for event in self._stream_agentic_chat(  # [CHAT FIX]
                    system_prompt,  # [CHAT FIX]
                    user_message,  # [CHAT FIX]
                    history,  # [CHAT FIX]
                    user_id,  # [CHAT FIX]
                    university_id,  # [CHAT FIX]
                    enable_tools,  # [CHAT FIX]
                    attempt_state,  # [CHAT FIX]
                    role,
                    levels,
                    fast_path=fast_path,
                    session_id=session_id,
                    presentation_slide_count=presentation_slide_count,
                    presentation_sources=presentation_sources,
                    presentation_request=presentation_request,
                    validate_presentation_request=validate_presentation_request,
                    web_search_scope=web_search_scope,
                    public_web_search=public_web_search,
                    current_information=current_information,
                ):  # [CHAT FIX]
                    yield event  # [CHAT FIX]
        except TimeoutError as exc:  # [CHAT FIX]
            self.circuits.failed(attempt_state["model"])
            logger.warning(  # [CHAT FIX]
                "chat_model_deadline_exceeded",  # [CHAT FIX]
                model=attempt_state["model"],  # [CHAT FIX]
                deadline=getattr(exc, "deadline", "total"),  # [CHAT FIX 2]
                timeout_s=getattr(exc, "timeout_s", settings.CHAT_TOTAL_TIMEOUT_S),  # [CHAT FIX 2]
                error_type=type(exc).__name__,  # [CHAT FIX]
                error=repr(exc),  # [CHAT FIX]
            )  # [CHAT FIX]
            yield (  # [CHAT FIX]
                "error",  # [CHAT FIX]
                {  # [CHAT FIX 2]
                    "error": "The answer timed out. Please try again.",  # [CHAT FIX 2]
                    "code": "TIMEOUT",  # [CHAT FIX 2]
                    "retryable": True,  # [CHAT FIX 2]
                    "model": attempt_state["model"],  # [CHAT FIX 2]
                },  # [CHAT FIX 2]
                "error",  # [CHAT FIX]
            )  # [CHAT FIX]

        except Exception as exc:  # [CHAT FIX 2]
            self.circuits.failed(attempt_state["model"])
            code = self._stream_error_code(exc)  # [CHAT FIX 2]
            logger.warning(  # [CHAT FIX 2]
                "chat_stream_failed_after_start",  # [CHAT FIX 2]
                model=attempt_state["model"],  # [CHAT FIX 2]
                error_type=type(exc).__name__,  # [CHAT FIX 2]
                error=str(exc) or repr(exc),  # [CHAT FIX 2]
                code=code,  # [CHAT FIX 2]
            )  # [CHAT FIX 2]
            yield (  # [CHAT FIX 2]
                "error",  # [CHAT FIX 2]
                {  # [CHAT FIX 2]
                    "error": "The answer timed out. Please try again."  # [CHAT FIX 2]
                    if code == "TIMEOUT"  # [CHAT FIX 2]
                    else "The model could not complete this answer. Please try again.",  # [CHAT FIX 2]
                    "code": code,  # [CHAT FIX 2]
                    "retryable": code  # [CHAT FIX 2]
                    in {"TIMEOUT", "429", "500", "502", "503", "504"},  # [CHAT FIX 2]
                    "model": attempt_state["model"],  # [CHAT FIX 2]
                },  # [CHAT FIX 2]
                "error",  # [CHAT FIX 2]
            )  # [CHAT FIX 2]

    @staticmethod  # [CHAT FIX 2]
    def _stream_error_code(exc: Exception) -> str:  # [CHAT FIX 2]
        if isinstance(exc, TimeoutError):  # [CHAT FIX 2]
            return "TIMEOUT"  # [CHAT FIX 2]
        code = getattr(exc, "code", None)  # [CHAT FIX 2]
        response = getattr(exc, "response", None)  # [CHAT FIX 2]
        return str(  # [CHAT FIX 2]
            code or getattr(response, "status_code", None) or "PROVIDER_ERROR"  # [CHAT FIX 2]
        )  # [CHAT FIX 2]

    async def _bounded_model_turn(  # [CHAT FIX 2]
        self,  # [CHAT FIX 2]
        model: str,  # [CHAT FIX 2]
        create: Callable[  # [CHAT FIX 2]
            [], Awaitable[tuple[list[dict[str, Any]], AsyncIterator[str] | None]]  # [CHAT FIX 2]
        ],  # [CHAT FIX 2]
        attempt_state: dict[str, str],  # [CHAT FIX 2]
    ) -> tuple[list[dict[str, Any]], AsyncGenerator[str, None] | None]:  # [CHAT FIX 2]
        attempt_state["model"] = model  # [CHAT FIX 2]
        timeout = settings.CHAT_FIRST_CHUNK_TIMEOUT_S  # [CHAT FIX 2]
        first_deadline = asyncio.get_running_loop().time() + timeout  # [CHAT FIX 2]
        stream: AsyncIterator[str] | None = None  # [CHAT FIX 2]

        async def close() -> None:  # [CHAT FIX 2]
            closer = getattr(stream, "aclose", None)  # [CHAT FIX 2]
            if closer is not None:  # [CHAT FIX 2]
                try:  # [CHAT FIX 2]
                    async with asyncio.timeout(0.1):  # [CHAT FIX 2]
                        await closer()  # [CHAT FIX 2]
                except Exception as exc:  # [CHAT FIX 2]
                    logger.warning(  # [CHAT FIX 2]
                        "chat_stream_close_failed",  # [CHAT FIX 2]
                        model=model,  # [CHAT FIX 2]
                        error=repr(exc),  # [CHAT FIX 2]
                    )  # [CHAT FIX 2]

        def timed_out(  # [CHAT FIX 2]
            deadline: str,  # [CHAT FIX 2]
            seconds: float,  # [CHAT FIX 2]
            exc: Exception,  # [CHAT FIX 2]
        ) -> TimeoutError:  # [CHAT FIX 2]
            logger.warning(  # [CHAT FIX 2]
                "chat_model_deadline_exceeded",  # [CHAT FIX 2]
                model=model,  # [CHAT FIX 2]
                deadline=deadline,  # [CHAT FIX 2]
                timeout_s=seconds,  # [CHAT FIX 2]
                error_type=type(exc).__name__,  # [CHAT FIX 2]
                error=repr(exc),  # [CHAT FIX 2]
            )  # [CHAT FIX 2]
            return ChatDeadlineError(model, deadline, seconds)  # [CHAT FIX 2]

        first = None  # [CHAT FIX 2]
        try:  # [CHAT FIX 2]
            async with asyncio.timeout_at(first_deadline):  # [CHAT FIX 2]
                calls, stream = await create()  # [CHAT FIX 2]
                if stream is not None:  # [CHAT FIX 2]
                    iterator = aiter(stream)  # [CHAT FIX 2]
                    async for chunk in iterator:  # [CHAT FIX 2]
                        if chunk:  # [CHAT FIX 2]
                            first = chunk  # [CHAT FIX 2]
                            break  # [CHAT FIX 2]
            if not calls and first is None:  # [CHAT FIX 2]
                raise RuntimeError("The model returned no answer or tool call.")  # [CHAT FIX 2]
        except BaseException as exc:  # [CHAT FIX 2]
            if isinstance(exc, Exception):  # [CHAT FIX 2]
                attempt_state["error_code"] = self._stream_error_code(exc)  # [CHAT FIX 2]
            await close()  # [CHAT FIX 2]
            if isinstance(exc, TimeoutError):  # [CHAT FIX 2]
                raise timed_out("first_chunk", timeout, exc) from exc  # [CHAT FIX 2]
            raise  # [CHAT FIX 2]
        if first is None:  # [CHAT FIX 2]
            await close()  # [CHAT FIX 2]
            return calls, None  # [CHAT FIX 2]

        async def forward() -> AsyncGenerator[str, None]:  # [CHAT FIX 2]
            try:  # [CHAT FIX 2]
                yield first  # [CHAT FIX 2]
                while True:  # [CHAT FIX 2]
                    try:  # [CHAT FIX 2]
                        async with asyncio.timeout(  # [CHAT FIX 2]
                            settings.CHAT_CHUNK_GAP_TIMEOUT_S  # [CHAT FIX 2]
                        ):  # [CHAT FIX 2]
                            chunk = await anext(iterator)  # [CHAT FIX 2]
                    except StopAsyncIteration:  # [CHAT FIX 2]
                        break  # [CHAT FIX 2]
                    except TimeoutError as exc:  # [CHAT FIX 2]
                        raise timed_out(  # [CHAT FIX 2]
                            "chunk_gap",  # [CHAT FIX 2]
                            settings.CHAT_CHUNK_GAP_TIMEOUT_S,  # [CHAT FIX 2]
                            exc,  # [CHAT FIX 2]
                        ) from exc  # [CHAT FIX 2]
                    if chunk:  # [CHAT FIX 2]
                        yield chunk  # [CHAT FIX 2]
            finally:  # [CHAT FIX 2]
                await close()  # [CHAT FIX 2]

        return calls, forward()  # [CHAT FIX 2]

    async def _openrouter_turn(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model_name: str | None = None,
    ) -> tuple[list[dict[str, Any]], AsyncIterator[str]]:
        from app.engines.provider_adapters import openrouter_turn

        return await openrouter_turn(
            self.openrouter_key, model_name or self.openrouter_model, messages, tools
        )

    async def _stream_agentic_chat(  # [CHAT FIX]
        self,
        system_prompt: str,
        user_message: str,
        history: list[dict[str, Any]] | None = None,
        user_id: str | None = None,
        university_id: str | None = None,
        enable_tools: bool = True,
        attempt_state: dict[str, str] | None = None,  # [CHAT FIX]
        role: str = "student",
        levels: list[str] | None = None,
        fast_path: bool = False,
        session_id: str | None = None,
        presentation_slide_count: int | None = None,
        presentation_sources: list[PresentationSource] | None = None,
        presentation_request: bool = False,
        validate_presentation_request: bool = False,
        web_search_scope: SearchScope = "biomedical",
        public_web_search: bool = False,
        current_information: bool = False,
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
        if attempt_state is None:  # [CHAT FIX]
            attempt_state = {"model": "unknown"}  # [CHAT FIX]
        start_time = time.time()
        collected_tokens: list[str] = []
        active_provider = "groq" if fast_path else "google"
        active_model = self.groq_model if fast_path else self.primary_model
        generation_successful = False

        agent_tool_messages: list[dict[str, Any]] = []
        deck_sources = merge_presentation_sources(presentation_sources or [], "", None)
        active_prompt_tokens = (len(system_prompt) + len(user_message)) // 4
        active_tools = None
        if enable_tools:
            if any(
                self._is_live_key(key)
                for key in (self.gemini_key, self.groq_key, self.openrouter_key)
            ):
                from app.engines.skill_registry import available_tools

                active_tools = await available_tools(levels)
            else:
                active_tools = ALL_TOOL_DEFINITIONS

        for turn in range(MAX_AGENT_TURNS):
            turn_handled = False
            tool_calls: list[dict[str, Any]] = []
            text_gen: AsyncGenerator[str, None] | None = None
            # Allow up to 2 tool execution turns; from turn 2 onwards force text synthesis
            tools_for_turn = active_tools if (turn < 2) else None

            if fast_path:
                candidates = [
                    ("groq", self.groq_model, self.groq_key, MAX_HISTORY_TOKENS_GROQ),
                    ("groq", self.groq_secondary_model, self.groq_key, MAX_HISTORY_TOKENS_GROQ),
                    ("google", self.primary_model, self.gemini_key, MAX_HISTORY_TOKENS_GOOGLE),
                    ("google", self.secondary_model, self.gemini_key, MAX_HISTORY_TOKENS_GOOGLE),
                    (
                        "openrouter",
                        settings.OPENROUTER_FAST_MODEL,
                        self.openrouter_key,
                        MAX_HISTORY_TOKENS_OPENROUTER,
                    ),
                    (
                        "openrouter",
                        self.openrouter_model,
                        self.openrouter_key,
                        MAX_HISTORY_TOKENS_OPENROUTER,
                    ),
                ]
            else:
                candidates = [
                    ("google", self.primary_model, self.gemini_key, MAX_HISTORY_TOKENS_GOOGLE),
                    ("google", self.secondary_model, self.gemini_key, MAX_HISTORY_TOKENS_GOOGLE),
                    ("groq", self.groq_model, self.groq_key, MAX_HISTORY_TOKENS_GROQ),
                    ("groq", self.groq_secondary_model, self.groq_key, MAX_HISTORY_TOKENS_GROQ),
                    (
                        "openrouter",
                        self.openrouter_model,
                        self.openrouter_key,
                        MAX_HISTORY_TOKENS_OPENROUTER,
                    ),
                    (
                        "openrouter",
                        settings.OPENROUTER_FAST_MODEL,
                        self.openrouter_key,
                        MAX_HISTORY_TOKENS_OPENROUTER,
                    ),
                ]
            for provider, model, key, budget in candidates:
                if not self._is_live_key(key) or not self.circuits.available(model):
                    continue
                active_provider, active_model = provider, model
                messages = self._build_provider_messages(
                    system_prompt, user_message, history, agent_tool_messages, budget
                )

                async def create() -> tuple[list[dict[str, Any]], AsyncIterator[str] | None]:
                    if provider == "google":
                        return await self._call_gemma_turn(model, messages, tools_for_turn)
                    if provider == "groq":
                        if model == self.groq_model:
                            return await self._call_groq_turn(messages, tools_for_turn)
                        return await self._call_groq_turn(
                            messages, tools_for_turn, model_name=model
                        )
                    return await self._openrouter_turn(messages, tools_for_turn, model_name=model)

                try:
                    tool_calls, text_gen = await self._bounded_model_turn(
                        model, create, attempt_state
                    )
                    if text_gen is None:
                        self.circuits.succeeded(model)
                    turn_handled = True
                    break
                except Exception as exc:
                    self.circuits.failed(model)
                    logger.warning(
                        "model_failover",
                        provider=provider,
                        model=model,
                        error_type=type(exc).__name__,
                    )

            # ------------------------------------------------------------------
            # OFFLINE DETERMINISTIC AGENT FALLBACK
            # ------------------------------------------------------------------
            if not turn_handled:
                if any(  # [CHAT FIX]
                    self._is_live_key(key)  # [CHAT FIX]
                    for key in (self.gemini_key, self.groq_key, self.openrouter_key)  # [CHAT FIX]
                ):  # [CHAT FIX]
                    yield (  # [CHAT FIX]
                        "error",  # [CHAT FIX]
                        {  # [CHAT FIX]
                            "error": "Unable to generate an answer right now. Please try again.",  # [CHAT FIX 2]
                            "code": attempt_state.get(  # [CHAT FIX 2]
                                "error_code",  # [CHAT FIX 2]
                                "PROVIDER_ERROR",  # [CHAT FIX 2]
                            ),  # [CHAT FIX 2]
                            "retryable": True,  # [CHAT FIX 2]
                            "model": attempt_state["model"],  # [CHAT FIX 2]
                        },  # [CHAT FIX]
                        "error",  # [CHAT FIX]
                    )  # [CHAT FIX]
                    return  # [CHAT FIX]
                if settings.ENVIRONMENT != "development" or not settings.EMBEDDER_FAKE_MODE:
                    raise RuntimeError("No privacy-eligible AI provider is available")
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

                    async def _mock_gen() -> AsyncGenerator[str, None]:
                        for word in mock_reply.split(" "):
                            yield word + " "
                            await asyncio.sleep(0.002)

                    text_gen = _mock_gen()

                turn_handled = True

            # ------------------------------------------------------------------
            # PROCESS AGENT TURN RESULTS
            # ------------------------------------------------------------------
            file_skills = {"create_doc", "create_pdf", "create_pptx", "create_md"}
            file_generation_turn = presentation_request or any(
                tc["name"] in file_skills for tc in tool_calls or []
            )
            turn_visible_tokens: list[str] = []
            if text_gen:
                from app.engines.stream_guard import StreamGuard

                output_guard = StreamGuard()
                parser = ThinkingStreamParser()
                async for chunk in text_gen:
                    visible, thought = parser.feed(output_guard.feed(chunk))
                    if thought:
                        yield (
                            "thinking_chunk",
                            {"delta": thought, "token": thought},
                            active_provider,
                        )
                    if visible and not file_generation_turn:
                        turn_visible_tokens.append(visible)
                        collected_tokens.append(visible)
                        yield "text_chunk", {"delta": visible, "token": visible}, active_provider
                tail_visible, tail_thought = parser.feed(output_guard.flush())
                self.circuits.succeeded(active_model)
                visible, thought = parser.flush()
                visible = tail_visible + visible
                thought = tail_thought + thought
                if thought:
                    yield "thinking_chunk", {"delta": thought, "token": thought}, active_provider
                if visible and not file_generation_turn:
                    turn_visible_tokens.append(visible)
                    collected_tokens.append(visible)
                    yield "text_chunk", {"delta": visible, "token": visible}, active_provider
                text_gen = None
            if tool_calls:
                successful_files: list[str] = []
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

                    allowed_names = {tool["function"]["name"] for tool in tools_for_turn or []}
                    if t_name not in allowed_names:
                        tool_res = {
                            "status": "error",
                            "error": "This tool is not available for this request.",
                        }
                    elif t_name in SKILL_NAMES:
                        try:
                            if (
                                t_name == "create_pptx"
                                and validate_presentation_request
                                and not presentation_request
                            ):
                                from app.engines.presentation_planning import (
                                    resolve_presentation_plan,
                                )

                                try:
                                    plan = await resolve_presentation_plan(user_message, history)
                                except Exception as exc:
                                    raise HTTPException(
                                        503,
                                        "Presentation requirements could not be checked. Please retry.",
                                    ) from exc
                                presentation_slide_count = plan.slide_count
                                presentation_request = True
                            artifact = await skill_engine.dispatch_skill(
                                t_name,
                                t_args,
                                user_id=user_id,
                                university_id=university_id,
                                **(
                                    {
                                        "requested_slide_count": presentation_slide_count,
                                        "sources": deck_sources,
                                    }
                                    if t_name == "create_pptx"
                                    else {}
                                ),
                            )
                        except HTTPException as exc:
                            yield (
                                "tool_end",
                                ToolResultPayload(
                                    call_id=call_id,
                                    tool_name=t_name,
                                    status="error",
                                    result={"error": "File generation failed."},
                                ),
                                active_provider,
                            )
                            yield (
                                "error",
                                {
                                    "error": str(exc.detail)
                                    if exc.status_code == 422
                                    else "The file could not be saved. Please try again.",
                                    "code": str(exc.status_code),
                                    "retryable": exc.status_code >= 500 or exc.status_code == 422,
                                },
                                active_provider,
                            )
                            return
                        yield "artifact_ready", artifact, active_provider
                        if t_name in file_skills:
                            successful_files.append(t_name)
                        tool_res = {
                            "status": "success",
                            "title": artifact.title,
                            "skill_name": artifact.skill_name,
                            "file_extension": artifact.file_extension,
                            "content_summary": artifact.content,
                            "instruction": "The artifact file has been compiled and rendered directly as a downloadable card in the student UI. Confirm completion briefly; do not repeat the slides or document content. Do NOT output raw URLs, file paths, or markdown download links in your text.",
                        }
                    else:
                        tool_res = await tool_engine.dispatch_tool(
                            t_name,
                            t_args,
                            university_id=university_id,
                            user_id=user_id,
                            role=role,
                            levels=levels,
                            session_id=session_id,
                            web_search_scope=web_search_scope,
                            public_web_search=public_web_search,
                            current_information=current_information,
                        )
                        deck_sources = merge_presentation_sources(deck_sources, t_name, tool_res)

                    yield (
                        "tool_end",
                        ToolResultPayload(
                            call_id=call_id,
                            tool_name=t_name,
                            status="error"
                            if isinstance(tool_res, dict) and tool_res.get("status") == "error"
                            else "success",
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

                if successful_files:
                    confirmation = (
                        "Your presentation is ready to download."
                        if successful_files == ["create_pptx"]
                        else "Your file is ready to download."
                        if len(successful_files) == 1
                        else "Your files are ready to download."
                    )
                    if successful_files == ["create_pptx"] and isinstance(artifact.content, dict):
                        confirmation = presentation_confirmation(artifact.content)
                    collected_tokens.append(confirmation)
                    yield (
                        "text_chunk",
                        {"token": confirmation, "delta": confirmation},
                        active_provider,
                    )
                    generation_successful = True
                    break

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

            else:
                if not collected_tokens:
                    raise RuntimeError("The model returned thinking without a visible answer.")
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
    ) -> VoiceTranscribeResponse:
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
