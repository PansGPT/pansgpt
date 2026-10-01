# ==============================================================================
# Unit & Integration Tests: Web Search Daily Quotas & MD5 Caching (Section 8)
# ==============================================================================

import pytest

from app.engines.tools import tool_engine
from app.engines.web_search import WebSearchEngine


@pytest.fixture(autouse=True)
def isolated_web_search_env(monkeypatch):
    """Isolate web search tests to in-memory mode without external network calls."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "UPSTASH_REDIS_URL", None)
    monkeypatch.setattr(settings, "REDIS_URL", None)
    monkeypatch.setattr(settings, "TAVILY_API_KEY", None)


# ------------------------------------------------------------------------------
# 1. Hashing and Normalization Tests
# ------------------------------------------------------------------------------
def test_query_hash_normalization():
    """Verify whitespace and casing normalization produce identical MD5 hashes."""
    h1 = WebSearchEngine.compute_query_hash("Mechanism of action of Lisinopril")
    h2 = WebSearchEngine.compute_query_hash("   mechanism of  ACTION OF lisinopril  \n")
    assert h1 == h2
    assert len(h1) == 32


def test_role_based_quota_ceilings():
    """Verify tier ceilings: student=5, pro=25, staff=50, super_admin=999."""
    engine = WebSearchEngine()
    assert engine.get_user_daily_limit("student") == 5
    assert engine.get_user_daily_limit("unknown_role") == 5
    assert engine.get_user_daily_limit("pro") == 25
    assert engine.get_user_daily_limit("lecturer") == 50
    assert engine.get_user_daily_limit("university_admin") == 50
    assert engine.get_user_daily_limit("super_admin") == 999


# ------------------------------------------------------------------------------
# 2. Daily Quota Enforcement Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_user_daily_quota_enforcement():
    """Verify user quota increments and blocks searches when the daily limit is reached."""
    engine = WebSearchEngine()
    test_user = "user-quota-test-uuid-999"

    # Reset in-memory test count
    engine._in_memory_daily_counts[test_user] = (engine._utc_today(), 0)

    # Perform 5 searches under free student quota
    for i in range(1, 6):
        res = await engine.search(
            query=f"Pharmacokinetics query test step {i}",
            user_id=test_user,
            role="student",
        )
        assert res["status"] == "success"
        assert res["quota_used"] == i
        assert res["quota_limit"] == 5

    # 6th search must trigger quota_exceeded gate
    blocked_res = await engine.search(
        query="Another search exceeding quota",
        user_id=test_user,
        role="student",
    )
    assert blocked_res["status"] == "quota_exceeded"
    assert "Daily web search quota exceeded" in blocked_res["error"]
    assert blocked_res["quota_used"] == 5
    assert blocked_res["quota_limit"] == 5
    assert len(blocked_res["results"]) == 0


@pytest.mark.asyncio
async def test_higher_quota_for_pro_and_staff():
    """Verify pro and staff users are allowed beyond the student limit."""
    engine = WebSearchEngine()
    pro_user = "pro-user-uuid-111"
    engine._in_memory_daily_counts[pro_user] = (engine._utc_today(), 10)

    res = await engine.search(
        query="Adverse effects of doxorubicin in cardiomyopathy",
        user_id=pro_user,
        role="pro",
    )
    assert res["status"] == "success"
    assert res["quota_used"] == 11
    assert res["quota_limit"] == 25


# ------------------------------------------------------------------------------
# 3. 1-Hour MD5 Result Caching Tests
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_md5_cache_hit_does_not_consume_quota():
    """Verify duplicate search query hits MD5 cache and preserves user daily quota."""
    engine = WebSearchEngine()
    user_id = "cache-user-uuid-222"
    query = "Bioavailability of oral ciprofloxacin"

    # Initial search
    res1 = await engine.search(query=query, user_id=user_id, role="student")
    assert res1["status"] == "success"
    assert res1["cached"] is False
    assert res1["quota_used"] == 1

    # Repeat search with different casing/spacing
    res2 = await engine.search(
        query="  bioavailability of ORAL ciprofloxacin   ",
        user_id=user_id,
        role="student",
    )
    assert res2["status"] == "success"
    assert res2["cached"] is True
    assert res2["source"] == "md5_result_cache"
    # Quota must NOT have incremented on cache hit
    assert await engine.get_daily_usage(user_id) == 1


# ------------------------------------------------------------------------------
# 4. Tool Engine Dispatch Integration
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_tool_engine_dispatch_web_search_with_user():
    """Verify tool_engine.dispatch_tool passes user_id and respects search quotas."""
    user_id = "tool-engine-test-user-333"
    result = await tool_engine.dispatch_tool(
        tool_name="web_search",
        arguments={"query": "Metformin lactic acidosis mechanism", "num_results": 2},
        user_id=user_id,
        role="student",
    )
    assert result["status"] == "success"
    assert "results" in result
    assert len(result["results"]) > 0
    assert result["quota_used"] == 1
