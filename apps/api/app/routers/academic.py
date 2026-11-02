"""Authenticated student tasks, recurring timetable and home activity APIs."""

import logging
import uuid
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.authorization import require_university
from app.core.config import settings
from app.core.database import get_db_connection
from app.core.dependencies import (
    UserContext,
    require_admin_or_super_admin,
    require_student,
)
from app.models.academic import (
    DailyStudyActivity,
    HomeDashboardResponse,
    StudentTask,
    StudentTaskCreate,
    StudentTaskUpdate,
    TimetableCreate,
    TimetableEntry,
    TimetableOccurrence,
    TimetableUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Academic Operations"])

TASK_SELECT = """id::text, title, subtitle, course_code, task_type, due_date,
    due_time, is_completed, is_favorite, completed_at, source, created_at"""
TIMETABLE_SELECT = """id::text, university_id::text, level::text, day, course_code,
    course_title, venue, time_slot, start_time, start_time_local, end_time_local,
    effective_from, effective_until"""
MAX_DATE_RANGE_DAYS = 31


def _database_error_summary(exc: Exception) -> str:
    sqlstate = getattr(exc, "sqlstate", None)
    if sqlstate:
        return f"{type(exc).__name__} sqlstate={sqlstate}"
    return type(exc).__name__


def _timezone(value: str | None) -> ZoneInfo:
    selected = value or settings.AI_REQUEST_TIMEZONE
    try:
        return ZoneInfo(selected)
    except (ValueError, ZoneInfoNotFoundError) as exc:
        raise HTTPException(status_code=422, detail="Use a valid IANA timezone.") from exc


def _task(row: Any) -> StudentTask:
    return StudentTask.model_validate(dict(row))


def _timetable_entry(row: Any) -> TimetableEntry:
    return TimetableEntry.model_validate(dict(row))


async def _load_tasks(
    conn: Any,
    user: UserContext,
    today: date,
    *,
    upcoming_days: int | None,
    limit: int,
    include_completed: bool = False,
) -> list[StudentTask]:
    university_id = require_university(user)
    where = "user_id = $1 AND university_id = $2"
    values: list[Any] = [user.id, university_id]
    if not include_completed:
        where += " AND is_completed IS FALSE"
    if upcoming_days is not None:
        values.append(today + timedelta(days=upcoming_days))
        where += f" AND due_date <= ${len(values)}"
    if include_completed:
        ordering = "due_date DESC, due_time DESC NULLS LAST, created_at DESC"
    else:
        values.append(today)
        ordering = (
            f"CASE WHEN due_date < ${len(values)} THEN 0 ELSE 1 END, "
            "due_date ASC, due_time ASC NULLS LAST, created_at ASC"
        )
    values.append(limit)
    rows = await conn.fetch(
        f"SELECT {TASK_SELECT} FROM public.student_tasks WHERE {where} "
        f"ORDER BY {ordering} LIMIT ${len(values)};",
        *values,
    )
    return [_task(row) for row in rows]


async def _load_occurrences(
    conn: Any,
    user: UserContext,
    start_date: date,
    end_date: date,
) -> list[TimetableOccurrence]:
    university_id = require_university(user)
    if user.current_level not in {"100", "200", "300", "400", "500", "600"}:
        return []
    rows = await conn.fetch(
        f"SELECT {TIMETABLE_SELECT} FROM public.timetables "
        "WHERE university_id = $1 AND level = $2::university_level "
        "AND (effective_from IS NULL OR effective_from <= $4) "
        "AND (effective_until IS NULL OR effective_until >= $3) "
        "ORDER BY day, start_time_local NULLS LAST, time_slot, course_code;",
        university_id,
        user.current_level,
        start_date,
        end_date,
    )
    by_day: dict[str, list[Any]] = {}
    for row in rows:
        by_day.setdefault(row["day"], []).append(row)

    occurrences: list[TimetableOccurrence] = []
    cursor = start_date
    while cursor <= end_date:
        day_name = cursor.strftime("%A")
        for row in by_day.get(day_name, []):
            if row["effective_from"] is not None and cursor < row["effective_from"]:
                continue
            if row["effective_until"] is not None and cursor > row["effective_until"]:
                continue
            start_time = row["start_time_local"]
            end_time = row["end_time_local"]
            slot = row["time_slot"]
            if start_time is not None and end_time is not None:
                slot = f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}"
            occurrences.append(
                TimetableOccurrence(
                    id=f"{row['id']}:{cursor.isoformat()}",
                    timetable_id=row["id"],
                    date=cursor,
                    day=day_name,
                    course_code=row["course_code"],
                    course_title=row["course_title"],
                    venue=row["venue"],
                    time_slot=slot,
                    start_time=row["start_time"],
                    start_time_local=start_time,
                    end_time_local=end_time,
                )
            )
        cursor += timedelta(days=1)
    return occurrences


