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
def test_no_hash_comments_in_sql_strings():  # [WORKER FIX]
    """AST guard: fails if any SQL-looking string constant contains a '#' comment tag."""
    root_dir = Path(__file__).resolve().parent.parent  # apps/api
    sql_keywords = re.compile(r"\b(SELECT|INSERT|UPDATE|DELETE|CREATE)\b", re.IGNORECASE)
    comment_pattern = re.compile(r"#\s*\[")

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
                            if sql_keywords.search(s) and comment_pattern.search(s):
                                rel_path = os.path.relpath(file_path, root_dir)
                                violating_strings.append((rel_path, node.lineno, s))
                except Exception as exc:
                    pytest.fail(f"AST parse failed on {file_path}: {exc}")

    assert len(violating_strings) == 0, (
        f"Found SQL strings containing '#' comments: {violating_strings}"
    )


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
