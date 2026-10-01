# ==============================================================================
# Comprehensive Verification Suite: Whisper STT Voice Input (Roadmap 6B.23)
# ==============================================================================

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.engines.stt import AudioTranscriptionEngine


@pytest.fixture
def mock_wav_bytes() -> bytes:
    """Minimal valid WAV header bytes (44 bytes)."""
    return (
        b"RIFF,\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
        b"D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    )


# ------------------------------------------------------------------------------
# 1. Endpoint Functional Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_transcribe_wav_success(client: AsyncClient, mock_wav_bytes: bytes):
    """Verify POST /api/v1/ai/chat/transcribe accepts WAV audio and returns 200."""
    files = {"file": ("student_query.wav", io.BytesIO(mock_wav_bytes), "audio/wav")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert len(data["text"]) > 0
    assert "latency_ms" in data
    assert "model" in data
    assert "provider" in data


@pytest.mark.asyncio
async def test_transcribe_accepts_legacy_audio_field(client: AsyncClient, mock_wav_bytes: bytes):
    """Verify endpoint accepts multipart field 'audio' for frontend backward compatibility."""
    files = {"audio": ("student_query.webm", io.BytesIO(mock_wav_bytes), "audio/webm")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data["text"]) > 0


@pytest.mark.asyncio
async def test_transcribe_accepts_m4a_mobile_format(client: AsyncClient, mock_wav_bytes: bytes):
    """Verify mobile iOS/Android m4a voice recordings are accepted."""
    files = {"file": ("mobile_record.m4a", io.BytesIO(mock_wav_bytes), "audio/m4a")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 200


# ------------------------------------------------------------------------------
# 2. Validation & Security Guard Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_transcribe_rejects_empty_file(client: AsyncClient):
    """Verify 0-byte audio file returns HTTP 400 Bad Request."""
    files = {"file": ("empty.wav", io.BytesIO(b""), "audio/wav")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_transcribe_rejects_disallowed_mime_type(client: AsyncClient):
    """Verify non-audio files (.pdf, .exe) return HTTP 415 Unsupported Media Type."""
    files = {"file": ("lecture.pdf", io.BytesIO(b"%PDF-1.4 header"), "application/pdf")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 415
    assert "unsupported" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_transcribe_rejects_oversized_file(client: AsyncClient):
    """Verify files exceeding 25MB return HTTP 413 Payload Too Large."""
    large_payload = b"0" * (26 * 1024 * 1024)
    files = {"file": ("too_large.wav", io.BytesIO(large_payload), "audio/wav")}
    response = await client.post("/api/v1/ai/chat/transcribe", files=files)
    assert response.status_code == 413
    assert "exceeds" in response.json()["detail"].lower()


# ------------------------------------------------------------------------------
# 3. Engine Failover & Resilience Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_engine_groq_primary_success():
    """Verify Tier 1 Groq Whisper Turbo returns correctly structured response."""
    engine = AudioTranscriptionEngine()
    fake_transcription = MagicMock()
    fake_transcription.text = "Explain the pharmacokinetics of digoxin."
    fake_transcription.language = "en"
    fake_transcription.duration = 3.2

    mock_groq = MagicMock()
    mock_groq.audio.transcriptions.create = AsyncMock(return_value=fake_transcription)

    with patch.object(engine, "_get_groq_client", return_value=mock_groq):
        res = await engine.transcribe(b"fake_audio_bytes", "test.wav", "audio/wav")
        assert res.text == "Explain the pharmacokinetics of digoxin."
        assert res.model == settings.WHISPER_PRIMARY_MODEL
        assert res.provider == "groq-whisper"
        assert res.duration == 3.2
        assert res.is_silent is False


@pytest.mark.asyncio
async def test_engine_groq_failover_to_secondary():
    """Verify that when Turbo fails, the engine seamlessly fails over to whisper-large-v3."""
    engine = AudioTranscriptionEngine()
    fake_transcription = MagicMock()
    fake_transcription.text = "Second tier transcript for warfarin dosing."
    fake_transcription.language = "en"
    fake_transcription.duration = 4.1

    mock_groq = MagicMock()
    mock_groq.audio.transcriptions.create = AsyncMock(
        side_effect=[Exception("Rate limit 429"), fake_transcription]
    )

    with patch.object(engine, "_get_groq_client", return_value=mock_groq):
        res = await engine.transcribe(b"fake_audio_bytes", "test.wav", "audio/wav")
        assert res.text == "Second tier transcript for warfarin dosing."
        assert res.model == settings.WHISPER_SECONDARY_MODEL
        assert res.provider == "groq-whisper-v3"


# ------------------------------------------------------------------------------
# 4. Hallucination Sanitizer Tests
# ------------------------------------------------------------------------------
def test_silence_hallucination_scrubbing():
    """Verify standard Whisper phantom phrases are scrubbed to empty strings."""
    engine = AudioTranscriptionEngine()
    clean, is_silent = engine.sanitize_transcript("Thank you for watching!")
    assert clean == ""
    assert is_silent is True

    clean2, is_silent2 = engine.sanitize_transcript("Subtitles by the Amara.org community")
    assert clean2 == ""
    assert is_silent2 is True

    clean3, is_silent3 = engine.sanitize_transcript("What is bioavailability?")
    assert clean3 == "What is bioavailability?"
    assert is_silent3 is False
