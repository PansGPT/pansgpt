"""Student task, timetable and dashboard activity API contracts."""

from datetime import date, datetime, time
from typing import Literal

from pydantic import Field, field_validator

from app.core.schemas import StrictRequest

TaskType = Literal["class", "reading", "assignment", "lab", "presentation", "meeting", "custom"]
TaskSource = Literal["custom", "timetable", "ai_generated"]
Weekday = Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
UniversityLevel = Literal["100", "200", "300", "400", "500", "600"]


def _parse_iso_date(value: object) -> object:
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return value
    return value


def _parse_iso_time(value: object) -> object:
    if isinstance(value, str):
        try:
            return time.fromisoformat(value)
        except ValueError:
            return value
    return value


class StudentTaskCreate(StrictRequest):
    title: str = Field(min_length=1, max_length=200)
    subtitle: str | None = Field(default=None, max_length=300)
    course_code: str | None = Field(default=None, max_length=30)
    task_type: TaskType = "custom"
    due_date: date | None = None
    due_time: time | None = None

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, value: object) -> object:
        return _parse_iso_date(value)

    @field_validator("due_time", mode="before")
    @classmethod
    def parse_due_time(cls, value: object) -> object:
        return _parse_iso_time(value)

    @field_validator("title")
    @classmethod
    def non_empty_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Task title cannot be blank.")
        return cleaned


class StudentTaskUpdate(StrictRequest):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    subtitle: str | None = Field(default=None, max_length=300)
    course_code: str | None = Field(default=None, max_length=30)
    task_type: TaskType | None = None
    due_date: date | None = None
    due_time: time | None = None
    is_completed: bool | None = None
    is_favorite: bool | None = None

    @field_validator("due_date", mode="before")
    @classmethod
    def parse_due_date(cls, value: object) -> object:
        return _parse_iso_date(value)

    @field_validator("due_time", mode="before")
    @classmethod
    def parse_due_time(cls, value: object) -> object:
        return _parse_iso_time(value)

    @field_validator("title")
    @classmethod
    def non_empty_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Task title cannot be blank.")
        return cleaned


class StudentTask(StrictRequest):
    id: str
    title: str
    subtitle: str | None
    course_code: str | None
    task_type: TaskType
    due_date: date | None = None
    due_time: time | None = None
    is_completed: bool
    is_favorite: bool
    completed_at: datetime | None
    source: TaskSource
    created_at: datetime


class TimetableCreate(StrictRequest):
    university_id: str | None = None
    level: UniversityLevel
    day: Weekday
    course_code: str = Field(min_length=1, max_length=30)
    course_title: str = Field(min_length=1, max_length=200)
    venue: str | None = Field(default=None, max_length=200)
    time_slot: str | None = Field(default=None, max_length=80)
    start_time: str | None = Field(default=None, max_length=80)
    start_time_local: time | None = None
    end_time_local: time | None = None
    effective_from: date | None = None
    effective_until: date | None = None

    @field_validator("start_time_local", "end_time_local", mode="before")
    @classmethod
    def parse_class_times(cls, value: object) -> object:
        return _parse_iso_time(value)

    @field_validator("effective_from", "effective_until", mode="before")
    @classmethod
    def parse_effective_dates(cls, value: object) -> object:
        return _parse_iso_date(value)

    @field_validator("course_code", "course_title")
    @classmethod
    def non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Course code and title cannot be blank.")
        return cleaned


class TimetableUpdate(StrictRequest):
    level: UniversityLevel | None = None
    day: Weekday | None = None
    course_code: str | None = Field(default=None, min_length=1, max_length=30)
    course_title: str | None = Field(default=None, min_length=1, max_length=200)
    venue: str | None = Field(default=None, max_length=200)
    time_slot: str | None = Field(default=None, max_length=80)
    start_time: str | None = Field(default=None, max_length=80)
    start_time_local: time | None = None
    end_time_local: time | None = None
    effective_from: date | None = None
    effective_until: date | None = None

    @field_validator("start_time_local", "end_time_local", mode="before")
    @classmethod
    def parse_class_times(cls, value: object) -> object:
        return _parse_iso_time(value)

    @field_validator("effective_from", "effective_until", mode="before")
    @classmethod
    def parse_effective_dates(cls, value: object) -> object:
        return _parse_iso_date(value)

    @field_validator("course_code", "course_title")
    @classmethod
    def non_empty_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Course code and title cannot be blank.")
        return cleaned


class TimetableEntry(StrictRequest):
    id: str
    university_id: str
    level: UniversityLevel
    day: Weekday
    course_code: str
    course_title: str
    venue: str | None
    time_slot: str
    start_time: str | None
    start_time_local: time | None
    end_time_local: time | None
    effective_from: date | None
    effective_until: date | None


class TimetableOccurrence(StrictRequest):
    id: str
    timetable_id: str
    date: date
    day: Weekday
    course_code: str
    course_title: str
    venue: str | None
    time_slot: str
    start_time: str | None
    start_time_local: time | None
    end_time_local: time | None


class DailyStudyActivity(StrictRequest):
    date: date
    tasks_completed: int = Field(ge=0)


class HomeDashboardResponse(StrictRequest):
    today: date
    activity_from: date
    current_streak_days: int = Field(ge=0)
    daily_activity: list[DailyStudyActivity]
    tasks: list[StudentTask]
    timetable: list[TimetableOccurrence]
