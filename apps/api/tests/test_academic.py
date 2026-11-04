"""Tests for academic task models, nullable due dates, and contracts."""

from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from app.models.academic import StudentTask, StudentTaskCreate, StudentTaskUpdate


def test_student_task_create_allows_optional_due_date() -> None:
    task = StudentTaskCreate(title="Complete pharmacology essay")
    assert task.due_date is None
    assert task.task_type == "custom"


def test_student_task_create_with_explicit_due_date() -> None:
    task = StudentTaskCreate(
        title="Complete pharmacology essay",
        due_date="2026-11-05",  # type: ignore[arg-type]
    )
    assert task.due_date == date(2026, 11, 5)


def test_student_task_update_allows_clearing_due_date() -> None:
    update = StudentTaskUpdate(due_date=None)
    assert update.due_date is None


def test_student_task_model_serializes_nullable_due_date() -> None:
    now = datetime(2026, 11, 3, 7, 0, 0, tzinfo=UTC)
    task = StudentTask(
        id="0192d194-28b3-7d24-811c-d784a0c8b321",
        title="Read monograph chapter 4",
        subtitle=None,
        course_code="PCO 301",
        task_type="reading",
        source="custom",
        due_date=None,
        due_time=None,
        is_completed=False,
        is_favorite=False,
        completed_at=None,
        created_at=now,
    )
    payload = task.model_dump(mode="json")
    assert payload["due_date"] is None
    assert payload["course_code"] == "PCO 301"


def test_student_task_create_empty_title_fails() -> None:
    with pytest.raises(ValidationError):
        StudentTaskCreate(title="")
