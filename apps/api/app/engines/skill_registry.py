"""Database configuration selects allowlisted handlers; it cannot execute code."""

from typing import Any

from app.core.database import get_db_connection
from app.engines.skills import SKILL_TOOL_DEFINITIONS
from app.engines.tools import CORE_TOOL_DEFINITIONS


async def available_tools(levels: list[str] | None = None) -> list[dict[str, Any]]:
    async with get_db_connection() as conn:
        if conn is None:
            raise RuntimeError("Skill registry is unavailable")
        rows = await conn.fetch(
            "SELECT slug, description, instructions FROM public.ai_skills WHERE is_active=true AND (target_levels IS NULL OR cardinality(target_levels)=0 OR target_levels && $1::public.university_level[]);",
            levels or [],
        )
    active = {row["slug"]: row for row in rows}
    return list(CORE_TOOL_DEFINITIONS) + [
        {
            **tool,
            "function": {
                **tool["function"],
                "description": (
                    str(
                        active[tool["function"]["name"]].get("description")
                        or tool["function"]["description"]
                    )
                    + "\n"
                    + str(active[tool["function"]["name"]].get("instructions") or "")
                )[:4000],
            },
        }
        for tool in SKILL_TOOL_DEFINITIONS
        if tool["function"]["name"] in active
    ]
