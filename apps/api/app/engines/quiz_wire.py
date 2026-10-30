"""Small provider-only payloads mapped to the full validated server contract."""

import json
import re
from typing import Annotated, Literal
from uuid import UUID

import structlog
from pydantic import BaseModel, Field, StrictBool, StrictInt, ValidationError

from app.models.quiz import Contract, GeneratedQuestion, OptionId, QuestionBatch, QuizConfig

logger = structlog.get_logger(__name__)


def rejection_reason(exc: Exception) -> str:
    """Allowlisted diagnostics only; never log provider output or source text."""
    if isinstance(exc, ValidationError):
        return "question_contract"
    if isinstance(exc, (KeyError, IndexError)):
        return "unknown_source_or_option"
    return {
        "Boolean answers required": "boolean_answer_shape",
        "Incomplete boolean key": "boolean_answer_count",
        "Five matrix statements are required": "matrix_statement_count",
        "Two distinct near-miss corrections are required": "matrix_correction_count",
        "A near-miss must change one source detail": "matrix_single_substitution",
        "Simple negation or direction reversal is not a near-miss": "matrix_direction_reversal",
        "The false statement must match its single-detail correction": "matrix_correction_mismatch",
        "Distractor terms must occur in cited evidence": "matrix_terms_not_in_evidence",
        "Reference answer required": "reference_answer_shape",
    }.get(str(exc), "invalid_question")


class FalseEdit(Contract):
    i: Literal[0, 1, 2, 3, 4]
    t: str = Field(min_length=15, max_length=240)
    r: str = Field(min_length=1, max_length=80)
    v: str = Field(min_length=1, max_length=80)


class WireQuestion(Contract):
    p: str = Field(min_length=15, max_length=2500)
    o: list[str] = Field(max_length=5)
    a: str | list[OptionId] | list[StrictBool]
    e: str = Field(min_length=20, max_length=3000)
    c: str = Field(min_length=2, max_length=120)
    s: list[Annotated[StrictInt, Field(ge=1, le=8)]] = Field(min_length=1, max_length=3)
    f: list[FalseEdit] = Field(default_factory=list, max_length=2)


class WireBatch(Contract):
    questions: list[WireQuestion] = Field(min_length=1, max_length=5)


class MatrixEdit(Contract):
    i: Literal[0, 1, 2, 3, 4]
    r: str = Field(min_length=1, max_length=80)
    v: str = Field(min_length=1, max_length=80)


class MatrixDraft(Contract):
    p: str = Field(min_length=15, max_length=240)
    t: list[Annotated[str, Field(min_length=15, max_length=240)]] = Field(
        min_length=5, max_length=5
    )
    f: list[MatrixEdit] = Field(min_length=2, max_length=2)
    e: str = Field(min_length=20, max_length=3000)
    c: str = Field(min_length=2, max_length=120)
    s: list[Annotated[StrictInt, Field(ge=1, le=4)]] = Field(min_length=1, max_length=3)


class MatrixDraftBatch(Contract):
    questions: list[MatrixDraft] = Field(min_length=1, max_length=5)


def compile_matrix(batch: MatrixDraftBatch) -> WireBatch:
    """Derive statements and keys from five true claims and two declared edits.

    Expansion still rejects repeated edits, absent terms, negation and ungrounded
    replacements. The model no longer has to duplicate the same substitution.
    """
    questions = []
    for draft in batch.questions:
        options = list(draft.t)
        answers = [True] * 5
        edits = []
        for edit in draft.f:
            original = draft.t[edit.i]
            options[edit.i] = original.replace(edit.r, edit.v, 1)
            answers[edit.i] = False
            edits.append(FalseEdit(i=edit.i, t=original, r=edit.r, v=edit.v))
        questions.append(
            WireQuestion(p=draft.p, o=options, a=answers, f=edits, e=draft.e, c=draft.c, s=draft.s)
        )
    return WireBatch(questions=questions)


class WireWrittenGrade(Contract):
    question_id: UUID
    marks: Annotated[StrictInt, Field(ge=0, le=2)]
    feedback: str = Field(min_length=5, max_length=300)


class WireWrittenGrades(Contract):
    grades: list[WireWrittenGrade] = Field(min_length=1, max_length=25)


