# ==============================================================================
# Worker Guard Tests and Escalation Error Tests [WORKER FIX]
# ==============================================================================

import ast
import hashlib
import io
import os
import re
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import fitz
import pytest
from PIL import Image

from app.core.config import settings
from app.engines.classifier import VisionError, image_classifier
from app.engines.ingestion import document_ingestion_engine
from workers.tasks import _get_document_meta, _update_document_converted_info

# ------------------------------------------------------------------------------
# 1. AST Guard Test: No SQL Strings with '#' Comments
# ------------------------------------------------------------------------------
# Harmless strings in apps/api that contain a '#' and SQL keywords, allowed by exact value with a one-line reason:  # [WORKER FIX 2]
ALLOWED_HARMLESS_STRINGS = {  # [WORKER FIX 2]
    # CSS hex colour codes (#15803d, #ffffff, #6b7280) in admin invite HTML template in app/routers/admin.py (matches 'with')  # [WORKER FIX 2]
    '" style="background-color: #15803d; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">\n                                Accept Faculty Invitation\n                            </a>\n                        </p>\n                        <p style="color: #6b7280; font-size: 14px;">This invitation link will expire in accordance with institutional policy.</p>\n                    </div>\n                    ',  # [WORKER FIX 2]
    # Docstring for convert_office_to_pdf in app/engines/converter.py (contains English word 'with' and doc tag)  # [WORKER FIX 2]
    "# [OFFICE PDF FIX]\n    Converts Office documents (.docx, .doc, .pptx, .ppt) to faithful visual PDF bytes via LibreOffice.  # [OFFICE PDF FIX]\n    Runs soffice in headless mode with an isolated per-call profile under a module-level concurrency semaphore.  # [OFFICE PDF FIX]\n    ",  # [WORKER FIX 2]
    # Docstring for DocumentIngestionEngine in app/engines/ingestion.py (contains English word 'with' and doc tag)  # [WORKER FIX 2]
    "\n    Executes the 8-stage document processing pipeline:\n    1. Upload & Immutable R2 Storage (Retrieved via storage_engine)\n    2. Per-Page Text Layer Check (zero-cost check)\n    3a. Native Text Extraction + Image Scan\n    3b. Scanned Canvas Render (Image route with local OCR-first)\n    4. Universal Image Classifier (Text Scan / Diagram / Table)\n    5. Text-Image Verbatim Transcription (Clinical Safety Rule)\n    6. Dual-Path Table Extraction (Structural geometry vs Vision)\n    7. Hierarchy & Segmentation (Single pass with explicit/synthesized/inherited titles)\n    8. Semantic Chunking & 1536d Vector Embeddings  # [DIM 1536]\n    ",  # [WORKER FIX 2]
    # Docstring for process_pending_images in app/engines/ingestion.py (contains English word 'from' and doc tag)  # [WORKER FIX 2]
    "# [IMAGES PHASE]\n        Phase 2: Resumable background processor for pending document images and scanned canvases.  # [IMAGES PHASE]\n        Re-extracts images from the PDF in R2, classifies via throttled vision cascade,  # [IMAGES PHASE]\n        and commits elements, chunks, and embeddings atomically per successful image.  # [IMAGES PHASE]\n        Returns 'completed' if all pending rows are processed, or 'paused' after 3 consecutive failures.  # [IMAGES PHASE]\n        ",  # [WORKER FIX 2]
    # Docstring for RAGRetrievalEngine in app/engines/rag.py (contains English word 'with' and doc tag)  # [WORKER FIX 2]
    "\n    3-Pool Hybrid RAG Retrieval Engine:\n    - Normalizes medical abbreviations with 200+ term clinical dictionary\n    - Multi-Query decomposition & HyDE hypothetical document generation\n    - Computes 1536d dense vector embeddings via Gemini  # [DIM 1536]\n    - Executes PostgreSQL 3-Pool Hybrid Search (Vector + FTS + Trigram) with RRF (k=60)\n    - Multi-factor candidate re-ranking (Dense + RRF + Lexical Overlap + Metadata)\n    - Absence Policy automated web search fallback for low/empty confidence\n    - Sibling & Full-Segment expansion for complete pharmacological contexts\n    - Returns structured citations with page coordinates and assembled markdown context\n    ",  # [WORKER FIX 2]
    # Docstring for chat SSE endpoint in app/routers/chat.py (contains English word 'with' and doc tag)  # [WORKER FIX 2]
    "\n    Core Server-Sent Events (SSE) endpoint:\n    1. Pre-LLM Prompt Injection & Policy Guard\n    2. Medical Acronym Normalizer\n    3. RAG Retrieval via Supabase RPC (1536d dense vectors + sibling & segment expansion)  # [DIM 1536]\n    4. Multi-turn Agentic Tool Loop & Multi-tier LLM inference\n    5. SSE Token streaming with 15s keep-alive heartbeat and disconnect abort\n    6. Asynchronous persistence of user and assistant messages + telemetry\n    ",  # [WORKER FIX 2]
    # Docstring for ingest_document_job in workers/tasks.py (contains English word 'with' and doc tag)  # [WORKER FIX 2]
    "\n    ARQ Background Job:\n    1. Claims document concurrency lock via `claim_document_ingestion`\n    2. Transitions status to 'processing'\n    3. Spawns 30s heartbeat loop\n    4. Converts Office files (.doc, .docx, .ppt, .pptx) to faithful visual PDF via LibreOffice  # [OFFICE PDF FIX]\n    5. Runs full 8-stage extraction, chunking, and 1536d vector pipeline on the PDF  # [DIM 1536]\n    6. Retries with exponential backoff on transient errors (30s, 60s, 120s)\n    7. Transitions status to 'completed' (or 'failed' if retries exhausted)\n    ",  # [WORKER FIX 2]
    # Docstring for test_no_hash_comments_in_sql_strings in tests/test_worker_guards.py (explains hash checks)  # [WORKER FIX 2]
    "AST guard: fails if any SQL-looking string constant contains any hash character.  # [WORKER FIX 2]\n\n    PostgreSQL does not support hash comments (only '--' and '/* */').  # [WORKER FIX 2]\n    Any hash comment symbol inside a SQL string passed to asyncpg causes:  # [WORKER FIX 2]\n        PostgresSyntaxError: syntax error at or near hash  # [WORKER FIX 2]\n    This guard catches ALL hash comment occurrences in SQL strings (SELECT, INSERT, UPDATE, DELETE, CREATE, WITH, FROM).  # [WORKER FIX 2]\n    Harmless strings (like colour codes) are explicitly allowed by exact value above.  # [WORKER FIX 2]\n    ",  # [WORKER FIX 2]
}  # [WORKER FIX 2]