@router.get("/home/dashboard", response_model=HomeDashboardResponse)
async def home_dashboard(
    response: Response,
    timezone: str | None = Query(default=None, max_length=64),
    user: UserContext = Depends(require_student),
) -> HomeDashboardResponse:
    """Return owner-scoped tasks, class occurrences and completed-task activity."""
    tz = _timezone(timezone)
    today = datetime.now(tz).date()
    activity_from = today - timedelta(days=364)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your study activity is temporarily unavailable.")
            async with conn.transaction(isolation="repeatable_read", readonly=True):
                tasks = await _load_tasks(conn, user, today, upcoming_days=21, limit=100)
                timetable = await _load_occurrences(conn, user, today, today + timedelta(days=20))
                activity_rows = await conn.fetch(
                    "SELECT (completed_at AT TIME ZONE $3::text)::date AS activity_date, "
                    "count(*)::int AS tasks_completed FROM public.student_tasks "
                    "WHERE user_id = $1 AND university_id = $2 AND is_completed IS TRUE "
                    "AND completed_at >= (($4::date - 364)::timestamp AT TIME ZONE $3::text) "
                    "GROUP BY activity_date ORDER BY activity_date;",
                    user.id,
                    require_university(user),
                    str(tz),
                    today,
                )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("home_dashboard_unavailable: %s", _database_error_summary(exc))
        raise HTTPException(503, "Your study activity is temporarily unavailable.") from exc

    daily_activity = [
        DailyStudyActivity(date=row["activity_date"], tasks_completed=row["tasks_completed"])
        for row in activity_rows
    ]
    active_dates = {row.date for row in daily_activity}
    cursor = today if today in active_dates else today - timedelta(days=1)
    streak = 0
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    response.headers["Cache-Control"] = "private, no-store"
    return HomeDashboardResponse(
        today=today,
        activity_from=activity_from,
        current_streak_days=streak,
        daily_activity=daily_activity,
        tasks=tasks,
        timetable=timetable,
    )


