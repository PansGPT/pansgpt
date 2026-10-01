# ==============================================================================
# PansGPT 2.0 Thinking Token Stream Parser Engine (Phase 6)
# High-precision FSM for separating chain-of-thought tokens from visible text
# ==============================================================================

import re

# Matches opening tag: <think>, <thinking>, <thought>, <scratchpad> with optional attributes
_OPEN_TAG_RE = re.compile(
    r"<(think|thinking|thought|scratchpad)\b[^>]*>",
    re.IGNORECASE,
)

# Matches full closing tag
_CLOSE_TAG_RE = re.compile(
    r"</(think|thinking|thought|scratchpad)>",
    re.IGNORECASE,
)

# Regex matching any prefix of an opening tag at the end of a string
_PARTIAL_OPEN_RE = re.compile(
    r"<(?:(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?|s(?:c(?:r(?:a(?:t(?:c(?:h(?:p(?:a(?:d)?)?)?)?)?)?)?)?)?)?|(?:think|thinking|thought|scratchpad)\b[^>]*)$",
    re.IGNORECASE,
)


class ThinkingStripResult(str):
    """String subclass that also allows tuple unpacking: visible, thinking = strip_thinking_tokens(text)"""

    thinking_text: str

    def __new__(cls, visible_text: str, thinking_text: str = "") -> "ThinkingStripResult":
        result = str.__new__(cls, visible_text)
        result.thinking_text = thinking_text
        return result

    def __iter__(self):
        yield str(self)
        yield self.thinking_text


def strip_thinking_tokens(text: str | None) -> ThinkingStripResult:
    """Non-streaming batch stripper that separates visible text from thinking blocks."""
    if not text:
        return ThinkingStripResult("", "")

    batch_pattern = re.compile(
        r"<(think|thinking|thought|scratchpad)\b[^>]*>(.*?)</\1>",
        re.DOTALL | re.IGNORECASE,
    )
    thinking_parts: list[str] = []

    def _replacer(m: re.Match) -> str:
        inner = m.group(2).strip()
        if inner:
            thinking_parts.append(inner)
        return ""

    visible = batch_pattern.sub(_replacer, text).strip()
    thinking = "\n\n".join(thinking_parts)
    return ThinkingStripResult(visible, thinking)


class ThinkingStreamParser:
    """
    Stateful streaming parser for SSE token streams.
    Detects <think>, <thought>, <scratchpad> across arbitrary chunk boundaries.
    """

    def __init__(self) -> None:
        self._buffer: str = ""
        self._in_thinking: bool = False
        self._current_open_tag: str = ""
        self._visible_acc: str = ""
        self._thinking_acc: str = ""

    def feed(self, chunk: str) -> tuple[str, str]:
        """
        Feed an incoming chunk from the LLM.
        Returns: (visible_text_delta, thinking_text_delta)
        """
        data = self._buffer + chunk
        self._buffer = ""

        visible_out = ""
        thinking_out = ""

        while data:
            if self._in_thinking:
                close_tag = f"</{self._current_open_tag}>"
                idx = data.lower().find(close_tag.lower())
                if idx == -1:
                    # Check if tail is a partial closing tag
                    partial = self._partial_close_at_tail(data, self._current_open_tag)
                    if partial:
                        emit = data[: len(data) - len(partial)]
                        self._thinking_acc += emit
                        thinking_out += emit
                        self._buffer = partial
                    else:
                        self._thinking_acc += data
                        thinking_out += data
                    data = ""
                else:
                    inner = data[:idx]
                    self._thinking_acc += inner
                    thinking_out += inner
                    data = data[idx + len(close_tag) :]
                    self._in_thinking = False
                    self._current_open_tag = ""
            else:
                match = _OPEN_TAG_RE.search(data)
                if match is None:
                    # Check if tail is a partial opening tag
                    partial = self._partial_open_at_tail(data)
                    if partial:
                        emit = data[: len(data) - len(partial)]
                        self._visible_acc += emit
                        visible_out += emit
                        self._buffer = partial
                    else:
                        self._visible_acc += data
                        visible_out += data
                    data = ""
                else:
                    before = data[: match.start()]
                    self._visible_acc += before
                    visible_out += before
                    self._in_thinking = True
                    self._current_open_tag = match.group(1).lower()
                    data = data[match.end() :]

        return visible_out, thinking_out

    def flush(self) -> tuple[str, str]:
        """Flushes any remaining holdback buffer when the stream terminates."""
        remainder = self._buffer
        self._buffer = ""
        if not remainder:
            return "", ""

        if self._in_thinking:
            self._thinking_acc += remainder
            return "", remainder
        else:
            self._visible_acc += remainder
            return remainder, ""

    def get_full_thinking(self) -> str:
        return self._thinking_acc.strip()

    def get_full_visible(self) -> str:
        return self._visible_acc.strip()

    @staticmethod
    def _partial_open_at_tail(text: str) -> str:
        """Finds longest suffix matching an opening tag prefix."""
        max_len = min(len(text), 64)
        for length in range(max_len, 0, -1):
            tail = text[-length:]
            if _PARTIAL_OPEN_RE.match(tail):
                return tail
        return ""

    @staticmethod
    def _partial_close_at_tail(text: str, tag_name: str) -> str:
        """Finds longest suffix matching '</tag_name>' prefix."""
        close_tag = f"</{tag_name}>"
        max_len = min(len(text), len(close_tag) - 1)
        for length in range(max_len, 0, -1):
            tail = text[-length:]
            if close_tag.lower().startswith(tail.lower()):
                return tail
        return ""