def test_no_hash_comments_in_sql_strings():  # [WORKER FIX 2]
    """AST guard: fails if any SQL-looking string constant contains any hash character.  # [WORKER FIX 2]

    PostgreSQL does not support hash comments (only '--' and '/* */').  # [WORKER FIX 2]
    Any hash comment symbol inside a SQL string passed to asyncpg causes:  # [WORKER FIX 2]
        PostgresSyntaxError: syntax error at or near hash  # [WORKER FIX 2]
    This guard catches ALL hash comment occurrences in SQL strings (SELECT, INSERT, UPDATE, DELETE, CREATE, WITH, FROM).  # [WORKER FIX 2]
    Harmless strings (like colour codes) are explicitly allowed by exact value above.  # [WORKER FIX 2]
    """  # [WORKER FIX 2]
    root_dir = Path(__file__).resolve().parent.parent  # apps/api
    sql_keywords = re.compile(
        r"\b(SELECT|INSERT|UPDATE|DELETE|CREATE|WITH|FROM)\b", re.IGNORECASE
    )  # [WORKER FIX 2]

    violating_strings = []
    for root, dirs, files in os.walk(root_dir):
        # Exclude virtual environments and cache
        if any(ignored in root for ignored in [".venv", "__pycache__", ".git"]):
            continue
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, encoding="utf-8") as f:
                    content = f.read()
                try:
                    tree = ast.parse(content, filename=file_path)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Constant) and isinstance(node.value, str):
                            s = node.value
                            if sql_keywords.search(s) and "#" in s:  # [WORKER FIX 2]
                                if (
                                    s not in ALLOWED_HARMLESS_STRINGS
                                    and s.strip() not in ALLOWED_HARMLESS_STRINGS
                                ):  # [WORKER FIX 2]
                                    rel_path = os.path.relpath(
                                        file_path, root_dir
                                    )  # [WORKER FIX 3]
                                    for offset, line_text in enumerate(
                                        s.splitlines()
                                    ):  # [WORKER FIX 3]
                                        if "#" in line_text:  # [WORKER FIX 3]
                                            line_no = node.lineno + offset  # [WORKER FIX 3]
                                            violating_strings.append(  # [WORKER FIX 3]
                                                f"- {rel_path}:{line_no}: {line_text.strip()!r}"  # [WORKER FIX 3]
                                            )  # [WORKER FIX 3]
                except Exception as exc:
                    pytest.fail(f"AST parse failed on {file_path}: {exc}")

    assert len(violating_strings) == 0, (  # [WORKER FIX 3]
        "Found SQL strings containing '#' comments:\n"  # [WORKER FIX 3]
        + "\n".join(violating_strings)  # [WORKER FIX 3]
    )  # [WORKER FIX 3]