@router.get("/timetable", response_model=list[TimetableOccurrence])
async def get_timetable(
    response: Response,
    start_date: date = Query(),
    end_date: date = Query(),
    user: UserContext = Depends(require_student),
) -> list[TimetableOccurrence]:
    if end_date < start_date or (end_date - start_date).days >= MAX_DATE_RANGE_DAYS:
        raise HTTPException(422, "Timetable range must be between 1 and 31 days.")
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your timetable is temporarily unavailable.")
            occurrences = await _load_occurrences(conn, user, start_date, end_date)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("timetable_unavailable: %s", _database_error_summary(exc))
        raise HTTPException(503, "Your timetable is temporarily unavailable.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return occurrences


@router.get("/tasks", response_model=list[StudentTask])
async def list_tasks(
    response: Response,
    include_completed: bool = False,
    limit: int = Query(default=200, ge=1, le=500),
    timezone: str | None = Query(default=None, max_length=64),
    user: UserContext = Depends(require_student),
) -> list[StudentTask]:
    today = datetime.now(_timezone(timezone)).date()
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your tasks are temporarily unavailable.")
            tasks = await _load_tasks(
                conn,
                user,
                today,
                upcoming_days=None,
                limit=limit,
                include_completed=include_completed,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("student_tasks_unavailable: %s", _database_error_summary(exc))
        raise HTTPException(503, "Your tasks are temporarily unavailable.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return tasks


@router.post("/tasks", response_model=StudentTask, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: StudentTaskCreate,
    response: Response,
    user: UserContext = Depends(require_student),
) -> StudentTask:
    university_id = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your task could not be saved. Please try again.")
            row = await conn.fetchrow(
                f"INSERT INTO public.student_tasks "
                "(user_id, university_id, title, subtitle, course_code, task_type, due_date, due_time) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) "
                f"RETURNING {TASK_SELECT};",
                user.id,
                university_id,
                payload.title,
                payload.subtitle,
                payload.course_code,
                payload.task_type,
                payload.due_date,
                payload.due_time,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("student_task_create_failed: %s", _database_error_summary(exc))
        raise HTTPException(503, "Your task could not be saved. Please try again.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return _task(row)


@router.patch("/tasks/{task_id}", response_model=StudentTask)
async def update_task(
    task_id: uuid.UUID,
    payload: StudentTaskUpdate,
    response: Response,
    user: UserContext = Depends(require_student),
) -> StudentTask:
    university_id = require_university(user)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "Provide at least one task field to update.")
    if "title" in updates and updates["title"] is None:
        raise HTTPException(422, "Task title cannot be blank.")
    if any(
        updates[field] is None
        for field in ("task_type", "due_date", "is_completed", "is_favorite")
        if field in updates
    ):
        raise HTTPException(422, "Task type, due date and task state cannot be cleared.")
    assignments: list[str] = []
    values: list[Any] = [task_id, user.id, university_id]
    for field, value in updates.items():
        values.append(value)
        index = len(values)
        assignments.append(f"{field} = ${index}")
        if field == "is_completed":
            assignments.append(
                f"completed_at = CASE WHEN ${index} THEN COALESCE(completed_at, now()) ELSE NULL END"
            )
    assignments.append("updated_at = now()")
    query = (
        "UPDATE public.student_tasks SET "
        + ", ".join(assignments)
        + f" WHERE id = $1 AND user_id = $2 AND university_id = $3 RETURNING {TASK_SELECT};"
    )
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your task could not be updated. Please try again.")
            row = await conn.fetchrow(query, *values)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("student_task_update_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your task could not be updated. Please try again.") from exc
    if row is None:
        raise HTTPException(404, "Task not found.")
    response.headers["Cache-Control"] = "private, no-store"
    return _task(row)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    user: UserContext = Depends(require_student),
) -> Response:
    university_id = require_university(user)
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Your task could not be deleted. Please try again.")
            deleted = await conn.fetchval(
                "DELETE FROM public.student_tasks WHERE id = $1 AND user_id = $2 "
                "AND university_id = $3 RETURNING id;",
                task_id,
                user.id,
                university_id,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("student_task_delete_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Your task could not be deleted. Please try again.") from exc
    if deleted is None:
        raise HTTPException(404, "Task not found.")
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"Cache-Control": "private, no-store"},
    )


def _admin_university(user: UserContext, requested: str | None) -> uuid.UUID:
    roles = set(user.roles) | {user.role}
    if "super_admin" in roles:
        if not requested:
            raise HTTPException(
                422, "A university_id is required for platform-wide timetable access."
            )
        try:
            return uuid.UUID(requested)
        except ValueError as exc:
            raise HTTPException(422, "University ID must be a UUID.") from exc
    if "university_admin" not in roles:
        raise HTTPException(403, "University administrator access is required.")
    return require_university(user)


def _legacy_slot(payload: TimetableCreate) -> str:
    if payload.time_slot:
        selected = payload.time_slot.strip()
        if selected:
            return selected
    if payload.start_time_local and payload.end_time_local:
        return (
            f"{payload.start_time_local.strftime('%H:%M')} - "
            f"{payload.end_time_local.strftime('%H:%M')}"
        )
    if payload.start_time:
        return payload.start_time.strip()
    raise HTTPException(422, "Provide a time slot or both typed start and end times.")


@router.get("/admin/timetables", response_model=list[TimetableEntry])
async def admin_list_timetables(
    response: Response,
    university_id: str | None = None,
    level: str | None = None,
    user: UserContext = Depends(require_admin_or_super_admin),
) -> list[TimetableEntry]:
    target = _admin_university(user, university_id)
    if level is not None and level not in {"100", "200", "300", "400", "500", "600"}:
        raise HTTPException(422, "Invalid university level.")
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "Timetables are temporarily unavailable.")
            rows = await conn.fetch(
                f"SELECT {TIMETABLE_SELECT} FROM public.timetables WHERE university_id = $1 "
                "AND ($2::university_level IS NULL OR level = $2::university_level) "
                "ORDER BY level, day, start_time_local NULLS LAST, time_slot, course_code;",
                target,
                level,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("admin_timetable_list_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Timetables are temporarily unavailable.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return [_timetable_entry(row) for row in rows]


@router.post(
    "/admin/timetables",
    response_model=TimetableEntry,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_timetable(
    payload: TimetableCreate,
    response: Response,
    user: UserContext = Depends(require_admin_or_super_admin),
) -> TimetableEntry:
    target = _admin_university(user, payload.university_id)
    time_slot = _legacy_slot(payload)
    if (
        payload.start_time_local is not None
        and payload.end_time_local is not None
        and payload.end_time_local <= payload.start_time_local
    ):
        raise HTTPException(422, "Class end time must be after its start time.")
    if (payload.start_time_local is None) != (payload.end_time_local is None):
        raise HTTPException(422, "Provide both typed class times or neither.")
    if (
        payload.effective_from is not None
        and payload.effective_until is not None
        and payload.effective_until < payload.effective_from
    ):
        raise HTTPException(422, "The timetable end date must follow its start date.")
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "The timetable entry could not be saved.")
            row = await conn.fetchrow(
                "INSERT INTO public.timetables "
                "(university_id, level, day, time_slot, start_time, course_code, course_title, venue, "
                "start_time_local, end_time_local, effective_from, effective_until) "
                "VALUES ($1, $2::university_level, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) "
                f"RETURNING {TIMETABLE_SELECT};",
                target,
                payload.level,
                payload.day,
                time_slot,
                payload.start_time
                or (
                    payload.start_time_local.strftime("%H:%M") if payload.start_time_local else None
                ),
                payload.course_code,
                payload.course_title,
                payload.venue,
                payload.start_time_local,
                payload.end_time_local,
                payload.effective_from,
                payload.effective_until,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("admin_timetable_create_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "The timetable entry could not be saved.") from exc
    response.headers["Cache-Control"] = "private, no-store"
    return _timetable_entry(row)


@router.patch("/admin/timetables/{entry_id}", response_model=TimetableEntry)
async def admin_update_timetable(
    entry_id: uuid.UUID,
    payload: TimetableUpdate,
    response: Response,
    user: UserContext = Depends(require_admin_or_super_admin),
) -> TimetableEntry:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(422, "Provide at least one timetable field to update.")
    if any(
        value is None
        for field, value in updates.items()
        if field in {"level", "day", "course_code", "course_title", "time_slot"}
    ):
        raise HTTPException(422, "Required timetable fields cannot be cleared.")
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "The timetable entry could not be updated.")
            existing = await conn.fetchrow(
                "SELECT university_id::text, start_time_local, end_time_local, effective_from, "
                "effective_until FROM public.timetables WHERE id = $1;",
                entry_id,
            )
            if existing is None:
                raise HTTPException(404, "Timetable entry not found.")
            target = _admin_university(user, existing["university_id"])
            starts = updates.get("start_time_local", existing["start_time_local"])
            ends = updates.get("end_time_local", existing["end_time_local"])
            first_day = updates.get("effective_from", existing["effective_from"])
            last_day = updates.get("effective_until", existing["effective_until"])
            if (starts is None) != (ends is None):
                raise HTTPException(422, "Provide both typed class times or neither.")
            if starts is not None and ends is not None and ends <= starts:
                raise HTTPException(422, "Class end time must be after its start time.")
            if first_day is not None and last_day is not None and last_day < first_day:
                raise HTTPException(422, "The timetable end date must follow its start date.")
            assignments: list[str] = []
            values: list[Any] = [entry_id, target]
            for field, value in updates.items():
                values.append(value)
                index = len(values)
                if field == "level":
                    assignments.append(f"level = ${index}::university_level")
                else:
                    assignments.append(f"{field} = ${index}")
            assignments.append("updated_at = now()")
            row = await conn.fetchrow(
                "UPDATE public.timetables SET "
                + ", ".join(assignments)
                + f" WHERE id = $1 AND university_id = $2 RETURNING {TIMETABLE_SELECT};",
                *values,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("admin_timetable_update_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "The timetable entry could not be updated.") from exc
    if row is None:
        raise HTTPException(404, "Timetable entry not found.")
    response.headers["Cache-Control"] = "private, no-store"
    return _timetable_entry(row)


@router.delete("/admin/timetables/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_timetable(
    entry_id: uuid.UUID,
    user: UserContext = Depends(require_admin_or_super_admin),
) -> Response:
    try:
        async with get_db_connection() as conn:
            if conn is None:
                raise HTTPException(503, "The timetable entry could not be deleted.")
            existing = await conn.fetchrow(
                "SELECT university_id::text FROM public.timetables WHERE id = $1;", entry_id
            )
            if existing is None:
                raise HTTPException(404, "Timetable entry not found.")
            target = _admin_university(user, existing["university_id"])
            deleted = await conn.fetchval(
                "DELETE FROM public.timetables WHERE id = $1 AND university_id = $2 RETURNING id;",
                entry_id,
                target,
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("admin_timetable_delete_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "The timetable entry could not be deleted.") from exc
    if deleted is None:
        raise HTTPException(404, "Timetable entry not found.")
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"Cache-Control": "private, no-store"},
    )
