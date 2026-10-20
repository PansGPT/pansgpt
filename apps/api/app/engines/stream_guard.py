"""Hold possible credential prefixes across provider chunk boundaries."""

import re

from app.engines.guard import policy_guard


class StreamGuard:
    prefixes = (
        "sk-",
        "gsk_",
        "tvly-",
        "AIza",
        "postgres://",
        "postgresql://",
        "SUPABASE_SERVICE_ROLE_KEY=",
    )
    complete_secret = re.compile(
        "(?:" + "|".join(re.escape(prefix) for prefix in prefixes) + r")\S+"
    )

    def redact(self, text: str) -> str:
        return policy_guard.filter_credential_leaks(
            self.complete_secret.sub("[REDACTED_SECRET]", text)
        )

    def __init__(self) -> None:
        self.pending = ""
        self.discarding = False

    def feed(self, chunk: str) -> str:
        if self.discarding:
            boundary = next((i for i, char in enumerate(chunk) if char.isspace()), None)
            if boundary is None:
                return ""
            self.discarding = False
            chunk = chunk[boundary:]
        text = self.pending + chunk
        self.pending = ""
        start = len(text)
        for prefix in self.prefixes:
            at = text.rfind(prefix)
            if at >= 0 and not any(char.isspace() for char in text[at:]):
                start = min(start, at)
            for length in range(1, len(prefix)):
                if text.endswith(prefix[:length]):
                    start = min(start, len(text) - length)
        self.pending = text[start:]
        if len(self.pending) > 4096:
            self.pending = ""
            self.discarding = True
            return self.redact(text[:start]) + "[REDACTED_SECRET]"
        return self.redact(text[:start])

    def flush(self) -> str:
        self.discarding = False
        value, self.pending = self.pending, ""
        if any(value.startswith(prefix) for prefix in self.prefixes):
            return "[REDACTED_SECRET]"
        return policy_guard.filter_credential_leaks(value)
