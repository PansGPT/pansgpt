"""Persist an unpredictable statement order without changing statement truth."""

from random import SystemRandom

from app.models.quiz import AnswerKey, GeneratedQuestion, Option

rng = SystemRandom()


def shuffle_matrix(question: GeneratedQuestion) -> GeneratedQuestion:
    if question.question_type != "statement_matrix":
        return question
    statements = [
        (option.text, question.answer_key.truth_values[option.id]) for option in question.options
    ]
    rng.shuffle(statements)
    options = [
        Option(id=letter, text=text) for letter, (text, _) in zip("ABCDE", statements, strict=True)
    ]
    key = AnswerKey(
        truth_values={letter: truth for letter, (_, truth) in zip("ABCDE", statements, strict=True)}
    )
    return question.model_copy(update={"options": options, "answer_key": key})
