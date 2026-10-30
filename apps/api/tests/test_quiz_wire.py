"""Compact provider output must still satisfy the full authoritative quiz contract."""

import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.engines.quiz_wire import WireBatch, WireQuestion, decode, expand
from app.models.quiz import QuizConfig


def sample():
    return {
        "p": "Which process describes absorption?",
        "o": ["Absorption", "Distribution", "Metabolism", "Excretion"],
        "a": ["A"],
        "e": "Absorption moves a drug into systemic circulation.",
        "c": "Absorption",
        "s": [1],
    }


def test_rejection_diagnostics_never_include_provider_or_student_content():
    from app.engines.quiz_wire import rejection_reason

    assert rejection_reason(ValueError("PRIVATE MATERIAL")) == "invalid_question"
    assert rejection_reason(KeyError("PRIVATE MATERIAL")) == "unknown_source_or_option"
    assert (
        rejection_reason(ValueError("The false statement must match its single-detail correction"))
        == "matrix_correction_mismatch"
    )


def test_valid_siblings_survive_malformed_question_without_relaxing_contract():
    good = sample()
    bad = {**sample(), "e": "bad"}
    result = decode(json.dumps({"questions": [bad, good]}), WireBatch)
    assert len(result.questions) == 1
    source = uuid4()
    question = expand(result.questions[0], QuizConfig(course_code="TEST 401"), {1: source})
    assert question.source_ids == [source] and question.answer_key.choice_ids == ["A"]


@pytest.mark.parametrize(
    "bad",
    [
        {"questions": [sample()], "unexpected": True},
        {"questions": []},
        {"questions": [{**sample(), "p": "bad"}]},
    ],
)
def test_invalid_envelope_or_all_invalid_questions_are_rejected(bad):
    with pytest.raises(ValidationError):
        decode(json.dumps(bad), WireBatch)


@pytest.mark.parametrize(
    "kind,options,answer",
    [
        ("objective", 4, ["B"]),
        ("multi_select", 5, ["A", "C", "E"]),
        ("statement_matrix", 5, [True, False, True, False, True]),
        ("true_false", 0, [False]),
        ("short_answer", 0, "A source based reference answer"),
    ],
)
def test_compact_format_expands_to_correct_scoring_shape(kind, options, answer):
    payload = {**sample(), "o": [f"Distinct statement {i}" for i in range(options)], "a": answer}
    if kind == "statement_matrix":
        payload = matrix_sample()
    item = WireQuestion.model_validate(payload)
    question = expand(item, QuizConfig(course_code="TEST 401", question_type=kind), {1: uuid4()})
    assert question.question_type == kind and len(question.options) == options


def matrix_sample():
    return {
        **sample(),
        "o": [
            "Carrier M moves compound Q.",
            "Organ K forms compound Q.",
            "Enzyme R clears compound Q.",
            "Carrier R moves compound Q.",
            "Organ K clears compound Q.",
        ],
        "a": [True, False, True, False, True],
        "f": [
            {"i": 1, "t": "Organ L forms compound Q.", "r": "L", "v": "K"},
            {"i": 3, "t": "Carrier M moves compound Q.", "r": "M", "v": "R"},
        ],
    }


@pytest.mark.parametrize(
    "failure", ["missing", "duplicate", "reversal", "mismatch", "unsupported", "short_options"]
)
def test_matrix_rejects_easy_or_untraceable_false_edits(failure):
    payload = matrix_sample()
    evidence = "Organ L forms Q; organ K clears Q; carrier M moves Q; enzyme R clears Q."
    if failure == "missing":
        payload["f"] = []
    elif failure == "duplicate":
        payload["f"][1]["i"] = 1
    elif failure == "reversal":
        payload["f"][0] = {
            "i": 1,
            "t": "Carrier M increases compound Q.",
            "r": "increases",
            "v": "decreases",
        }
        payload["o"][1] = "Carrier M decreases compound Q."
    elif failure == "mismatch":
        payload["o"][1] = "Organ K forms a different compound."
    elif failure == "unsupported":
        payload["f"][0]["v"] = "Z"
        payload["o"][1] = "Organ Z forms compound Q."
    else:
        payload["o"] = []
    with pytest.raises(ValueError):
        expand(
            WireQuestion.model_validate(payload),
            QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
            {1: uuid4()},
            {1: evidence},
        )


