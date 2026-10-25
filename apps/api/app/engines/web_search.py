# ==============================================================================
# Web Search Engine with Quotas, Redis Rate-Limiting & Caching (Roadmap 6B.13 & Section 8)
# ==============================================================================

from __future__ import annotations

import asyncio
import hashlib
import re
import time
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit  # [CHAT FIX 2]

import httpx
import structlog

from app.core.config import settings
from app.engines.guard import policy_guard
from app.models.web_search import SearchScope, WebReference

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
        self._quota_lock = asyncio.Lock()
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

    async def reserve_daily_usage(self, user_id: str, limit: int) -> tuple[bool, int]:
        if settings.ENVIRONMENT != "development":
            import uuid

            from app.core.database import get_db_connection

            async with get_db_connection() as conn:
                if conn is None:
                    raise RuntimeError("Search quota storage is unavailable")
                count = await conn.fetchval(
                    "SELECT public.reserve_web_search_quota($1,$2,$3);",
                    uuid.UUID(user_id),
                    datetime.now(UTC).date(),
                    limit,
                )
                return count is not None, int(count) if count is not None else limit
        if settings.redis_connection_url:
            import redis.asyncio as aioredis

            redis = aioredis.from_url(
                settings.redis_connection_url, socket_connect_timeout=1, socket_timeout=1
            )
            try:
                script = "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>=tonumber(ARGV[1]) then return -1 end; n=redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],172800); return n"
                count = int(
                    await redis.eval(
                        script, 1, f"web_search:daily:{user_id}:{self._utc_today()}", limit
                    )
                )
                return count != -1, count if count != -1 else limit
            except Exception:
                pass  # The database is the shared authoritative fallback.
            finally:
                await redis.aclose()
        async with self._quota_lock:
            current = await self.get_daily_usage(user_id)
            if current >= limit:
                return False, current
            return True, await self.increment_daily_usage(user_id)

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
        scope: SearchScope = "biomedical",
        current_information: bool = False,
        public_query: bool = False,
    ) -> dict[str, Any]:
        """Search scoped public facts; eligibility precedes cache, quota and dispatch."""
        norm_query = " ".join(query.strip().split())

        def unavailable(status: str, message: str) -> dict[str, Any]:
            return {"status": status, "results": [], "source": status, "message": message}

        if settings.ENVIRONMENT != "development" and not user_id:
            return unavailable("identity_required", "Sign in to use web search.")
        if not settings.WEB_SEARCH_ENABLED:
            return unavailable(
                "disabled", "Web search is disabled, so I cannot verify current information."
            )
        if not norm_query or len(norm_query) > 400 or scope not in {"general", "biomedical"}:
            return unavailable(
                "sensitive_query",
                "Use a short public topic without private details for web search.",
            )
        identifier_text = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "DATE", norm_query)
        has_phone = any(
            sum(character.isdigit() for character in match.group()) >= 10
            for match in re.finditer(r"\b\d[\d\s()+-]{8,}\d\b", identifier_text)
        )
        if (
            has_phone
            or policy_guard.filter_credential_leaks(norm_query) != norm_query
            or re.search(
                r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|"
                r"\bpatient\b|"
                r"\b(?:patient\s*name|medical\s*record|mrn|ssn|bvn|nin)\s*[:=#]|"
                r"[?&](?:token|key|signature|x-amz-signature)=",
                norm_query,
                re.IGNORECASE,
            )
        ):
            return unavailable(
                "sensitive_query",
                "This search may contain private details. Please use an anonymous public topic.",
            )
        if not self.tavily_key or any(
            value in self.tavily_key.lower() for value in ["placeholder", "dummy", "your_tavily"]
        ):
            return unavailable(
                "not_configured",
                "Web search is not configured, so I cannot verify current information.",
            )
        if not settings.provider_privacy_allowed("tavily") and not (
            settings.TAVILY_PUBLIC_SEARCH_ALLOWED and public_query
        ):
            return unavailable(
                "privacy_blocked",
                "Web search is blocked by the privacy policy for this request. Use a public topic without private details.",
            )

        query_hash = self.compute_query_hash(
            "\0".join(
                [
                    user_id or "anonymous",
                    scope,
                    str(current_information),
                    str(min(max(num_results, 1), 8)),
                    norm_query,
                ]
            )
        )
        now = time.time()

        if query_hash in self._result_cache:
            expires, cached_results = self._result_cache[query_hash]
            if now < expires:
                logger.info("web_search_cache_hit")
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
            try:
                allowed, current_count = await self.reserve_daily_usage(user_id, limit)
            except Exception:
                return unavailable(
                    "quota_unavailable", "Web-search usage could not be checked. Please retry."
                )
            if not allowed:
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
                    "message": f"Your daily limit of {limit} web searches has been reached. It resets at 00:00 UTC.",
                    "source": "quota_gate",
                }

        results: list[dict[str, Any]] = []
        payload: dict[str, object] = {
            "api_key": self.tavily_key,
            "query": norm_query,
            "topic": "general",
            "search_depth": "basic",
            "max_results": min(max(num_results, 1), 8),
            "include_answer": False,
            "include_raw_content": False,
        }
        if scope == "biomedical":
            payload["include_domains"] = BIOMEDICAL_AUTHORITY_DOMAINS
        try:
            async with httpx.AsyncClient(timeout=settings.WEB_SEARCH_TIMEOUT_SECONDS) as client:
                resp = await client.post("https://api.tavily.com/search", json=payload)
            if resp.status_code != 200:
                logger.warning("web_search_upstream_status", http_status=resp.status_code)
                return unavailable(
                    "provider_error",
                    "The web-search provider could not complete this lookup. Please retry.",
                )
            data = resp.json()
            items = data.get("results", []) if isinstance(data, dict) else None
            if not isinstance(items, list):
                return unavailable(
                    "provider_error",
                    "The web-search provider returned an invalid response. Please retry.",
                )
            for item in items[:8]:
                if not isinstance(item, dict):
                    continue
                url = item.get("url")
                content = item.get("content")
                title = item.get("title")
                if not all(
                    isinstance(value, str) and value.strip() for value in [url, content, title]
                ):
                    continue
                try:
                    parsed = urlsplit(url)
                    if (
                        parsed.scheme not in {"https", "http"}
                        or not parsed.hostname
                        or parsed.username is not None
                        or parsed.password is not None
                        or len(url) > 2000
                        or re.search(r"[\s<>\\]", url)
                    ):
                        continue
                except ValueError:
                    continue
                results.append(
                    WebReference(title=title[:300], url=url, content=content[:8000]).model_dump()
                )
        except httpx.TimeoutException:
            return unavailable("timeout", "The web search timed out. Please retry.")
        except Exception as exc:
            logger.warning("tavily_api_call_failed", error_type=type(exc).__name__)
            return unavailable(
                "provider_error", "The web-search provider is unavailable. Please retry."
            )
        if not results:
            return unavailable(
                "empty",
                "I could not find reliable web results to verify this request. Try an exact date or a more specific public topic.",
            )
        ttl = (
            settings.WEB_SEARCH_CURRENT_CACHE_TTL_SECONDS
            if current_information
            else self._cache_ttl_seconds
        )
        if len(self._result_cache) >= 256:
            self._result_cache = {
                key: value for key, value in self._result_cache.items() if value[0] > now
            }
            if len(self._result_cache) >= 256:
                self._result_cache.pop(next(iter(self._result_cache)))
        self._result_cache[query_hash] = (now + ttl, results)

        return {
            "status": "success",
            "results": results,
            "source": f"tavily-{scope}",
            "cached": False,
            "query": norm_query,
            "quota_used": current_count,
            "quota_limit": limit,
        }


web_search_engine = WebSearchEngine()