# ------------------------------------------------------------------------------
# 2. Mock asyncpg Guard Test: _get_document_meta & _update_document_converted_info
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX]
async def test_get_document_meta_and_update_converted_info_sql_no_hash(monkeypatch):  # [WORKER FIX]
    """Calls _get_document_meta and _update_document_converted_info and asserts SQL text contains no '#'."""
    mock_conn = MagicMock()
    captured_queries = []

    async def mock_fetchrow(query, *args):
        captured_queries.append(query)
        return {
            "id": uuid.uuid4(),
            "storage_key": "test.pdf",
            "mime_type": "application/pdf",
            "converted_key": None,
            "university_id": uuid.uuid4(),
            "course_code": "TEST_000",
            "page_count": 1,
        }

    async def mock_execute(query, *args):
        captured_queries.append(query)
        return "UPDATE 1"

    async def mock_close():
        pass

    mock_conn.fetchrow = mock_fetchrow
    mock_conn.execute = mock_execute
    mock_conn.close = mock_close

    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock")
    monkeypatch.setattr("asyncpg.connect", AsyncMock(return_value=mock_conn))

    test_doc_id = str(uuid.uuid4())

    # Call _get_document_meta
    await _get_document_meta(test_doc_id)

    # Call _update_document_converted_info with page_count
    await _update_document_converted_info(test_doc_id, "converted/test.pdf", page_count=5)

    # Call _update_document_converted_info without page_count
    await _update_document_converted_info(test_doc_id, "converted/test.pdf", page_count=None)

    assert len(captured_queries) == 3, f"Expected 3 queries, got {len(captured_queries)}"
    for q in captured_queries:
        assert "#" not in q, f"SQL query contains '#' character: {q}"


# ------------------------------------------------------------------------------
# Helper for Vision Escalation Tests
# ------------------------------------------------------------------------------
def _make_mock_response(text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=1024):
    cand = MagicMock()
    cand.finish_reason = finish_reason
    resp = MagicMock()
    resp.candidates = [cand]
    resp.prompt_feedback = None
    resp.usage_metadata = MagicMock(
        prompt_token_count=p_tok,
        candidates_token_count=c_tok,
        thoughts_token_count=th_tok,
    )
    resp.text = text
    return resp


# ------------------------------------------------------------------------------
# 3. Escalation Error Tests: (a) 500 on 8192 step then success
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX]
async def test_escalation_500_on_8192_then_success(monkeypatch):  # [WORKER FIX]
    """(a) a 500 on the 8192 step then success succeeds on retry."""
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")

    call_history = []

    async def mock_generate_content(*args, **kwargs):
        config = kwargs.get("config")
        max_tok = getattr(config, "max_output_tokens", None)
        call_history.append(max_tok)

        if max_tok == 1024:
            # 1024 burns all tokens thinking
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=1024
            )
        elif max_tok == 4096:
            # 4096 burns all tokens thinking
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=4096
            )
        elif max_tok == 8192:
            # First attempt at 8192 throws 500 error
            if call_history.count(8192) == 1:
                err = Exception("500 Internal Server Error")
                err.code = 500
                raise err
            # Second attempt at 8192 succeeds
            return _make_mock_response(
                text="CLASSIFICATION: DIAGRAM\n---CONTENT---\n[Visual Description: Drug receptor interaction]",
                finish_reason="STOP",
                p_tok=100,
                c_tok=150,
                th_tok=5000,
            )
        return _make_mock_response()

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content

    with (
        patch("google.genai.Client", return_value=mock_client),
        patch("asyncio.sleep", AsyncMock()),
    ):
        route, content = await image_classifier.classify_and_process(
            b"fake_image_bytes", page_number=12
        )
        assert route == "diagram"
        assert "[Visual Description: Drug receptor interaction]" in content
        assert call_history == [1024, 4096, 8192, 8192]


