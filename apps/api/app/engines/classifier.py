# ==============================================================================
# Image Classifier Engine (Stage 4 & 5 - Classify-Then-Route)
# Distinguishes text scans, pharmacology diagrams/pathways, and image tables
# ==============================================================================

import asyncio  # [VISION FIX]
import hashlib  # [VISION FIX]
from typing import Literal  # [VISION FIX]

import structlog  # [VISION FIX]

from app.core.config import settings  # [VISION FIX]
from app.engines.embedder import _is_rate_limit, _parse_retry_delay  # [VISION FIX]

logger = structlog.get_logger(__name__)  # [VISION FIX]

ImageRouteType = Literal["text_scan", "diagram", "table"]  # [VISION FIX]

BACKOFF_5XX = [1.0, 2.0, 4.0, 8.0, 8.0]  # [VISION FIX]
BACKOFF_CONN = [5.0, 10.0, 20.0, 40.0, 60.0]  # [VISION FIX]


def _is_connection_error(exc: Exception) -> bool:  # [VISION FIX]
    try:  # [VISION FIX]
        import aiohttp  # [VISION FIX]

        aio_types = (aiohttp.ClientConnectorError,)  # [VISION FIX]
    except ImportError:  # [VISION FIX]
        aio_types = ()  # [VISION FIX]
    if isinstance(exc, (OSError, ConnectionError, *aio_types)):  # [VISION FIX]
        return True  # [VISION FIX]
    msg = str(exc).lower()  # [VISION FIX]
    return (  # [VISION FIX]
        "getaddrinfo failed" in msg  # [VISION FIX]
        or "cannot connect to host" in msg  # [VISION FIX]
        or "connection error" in msg  # [VISION FIX]
        or "connection reset" in msg  # [VISION FIX]
        or "network is unreachable" in msg  # [VISION FIX]
    )  # [VISION FIX]


def _is_server_error_or_timeout(exc: Exception) -> bool:  # [VISION FIX]
    if (
        isinstance(exc, (TimeoutError, asyncio.TimeoutError)) or "timeout" in str(exc).lower()
    ):  # [VISION FIX]
        return True  # [VISION FIX]
    code = getattr(exc, "code", None)  # [VISION FIX]
    status = getattr(exc, "status", None)  # [VISION FIX]
    if code is not None and 500 <= code < 600:  # [VISION FIX]
        return True  # [VISION FIX]
    if status in ("INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED"):  # [VISION FIX]
        return True  # [VISION FIX]
    msg = str(exc).lower()  # [VISION FIX]
    return any(  # [VISION FIX]
        x in msg  # [VISION FIX]
        for x in [
            "500",
            "502",
            "503",
            "504",
            "internal error",
            "unavailable",
            "server error",
        ]  # [VISION FIX]
    )  # [VISION FIX]


def _is_400_invalid_image(exc: Exception) -> bool:  # [VISION FIX]
    code = getattr(exc, "code", None)  # [VISION FIX]
    status = getattr(exc, "status", None)  # [VISION FIX]
    if code == 400 or status == "INVALID_ARGUMENT":  # [VISION FIX]
        return True  # [VISION FIX]
    msg = str(exc).lower()  # [VISION FIX]
    return (  # [VISION FIX]
        "400" in msg or "invalid_argument" in msg or "invalid argument" in msg  # [VISION FIX]
    ) and (not _is_server_error_or_timeout(exc) and not _is_rate_limit(exc))  # [VISION FIX]


class VisionError(Exception):  # [VISION FIX]
    """Raised when vision classification or description fails permanently."""  # [VISION FIX]

    pass  # [VISION FIX]


