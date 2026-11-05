"""Academic API boundaries, pagination and deterministic activity contracts."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime, time, tzinfo
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from httpx import AsyncClient

from app.core.dependencies import UserContext
from app.routers import academic

TASK_ID = UUID("0192d194-28b3-7d24-811c-d784a0c8b321")


def task_row(index: int = 0) -> dict[str, object]:
    return {
        "id": str(UUID(int=TASK_ID.int + index)),
        "title": f"Synthetic task {index}",
        "subtitle": None,
        "course_code": None,
        "task_type": "custom",
        "due_date": None,
        "due_time": None,
        "is_completed": False,
        "is_favorite": False,
        "completed_at": None,
        "source": "custom",
        "created_at": datetime(2026, 11, 5, tzinfo=UTC),
    }


@pytest.fixture
def academic_db(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    conn = MagicMock()
    conn.fetch = AsyncMock(return_value=[])
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetchval = AsyncMock(return_value=None)

    @asynccontextmanager
    async def transaction(**_: object) -> AsyncIterator[None]:
        yield

    @asynccontextmanager
    async def connection() -> AsyncIterator[MagicMock]:
        yield conn

    conn.transaction = transaction
    monkeypatch.setattr(academic, "get_db_connection", connection)
    return conn


@pytest.mark.parametrize("state", ["active", "completed"])
async def test_task_pages_are_separate_bounded_and_owner_scoped(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, state: str
) -> None:
    academic_db.fetch.return_value = [task_row(i) for i in range(101)]
    response = await client.get(f"/api/v1/tasks/page?state={state}&offset=200")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 100
    assert body["next_offset"] == 300
    assert response.headers["cache-control"] == "private, no-store"
    query, *args = academic_db.fetch.await_args.args
    assert args == [
        authenticated_student.id,
        authenticated_student.university_id,
        state == "completed",
        101,
        200,
    ]
    assert "user_id = $1 AND university_id = $2 AND is_completed = $3" in query
    assert "LIMIT $4 OFFSET $5" in query
    assert (
        "completed_at DESC NULLS LAST, id DESC"
        if state == "completed"
        else "created_at ASC, id ASC"
    ) in query


async def test_last_task_page_has_no_next_offset(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    academic_db.fetch.return_value = [task_row()]
    response = await client.get("/api/v1/tasks/page?limit=1")
    assert response.status_code == 200
    assert response.json()["next_offset"] is None


@pytest.mark.parametrize("exists", [True, False])
async def test_selected_task_lookup_is_owner_and_university_scoped(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, exists: bool
) -> None:
    academic_db.fetchrow.return_value = task_row() if exists else None
    response = await client.get(f"/api/v1/tasks/{TASK_ID}")
    assert response.status_code == (200 if exists else 404)
    query, task_id, owner, university = academic_db.fetchrow.await_args.args
    assert (task_id, owner, university) == (
        TASK_ID,
        authenticated_student.id,
        authenticated_student.university_id,
    )
    assert "WHERE id = $1 AND user_id = $2 AND university_id = $3" in query


@pytest.mark.parametrize(
    "query", ["limit=0", "limit=201", "offset=-1", "state=all", "offset=1000001"]
)
async def test_invalid_task_page_does_not_query_storage(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, query: str
) -> None:
    response = await client.get(f"/api/v1/tasks/page?{query}")
    assert response.status_code == 422
    academic_db.fetch.assert_not_awaited()


@pytest.mark.parametrize(
    "path",
    [
        "/tasks/page",
        "/tasks",
        "/timetable?start_date=2026-11-05&end_date=2026-11-06",
        "/home/dashboard",
    ],
)
async def test_academic_reads_require_authentication(
    client: AsyncClient, academic_db: MagicMock, path: str
) -> None:
    response = await client.get("/api/v1" + path)
    assert response.status_code == 401
    academic_db.fetch.assert_not_awaited()


async def test_task_pages_require_a_university(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    authenticated_student["university_id"] = None
    response = await client.get("/api/v1/tasks/page")
    assert response.status_code == 403
    academic_db.fetch.assert_not_awaited()


async def test_task_create_derives_owner_and_allows_no_due_date(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    academic_db.fetchrow.return_value = task_row()
    response = await client.post("/api/v1/tasks", json={"title": "Synthetic task"})
    assert response.status_code == 201
    assert response.json()["due_date"] is None
    _, owner, university, *_ = academic_db.fetchrow.await_args.args
    assert (owner, university) == (authenticated_student.id, authenticated_student.university_id)


@pytest.mark.parametrize("field", ["user_id", "university_id", "completed_at", "source"])
async def test_task_create_rejects_client_authority_fields(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, field: str
) -> None:
    response = await client.post(
        "/api/v1/tasks", json={"title": "Synthetic task", field: str(TASK_ID)}
    )
    assert response.status_code == 422
    academic_db.fetchrow.assert_not_awaited()


@pytest.mark.parametrize(
    "patch",
    [{"is_completed": None}, {"is_favorite": None}, {"task_type": None}, {"title": None}, {}],
)
async def test_invalid_task_patch_does_not_write(
    client: AsyncClient,
    authenticated_student: UserContext,
    academic_db: MagicMock,
    patch: dict[str, object],
) -> None:
    response = await client.patch(f"/api/v1/tasks/{TASK_ID}", json=patch)
    assert response.status_code == 422
    academic_db.fetchrow.assert_not_awaited()


async def test_completion_timestamp_is_server_authoritative_and_idempotent(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    academic_db.fetchrow.return_value = task_row() | {
        "is_completed": True,
        "completed_at": datetime(2026, 11, 5, tzinfo=UTC),
    }
    response = await client.patch(f"/api/v1/tasks/{TASK_ID}", json={"is_completed": True})
    assert response.status_code == 200
    query, task_id, owner, university, value = academic_db.fetchrow.await_args.args
    assert (task_id, owner, university, value) == (
        TASK_ID,
        authenticated_student.id,
        authenticated_student.university_id,
        True,
    )
    assert "COALESCE(completed_at, now()) ELSE NULL END" in query
    assert "WHERE id = $1 AND user_id = $2 AND university_id = $3" in query


@pytest.mark.parametrize("method", ["patch", "delete"])
async def test_foreign_or_missing_task_is_not_mutated(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, method: str
) -> None:
    if method == "patch":
        response = await client.patch(f"/api/v1/tasks/{TASK_ID}", json={"is_favorite": True})
        call = academic_db.fetchrow.await_args
    else:
        response = await client.delete(f"/api/v1/tasks/{TASK_ID}")
        call = academic_db.fetchval.await_args
    assert response.status_code == 404
    query, task_id, owner, university, *_ = call.args
    assert (task_id, owner, university) == (
        TASK_ID,
        authenticated_student.id,
        authenticated_student.university_id,
    )
    assert "user_id = $2" in query and "university_id = $3" in query


@pytest.mark.parametrize(
    "query",
    ["start_date=2026-11-06&end_date=2026-11-05", "start_date=2026-11-01&end_date=2026-12-02"],
)
async def test_timetable_rejects_unbounded_or_reversed_ranges(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, query: str
) -> None:
    response = await client.get("/api/v1/timetable?" + query)
    assert response.status_code == 422
    academic_db.fetch.assert_not_awaited()


async def test_timetable_recurrence_respects_level_university_and_effective_dates(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    authenticated_student["current_level"] = "400"
    academic_db.fetch.return_value = [
        {
            "id": str(TASK_ID),
            "day": "Thursday",
            "effective_from": date(2026, 11, 6),
            "effective_until": date(2026, 11, 12),
            "start_time_local": time(9),
            "end_time_local": time(10),
            "time_slot": "legacy",
            "course_code": "TEST 401",
            "course_title": "Synthetic course",
            "venue": None,
            "start_time": None,
        }
    ]
    response = await client.get("/api/v1/timetable?start_date=2026-11-05&end_date=2026-11-19")
    assert response.status_code == 200
    assert [row["date"] for row in response.json()] == ["2026-11-12"]
    assert response.json()[0]["time_slot"] == "09:00 - 10:00"
    _, university, level, *_ = academic_db.fetch.await_args.args
    assert (university, level) == (authenticated_student.university_id, "400")


@pytest.mark.parametrize("days,expected", [([], 0), ([5, 4, 3], 3), ([4, 3], 2), ([5, 3], 1)])
async def test_existing_completed_task_streak_rules(
    client: AsyncClient,
    authenticated_student: UserContext,
    academic_db: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
    days: list[int],
    expected: int,
) -> None:
    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz: tzinfo | None = None) -> datetime:
            return datetime(2026, 11, 5, 12, tzinfo=UTC).astimezone(tz)

    monkeypatch.setattr(academic, "datetime", FrozenDateTime)
    authenticated_student["current_level"] = "400"
    academic_db.fetch.side_effect = [
        [],
        [],
        [{"activity_date": date(2026, 11, day), "tasks_completed": 1} for day in sorted(days)],
    ]
    response = await client.get("/api/v1/home/dashboard?timezone=Africa/Lagos")
    assert response.status_code == 200
    assert response.json()["current_streak_days"] == expected
    query, owner, university, timezone, today = academic_db.fetch.await_args.args
    assert (owner, university, timezone, today) == (
        authenticated_student.id,
        authenticated_student.university_id,
        "Africa/Lagos",
        date(2026, 11, 5),
    )
    assert "completed_at AT TIME ZONE" in query


async def test_storage_outage_is_not_an_empty_task_list(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    academic_db.fetch.side_effect = TimeoutError
    response = await client.get("/api/v1/tasks/page")
    assert response.status_code == 503


async def test_legacy_task_list_keeps_its_array_contract(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    academic_db.fetch.return_value = [task_row()]
    response = await client.get("/api/v1/tasks?include_completed=true")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert response.json()[0]["id"] == str(TASK_ID)


@pytest.mark.parametrize("role", ["lecturer", "university_admin"])
async def test_non_student_cannot_access_student_task_pages(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, role: str
) -> None:
    authenticated_student["role"] = role
    authenticated_student["roles"] = [role]
    response = await client.get("/api/v1/tasks/page")
    assert response.status_code == 403
    academic_db.fetch.assert_not_awaited()


@pytest.mark.parametrize("method", ["get", "post", "patch", "delete"])
async def test_students_cannot_manage_timetables(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock, method: str
) -> None:
    path = "/api/v1/admin/timetables" + (f"/{TASK_ID}" if method in {"patch", "delete"} else "")
    response = await client.request(
        method,
        path,
        json={
            "level": "400",
            "day": "Thursday",
            "course_code": "TEST",
            "course_title": "Synthetic",
            "time_slot": "09:00",
        }
        if method in {"post", "patch"}
        else None,
    )
    assert response.status_code == 403
    academic_db.fetch.assert_not_awaited()
    academic_db.fetchrow.assert_not_awaited()


async def test_admin_list_scopes_to_own_university_even_if_another_is_requested(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    authenticated_student["role"] = "university_admin"
    authenticated_student["roles"] = ["university_admin"]
    response = await client.get(f"/api/v1/admin/timetables?university_id={TASK_ID}&level=400")
    assert response.status_code == 200
    assert academic_db.fetch.await_args.args[1] == authenticated_student.university_id


async def test_admin_cannot_update_a_foreign_university_entry(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    authenticated_student["role"] = "university_admin"
    authenticated_student["roles"] = ["university_admin"]
    academic_db.fetchrow.side_effect = [
        {
            "university_id": str(TASK_ID),
            "start_time_local": None,
            "end_time_local": None,
            "effective_from": None,
            "effective_until": None,
        },
        None,
    ]
    response = await client.patch(
        f"/api/v1/admin/timetables/{TASK_ID}", json={"venue": "Synthetic room"}
    )
    assert response.status_code == 404
    query, _, university, *_ = academic_db.fetchrow.await_args.args
    assert university == authenticated_student.university_id
    assert "WHERE id = $1 AND university_id = $2" in query


async def test_invalid_activity_timezone_does_not_query_storage(
    client: AsyncClient, authenticated_student: UserContext, academic_db: MagicMock
) -> None:
    response = await client.get("/api/v1/home/dashboard?timezone=Not_A_Timezone")
    assert response.status_code == 422
    academic_db.fetch.assert_not_awaited()


async def test_dashboard_resolves_today_in_the_requested_timezone(
    client: AsyncClient,
    authenticated_student: UserContext,
    academic_db: MagicMock,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz: tzinfo | None = None) -> datetime:
            return datetime(2026, 11, 5, 23, 30, tzinfo=UTC).astimezone(tz)

    monkeypatch.setattr(academic, "datetime", FrozenDateTime)
    authenticated_student["current_level"] = "400"
    academic_db.fetch.side_effect = [[], [], []]
    response = await client.get("/api/v1/home/dashboard?timezone=Africa/Lagos")
    assert response.status_code == 200
    assert response.json()["today"] == "2026-11-06"
