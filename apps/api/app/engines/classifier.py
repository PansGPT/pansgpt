# ==============================================================================
# Image Classifier Engine (Stage 4 & 5 - Classify-Then-Route)
# Distinguishes text scans, pharmacology diagrams/pathways, and image tables
# ==============================================================================

import asyncio  # [IMAGE FIX]
from typing import Literal  # [IMAGE FIX]

import structlog  # [IMAGE FIX]

from app.core.config import settings  # [IMAGE FIX]
from app.engines.embedder import _is_rate_limit, _parse_retry_delay  # [IMAGE FIX]

logger = structlog.get_logger(__name__)  # [IMAGE FIX]

ImageRouteType = Literal["text_scan", "diagram", "table"]


class VisionError(Exception):  # [IMAGE FIX]
    """Raised when vision classification or description fails permanently."""  # [IMAGE FIX]

    pass  # [IMAGE FIX]


class ImageClassifier:
    """Classifies embedded images and scanned page canvases into downstream pipelines."""

    def __init__(self):
        self._api_key = settings.GEMINI_API_KEY

    async def classify_and_process(  # [IMAGE FIX]
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
    ) -> tuple[ImageRouteType | None, str | None]:  # [IMAGE FIX]
        """
        Classifies image and extracts appropriate content:
        - 'text_scan': Verbatim text transcription (Clinical Safety Rule: NO summarization)
        - 'diagram': Descriptive markdown [Visual Description: ...]
        - 'table': Structured markdown rows & columns
        """
        if settings.VISION_FAKE_MODE:  # [IMAGE FIX]
            return "diagram", "[Visual Description: Mock pharmacology diagram]"  # [IMAGE FIX]

        api_key = self._api_key or settings.GEMINI_API_KEY  # [IMAGE FIX]
        if not api_key:  # [IMAGE FIX]
            raise VisionError("GEMINI_API_KEY not configured for vision processing")  # [IMAGE FIX]

        from google import genai  # [IMAGE FIX]
        from google.genai import types  # [IMAGE FIX]

        client = genai.Client(api_key=api_key)  # [IMAGE FIX]
        prompt = """
You are an expert pharmacology and medical document processor.
Analyze the provided image and perform two tasks:
1. Determine the classification:
   - TEXT_SCAN: If this is a page or snippet of printed/handwritten text or notes.
   - TABLE: If this is a grid, matrix, or dosage/drug comparison table.
   - DIAGRAM: If this is a chemical structure, biological pathway, chart, or clinical illustration.

2. Process the content according to its classification:
   - If TEXT_SCAN: Transcribe all visible text VERBATIM. Do NOT summarize or omit anything.
   - If TABLE: Output the table as clean, formatted Markdown table with headers and rows.
   - If DIAGRAM: Output a concise description starting with '[Visual Description: ' describing the structures, arrows, receptors, and pathways.

Format your exact response as:
CLASSIFICATION: <TEXT_SCAN|TABLE|DIAGRAM>
---CONTENT---
<Your processed output>
"""
        max_attempts = 5  # [IMAGE FIX]
        for attempt in range(max_attempts):  # [IMAGE FIX]
            try:  # [IMAGE FIX]
                part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)  # [IMAGE FIX]
                response = await client.aio.models.generate_content(  # [IMAGE FIX]
                    model=settings.GEMINI_PRIMARY_MODEL,  # [IMAGE FIX]
                    contents=[part, prompt],  # [IMAGE FIX]
                    config=types.GenerateContentConfig(  # [IMAGE FIX]
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(  # [IMAGE FIX]
                            disable=True  # [IMAGE FIX]
                        )  # [IMAGE FIX]
                    ),  # [IMAGE FIX]
                )  # [IMAGE FIX]
                raw = response.text.strip() if response.text else ""  # [IMAGE FIX]

                route: ImageRouteType = "diagram"  # [IMAGE FIX]
                content: str = ""  # [IMAGE FIX]

                if "CLASSIFICATION: TEXT_SCAN" in raw:  # [IMAGE FIX]
                    route = "text_scan"  # [IMAGE FIX]
                elif "CLASSIFICATION: TABLE" in raw:  # [IMAGE FIX]
                    route = "table"  # [IMAGE FIX]
                elif "CLASSIFICATION: DIAGRAM" in raw:  # [IMAGE FIX]
                    route = "diagram"  # [IMAGE FIX]

                if "---CONTENT---" in raw:  # [IMAGE FIX]
                    content = raw.split("---CONTENT---", 1)[1].strip()  # [IMAGE FIX]
                else:  # [IMAGE FIX]
                    content = raw  # [IMAGE FIX]

                return route, content  # [IMAGE FIX]

            except Exception as exc:  # [IMAGE FIX]
                if _is_rate_limit(exc):  # [IMAGE FIX]
                    if attempt == max_attempts - 1:  # [IMAGE FIX]
                        raise VisionError(f"Vision analysis rate limit exhausted: {exc}") from exc  # [IMAGE FIX]
                    parsed_wait = _parse_retry_delay(exc)  # [IMAGE FIX]
                    wait_base = parsed_wait if parsed_wait is not None else 60.0  # [IMAGE FIX]
                    sleep_seconds = min(65.0, wait_base + 1.0)  # [IMAGE FIX]
                    logger.warning(  # [IMAGE FIX]
                        "vision_rate_limited",  # [IMAGE FIX]
                        wait_seconds=sleep_seconds,  # [IMAGE FIX]
                        attempt=attempt + 1,  # [IMAGE FIX]
                    )  # [IMAGE FIX]
                    await asyncio.sleep(sleep_seconds)  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                code = getattr(exc, "code", None)  # [IMAGE FIX]
                status = getattr(exc, "status", None)  # [IMAGE FIX]
                is_timeout = isinstance(exc, (TimeoutError, asyncio.TimeoutError)) or "timeout" in str(exc).lower()  # [IMAGE FIX]
                is_5xx = (code is not None and 500 <= code < 600) or any(x in str(exc).lower() for x in ["500", "502", "503", "504", "unavailable", "server error"])  # [IMAGE FIX]
                is_400 = (code == 400 or status == "INVALID_ARGUMENT" or "400" in str(exc) or "invalid argument" in str(exc).lower())  # [IMAGE FIX]

                if is_400 and not (is_5xx or is_timeout):  # [IMAGE FIX]
                    logger.warning("vision_image_skipped", error=str(exc))  # [IMAGE FIX]
                    return None, None  # [IMAGE FIX]

                if is_5xx or is_timeout:  # [IMAGE FIX]
                    if attempt == max_attempts - 1:  # [IMAGE FIX]
                        raise VisionError(f"Vision analysis server error exhausted: {exc}") from exc  # [IMAGE FIX]
                    delay = min(8.0, 1.0 * (2 ** attempt))  # [IMAGE FIX]
                    logger.warning(  # [IMAGE FIX]
                        "vision_transient_error",  # [IMAGE FIX]
                        error=str(exc),  # [IMAGE FIX]
                        attempt=attempt + 1,  # [IMAGE FIX]
                        retry_delay=delay,  # [IMAGE FIX]
                    )  # [IMAGE FIX]
                    await asyncio.sleep(delay)  # [IMAGE FIX]
                    continue  # [IMAGE FIX]

                logger.warning("vision_image_skipped", error=str(exc))  # [IMAGE FIX]
                return None, None  # [IMAGE FIX]

        raise VisionError(f"Vision analysis failed after {max_attempts} attempts")  # [IMAGE FIX]


image_classifier = ImageClassifier()
