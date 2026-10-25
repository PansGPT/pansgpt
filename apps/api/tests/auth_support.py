"""Authoritative fake profile records, independent of user-editable JWT metadata."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

AUTH_PROFILES: dict[str, dict[str, Any]] = {}


def register_profile(user_id: str, roles: list[str], university_id: str | None = None) -> None:
    import uuid

    AUTH_PROFILES[user_id] = {
        "roles": roles,
        "university_id": uuid.UUID(university_id) if university_id else None,
        "first_name": "Test",
        "last_name": "User",
        "current_level": None,
        "terms_accepted_at": None,
        "deleted_at": None,
    }


class AuthConnection:
    async def fetch(self, sql: str, *args: Any) -> list[dict[str, Any]]:
        return [
            {
                "id": "01a07664-7a69-7ce0-ad6a-b219462cbde3",
                "name": "University of Jos",
                "short_name": "UNIJOS",
                "slug": "unijos",
            }
        ]

    async def fetchrow(self, sql: str, *args: Any) -> dict[str, Any] | None:
        if "FROM public.invitations" in sql:
            import uuid
            from datetime import UTC, datetime, timedelta

            value = str(args[0])
            if value.startswith("mock-invalid"):
                return None
            return {
                "id": uuid.uuid4(),
                "token": value,
                "university_id": uuid.UUID("01a07664-7a69-7ce0-ad6a-b219462cbde3"),
                "grant_roles": ["lecturer"],
                "target_level": "300",
                "max_uses": 1,
                "current_uses": 1 if "exhausted" in value else 0,
                "is_active": True,
                "expires_at": datetime.now(UTC) + timedelta(days=-1 if "expired" in value else 1),
                "uni_name": "University of Jos",
                "uni_short_name": "UNIJOS",
                "uni_slug": "unijos",
            }
        if "INSERT INTO public.users" in sql:
            row = AUTH_PROFILES[str(args[0])]
            row.update(
                first_name=args[2],
                last_name=args[3],
                university_id=args[4],
                current_level=args[5],
                terms_accepted_at="2026-10-20T00:00:00Z",
            )
            return row
        return AUTH_PROFILES.get(str(args[0]))

    async def fetchval(self, sql: str, *args: Any) -> int | str:
        return "University of Jos" if "SELECT name" in sql else 1

    async def execute(self, sql: str, *args: Any) -> str:
        return "INSERT 0 1"


@asynccontextmanager
async def auth_connection(**kwargs: Any) -> AsyncIterator[AuthConnection]:
    yield AuthConnection()
