# ==============================================================================
# Web Search Engine with Quotas, Redis Rate-Limiting & Caching (Roadmap 6B.13 & Section 8)
# ==============================================================================

from __future__ import annotations

import asyncio
import hashlib
import time
from datetime import UTC, datetime
from typing import Any

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

BIOMEDICAL_AUTHORITY_DOMAINS = [
    "ncbi.nlm.nih.gov",
    "pubmed.ncbi.nlm.nih.gov",
    "who.int",
    "fda.gov",
    "medicines.org.uk",
    "nice.org.uk",
    "medscape.com",
    "dailymed.nlm.nih.gov",
]


class WebSearchEngine:
    """Manages Tavily web search with per-user daily rate limits and 1-hour MD5 caching."""

    def __init__(self) -> None:
        self.tavily_key = settings.TAVILY_API_KEY
        self._result_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
        self._cache_ttl_seconds: float = float(settings.WEB_SEARCH_CACHE_TTL_SECONDS)
        # In-memory tracking fallback: user_id -> (date_str, count)
        self._in_memory_daily_counts: dict[str, tuple[str, int]] = {}

    @staticmethod
    def _utc_today() -> str:
        return datetime.now(UTC).date().isoformat()

    @staticmethod
    def compute_query_hash(query: str) -> str:
        """Computes deterministic MD5 hash of normalized query."""
        clean = " ".join(query.strip().lower().split())
        return hashlib.md5(clean.encode("utf-8")).hexdigest()

    def get_user_daily_limit(self, role: str = "student") -> int:
        """Returns the configured daily quota ceiling by role tier."""
        r = role.lower() if role else "student"
        if r in ("super_admin", "admin"):
            return 999
        elif r in ("lecturer", "university_admin", "staff"):
            return settings.WEB_SEARCH_DAILY_LIMIT_STAFF
        elif r in ("pro", "subscribed"):
            return settings.WEB_SEARCH_DAILY_LIMIT_PRO
        return settings.WEB_SEARCH_DAILY_LIMIT_STUDENT

    async def get_daily_usage(self, user_id: str) -> int:
        """Fetches the user's current daily search count from Redis or memory."""
        today = self._utc_today()

        # 1. Try Redis Fast-Path with strict 1.5s timeout
        redis_url = settings.redis_connection_url
        if redis_url and not any(p in redis_url for p in ["placeholder", "dummy", "test"]):
            try:
                import redis.asyncio as aioredis

                r = aioredis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                )
                key = f"web_search:daily:{user_id}:{today}"
                val = await asyncio.wait_for(r.get(key), timeout=1.5)
                await r.aclose()
                if val is not None:
                    return int(val)
            except Exception as r_err:
                logger.debug("redis_quota_get_failed_falling_back", error=str(r_err))

        # 2. Check in-memory fallback
        if user_id in self._in_memory_daily_counts:
            date_record, count = self._in_memory_daily_counts[user_id]
            if date_record == today:
                return count

        return 0

    async def increment_daily_usage(self, user_id: str) -> int:
        """Increments the user's daily search count atomically."""
        today = self._utc_today()
        new_count = 1

        # 1. Try Redis Fast-Path with strict 1.5s timeout
        redis_url = settings.redis_connection_url
        redis_incremented = False
        if redis_url and not any(p in redis_url for p in ["placeholder", "dummy", "test"]):
            try:
                import redis.asyncio as aioredis

                r = aioredis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                )
                key = f"web_search:daily:{user_id}:{today}"
                new_count = await asyncio.wait_for(r.incr(key), timeout=1.5)
                if new_count == 1:
                    await asyncio.wait_for(r.expire(key, 172800), timeout=1.0)
                await r.aclose()
                redis_incremented = True
            except Exception as r_err:
                logger.debug("redis_quota_incr_failed", error=str(r_err))

        # 2. Update in-memory count
        if user_id in self._in_memory_daily_counts:
            date_record, count = self._in_memory_daily_counts[user_id]
            if date_record == today:
                new_count = count + 1 if not redis_incremented else new_count
            else:
                new_count = 1
        self._in_memory_daily_counts[user_id] = (today, new_count)

        # 3. Asynchronously record to PostgreSQL web_search_usage if DB is available and valid UUID
        asyncio.create_task(self._persist_db_usage(user_id, today))

        return new_count

    async def _persist_db_usage(self, user_id: str, today: str) -> None:
        """Background persistence of daily usage to Supabase."""
        try:
            import uuid

            # Validate that user_id is a valid UUID
            uuid_obj = uuid.UUID(str(user_id))
        except (ValueError, TypeError):
            return

        try:
            from app.core.database import get_db_connection

            async with get_db_connection() as conn:
                if conn:
                    await conn.execute(
                        """
                        INSERT INTO public.web_search_usage (user_id, date, count, updated_at)
                        VALUES ($1::uuid, $2::date, 1, now())
                        ON CONFLICT (user_id, date)
                        DO UPDATE SET count = public.web_search_usage.count + 1, updated_at = now();
                        """,
                        str(uuid_obj),
                        datetime.strptime(today, "%Y-%m-%d").date(),
                    )
        except Exception as db_err:
            logger.debug("db_web_search_usage_sync_skipped", error=str(db_err))

    async def search(
        self,
        query: str,
        num_results: int = 3,
        user_id: str | None = None,
        role: str = "student",
    ) -> dict[str, Any]:
        """
        Executes web search with MD5 caching and per-user daily quota enforcement.
        """
        norm_query = " ".join(query.strip().split())
        if not norm_query:
            return {"results": [], "source": "empty_query", "status": "success"}

        query_hash = self.compute_query_hash(norm_query)
        now = time.time()

        # Step 1: Check 1-Hour MD5 Result Cache
        if query_hash in self._result_cache:
            ts, cached_results = self._result_cache[query_hash]
            if now - ts < self._cache_ttl_seconds:
                logger.info("web_search_cache_hit", query_hash=query_hash, query=norm_query[:50])
                return {
                    "status": "success",
                    "results": cached_results,
                    "source": "md5_result_cache",
                    "cached": True,
                    "query": norm_query,
                }

        # Step 2: Enforce Daily User Quotas
        limit = self.get_user_daily_limit(role)
        current_count = 0
        if user_id:
            current_count = await self.get_daily_usage(user_id)
            if current_count >= limit:
                logger.warning(
                    "web_search_quota_exceeded",
                    user_id=user_id,
                    usage=current_count,
                    limit=limit,
                )
                return {
                    "status": "quota_exceeded",
                    "error": f"Daily web search quota exceeded ({current_count}/{limit}). Quota resets at 00:00 UTC.",
                    "quota_limit": limit,
                    "quota_used": current_count,
                    "results": [],
                    "message": (
                        f"You have reached your daily quota of {limit} web searches for today. "
                        "Please refer to the verified lecture slides and course monographs in your library."
                    ),
                    "source": "quota_gate",
                }

        # Step 3: Execute Upstream Search (Tavily or Fallback)
        results: list[dict[str, Any]] = []
        source = "curated-biomedical-fallback"

        if self.tavily_key and not any(
            p in self.tavily_key.lower() for p in ["placeholder", "dummy", "test"]
        ):
            try:
                async with httpx.AsyncClient(timeout=settings.WEB_SEARCH_TIMEOUT_SECONDS) as client:
                    resp = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": self.tavily_key,
                            "query": f"{norm_query} pharmacology medical pubmed",
                            "search_depth": "basic",
                            "include_domains": BIOMEDICAL_AUTHORITY_DOMAINS,
                            "max_results": num_results,
                            "include_answer": True,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        tavily_items = data.get("results", [])
                        if tavily_items:
                            results = [
                                {
                                    "title": item.get("title", "Biomedical Literature"),
                                    "url": item.get("url", "https://pubmed.ncbi.nlm.nih.gov"),
                                    "content": item.get("content", ""),
                                }
                                for item in tavily_items
                            ]
                            source = "tavily-biomedical"
            except Exception as exc:
                logger.warning("tavily_api_call_failed", error=str(exc))

        # Fallback if Tavily returned no results or is unconfigured
        if not results:
            results = [
                {
                    "title": f"Biomedical Literature Reference: {norm_query}",
                    "url": "https://pubmed.ncbi.nlm.nih.gov",
                    "content": (
                        f"Pharmacological consensus reference for '{norm_query}': "
                        "Clinical pharmacology guidelines recommend cross-referencing therapeutic drug "
                        "mechanisms, receptor selectivity, and adverse reactions against official pharmacopeial monographs (BNF, USP, WHO)."
                    ),
                }
            ]

        # Step 4: Populate MD5 Result Cache
        self._result_cache[query_hash] = (now, results)

        # Step 5: Increment User Quota (only for real, non-cached searches)
        new_count = current_count
        if user_id:
            new_count = await self.increment_daily_usage(user_id)

        return {
            "status": "success",
            "results": results,
            "source": source,
            "cached": False,
            "query": norm_query,
            "quota_used": new_count,
            "quota_limit": limit,
        }


web_search_engine = WebSearchEngine()
