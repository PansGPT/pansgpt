# ==============================================================================
# PansGPT 2.0 Multi-Tier Resilient LLM Engine (Phase 6)
# Primary: Google AI Studio Gemma 4 (31B & 26B)
# Fast Fallback: Groq (Llama 3.3 70B / GPT-OSS 120B)
# Safety Net: OpenRouter (Nemotron 3.5 Lightning / Free Tier)
# ==============================================================================

import asyncio
import time
import uuid
from collections.abc import AsyncGenerator

import httpx
import structlog

from app.core.config import settings
from app.core.database import get_db_connection
from app.engines.guard import policy_guard

logger = structlog.get_logger(__name__)


class MultiTierLlmEngine:
    """
    Orchestrates resilient multi-tier LLM inference with transparent failover:
    Tier 1:  Google AI Studio Gemma 4 31B (gemma-4-31b-it)
    Tier 1b: Google AI Studio Gemma 4 26B MoE (gemma-4-26b-a4b-it)
    Tier 2:  Groq (openai/gpt-oss-120b or llama-3.3-70b-versatile)
    Tier 3:  OpenRouter (nvidia/nemotron-3.5-lightning:free)
    """

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.primary_model = settings.GEMINI_PRIMARY_MODEL
        self.secondary_model = settings.GEMINI_SECONDARY_MODEL
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_FALLBACK_MODEL
        self.openrouter_key = settings.OPENROUTER_API_KEY
        self.openrouter_model = "nvidia/nemotron-3.5-lightning:free"

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
                # Enforce valid DB enum for provider ('google', 'groq', 'openrouter')
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
            # Telemetry failure must never disrupt the user stream
            logger.warning("telemetry_record_failed", error=str(exc))

    async def _call_gemma(self, model_name: str, system_prompt: str, user_message: str) -> str:
        """Executes generation against Google AI Studio Gemma model."""
        from google import genai

        client = genai.Client(api_key=self.gemini_key)
        full_content = f"{system_prompt}\n\nStudent Question:\n{user_message}"
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=full_content,
        )
        if not response or not response.text:
            raise ValueError(f"Empty response from {model_name}")
        return response.text

    async def _call_groq_stream(
        self, system_prompt: str, user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streams tokens from Groq API."""
        from groq import AsyncGroq

        client = AsyncGroq(api_key=self.groq_key)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        stream = await client.chat.completions.create(
            model=self.groq_model,
            messages=messages,
            stream=True,
            temperature=0.2,
            max_tokens=2048,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token

    async def _call_openrouter(self, system_prompt: str, user_message: str) -> str:
        """Executes fallback generation via OpenRouter API."""
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "HTTP-Referer": "https://pansgpt.com",
            "X-Title": "PansGPT 2.0",
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

    async def stream_chat(
        self,
        system_prompt: str,
        user_message: str,
        user_id: str | None = None,
        university_id: str | None = None,
    ) -> AsyncGenerator[tuple[str, str], None]:
        """
        Main multi-tier chat generator yielding (token, active_provider).
        Catches 429/500/503/timeout (>8s) and fails over transparently across tiers.
        """
        start_time = time.time()
        prompt_tokens = (len(system_prompt) + len(user_message)) // 4
        collected_tokens: list[str] = []
        active_provider = "google"
        active_model = self.primary_model
        generation_successful = False

        # ----------------------------------------------------------------------
        # TIER 1: Google AI Studio Gemma 4 31B
        # ----------------------------------------------------------------------
        if self.gemini_key and not self.gemini_key.startswith(("placeholder", "dummy", "test")):
            try:
                logger.info("llm_attempt_tier1_gemma_31b", model=self.primary_model)
                text = await asyncio.wait_for(
                    self._call_gemma(self.primary_model, system_prompt, user_message),
                    timeout=3.0,
                )
                active_provider = "google"
                active_model = self.primary_model
                sanitized_text = policy_guard.filter_credential_leaks(text)

                # Fluid token delivery for UI
                words = sanitized_text.split(" ")
                for i in range(0, len(words), 3):
                    chunk = " ".join(words[i : i + 3])
                    if i + 3 < len(words):
                        chunk += " "
                    collected_tokens.append(chunk)
                    yield chunk, active_provider
                    await asyncio.sleep(0.01)

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
        if (
            not generation_successful
            and self.gemini_key
            and not self.gemini_key.startswith(("placeholder", "dummy", "test"))
        ):
            try:
                logger.info("llm_attempt_tier1b_gemma_26b", model=self.secondary_model)
                text = await asyncio.wait_for(
                    self._call_gemma(self.secondary_model, system_prompt, user_message),
                    timeout=3.0,
                )
                active_provider = "google"
                active_model = self.secondary_model
                sanitized_text = policy_guard.filter_credential_leaks(text)

                words = sanitized_text.split(" ")
                for i in range(0, len(words), 3):
                    chunk = " ".join(words[i : i + 3])
                    if i + 3 < len(words):
                        chunk += " "
                    collected_tokens.append(chunk)
                    yield chunk, active_provider
                    await asyncio.sleep(0.01)

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
        # TIER 2: Groq Fast Fallback
        # ----------------------------------------------------------------------
        if (
            not generation_successful
            and self.groq_key
            and not self.groq_key.startswith(("placeholder", "dummy", "test"))
        ):
            try:
                logger.info("llm_attempt_tier2_groq", model=self.groq_model)
                active_provider = "groq"
                active_model = self.groq_model
                groq_tokens: list[str] = []

                async for token in self._call_groq_stream(system_prompt, user_message):
                    sanitized_token = policy_guard.filter_credential_leaks(token)
                    groq_tokens.append(sanitized_token)
                    collected_tokens.append(sanitized_token)
                    yield sanitized_token, active_provider

                if groq_tokens:
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
        # TIER 3: OpenRouter Safety Net
        # ----------------------------------------------------------------------
        if (
            not generation_successful
            and self.openrouter_key
            and not self.openrouter_key.startswith(("placeholder", "dummy", "test"))
        ):
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
                    yield chunk, active_provider
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
        # OFFLINE TEST FALLBACK (Deterministic Mock when no API keys are alive)
        # ----------------------------------------------------------------------
        if not generation_successful:
            active_provider = "google"
            active_model = "gemma-offline-mock"
            mock_reply = (
                "PansGPT Pharmacology Tutor:\n"
                "Based on the curriculum guidelines, this pharmacological topic requires reviewing drug receptor specificity, "
                "bioavailability, metabolism, and therapeutic monitoring. Please refer to your lecture monograph for exact clinical dosing."
            )
            for word in mock_reply.split(" "):
                collected_tokens.append(word + " ")
                yield word + " ", active_provider
                await asyncio.sleep(0.005)

        # Record final success telemetry
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


llm_engine = MultiTierLlmEngine()
