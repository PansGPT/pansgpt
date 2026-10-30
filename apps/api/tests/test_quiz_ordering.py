"""Every statement permutation must retain truth and exact matrix scoring."""

from collections import Counter
from itertools import permutations
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.engines import quiz_ordering as ordering
from app.engines.quiz_grading import grade_question
from app.models.quiz import Answer, GeneratedQuestion, Question


def matrix():
    return GeneratedQuestion(
        question_type="statement_matrix",
        prompt="Assess these synthetic source claims.",
        options=[
            {"id": letter, "text": f"Distinct synthetic claim {index}"}
            for index, letter in enumerate("ABCDE")
        ],
        answer_key={
            "truth_values": dict(zip("ABCDE", [True, False, True, False, True], strict=True))
        },
        explanation="The claims about the route and target differ from the source facts.",
        concept="Synthetic concept",
        source_ids=[uuid4()],
    )


def test_all_statement_permutations_preserve_truth_scoring_and_input(monkeypatch):
    original = matrix()
    before = original.model_dump()
    facts = {
        option.text: original.answer_key.truth_values[option.id] for option in original.options
    }
    patterns = Counter()
    for permutation in permutations(range(5)):

        def reorder(values):
            initial = list(values)
            values[:] = [initial[index] for index in permutation]

        monkeypatch.setattr(ordering.rng, "shuffle", reorder)
        shuffled = ordering.shuffle_matrix(original)
        assert original.model_dump() == before
        assert [option.id for option in shuffled.options] == list("ABCDE")
        assert {
            option.text: shuffled.answer_key.truth_values[option.id] for option in shuffled.options
        } == facts
        patterns[tuple(shuffled.answer_key.truth_values[letter] for letter in "ABCDE")] += 1
        taking = Question(
            id=uuid4(),
            position=1,
            question_type="statement_matrix",
            prompt=shuffled.prompt,
            options=shuffled.options,
            points=5,
            concept=shuffled.concept,
        )
        response = Answer(
            question_id=taking.id,
            truth_values={option.id: facts[option.text] for option in shuffled.options},
        )
        assert (
            grade_question(taking, shuffled.answer_key, response, shuffled.explanation, []).earned
            == 5
        )
        response.truth_values["A"] = not response.truth_values["A"]
        assert (
            grade_question(taking, shuffled.answer_key, response, shuffled.explanation, []).earned
            == 3
        )
    assert len(patterns) == 10 and set(patterns.values()) == {12}


@pytest.mark.parametrize("true_count", [0, 1, 2, 4, 5])
def test_generation_rejects_matrix_without_three_true_two_false(true_count):
    values = matrix().model_dump()
    values["answer_key"]["truth_values"] = {
        letter: index < true_count for index, letter in enumerate("ABCDE")
    }
    with pytest.raises(ValidationError, match="three true and two false"):
        GeneratedQuestion.model_validate(values)
