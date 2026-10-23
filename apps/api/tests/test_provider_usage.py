"""Reported usage is observable without making provider calls. [CHAT FIX 2]"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.engines import llm


@pytest.mark.parametrize(
    "provider,usage,expected",
    [
        (
            "google",
            SimpleNamespace(
                prompt_token_count=123, candidates_token_count=0, thoughts_token_count=14
            ),
            (123, 0, 14),
        ),
        (
            "groq",
            SimpleNamespace(
                prompt_tokens=45,
                completion_tokens=10,
                completion_tokens_details=SimpleNamespace(reasoning_tokens=3),
            ),
            (45, 10, 3),
        ),
        ("openrouter", {"prompt_tokens": 80, "completion_tokens": 20}, (80, 20, None)),
    ],
)
def test_logs_actual_reported_usage(
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
    usage: object,
    expected: tuple[int, int, int | None],
) -> None:
    log = MagicMock()
    monkeypatch.setattr(llm, "logger", log)
    llm.MultiTierLlmEngine._log_provider_usage(provider, "configured-model", usage)
    log.info.assert_called_once_with(
        "chat_provider_usage",
        provider=provider,
        model="configured-model",
        prompt_tokens=expected[0],
        completion_tokens=expected[1],
        thinking_tokens=expected[2],
    )


@pytest.mark.parametrize("usage", [None, {}, MagicMock(), {"prompt_tokens": "100"}])
def test_missing_usage_is_never_fabricated(monkeypatch: pytest.MonkeyPatch, usage: object) -> None:
    log = MagicMock()
    monkeypatch.setattr(llm, "logger", log)
    llm.MultiTierLlmEngine._log_provider_usage("groq", "configured-model", usage)
    log.info.assert_not_called()