# ------------------------------------------------------------------------------
# 4. Escalation Error Tests: (b) Three 500s on 8192 step leaves pending and pauses
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX]
async def test_escalation_three_500s_leaves_pending_and_pauses(monkeypatch):  # [WORKER FIX]
    """(b) three 500s on the 8192 step leaves the row pending and pauses."""
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")

    call_history = []

    async def mock_generate_content(*args, **kwargs):
        config = kwargs.get("config")
        max_tok = getattr(config, "max_output_tokens", None)
        call_history.append(max_tok)

        if max_tok == 1024:
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=1024
            )
        elif max_tok == 4096:
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=4096
            )
        elif max_tok == 8192:
            # Always fail with 500
            err = Exception("500 Internal Server Error")
            err.code = 500
            raise err
        return _make_mock_response()

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content

    with (
        patch("google.genai.Client", return_value=mock_client),
        patch("asyncio.sleep", AsyncMock()),
    ):
        # classify_and_process must raise VisionError (not return empty:MAX_TOKENS)
        with pytest.raises(VisionError) as exc_info:
            await image_classifier.classify_and_process(b"fake_image_bytes", page_number=12)
        assert "Vision escalation to 8192 tokens failed after 3 attempts" in str(exc_info.value)
        assert call_history == [1024, 4096, 8192, 8192, 8192]

    # Verify that in process_pending_images, VisionError keeps row 'pending' and pauses after 3 failures
    doc = fitz.open()  # [WORKER FIX]
    page = doc.new_page(width=600, height=800)  # [WORKER FIX]
    img = Image.new("RGB", (300, 300), color=(100, 150, 200))  # [WORKER FIX]
    buf = io.BytesIO()  # [WORKER FIX]
    img.save(buf, format="PNG")  # [WORKER FIX]
    page.insert_image(fitz.Rect(50, 100, 350, 400), stream=buf.getvalue())  # [WORKER FIX]
    pdf_bytes = doc.tobytes()  # [WORKER FIX]
    img_info = doc[0].get_image_info(xrefs=True)[0]  # [WORKER FIX]
    raw_img = doc.extract_image(img_info["xref"])["image"]  # [WORKER FIX]
    content_hash = hashlib.md5(raw_img).hexdigest()  # [WORKER FIX]
    doc.close()  # [WORKER FIX]

    doc_id = str(uuid.uuid4())  # [WORKER FIX]
    row_id = uuid.uuid4()  # [WORKER FIX]
    pending_row = {  # [WORKER FIX]
        "id": row_id,  # [WORKER FIX]
        "page_number": 1,  # [WORKER FIX]
        "content_hash": content_hash,  # [WORKER FIX]
        "source": "embedded",  # [WORKER FIX]
        "width": 300,  # [WORKER FIX]
        "height": 300,  # [WORKER FIX]
        "status": "pending",  # [WORKER FIX]
        "attempts": 0,  # [WORKER FIX]
    }  # [WORKER FIX]

    mock_db = MagicMock()
    execute_calls = []

    async def mock_execute(query, *args):
        execute_calls.append((query, args))
        return "UPDATE 1"

    async def mock_fetch(query, *args):
        if "GROUP BY status" in query:
            return [{"status": "pending", "count": 1}]
        if "FROM public.document_images" in query:
            return [pending_row]
        if "FROM public.document_segments" in query:
            return [{"id": uuid.uuid4(), "start_page": 1, "end_page": 20, "order_index": 0}]
        return []

    async def mock_fetchval(query, *args):
        if "SELECT 1" in query:
            return 1
        return None

    async def mock_fetchrow(query, *args):
        return {
            "id": uuid.uuid4(),
            "converted_key": None,
            "storage_key": "test.pdf",
            "embedding_status": "active",
        }

    mock_db.execute = mock_execute
    mock_db.fetch = mock_fetch
    mock_db.fetchval = mock_fetchval
    mock_db.fetchrow = mock_fetchrow
    mock_db.close = AsyncMock()

    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql://mock:mock@localhost/mock")
    monkeypatch.setattr("asyncpg.connect", AsyncMock(return_value=mock_db))
    monkeypatch.setattr(
        "app.engines.ingestion.storage_engine.download_bytes", AsyncMock(return_value=pdf_bytes)
    )

    # Mock classify_and_process to raise VisionError
    with patch.object(
        image_classifier,
        "classify_and_process",
        side_effect=VisionError("Vision escalation failed"),
    ):
        res = await document_ingestion_engine.process_pending_images(
            doc_id, "test.pdf", max_consecutive_failures=1
        )
        assert res == "paused"

    # Verify that the DB was updated with status = 'pending' (NEVER 'skipped')
    status_updates = [
        args
        for q, args in execute_calls
        if "UPDATE public.document_images" in q and "status = $4" in q
    ]
    assert len(status_updates) == 1
    # args: (row_id, new_attempts, err_msg, new_status)
    assert status_updates[0][3] == "pending"
    assert "Vision escalation failed" in status_updates[0][2]


