"""Explicit public taking/review contracts and private generation schemas."""

from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator, model_validator

QuestionType = Literal[
    "objective", "multi_select", "statement_matrix", "true_false", "short_answer"
]
OptionId = Literal["A", "B", "C", "D", "E"]
JobStatus = Literal[
    "queued", "retrieving", "generating", "saving", "completed", "failed", "cancelled"
]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class QuizConfig(Contract):
    course_code: str = Field(min_length=1, max_length=30)
    topic: str = Field(default="", max_length=300)
    question_type: QuestionType = "objective"
    count: Literal[5, 10, 15, 20, 25] = 10
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    time_limit_sec: Literal[300, 600, 900, 1200, 1800, 2700, 3600] | None = None
    revision_result_id: UUID | None = None


class CreateQuiz(QuizConfig):
    request_key: UUID


class QuizTaskConfig(QuizConfig):
    """Internal worker metadata; never accepted by the public builder contract."""

    content_generation_version: Literal[1] | None = None

    bank_refill: bool = False
    matrix_generation_version: Literal[0, 1] = 0
    capacity_waits: int = Field(default=0, ge=0, le=8)


class Option(Contract):
    id: OptionId
    text: str = Field(min_length=1, max_length=1000)


class Source(Contract):
    chunk_id: UUID
    document_id: UUID
    title: str
    page: int | None = None
    excerpt: str


class Question(Contract):
    id: UUID
    position: int
    question_type: QuestionType
    prompt: str
    options: list[Option]
    points: int
    concept: str


class AnswerKey(Contract):
    choice_ids: list[OptionId] = Field(default_factory=list, max_length=3)
    truth_values: dict[OptionId, StrictBool] = Field(default_factory=dict)
    text: str = Field(default="", max_length=3000)


class GeneratedQuestion(Contract):
    question_type: QuestionType
    prompt: str = Field(min_length=15, max_length=2500)
    options: list[Option] = Field(default_factory=list, max_length=5)
    answer_key: AnswerKey
    explanation: str = Field(min_length=20, max_length=3000)
    concept: str = Field(min_length=2, max_length=120)
    source_ids: list[UUID] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def check_format(self) -> Self:
        ids = [option.id for option in self.options]
        texts = [option.text.casefold() for option in self.options]
        key = self.answer_key
        if len(ids) != len(set(ids)) or len(texts) != len(set(texts)):
            raise ValueError("Options must be distinct")
        if self.question_type in ("objective", "multi_select", "statement_matrix"):
            expected = list("ABCD" if self.question_type == "objective" else "ABCDE")
            if ids != expected:
                raise ValueError("Incorrect option identifiers")
        elif ids:
            raise ValueError("This format has no options")
        if self.question_type in ("objective", "multi_select"):
            count = 1 if self.question_type == "objective" else 3
            if (
                len(set(key.choice_ids)) != count
                or len(key.choice_ids) != count
                or not set(key.choice_ids) <= set(ids)
                or key.truth_values
                or key.text
            ):
                raise ValueError("Invalid choice key")
        elif self.question_type == "statement_matrix":
            if set(key.truth_values) != set(ids) or key.choice_ids or key.text:
                raise ValueError("Every statement needs a boolean key")
            if sum(key.truth_values.values()) != 3:
                raise ValueError("A matrix needs three true and two false statements")
        elif self.question_type == "true_false":
            if set(key.truth_values) != {"A"} or key.choice_ids or key.text:
                raise ValueError("True/false key uses A")
        elif not key.text or key.choice_ids or key.truth_values:
            raise ValueError("Written answer needs a reference rubric")
        return self


class QuestionBatch(Contract):
    questions: list[GeneratedQuestion] = Field(min_length=1, max_length=5)


class Answer(Contract):
    question_id: UUID
    selected_option_ids: list[OptionId] = Field(default_factory=list, max_length=3)
    truth_values: dict[OptionId, StrictBool] = Field(default_factory=dict)
    text: str = Field(default="", max_length=4000)

    @model_validator(mode="after")
    def unique_choices(self) -> Self:
        if len(set(self.selected_option_ids)) != len(self.selected_option_ids):
            raise ValueError("Duplicate choices")
        return self


class SaveAnswers(Contract):
    revision: int = Field(ge=0)
    answers: list[Answer] = Field(default_factory=list, max_length=25)
    flagged_ids: list[UUID] = Field(default_factory=list, max_length=25)


class QuizJob(Contract):
    id: UUID
    quiz_id: UUID
    status: JobStatus
    generated_count: int
    target_count: int
    current_step: str
    error_message: str | None
    can_start: bool = False


class QuizInfo(Contract):
    id: UUID
    title: str
    course_code: str
    topic: str
    question_type: QuestionType
    difficulty: str
    count: int
    time_limit_sec: int | None


class Attempt(Contract):
    id: UUID
    quiz: QuizInfo
    questions: list[Question]
    answers: list[Answer]
    flagged_ids: list[UUID]
    revision: int
    status: Literal["in_progress", "grading", "grading_failed", "completed"]
    started_at: datetime
    deadline_at: datetime | None
    server_now: datetime
    result_id: UUID | None
    generation_job_id: UUID | None = None
    generation_status: JobStatus = "completed"


class OptionGrade(Contract):
    id: OptionId
    earned: float
    correct: bool | None


class Feedback(Contract):
    question: Question
    answer: Answer
    answer_key: AnswerKey
    earned: float
    explanation: str
    sources: list[Source]
    option_grades: list[OptionGrade] = Field(default_factory=list)
    outcome: Literal["correct", "partial", "incorrect", "unanswered"]


class QuizResult(Contract):
    id: UUID
    quiz: QuizInfo
    score: float
    max_score: float
    percentage: float
    time_taken_sec: int
    completed_at: datetime
    feedback: list[Feedback]


class WrittenGrade(Contract):
    question_id: UUID
    score: Literal[0.0, 0.5, 1.0]
    feedback: str = Field(min_length=5, max_length=1500)

    @field_validator("score", mode="before")
    @classmethod
    def no_boolean_score(cls, value: object) -> object:
        if isinstance(value, bool):
            raise ValueError("A numeric grade is required")
        return value


class WrittenGrades(Contract):
    grades: list[WrittenGrade] = Field(min_length=1, max_length=25)


class HistoryItem(Contract):
    id: UUID
    quiz_id: UUID
    title: str
    course_code: str
    question_type: QuestionType
    percentage: float
    time_taken_sec: int | None
    completed_at: datetime


class QuizStats(Contract):
    completed: int
    average: float
    best: float
    study_seconds: int


class QuizHistory(Contract):
    items: list[HistoryItem]
    next_offset: int | None
    stats: QuizStats
    jobs: list[QuizJob]
    active_attempts: list[Attempt] = Field(default_factory=list)


class Course(Contract):
    code: str
    title: str
    topics: list[str]
    document_count: int


class ShareSummary(Contract):
    title: str
    course_code: str
    percentage: float
    question_count: int
    completed_at: datetime


class ShareRequest(Contract):
    token: str = Field(min_length=30, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
