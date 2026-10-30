"""Pure deterministic grading. Written responses require validated semantic grades."""

from app.models.quiz import Answer, AnswerKey, Feedback, OptionGrade, Question, Source, WrittenGrade


def validate_answer(question: Question, answer: Answer) -> None:
    ids = {option.id for option in question.options}
    if answer.question_id != question.id:
        raise ValueError("Answer belongs to another question")
    kind = question.question_type
    if kind in ("objective", "multi_select"):
        if answer.truth_values or answer.text or not set(answer.selected_option_ids) <= ids:
            raise ValueError("Use the available option identifiers")
        if kind == "objective" and len(answer.selected_option_ids) > 1:
            raise ValueError("Choose one answer")
    elif kind in ("statement_matrix", "true_false"):
        allowed = ids if kind == "statement_matrix" else {"A"}
        if answer.text or answer.selected_option_ids or not set(answer.truth_values) <= allowed:
            raise ValueError("Use true, false or unanswered for each statement")
    elif answer.selected_option_ids or answer.truth_values:
        raise ValueError("Use a written response")


def grade_question(
    question: Question,
    key: AnswerKey,
    answer: Answer,
    explanation: str,
    sources: list[Source],
    written: WrittenGrade | None = None,
) -> Feedback:
    validate_answer(question, answer)
    answered = bool(answer.selected_option_ids or answer.truth_values or answer.text)
    earned = 0.0
    details: list[OptionGrade] = []
    if question.question_type in ("objective", "multi_select"):
        earned = float(len(set(answer.selected_option_ids) & set(key.choice_ids)))
        details = [
            OptionGrade(
                id=option.id,
                earned=float(
                    option.id in answer.selected_option_ids and option.id in key.choice_ids
                ),
                correct=option.id in key.choice_ids,
            )
            for option in question.options
        ]
    elif question.question_type in ("statement_matrix", "true_false"):
        for option_id, expected in key.truth_values.items():
            value = answer.truth_values.get(option_id)
            correct = None if value is None else value == expected
            points = (
                0
                if correct is None
                else 1
                if correct
                else -1
                if question.question_type == "statement_matrix"
                else 0
            )
            earned += points
            details.append(OptionGrade(id=option_id, earned=points, correct=correct))
    elif answered:
        if written is None or written.question_id != question.id:
            raise ValueError("Written grading is unavailable; keep the submitted answer for retry")
        earned = written.score * question.points
        explanation = written.feedback + "\n\n" + explanation
    outcome = (
        "unanswered"
        if not answered
        else "correct"
        if earned == question.points
        else "partial"
        if earned > 0
        else "incorrect"
    )
    return Feedback(
        question=question,
        answer=answer,
        answer_key=key,
        earned=earned,
        explanation=explanation,
        sources=sources,
        option_grades=details,
        outcome=outcome,
    )


def percentage(score: float, maximum: float) -> float:
    return round(max(0.0, min(100.0, score / maximum * 100)), 2) if maximum else 0.0
