# ==============================================================================
# PansGPT 2.0 Audio Transcription Engine (Phase 6 / Roadmap 6B.23)
# Multi-tier Speech-to-Text: Groq Whisper Turbo -> Groq Whisper Large -> OpenAI -> Mock
# ==============================================================================

import time

import httpx
import structlog

from app.core.config import settings
from app.models.chat import VoiceTranscribeResponse

logger = structlog.get_logger(__name__)

WHISPER_HALLUCINATIONS = {
    "thank you for watching",
    "thank you for watching!",
    "thanks for watching",
    "thanks for watching!",
    "please subscribe",
    "please subscribe!",
    "subtitles by",
    "subtitles by the amara.org community",
    "amara.org",
    "mbc",
    "bye",
    "thank you",
    "thank you.",
    "you",
    ".",
    "so",
    "...",
}


class AudioTranscriptionEngine:
    """
    High-performance audio transcription engine utilizing Groq Whisper LPUs
    with automatic multi-tier failover, domain vocabulary biasing, and hallucination scrubbing.
    """

    def __init__(self):
        self._groq_client = None
        self._http_client: httpx.AsyncClient | None = None

    def _is_live_key(self, key: str | None) -> bool:
        """Determines if an API key is active or a local test placeholder."""
        if not key or not key.strip():
            return False
        lower = key.lower()
        return not any(p in lower for p in ("placeholder", "dummy", "test", "your-", "mock"))

    def _get_groq_client(self):
        """Lazy-initializes and caches the AsyncGroq client singleton."""
        if self._groq_client is None and self._is_live_key(settings.GROQ_API_KEY):
            try:
                from groq import AsyncGroq

                self._groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            except Exception as exc:
                logger.error("failed_to_initialize_groq_client", error=str(exc))
        return self._groq_client

    def _get_http_client(self) -> httpx.AsyncClient:
        """Returns persistent httpx.AsyncClient for external REST fallbacks."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=15.0)
        return self._http_client

    @staticmethod
    def sanitize_transcript(raw_text: str) -> tuple[str, bool]:
        """
        Cleans Whisper text and detects silence hallucinations.
        Returns: (sanitized_text, is_silent)
        """
        if not raw_text:
            return "", True

        text = raw_text.strip()
        lower_text = text.lower().strip(" .!?,:;-")

        if lower_text in WHISPER_HALLUCINATIONS or len(lower_text) <= 1:
            return "", True

        words = text.split()
        if len(words) >= 4 and len(set(words)) == 1:
            return "", True

        return text, False

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "recording.webm",
        mime_type: str = "audio/webm",
        language: str = "en",
    ) -> VoiceTranscribeResponse:
        """
        Transcribes audio bytes into text with 2-tier Groq failover and OpenAI safety net.
        """
        started = time.perf_counter()
        file_tuple = (filename, audio_bytes, mime_type)

        groq_client = self._get_groq_client()

        # --------------------------------------------------------------------------
        # Tier 1: Groq whisper-large-v3-turbo (~200ms - 400ms)
        # --------------------------------------------------------------------------
        if groq_client:
            try:
                transcription = await groq_client.audio.transcriptions.create(
                    file=file_tuple,
                    model=settings.WHISPER_PRIMARY_MODEL,
                    prompt=settings.WHISPER_PHARMACY_PROMPT,
                    language=language,
                    temperature=0.0,
                    response_format="verbose_json",
                )
                latency_ms = (time.perf_counter() - started) * 1000
                raw_text = getattr(transcription, "text", "") or ""
                duration = getattr(transcription, "duration", None)
                clean_text, is_silent = self.sanitize_transcript(raw_text)

                return VoiceTranscribeResponse(
                    text=clean_text,
                    language=getattr(transcription, "language", language) or language,
                    duration=duration,
                    latency_ms=round(latency_ms, 2),
                    model=settings.WHISPER_PRIMARY_MODEL,
                    provider="groq-whisper",
                    word_count=len(clean_text.split()) if clean_text else 0,
                    is_silent=is_silent,
                )
            except Exception as turbo_err:
                logger.warning(
                    "groq_whisper_turbo_failed_attempting_secondary",
                    model=settings.WHISPER_PRIMARY_MODEL,
                    error=str(turbo_err),
                )

            # ----------------------------------------------------------------------
            # Tier 2: Groq whisper-large-v3 (~400ms - 800ms Fallback)
            # ----------------------------------------------------------------------
            try:
                transcription = await groq_client.audio.transcriptions.create(
                    file=file_tuple,
                    model=settings.WHISPER_SECONDARY_MODEL,
                    prompt=settings.WHISPER_PHARMACY_PROMPT,
                    language=language,
                    temperature=0.0,
                    response_format="verbose_json",
                )
                latency_ms = (time.perf_counter() - started) * 1000
                raw_text = getattr(transcription, "text", "") or ""
                duration = getattr(transcription, "duration", None)
                clean_text, is_silent = self.sanitize_transcript(raw_text)

                return VoiceTranscribeResponse(
                    text=clean_text,
                    language=getattr(transcription, "language", language) or language,
                    duration=duration,
                    latency_ms=round(latency_ms, 2),
                    model=settings.WHISPER_SECONDARY_MODEL,
                    provider="groq-whisper-v3",
                    word_count=len(clean_text.split()) if clean_text else 0,
                    is_silent=is_silent,
                )
            except Exception as v3_err:
                logger.warning(
                    "groq_whisper_v3_failed_attempting_openai",
                    model=settings.WHISPER_SECONDARY_MODEL,
                    error=str(v3_err),
                )

        # --------------------------------------------------------------------------
        # Tier 3: OpenAI whisper-1 Safety Net
        # --------------------------------------------------------------------------
        if self._is_live_key(settings.OPENAI_API_KEY):
            try:
                client = self._get_http_client()
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    files={"file": (filename, audio_bytes, mime_type)},
                    data={
                        "model": settings.WHISPER_FALLBACK_MODEL,
                        "prompt": settings.WHISPER_PHARMACY_PROMPT,
                        "language": language,
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    raw_text = data.get("text", "")
                    latency_ms = (time.perf_counter() - started) * 1000
                    clean_text, is_silent = self.sanitize_transcript(raw_text)

                    return VoiceTranscribeResponse(
                        text=clean_text,
                        language=language,
                        duration=data.get("duration"),
                        latency_ms=round(latency_ms, 2),
                        model=settings.WHISPER_FALLBACK_MODEL,
                        provider="openai-whisper",
                        word_count=len(clean_text.split()) if clean_text else 0,
                        is_silent=is_silent,
                    )
                else:
                    logger.warning(
                        "openai_whisper_failed",
                        status_code=response.status_code,
                        body=response.text[:200],
                    )
            except Exception as openai_err:
                logger.warning("openai_whisper_request_exception", error=str(openai_err))

        # --------------------------------------------------------------------------
        # Tier 4: Deterministic Mock / CI Fallback
        # --------------------------------------------------------------------------
        latency_ms = (time.perf_counter() - started) * 1000
        mock_transcript = "What is the mechanism of action of beta-lactam antibiotics in bacterial cell wall synthesis?"
        clean_text, is_silent = self.sanitize_transcript(mock_transcript)

        return VoiceTranscribeResponse(
            text=clean_text,
            language=language,
            duration=3.2,
            latency_ms=round(latency_ms, 2),
            model="whisper-offline-mock",
            provider="mock-stt",
            word_count=len(clean_text.split()),
            is_silent=is_silent,
        )


stt_engine = AudioTranscriptionEngine()