# ------------------------------------------------------------------------------
# 5. Escalation Error Tests: (c) True MAX_TOKENS at 8192 skips with empty:MAX_TOKENS
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX]
async def test_escalation_true_max_tokens_at_8192_skips(monkeypatch):  # [WORKER FIX]
    """(c) a true MAX_TOKENS at 8192 skips with 'empty:MAX_TOKENS' and logs 8192 telemetry."""
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")

    call_history = []

    async def mock_generate_content(*args, **kwargs):
        config = kwargs.get("config")
        max_tok = getattr(config, "max_output_tokens", None)
        call_history.append(max_tok)

        if max_tok == 1024:
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=1024
            )
        elif max_tok == 4096:
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=4096
            )
        elif max_tok == 8192:
            # True MAX_TOKENS at 8192: burned all 8192 tokens in thinking, 0 candidate tokens
            return _make_mock_response(
                text="", finish_reason="MAX_TOKENS", p_tok=100, c_tok=0, th_tok=8192
            )
        return _make_mock_response()

    mock_client = MagicMock()
    mock_client.aio.models.generate_content = mock_generate_content

    with (
        patch("google.genai.Client", return_value=mock_client),
        patch("asyncio.sleep", AsyncMock()),
    ):
        route, content = await image_classifier.classify_and_process(
            b"fake_image_bytes", page_number=12
        )
        assert route is None
        assert content == "empty:MAX_TOKENS"
        assert call_history == [1024, 4096, 8192]


# ------------------------------------------------------------------------------
# 6. Escalation Error Tests: 400 -> called once, then fails [WORKER FIX 2]
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX 2]
async def test_escalation_400_called_once_then_fails(monkeypatch):  # [WORKER FIX 2]
    """400 client error during token escalation must not retry: called once, then raises VisionError."""  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [WORKER FIX 2]

    call_history = []  # [WORKER FIX 2]

    async def mock_generate_content(*args, **kwargs):  # [WORKER FIX 2]
        config = kwargs.get("config")  # [WORKER FIX 2]
        max_tok = getattr(config, "max_output_tokens", None)  # [WORKER FIX 2]
        call_history.append(max_tok)  # [WORKER FIX 2]

        if max_tok == 1024:  # [WORKER FIX 2]
            return _make_mock_response(  # [WORKER FIX 2]
                text="",
                finish_reason="MAX_TOKENS",
                p_tok=100,
                c_tok=0,
                th_tok=1024,  # [WORKER FIX 2]
            )  # [WORKER FIX 2]
        elif max_tok == 4096:  # [WORKER FIX 2]
            # 400 client error -> should not be retried  # [WORKER FIX 2]
            err = Exception("400 Bad Request")  # [WORKER FIX 2]
            err.code = 400  # [WORKER FIX 2]
            raise err  # [WORKER FIX 2]
        return _make_mock_response()  # [WORKER FIX 2]

    mock_client = MagicMock()  # [WORKER FIX 2]
    mock_client.aio.models.generate_content = mock_generate_content  # [WORKER FIX 2]

    with (  # [WORKER FIX 2]
        patch("google.genai.Client", return_value=mock_client),  # [WORKER FIX 2]
        patch("asyncio.sleep", AsyncMock()),  # [WORKER FIX 2]
    ):  # [WORKER FIX 2]
        with pytest.raises(VisionError) as exc_info:  # [WORKER FIX 2]
            await image_classifier.classify_and_process(
                b"fake_image_bytes", page_number=12
            )  # [WORKER FIX 2]
        assert "non-retriable error" in str(exc_info.value)  # [WORKER FIX 2]
        # Must be called exactly once for 1024 and once for 4096 (no retry on 400)  # [WORKER FIX 2]
        assert call_history == [1024, 4096]  # [WORKER FIX 2]