class ImageClassifier:  # [VISION FIX]
    """Classifies embedded images and scanned page canvases into downstream pipelines."""  # [VISION FIX]

    def __init__(self):  # [VISION FIX]
        self._api_key = settings.GEMINI_API_KEY  # [VISION FIX]

    async def classify_and_process(  # [VISION FIX]
        self,  # [VISION FIX]
        image_bytes: bytes,  # [VISION FIX]
        mime_type: str = "image/png",  # [VISION FIX]
        page_number: int | None = None,  # [VISION FIX]
    ) -> tuple[ImageRouteType | None, str | None]:  # [VISION FIX]
        """Classifies image and extracts appropriate content:
        - 'text_scan': Verbatim text transcription (Clinical Safety Rule: NO summarization)
        - 'diagram': Descriptive markdown [Visual Description: ...]
        - 'table': Structured markdown rows & columns
        """  # [VISION FIX]
        if settings.VISION_FAKE_MODE:  # [VISION FIX]
            return "diagram", "[Visual Description: Mock pharmacology diagram]"  # [VISION FIX]

        api_key = self._api_key or settings.GEMINI_API_KEY  # [VISION FIX]
        if not api_key:  # [VISION FIX]
            raise VisionError("GEMINI_API_KEY not configured for vision processing")  # [VISION FIX]

        from google import genai  # [VISION FIX]
        from google.genai import types  # [VISION FIX]

        client = genai.Client(api_key=api_key)  # [VISION FIX]
        prompt = (  # [VISION FIX]
            "/nothink\n"  # [VISION FIX]
            "You are an expert pharmacology and medical document processor.\n"
            "Analyze the provided image and perform two tasks:\n"
            "1. Determine the classification:\n"
            "   - TEXT_SCAN: If this is a page or snippet of printed/handwritten text or notes.\n"
            "   - TABLE: If this is a grid, matrix, or dosage/drug comparison table.\n"
            "   - DIAGRAM: If this is a chemical structure, biological pathway, chart, or clinical illustration.\n\n"
            "2. Process the content according to its classification:\n"
            "   - If TEXT_SCAN: Transcribe all visible text VERBATIM. Do NOT summarize or omit anything.\n"
            "   - If TABLE: Output the table as clean, formatted Markdown table with headers and rows.\n"
            "   - If DIAGRAM: Output a concise description starting with '[Visual Description: ' describing the structures, arrows, receptors, and pathways.\n\n"
            "Format your exact response as:\n"
            "CLASSIFICATION: <TEXT_SCAN|TABLE|DIAGRAM>\n"
            "---CONTENT---\n"
            "<Your processed output>\n"
        )  # [VISION FIX]

        model_to_use = (
            getattr(settings, "GEMINI_VISION_MODEL", None) or "gemma-4-26b-a4b-it"
        )  # [VISION FIX]
        hash_prefix = hashlib.md5(image_bytes).hexdigest()[:8]  # [VISION FIX]
        max_attempts = 5  # [VISION FIX]

        for attempt in range(max_attempts):  # [VISION FIX]
            try:  # [VISION FIX]
                part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)  # [VISION FIX]
                response = await client.aio.models.generate_content(  # [VISION FIX]
                    model=model_to_use,  # [VISION FIX]
                    contents=[part, prompt],  # [VISION FIX]
                    config=types.GenerateContentConfig(  # [VISION FIX]
                        max_output_tokens=1024,  # [VISION FIX]
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(  # [VISION FIX]
                            disable=True  # [VISION FIX]
                        ),  # [VISION FIX]
                    ),  # [VISION FIX]
                )  # [VISION FIX]
                raw = response.text.strip() if response.text else ""  # [VISION FIX]

                if not raw:  # [VISION FIX]
                    # Retry once on empty model output (3d)  # [VISION FIX]
                    logger.warning(  # [VISION FIX]
                        "vision_empty_retry",  # [VISION FIX]
                        page=page_number,  # [VISION FIX]
                        hash_prefix=hash_prefix,  # [VISION FIX]
                        attempt=attempt + 1,  # [VISION FIX]
                    )  # [VISION FIX]
                    try:  # [VISION FIX]
                        await asyncio.sleep(1.0)  # [VISION FIX]
                        retry_response = await client.aio.models.generate_content(  # [VISION FIX]
                            model=model_to_use,  # [VISION FIX]
                            contents=[part, prompt],  # [VISION FIX]
                            config=types.GenerateContentConfig(  # [VISION FIX]
                                max_output_tokens=1024,  # [VISION FIX]
                                automatic_function_calling=types.AutomaticFunctionCallingConfig(  # [VISION FIX]
                                    disable=True  # [VISION FIX]
                                ),  # [VISION FIX]
                            ),  # [VISION FIX]
                        )  # [VISION FIX]
                        raw = (
                            retry_response.text.strip() if retry_response.text else ""
                        )  # [VISION FIX]
                    except Exception:  # [VISION FIX]
                        pass  # [VISION FIX]

                    if not raw:  # [VISION FIX]
                        logger.warning(  # [VISION FIX]
                            "vision_empty_result",  # [VISION FIX]
                            page=page_number,  # [VISION FIX]
                            hash_prefix=hash_prefix,  # [VISION FIX]
                        )  # [VISION FIX]
                        return None, ""  # [VISION FIX]

                route: ImageRouteType = "diagram"  # [VISION FIX]
                content: str = ""  # [VISION FIX]

                if "CLASSIFICATION: TEXT_SCAN" in raw:  # [VISION FIX]
                    route = "text_scan"  # [VISION FIX]
                elif "CLASSIFICATION: TABLE" in raw:  # [VISION FIX]
                    route = "table"  # [VISION FIX]
                elif "CLASSIFICATION: DIAGRAM" in raw:  # [VISION FIX]
                    route = "diagram"  # [VISION FIX]

                if "---CONTENT---" in raw:  # [VISION FIX]
                    content = raw.split("---CONTENT---", 1)[1].strip()  # [VISION FIX]
                else:  # [VISION FIX]
                    content = raw  # [VISION FIX]

                return route, content  # [VISION FIX]

            except Exception as exc:  # [VISION FIX]
                is_final_attempt = attempt == max_attempts - 1  # [VISION FIX]

                # 1. Connection / DNS error  # [VISION FIX]
                if _is_connection_error(exc):  # [VISION FIX]
                    if is_final_attempt:  # [VISION FIX]
                        raise VisionError(  # [VISION FIX]
                            f"Vision connection failed after {max_attempts} attempts: {exc}"  # [VISION FIX]
                        ) from exc  # [VISION FIX]
                    conn_delay = BACKOFF_CONN[min(attempt, len(BACKOFF_CONN) - 1)]  # [VISION FIX]
                    logger.warning(  # [VISION FIX]
                        "vision_connection_error",  # [VISION FIX]
                        page=page_number,  # [VISION FIX]
                        hash_prefix=hash_prefix,  # [VISION FIX]
                        attempt=attempt + 1,  # [VISION FIX]
                        retry_delay=conn_delay,  # [VISION FIX]
                        error=str(exc),  # [VISION FIX]
                    )  # [VISION FIX]
                    await asyncio.sleep(conn_delay)  # [VISION FIX]
                    continue  # [VISION FIX]

                # 2. Rate limit (429 / RESOURCE_EXHAUSTED)  # [VISION FIX]
                if _is_rate_limit(exc):  # [VISION FIX]
                    if is_final_attempt:  # [VISION FIX]
                        raise VisionError(  # [VISION FIX]
                            f"Vision rate limit exhausted after {max_attempts} attempts: {exc}"  # [VISION FIX]
                        ) from exc  # [VISION FIX]
                    parsed_wait = _parse_retry_delay(exc)  # [VISION FIX]
                    wait_base = parsed_wait if parsed_wait is not None else 60.0  # [VISION FIX]
                    rate_delay = min(65.0, wait_base + 1.0)  # [VISION FIX]
                    logger.warning(  # [VISION FIX]
                        "vision_rate_limited",  # [VISION FIX]
                        page=page_number,  # [VISION FIX]
                        hash_prefix=hash_prefix,  # [VISION FIX]
                        attempt=attempt + 1,  # [VISION FIX]
                        wait_seconds=rate_delay,  # [VISION FIX]
                        error=str(exc),  # [VISION FIX]
                    )  # [VISION FIX]
                    await asyncio.sleep(rate_delay)  # [VISION FIX]
                    continue  # [VISION FIX]

                # 3. HTTP 400 invalid image error -> skip only this image (3c)  # [VISION FIX]
                if _is_400_invalid_image(exc):  # [VISION FIX]
                    logger.warning(  # [VISION FIX]
                        "vision_image_skipped",  # [VISION FIX]
                        page=page_number,  # [VISION FIX]
                        hash_prefix=hash_prefix,  # [VISION FIX]
                        error=str(exc),  # [VISION FIX]
                    )  # [VISION FIX]
                    return None, None  # [VISION FIX]

                # 4. 5xx and timeouts  # [VISION FIX]
                if _is_server_error_or_timeout(exc):  # [VISION FIX]
                    if is_final_attempt:  # [VISION FIX]
                        raise VisionError(  # [VISION FIX]
                            f"Vision server error exhausted after {max_attempts} attempts: {exc}"  # [VISION FIX]
                        ) from exc  # [VISION FIX]
                    server_delay = BACKOFF_5XX[min(attempt, len(BACKOFF_5XX) - 1)]  # [VISION FIX]
                    logger.warning(  # [VISION FIX]
                        "vision_transient_error",  # [VISION FIX]
                        page=page_number,  # [VISION FIX]
                        hash_prefix=hash_prefix,  # [VISION FIX]
                        attempt=attempt + 1,  # [VISION FIX]
                        retry_delay=server_delay,  # [VISION FIX]
                        error=str(exc),  # [VISION FIX]
                    )  # [VISION FIX]
                    await asyncio.sleep(server_delay)  # [VISION FIX]
                    continue  # [VISION FIX]

                # 5. Any other unexpected error -> NEVER skip, retry or raise VisionError  # [VISION FIX]
                if is_final_attempt:  # [VISION FIX]
                    raise VisionError(  # [VISION FIX]
                        f"Vision analysis failed after {max_attempts} attempts: {exc}"  # [VISION FIX]
                    ) from exc  # [VISION FIX]
                unknown_delay = BACKOFF_5XX[min(attempt, len(BACKOFF_5XX) - 1)]  # [VISION FIX]
                logger.warning(  # [VISION FIX]
                    "vision_unexpected_error",  # [VISION FIX]
                    page=page_number,  # [VISION FIX]
                    hash_prefix=hash_prefix,  # [VISION FIX]
                    attempt=attempt + 1,  # [VISION FIX]
                    retry_delay=unknown_delay,  # [VISION FIX]
                    error=str(exc),  # [VISION FIX]
                )  # [VISION FIX]
                await asyncio.sleep(unknown_delay)  # [VISION FIX]
                continue  # [VISION FIX]

        raise VisionError(f"Vision analysis failed after {max_attempts} attempts")  # [VISION FIX]


image_classifier = ImageClassifier()  # [VISION FIX]
