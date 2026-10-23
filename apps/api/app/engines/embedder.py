# ==============================================================================
# Gemini Embedding Engine (Stage 8)  # [EMBED FIX]
# Model: gemini-embedding-2, 1536 dimensions, batch processing  # [DIM 1536]
# ==============================================================================

import asyncio  # [EMBED FIX]
import hashlib  # [EMBED FIX]
import math  # [EMBED FIX]
import re  # [EMBED RETRY FIX]
from typing import Literal  # [EMBED FIX]

import structlog  # [EMBED RETRY FIX]

from app.core.config import settings  # [EMBED FIX]

logger = structlog.get_logger(__name__)  # [EMBED RETRY FIX]


def _parse_retry_delay(exc: Exception) -> float | None:  # [EMBED RETRY FIX]
    """Extract retry delay seconds from Google APIError details or message."""  # [EMBED RETRY FIX]
    details = getattr(exc, "details", None)  # [EMBED RETRY FIX]
    detail_list = []  # [EMBED RETRY FIX]
    if isinstance(details, dict):  # [EMBED RETRY FIX]
        if "error" in details and isinstance(details["error"], dict):  # [EMBED RETRY FIX]
            detail_list = details["error"].get("details", [])  # [EMBED RETRY FIX]
        else:  # [EMBED RETRY FIX]
            detail_list = details.get("details", [])  # [EMBED RETRY FIX]
    elif isinstance(details, list):  # [EMBED RETRY FIX]
        detail_list = details  # [EMBED RETRY FIX]

    if isinstance(detail_list, list):  # [EMBED RETRY FIX]
        for item in detail_list:  # [EMBED RETRY FIX]
            if isinstance(item, dict):  # [EMBED RETRY FIX]
                delay_val = item.get("retryDelay", item.get("retry_delay"))  # [EMBED RETRY FIX]
                if delay_val is not None:  # [EMBED RETRY FIX]
                    if isinstance(delay_val, str):  # [EMBED RETRY FIX]
                        m = re.search(r"([\d.]+)", delay_val)  # [EMBED RETRY FIX]
                        if m:  # [EMBED RETRY FIX]
                            return float(m.group(1))  # [EMBED RETRY FIX]
                    elif isinstance(delay_val, (int, float)):  # [EMBED RETRY FIX]
                        return float(delay_val)  # [EMBED RETRY FIX]
                    elif isinstance(delay_val, dict):  # [EMBED RETRY FIX]
                        return float(delay_val.get("seconds", 0))  # [EMBED RETRY FIX]

    msg = getattr(exc, "message", None) or str(exc)  # [EMBED RETRY FIX]
    m = re.search(
        r"retry\s+(?:in|after)\s+([\d.]+)\s*s", str(msg), re.IGNORECASE
    )  # [EMBED RETRY FIX]
    if m:  # [EMBED RETRY FIX]
        return float(m.group(1))  # [EMBED RETRY FIX]

    m = re.search(r"retryDelay[\"'\s:]+([\d.]+)", str(exc), re.IGNORECASE)  # [EMBED RETRY FIX]
    if m:  # [EMBED RETRY FIX]
        return float(m.group(1))  # [EMBED RETRY FIX]

    return None  # [EMBED RETRY FIX]


def _is_rate_limit(exc: Exception) -> bool:  # [EMBED RETRY FIX]
    """Determine if exception is a 429 / RESOURCE_EXHAUSTED error."""  # [EMBED RETRY FIX]
    code = getattr(exc, "code", None)  # [EMBED RETRY FIX]
    status = getattr(exc, "status", None)  # [EMBED RETRY FIX]
    if code == 429 or status == "RESOURCE_EXHAUSTED":  # [EMBED RETRY FIX]
        return True  # [EMBED RETRY FIX]
    exc_str = str(exc).lower()  # [EMBED RETRY FIX]
    return "429" in exc_str or "resource_exhausted" in exc_str  # [EMBED RETRY FIX]


class EmbeddingError(Exception):  # [EMBED FIX]
    """Raised when embedding generation or validation fails."""  # [EMBED FIX]

    pass  # [EMBED FIX]