# ------------------------------------------------------------------------------
# 7. Escalation Error Tests: 429 then success -> works [WORKER FIX 2]
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX 2]
async def test_escalation_429_then_success(monkeypatch):  # [WORKER FIX 2]
    """429 rate limit error during token escalation retries with wait and succeeds."""  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [WORKER FIX 2]

    call_history = []  # [WORKER FIX 2]

    async def mock_generate_content(*args, **kwargs):  # [WORKER FIX 2]
        config = kwargs.get("config")  # [WORKER FIX 2]
        max_tok = getattr(config, "max_output_tokens", None)  # [WORKER FIX 2]
        call_history.append(max_tok)  # [WORKER FIX 2]

        if max_tok == 1024:  # [WORKER FIX 2]
            return _make_mock_response(  # [WORKER FIX 2]
                text="",
                finish_reason="MAX_TOKENS",
                p_tok=100,
                c_tok=0,
                th_tok=1024,  # [WORKER FIX 2]
            )  # [WORKER FIX 2]
        elif max_tok == 4096:  # [WORKER FIX 2]
            return _make_mock_response(  # [WORKER FIX 2]
                text="",
                finish_reason="MAX_TOKENS",
                p_tok=100,
                c_tok=0,
                th_tok=4096,  # [WORKER FIX 2]
            )  # [WORKER FIX 2]
        elif max_tok == 8192:  # [WORKER FIX 2]
            if call_history.count(8192) == 1:  # [WORKER FIX 2]
                err = Exception("429 RESOURCE_EXHAUSTED: Rate limit exceeded")  # [WORKER FIX 2]
                err.code = 429  # [WORKER FIX 2]
                raise err  # [WORKER FIX 2]
            return _make_mock_response(  # [WORKER FIX 2]
                text="CLASSIFICATION: TABLE\n---CONTENT---\n[Table: Drug interactions]",  # [WORKER FIX 2]
                finish_reason="STOP",  # [WORKER FIX 2]
                p_tok=100,  # [WORKER FIX 2]
                c_tok=200,  # [WORKER FIX 2]
                th_tok=5000,  # [WORKER FIX 2]
            )  # [WORKER FIX 2]
        return _make_mock_response()  # [WORKER FIX 2]

    mock_client = MagicMock()  # [WORKER FIX 2]
    mock_client.aio.models.generate_content = mock_generate_content  # [WORKER FIX 2]

    with (  # [WORKER FIX 2]
        patch("google.genai.Client", return_value=mock_client),  # [WORKER FIX 2]
        patch("asyncio.sleep", AsyncMock()),  # [WORKER FIX 2]
    ):  # [WORKER FIX 2]
        route, content = await image_classifier.classify_and_process(  # [WORKER FIX 2]
            b"fake_image_bytes",
            page_number=12,  # [WORKER FIX 2]
        )  # [WORKER FIX 2]
        assert route == "table"  # [WORKER FIX 2]
        assert "[Table: Drug interactions]" in content  # [WORKER FIX 2]
        assert call_history == [1024, 4096, 8192, 8192]  # [WORKER FIX 2]


# ------------------------------------------------------------------------------
# 8. Escalation Error Tests: three 503s -> stops after 3 calls [WORKER FIX 2]
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX 2]
async def test_escalation_three_503s_stops_after_three_calls(monkeypatch):  # [WORKER FIX 2]
    """Three consecutive 503 service unavailable errors in escalation stop after 3 attempts."""  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [WORKER FIX 2]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [WORKER FIX 2]

    call_history = []  # [WORKER FIX 2]

    async def mock_generate_content(*args, **kwargs):  # [WORKER FIX 2]
        config = kwargs.get("config")  # [WORKER FIX 2]
        max_tok = getattr(config, "max_output_tokens", None)  # [WORKER FIX 2]
        call_history.append(max_tok)  # [WORKER FIX 2]

        if max_tok == 1024:  # [WORKER FIX 2]
            return _make_mock_response(  # [WORKER FIX 2]
                text="",
                finish_reason="MAX_TOKENS",
                p_tok=100,
                c_tok=0,
                th_tok=1024,  # [WORKER FIX 2]
            )  # [WORKER FIX 2]
        elif max_tok == 4096:  # [WORKER FIX 2]
            err = Exception("503 Service Unavailable")  # [WORKER FIX 2]
            err.code = 503  # [WORKER FIX 2]
            raise err  # [WORKER FIX 2]
        return _make_mock_response()  # [WORKER FIX 2]

    mock_client = MagicMock()  # [WORKER FIX 2]
    mock_client.aio.models.generate_content = mock_generate_content  # [WORKER FIX 2]

    with (  # [WORKER FIX 2]
        patch("google.genai.Client", return_value=mock_client),  # [WORKER FIX 2]
        patch("asyncio.sleep", AsyncMock()),  # [WORKER FIX 2]
    ):  # [WORKER FIX 2]
        with pytest.raises(VisionError) as exc_info:  # [WORKER FIX 2]
            await image_classifier.classify_and_process(
                b"fake_image_bytes", page_number=12
            )  # [WORKER FIX 2]
        assert "Vision escalation to 4096 tokens failed after 3 attempts" in str(
            exc_info.value
        )  # [WORKER FIX 2]
        # 1024 (initial attempt) + 4096 (3 retry attempts) = 4 total calls  # [WORKER FIX 2]
        assert call_history == [1024, 4096, 4096, 4096]  # [WORKER FIX 2]