def strict_batch_schema(kind: str) -> dict[str, object]:
    """Small closed provider schema; local expansion still checks keys and evidence."""
    answer: dict[str, object]
    if kind in {"objective", "multi_select"}:
        n = 1 if kind == "objective" else 3
        answer = {
            "type": "array",
            "items": {"type": "string", "enum": list("ABCD" if kind == "objective" else "ABCDE")},
            "minItems": n,
            "maxItems": n,
        }
    elif kind in {"true_false", "statement_matrix"}:
        n = 1 if kind == "true_false" else 5
        answer = {"type": "array", "items": {"type": "boolean"}, "minItems": n, "maxItems": n}
    elif kind == "short_answer":
        answer = {"type": "string", "minLength": 1}
    else:
        raise ValueError("Unsupported question format")
    option_count = (
        4 if kind == "objective" else 5 if kind in {"multi_select", "statement_matrix"} else 0
    )
    fields: dict[str, object] = {
        "p": {"type": "string", "minLength": 15, "maxLength": 240},
        "o": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": option_count,
            "maxItems": option_count,
        },
        "a": answer,
        "e": {"type": "string", "minLength": 20, "maxLength": 3000},
        "c": {"type": "string", "minLength": 2, "maxLength": 120},
        "s": {
            "type": "array",
            "items": {"type": "integer", "minimum": 1, "maximum": 4},
            "minItems": 1,
            "maxItems": 3,
        },
    }
    if kind == "statement_matrix":
        fields.pop("o")
        fields.pop("a")
        fields["t"] = {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {"type": "string", "minLength": 15, "maxLength": 240},
        }
        fields["f"] = {
            "type": "array",
            "minItems": 2,
            "maxItems": 2,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["i", "r", "v"],
                "properties": {
                    "i": {"type": "integer", "minimum": 0, "maximum": 4},
                    "r": {"type": "string", "minLength": 1, "maxLength": 80},
                    "v": {"type": "string", "minLength": 1, "maxLength": 80},
                },
            },
        }
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["questions"],
        "properties": {
            "questions": {
                "type": "array",
                "minItems": 1,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": list(fields),
                    "properties": fields,
                },
            }
        },
    }


def decode[T: BaseModel](clean: str, schema: type[T]) -> T:
    try:
        return schema.model_validate_json(clean)
    except ValidationError:
        # Reject malformed envelopes, but retain valid siblings inside a batch.
        if schema not in (WireBatch, MatrixDraftBatch, QuestionBatch):
            raise
        data = json.loads(clean)
        if (
            not isinstance(data, dict)
            or set(data) != {"questions"}
            or not isinstance(data["questions"], list)
            or not 1 <= len(data["questions"]) <= 5
        ):
            raise
        model = (
            WireQuestion
            if schema is WireBatch
            else MatrixDraft
            if schema is MatrixDraftBatch
            else GeneratedQuestion
        )
        accepted = []
        for value in data["questions"]:
            try:
                accepted.append(model.model_validate(value).model_dump(mode="json"))
            except ValidationError:
                continue
        if not accepted:
            raise
        logger.info(
            "quiz_batch_partial_validation",
            accepted=len(accepted),
            rejected=len(data["questions"]) - len(accepted),
        )
        return schema.model_validate({"questions": accepted})


def expand(
    question: WireQuestion,
    config: QuizConfig,
    sources: dict[int, UUID],
    evidence: dict[int, str] | None = None,
) -> GeneratedQuestion:
    key: dict[str, object] = {"choice_ids": [], "truth_values": {}, "text": ""}
    if config.question_type in ("objective", "multi_select"):
        key["choice_ids"] = question.a
    elif config.question_type in ("statement_matrix", "true_false"):
        if not isinstance(question.a, list) or not all(
            isinstance(value, bool) for value in question.a
        ):
            raise ValueError("Boolean answers required")
        letters = "ABCDE" if config.question_type == "statement_matrix" else "A"
        if len(question.a) != len(letters):
            raise ValueError("Incomplete boolean key")
        key["truth_values"] = dict(zip(letters, question.a, strict=True))
        if config.question_type == "statement_matrix":
            if len(question.o) != 5:
                raise ValueError("Five matrix statements are required")
            false_indices = {index for index, value in enumerate(question.a) if not value}
            if (
                len(false_indices) != 2
                or len(question.f) != 2
                or {edit.i for edit in question.f} != false_indices
            ):
                raise ValueError("Two distinct near-miss corrections are required")
            cited = (
                " ".join(evidence[index] for index in question.s).casefold()
                if evidence is not None
                else None
            )
            for edit in question.f:
                if edit.r.casefold() == edit.v.casefold() or edit.t.count(edit.r) != 1:
                    raise ValueError("A near-miss must change one source detail")
                if re.search(
                    r"\b(?:increas\w*|decreas\w*|accelerat\w*|fast\w*|slow\w*|not|always|never|more|less)\b",
                    edit.r + " " + edit.v,
                    flags=re.IGNORECASE,
                ):
                    raise ValueError("Simple negation or direction reversal is not a near-miss")
                expected = " ".join(edit.t.replace(edit.r, edit.v, 1).split()).rstrip(".;")
                actual = " ".join(question.o[edit.i].split()).rstrip(".;")
                if expected != actual:
                    raise ValueError("The false statement must match its single-detail correction")
                if cited is not None and any(
                    not re.search(r"(?<!\w)" + re.escape(term.casefold()) + r"(?!\w)", cited)
                    for term in (edit.r, edit.v)
                ):
                    raise ValueError("Distractor terms must occur in cited evidence")
    else:
        if not isinstance(question.a, str):
            raise ValueError("Reference answer required")
        key["text"] = question.a
    return GeneratedQuestion.model_validate(
        {
            "question_type": config.question_type,
            "prompt": question.p,
            "options": [{"id": letter, "text": text} for letter, text in zip("ABCDE", question.o)],
            "answer_key": key,
            "explanation": question.e
            + (
                "\nCorrect facts: " + " ".join(edit.t for edit in question.f)
                if config.question_type == "statement_matrix"
                else ""
            ),
            "concept": question.c,
            "source_ids": [sources[index] for index in question.s],
        }
    )