def test_matrix_explanation_preserves_corrected_facts_without_option_positions():
    question = expand(
        WireQuestion.model_validate(matrix_sample()),
        QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
        {1: uuid4()},
        {1: "Organs L and K; carrier M and enzyme R."},
    )
    assert "Organ L forms compound Q." in question.explanation
    assert "Carrier M moves compound Q." in question.explanation


def test_unknown_sources_and_invalid_option_count_never_reach_storage():
    with pytest.raises(KeyError):
        expand(WireQuestion.model_validate(sample()), QuizConfig(course_code="TEST 401"), {})
    with pytest.raises(ValueError):
        expand(
            WireQuestion.model_validate({**sample(), "o": []}),
            QuizConfig(course_code="TEST 401"),
            {1: uuid4()},
        )


@pytest.mark.parametrize(
    "kind", ["objective", "multi_select", "statement_matrix", "true_false", "short_answer"]
)
def test_strict_provider_schemas_are_closed_and_have_format_specific_answers(kind):
    from app.engines.quiz_wire import strict_batch_schema

    schema = strict_batch_schema(kind)

    def check_closed(node):
        if isinstance(node, dict):
            if node.get("type") == "object":
                assert node["additionalProperties"] is False
                assert set(node["required"]) == set(node["properties"])
            assert "propertyNames" not in node and "$ref" not in node
            for value in node.values():
                check_closed(value)
        elif isinstance(node, list):
            for value in node:
                check_closed(value)

    check_closed(schema)
    fields = schema["properties"]["questions"]["items"]["properties"]
    assert ("f" in fields) == (kind == "statement_matrix")
    if kind == "short_answer":
        assert fields["a"]["type"] == "string"
    elif kind == "statement_matrix":
        assert "a" not in fields and "o" not in fields
        assert fields["t"]["minItems"] == fields["t"]["maxItems"] == 5
        assert fields["f"]["minItems"] == fields["f"]["maxItems"] == 2
    elif kind == "true_false":
        assert fields["a"]["items"]["type"] == "boolean"
    else:
        assert fields["a"]["items"]["enum"] == list("ABCD" if kind == "objective" else "ABCDE")


def draft_sample():
    sample = matrix_sample()
    truths = list(sample.pop("o"))
    sample.pop("a")
    for edit in sample["f"]:
        truths[edit["i"]] = edit.pop("t")
    return sample | {"t": truths}


def test_matrix_compilation_owns_false_statements_and_key():
    from app.engines.quiz_wire import MatrixDraftBatch, compile_matrix

    draft = draft_sample()
    batch = decode(json.dumps({"questions": [draft]}), MatrixDraftBatch)
    wire = compile_matrix(batch).questions[0]
    question = expand(
        wire,
        QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
        {1: uuid4()},
        {1: "L K M R"},
    )
    assert list(question.answer_key.truth_values.values()) == [True, False, True, False, True]
    assert question.options[1].text == "Organ K forms compound Q."
    assert question.options[3].text == "Carrier R moves compound Q."
    assert batch.questions[0].t[1] == "Organ L forms compound Q."
    assert "Organ L forms compound Q." in question.explanation


@pytest.mark.parametrize(
    "failure", ["duplicate", "missing", "repeated", "unsupported", "direction"]
)
def test_compiled_matrix_still_rejects_invalid_edits(failure):
    from app.engines.quiz_wire import MatrixDraftBatch, compile_matrix

    draft = draft_sample()
    if failure == "duplicate":
        draft["f"][1] = dict(draft["f"][0])
    elif failure == "missing":
        draft["f"][0]["r"] = "Absent"
    elif failure == "repeated":
        draft["t"][1] = "Organ L forms compound Q at site L."
    elif failure == "unsupported":
        draft["f"][0]["v"] = "Unsupported"
    else:
        draft["t"][1] = "Organ L increases compound Q."
        draft["f"][0].update(r="increases", v="decreases")
    wire = compile_matrix(MatrixDraftBatch.model_validate({"questions": [draft]})).questions[0]
    with pytest.raises(ValueError):
        expand(
            wire,
            QuizConfig(course_code="TEST 401", question_type="statement_matrix"),
            {1: uuid4()},
            {1: "L K M R increases decreases"},
        )


def test_draft_decoder_preserves_valid_siblings():
    from app.engines.quiz_wire import MatrixDraftBatch

    result = decode(
        json.dumps({"questions": [draft_sample() | {"t": []}, draft_sample()]}), MatrixDraftBatch
    )
    assert len(result.questions) == 1