# ------------------------------------------------------------------------------
# 9. Escalation Error Tests: 400 error with "503" in message is NOT retried [WORKER FIX 3]
# ------------------------------------------------------------------------------
@pytest.mark.asyncio  # [WORKER FIX 3]
async def test_escalation_400_with_503_in_message_not_retried(monkeypatch):  # [WORKER FIX 3]
    """A 400 error whose message text contains '503' is determined by numeric code and not retried."""  # [WORKER FIX 3]
    monkeypatch.setattr(settings, "VISION_FAKE_MODE", False)  # [WORKER FIX 3]
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-test-key")  # [WORKER FIX 3]

    call_history = []  # [WORKER FIX 3]

    async def mock_generate_content(*args, **kwargs):  # [WORKER FIX 3]
        config = kwargs.get("config")  # [WORKER FIX 3]
        max_tok = getattr(config, "max_output_tokens", None)  # [WORKER FIX 3]
        call_history.append(max_tok)  # [WORKER FIX 3]

        if max_tok == 1024:  # [WORKER FIX 3]
            return _make_mock_response(  # [WORKER FIX 3]
                text="",  # [WORKER FIX 3]
                finish_reason="MAX_TOKENS",  # [WORKER FIX 3]
                p_tok=100,  # [WORKER FIX 3]
                c_tok=0,  # [WORKER FIX 3]
                th_tok=1024,  # [WORKER FIX 3]
            )  # [WORKER FIX 3]
        elif max_tok == 4096:  # [WORKER FIX 3]
            # 400 code but text explicitly mentions "503 Service Unavailable"  # [WORKER FIX 3]
            err = Exception("400 Bad Request: upstream service 503 unavailable")  # [WORKER FIX 3]
            err.code = 400  # [WORKER FIX 3]
            raise err  # [WORKER FIX 3]
        return _make_mock_response()  # [WORKER FIX 3]

    mock_client = MagicMock()  # [WORKER FIX 3]
    mock_client.aio.models.generate_content = mock_generate_content  # [WORKER FIX 3]

    with (  # [WORKER FIX 3]
        patch("google.genai.Client", return_value=mock_client),  # [WORKER FIX 3]
        patch("asyncio.sleep", AsyncMock()),  # [WORKER FIX 3]
    ):  # [WORKER FIX 3]
        with pytest.raises(VisionError) as exc_info:  # [WORKER FIX 3]
            await image_classifier.classify_and_process(  # [WORKER FIX 3]
                b"fake_image_bytes",
                page_number=12,  # [WORKER FIX 3]
            )  # [WORKER FIX 3]
        assert "non-retriable error" in str(exc_info.value)  # [WORKER FIX 3]
        # Must be called exactly once for 1024 and once for 4096 (no retry on 400 despite "503" in text)  # [WORKER FIX 3]
        assert call_history == [1024, 4096]  # [WORKER FIX 3]


# ------------------------------------------------------------------------------
# 10. Worker Settings Queue Split Invariant Test [QUEUE SPLIT]
# ------------------------------------------------------------------------------
def test_worker_functions_registered_timeouts():  # [QUEUE SPLIT]
    """Verify WorkerSettings and PictureWorkerSettings invariants under queue split."""  # [QUEUE SPLIT]
    from workers.settings import (  # [QUEUE SPLIT]
        PICTURE_QUEUE_NAME,  # [QUEUE SPLIT]
        PictureWorkerSettings,  # [QUEUE SPLIT]
        WorkerSettings,  # [QUEUE SPLIT]
    )  # [QUEUE SPLIT]

    # Main worker invariants [QUEUE SPLIT]
    main_func_map = {  # [QUEUE SPLIT]
        getattr(f, "name", getattr(f, "__name__", str(f))): f  # [QUEUE SPLIT]
        for f in WorkerSettings.functions  # [QUEUE SPLIT]
    }  # [QUEUE SPLIT]

    assert "ingest_document_job" in main_func_map  # [QUEUE SPLIT]
    assert "describe_document_images_job" not in main_func_map  # [QUEUE SPLIT]
    assert getattr(main_func_map["ingest_document_job"], "timeout_s", None) == 1800  # [QUEUE SPLIT]
    assert WorkerSettings.max_jobs == 3  # [QUEUE SPLIT]
    assert WorkerSettings.poll_delay == 30.0  # [QUEUE SPLIT]

    # Picture worker invariants [QUEUE SPLIT]
    pic_func_map = {  # [QUEUE SPLIT]
        getattr(f, "name", getattr(f, "__name__", str(f))): f  # [QUEUE SPLIT]
        for f in PictureWorkerSettings.functions  # [QUEUE SPLIT]
    }  # [QUEUE SPLIT]

    assert "describe_document_images_job" in pic_func_map  # [QUEUE SPLIT]
    assert len(pic_func_map) == 1  # [QUEUE SPLIT]
    describe_func = pic_func_map["describe_document_images_job"]  # [QUEUE SPLIT]
    assert getattr(describe_func, "timeout_s", None) == 7200  # [QUEUE SPLIT]
    assert getattr(describe_func, "max_tries", None) == 8  # [QUEUE SPLIT]
    assert PictureWorkerSettings.queue_name == PICTURE_QUEUE_NAME  # [QUEUE SPLIT]
    assert PictureWorkerSettings.max_jobs == 1  # [QUEUE SPLIT]
    assert PictureWorkerSettings.burst is True  # [QUEUE SPLIT]