class GeminiEmbeddingEngine:  # [EMBED FIX]
    """Generates 1536-dimensional dense vector embeddings using Google AI Studio."""  # [DIM 1536]

    def __init__(self):  # [EMBED FIX]
        raw_model = settings.GEMINI_EMBEDDING_MODEL
        if not raw_model or raw_model in (
            "gemini-embedding-002",
            "models/gemini-embedding-002",
            "gemini-embedding-exp-03-07",
            "models/gemini-embedding-exp-03-07",
        ):
            raw_model = "gemini-embedding-2"
        self.model_name = raw_model
        self.dimensions = settings.GEMINI_EMBEDDING_DIMENSIONS  # [EMBED FIX]
        self.api_key = settings.GEMINI_API_KEY  # [EMBED FIX]

    @staticmethod  # [EMBED FIX]
    def format_text(  # [EMBED FIX]
        text: str,  # [EMBED FIX]
        kind: Literal["document", "query"],  # [EMBED FIX]
        title: str | None = None,  # [EMBED FIX]
    ) -> str:  # [EMBED FIX]
        """Applies mandatory prefix format for Gemini embedding if not already present."""  # [EMBED FIX]
        if kind == "query":  # [EMBED FIX]
            if text.startswith("task: search result | query:"):  # [EMBED FIX]
                return text  # [EMBED FIX]
            return f"task: search result | query: {text}"  # [EMBED FIX]
        elif kind == "document":  # [EMBED FIX]
            if text.startswith("title: ") and " | text:" in text:  # [EMBED FIX]
                return text  # [EMBED FIX]
            doc_title = title.strip() if title and title.strip() else "none"  # [EMBED FIX]
            return f"title: {doc_title} | text: {text}"  # [EMBED FIX]
        raise ValueError(f"Unsupported embedding kind: {kind}")  # [EMBED FIX]

    def _generate_deterministic_vector(self, text: str) -> list[float]:
        """
        Fallback for offline unit tests:
        Generates deterministic 1536d pseudo-random normalized vector based on SHA256 of text.  # [DIM 1536]
        """
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16)
        vec = []
        for i in range(self.dimensions):
            # Deterministic linear congruential generator
            seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
            val = (seed / 0x7FFFFFFF) * 2.0 - 1.0
            vec.append(val)

        # Normalize to unit length for cosine similarity
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    async def embed_single(  # [EMBED FIX]
        self,  # [EMBED FIX]
        text: str,  # [EMBED FIX]
        kind: Literal["document", "query"] = "document",  # [EMBED FIX]
        title: str | None = None,  # [EMBED FIX]
    ) -> list[float]:  # [EMBED FIX]
        """Embed a single text string."""  # [EMBED FIX]
        results = await self.embed_batch(  # [EMBED FIX]
            [text],
            kind=kind,
            titles=[title] if title else None,  # [EMBED FIX]
        )  # [EMBED FIX]
        return results[0]  # [EMBED FIX]

    async def embed_batch(  # [EMBED FIX]
        self,  # [EMBED FIX]
        texts: list[str],  # [EMBED FIX]
        kind: Literal["document", "query"],  # [EMBED FIX]
        titles: list[str] | None = None,  # [EMBED FIX]
        max_batch_size: int = 32,  # [EMBED FIX]
    ) -> list[list[float]]:  # [EMBED FIX]
        """# [EMBED FIX]
        Embed a list of text strings into 1536-dimensional vectors.  # [DIM 1536]
        Uses single batched API calls of wrapped Content objects capped at 32 items.  # [EMBED FIX]
        """  # [EMBED FIX]
        if not texts:  # [EMBED FIX]
            return []  # [EMBED FIX]

        # 1. Format input texts with mandatory prefixes  # [EMBED FIX]
        formatted_texts: list[str] = []  # [EMBED FIX]
        for idx, t in enumerate(texts):  # [EMBED FIX]
            t_title = titles[idx] if titles and idx < len(titles) else None  # [EMBED FIX]
            formatted_texts.append(self.format_text(t, kind=kind, title=t_title))  # [EMBED FIX]

        # 2. Check for explicit test fake mode  # [EMBED FIX]
        if settings.EMBEDDER_FAKE_MODE:  # [EMBED FIX]
            return [self._generate_deterministic_vector(t) for t in formatted_texts]  # [EMBED FIX]

        # 3. Real API execution - strictly require GEMINI_API_KEY  # [EMBED FIX]
        api_key = self.api_key or settings.GEMINI_API_KEY  # [EMBED FIX]
        if not api_key:  # [EMBED FIX]
            raise EmbeddingError(  # [EMBED FIX]
                "GEMINI_API_KEY is not configured and EMBEDDER_FAKE_MODE is False"  # [EMBED FIX]
            )  # [EMBED FIX]

        from google import genai  # [EMBED FIX]
        from google.genai import errors, types  # [EMBED FIX]

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version="v1"),
        )  # [EMBED FIX]
        model_name = self.model_name or settings.GEMINI_EMBEDDING_MODEL  # [EMBED FIX]
        if not model_name or model_name in (
            "gemini-embedding-002",
            "models/gemini-embedding-002",
            "gemini-embedding-exp-03-07",
            "models/gemini-embedding-exp-03-07",
        ):
            model_name = "gemini-embedding-2"
        dimensions = self.dimensions or settings.GEMINI_EMBEDDING_DIMENSIONS  # [EMBED FIX]
        config = types.EmbedContentConfig(output_dimensionality=dimensions)  # [EMBED FIX]
        all_embeddings: list[list[float]] = []  # [EMBED FIX]

        for i in range(0, len(formatted_texts), max_batch_size):  # [EMBED FIX]
            batch = formatted_texts[i : i + max_batch_size]  # [EMBED FIX]
            contents = [  # [EMBED FIX]
                types.Content(parts=[types.Part.from_text(text=s)])  # [EMBED FIX]
                for s in batch  # [EMBED FIX]
            ]  # [EMBED FIX]

            max_429_attempts = 5  # [EMBED RETRY FIX]
            attempt_429 = 0  # [EMBED RETRY FIX]
            retries_other = 3  # [EMBED RETRY FIX]
            delay_other = 1.0  # [EMBED RETRY FIX]

            while True:  # [EMBED RETRY FIX]
                try:  # [EMBED FIX]
                    resp = await asyncio.wait_for(  # [EMBED FIX]
                        client.aio.models.embed_content(  # [EMBED FIX]
                            model=model_name,  # [EMBED FIX]
                            contents=contents,  # [EMBED FIX]
                            config=config,  # [EMBED FIX]
                        ),  # [EMBED FIX]
                        timeout=15.0,  # [EMBED FIX]
                    )  # [EMBED FIX]

                    if not resp.embeddings or len(resp.embeddings) != len(batch):  # [EMBED FIX]
                        raise EmbeddingError(  # [EMBED FIX]
                            f"Embedding count mismatch: expected {len(batch)}, got {len(resp.embeddings) if resp.embeddings else 0}"  # [EMBED FIX]
                        )  # [EMBED FIX]

                    for emb in resp.embeddings:  # [EMBED FIX]
                        vec = list(emb.values)  # [EMBED FIX]
                        if len(vec) != dimensions:  # [EMBED FIX]
                            raise EmbeddingError(  # [EMBED FIX]
                                f"Vector dimension mismatch: expected {dimensions}, got {len(vec)}"  # [EMBED FIX]
                            )  # [EMBED FIX]
                        all_embeddings.append(vec)  # [EMBED FIX]
                    break  # [EMBED FIX]

                except EmbeddingError:  # [EMBED FIX]
                    raise  # [EMBED FIX]
                except Exception as exc:  # [EMBED FIX]
                    if _is_rate_limit(exc):  # [EMBED RETRY FIX]
                        attempt_429 += 1  # [EMBED RETRY FIX]
                        if attempt_429 >= max_429_attempts:  # [EMBED RETRY FIX]
                            orig_msg = getattr(exc, "message", None) or str(
                                exc
                            )  # [EMBED RETRY FIX]
                            raise EmbeddingError(orig_msg) from exc  # [EMBED RETRY FIX]
                        parsed_wait = _parse_retry_delay(exc)  # [EMBED RETRY FIX]
                        wait_base = (
                            parsed_wait if parsed_wait is not None else 60.0
                        )  # [EMBED RETRY FIX]
                        sleep_seconds = min(65.0, wait_base + 1.0)  # [EMBED RETRY FIX]
                        logger.warning(  # [EMBED RETRY FIX]
                            "embed_rate_limited",  # [EMBED RETRY FIX]
                            wait_seconds=sleep_seconds,  # [EMBED RETRY FIX]
                            attempt=attempt_429,  # [EMBED RETRY FIX]
                            attempt_number=attempt_429,  # [EMBED RETRY FIX]
                        )  # [EMBED RETRY FIX]
                        await asyncio.sleep(sleep_seconds)  # [EMBED RETRY FIX]
                        continue  # [EMBED RETRY FIX]

                    is_retryable = False  # [EMBED FIX]
                    if isinstance(exc, (TimeoutError, asyncio.TimeoutError)):  # [EMBED FIX]
                        is_retryable = True  # [EMBED FIX]
                    elif isinstance(exc, errors.APIError):  # [EMBED FIX]
                        code = getattr(exc, "code", None)  # [EMBED FIX]
                        if code is not None and 500 <= code < 600:  # [EMBED RETRY FIX]
                            is_retryable = True  # [EMBED FIX]
                    elif "timeout" in str(exc).lower():  # [EMBED RETRY FIX]
                        is_retryable = True  # [EMBED FIX]

                    if not is_retryable:  # [EMBED FIX]
                        raise EmbeddingError(
                            f"Non-retryable embedding failure: {exc}"
                        ) from exc  # [EMBED FIX]

                    retries_other -= 1  # [EMBED RETRY FIX]
                    if retries_other == 0:  # [EMBED RETRY FIX]
                        raise EmbeddingError(  # [EMBED FIX]
                            f"Embedding call failed after 3 attempts: {exc}"  # [EMBED FIX]
                        ) from exc  # [EMBED FIX]
                    await asyncio.sleep(delay_other)  # [EMBED RETRY FIX]
                    delay_other *= 2.0  # [EMBED RETRY FIX]

        return all_embeddings  # [EMBED FIX]


gemini_embedder = GeminiEmbeddingEngine()  # [EMBED FIX]