# ------------------------------------------------------------------------------
# 11. AST Guard: describe_document_images_job must enqueue with PICTURE_QUEUE_NAME [QUEUE SPLIT]
# ------------------------------------------------------------------------------
def test_guard_describe_images_job_requires_picture_queue():  # [QUEUE SPLIT]
    """Guard: any enqueue of describe_document_images_job must specify _queue_name=PICTURE_QUEUE_NAME."""  # [QUEUE SPLIT]
    repo_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))  # [QUEUE SPLIT]
    violations = []  # [QUEUE SPLIT]

    for root, dirs, files in os.walk(repo_api_dir):  # [QUEUE SPLIT]
        if any(  # [QUEUE SPLIT]
            ignored in root
            for ignored in [".venv", "__pycache__", ".git", "tests"]  # [QUEUE SPLIT]
        ):  # [QUEUE SPLIT]
            continue  # [QUEUE SPLIT]
        for file in files:  # [QUEUE SPLIT]
            if not file.endswith(".py"):  # [QUEUE SPLIT]
                continue  # [QUEUE SPLIT]
            file_path = os.path.join(root, file)  # [QUEUE SPLIT]
            with open(file_path, encoding="utf-8") as f:  # [QUEUE SPLIT]
                content = f.read()  # [QUEUE SPLIT]
            try:  # [QUEUE SPLIT]
                tree = ast.parse(content, filename=file_path)  # [QUEUE SPLIT]
            except Exception as e:  # [QUEUE SPLIT]
                pytest.fail(f"AST parse error in {file_path}: {e}")  # [QUEUE SPLIT]
            for node in ast.walk(tree):  # [QUEUE SPLIT]
                if isinstance(node, ast.Call):  # [QUEUE SPLIT]
                    func_name = getattr(  # [QUEUE SPLIT]
                        node.func,
                        "attr",
                        getattr(node.func, "id", None),  # [QUEUE SPLIT]
                    )  # [QUEUE SPLIT]
                    if func_name == "enqueue_job" and node.args:  # [QUEUE SPLIT]
                        first_arg = node.args[0]  # [QUEUE SPLIT]
                        if (  # [QUEUE SPLIT]
                            isinstance(first_arg, ast.Constant)  # [QUEUE SPLIT]
                            and first_arg.value == "describe_document_images_job"  # [QUEUE SPLIT]
                        ):  # [QUEUE SPLIT]
                            queue_kw = next(  # [QUEUE SPLIT]
                                (
                                    kw for kw in node.keywords if kw.arg == "_queue_name"
                                ),  # [QUEUE SPLIT]
                                None,  # [QUEUE SPLIT]
                            )  # [QUEUE SPLIT]
                            valid = False  # [QUEUE SPLIT]
                            if queue_kw:  # [QUEUE SPLIT]
                                if (  # [QUEUE SPLIT]
                                    isinstance(queue_kw.value, ast.Name)  # [QUEUE SPLIT]
                                    and queue_kw.value.id == "PICTURE_QUEUE_NAME"  # [QUEUE SPLIT]
                                ):  # [QUEUE SPLIT]
                                    valid = True  # [QUEUE SPLIT]
                                elif (  # [QUEUE SPLIT]
                                    isinstance(queue_kw.value, ast.Constant)  # [QUEUE SPLIT]
                                    and queue_kw.value.value == "arq:picture_queue"  # [QUEUE SPLIT]
                                ):  # [QUEUE SPLIT]
                                    valid = True  # [QUEUE SPLIT]
                                elif (  # [QUEUE SPLIT]
                                    isinstance(queue_kw.value, ast.Attribute)  # [QUEUE SPLIT]
                                    and queue_kw.value.attr == "PICTURE_QUEUE_NAME"  # [QUEUE SPLIT]
                                ):  # [QUEUE SPLIT]
                                    valid = True  # [QUEUE SPLIT]
                            if not valid:  # [QUEUE SPLIT]
                                rel = os.path.relpath(file_path, repo_api_dir)  # [QUEUE SPLIT]
                                violations.append(f"{rel}:{node.lineno}")  # [QUEUE SPLIT]

    assert not violations, (  # [QUEUE SPLIT]
        f"Calls to enqueue_job('describe_document_images_job') missing _queue_name=PICTURE_QUEUE_NAME: {violations}"  # [QUEUE SPLIT]
    )  # [QUEUE SPLIT]
