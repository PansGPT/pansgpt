"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Copy, RefreshCw, Share2, Target } from "lucide-react";
import { Button } from "./button";
import { downloadScoreCard } from "./score-card";
import type { QuizConfig, QuizFeedback, QuizResult } from "@pansgpt/types";
import type { QuizApi } from "@/lib/quiz-api";

function responseText(item: QuizFeedback, key = false): string {
  const source = key ? item.answer_key : item.answer;
  const ids = "choice_ids" in source ? source.choice_ids : source.selected_option_ids;
  if (ids.length)
    return ids
      .map((id) => `${id}. ${item.question.options.find((option) => option.id === id)?.text ?? id}`)
      .join(" · ");
  const values = Object.entries(source.truth_values);
  if (values.length)
    return values
      .map(
        ([id, value]) =>
          `${item.question.question_type === "true_false" ? "" : `${id}: `}${value ? "True" : "False"}`
      )
      .join(" · ");
  return source.text || "No answer submitted";
}

export function QuizResults({
  result,
  api,
  onBack,
  onRevise,
  onRetake,
}: {
  result: QuizResult;
  api: QuizApi;
  onBack: () => void;
  onRevise: (config: Partial<QuizConfig>) => void;
  onRetake: (quizId: string) => void;
}): React.ReactElement {
  const [filter, setFilter] = useState("all");
  const [share, setShare] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const missed = result.feedback.filter((item) => item.outcome !== "correct");
  const concepts = [...new Set(missed.map((item) => item.question.concept))];
  const correct = result.feedback.filter((item) => item.outcome === "correct").length;
  const partial = result.feedback.filter((item) => item.outcome === "partial").length;
  const rows = filter === "all" ? result.feedback : missed;
  async function createShare(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api.share(result.id);
      setShare(`${window.location.origin}/quiz/share#${data.token}`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Sharing is unavailable. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function revokeShare(): Promise<void> {
    setBusy(true);
    try {
      await api.revoke(result.id);
      setShare(null);
      setMessage("All share links for this result have been revoked.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not revoke the link.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="quiz-results">
      <button type="button" className="quiz-text-button" onClick={onBack}>
        <ArrowLeft size={16} /> Quizzes
      </button>
      <div className="quiz-result-hero">
        <div>
          <h1>Quiz results</h1>
          <p>
            {result.quiz.title} <span>· {result.quiz.course_code}</span>
          </p>
          <div className="quiz-result-pills">
            <span>{correct} correct</span>
            <span>{partial} partial</span>
            <span>{missed.length - partial} incorrect or unanswered</span>
            <span>
              {Math.floor(result.time_taken_sec / 60)}m {result.time_taken_sec % 60}s
            </span>
          </div>
        </div>
        <div
          className="quiz-score-ring"
          role="img"
          style={{ "--quiz-score": `${result.percentage}%` } as React.CSSProperties}
          aria-label={`Score: ${Math.round(result.percentage)} percent, ${result.score} of ${result.max_score} points`}
        >
          <div>
            <strong>
              {Math.round(result.percentage)}
              <small>%</small>
            </strong>
            <span>
              {result.score} / {result.max_score} points
            </span>
          </div>
        </div>
      </div>
      <div className="quiz-result-actions">
        <Button
          leadingIcon={<Target size={16} />}
          trailingIcon={null}
          onClick={() =>
            onRevise({
              course_code: result.quiz.course_code,
              topic: result.quiz.topic,
              question_type: result.quiz.question_type,
              revision_result_id: missed.length ? result.id : null,
            })
          }
        >
          {missed.length ? "Practice missed topics" : "New quiz"}
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<RefreshCw size={16} />}
          trailingIcon={null}
          onClick={() => onRetake(result.quiz.id)}
        >
          Retake quiz
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<Share2 size={16} />}
          trailingIcon={null}
          disabled={busy}
          onClick={() => void createShare()}
        >
          Share result
        </Button>
        <button
          type="button"
          className="quiz-text-button"
          onClick={() => void downloadScoreCard(result)}
        >
          Download score card <ArrowUpRight size={15} />
        </button>
      </div>
      {share && (
        <div className="quiz-share-panel">
          <strong>Share link</strong>
          <p>
            This link shows your course and score. Your name, answers and questions stay private.
          </p>
          <div>
            <input aria-label="Share link" readOnly value={share} />
            <Button
              variant="secondary"
              leadingIcon={<Copy size={15} />}
              trailingIcon={null}
              onClick={() =>
                void navigator.clipboard
                  .writeText(share)
                  .then(() => setMessage("Link copied."))
                  .catch(() => setMessage("Copy the link from the field above."))
              }
            >
              Copy link
            </Button>
            <button
              type="button"
              className="quiz-text-button"
              disabled={busy}
              onClick={() => void revokeShare()}
            >
              Revoke links
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="quiz-source-note">
          {message}
        </p>
      )}
      {concepts.length > 0 && (
        <div className="quiz-revision-note">
          <BookOpen size={22} />
          <div>
            <strong>Topics to review</strong>
            <p>
              {concepts.slice(0, 4).join(", ")}
              {concepts.length > 4 ? ` and ${concepts.length - 4} more` : ""}.
            </p>
          </div>
        </div>
      )}
      <header className="quiz-review-heading">
        <div>
          <h2>Answers</h2>
        </div>
        <div className="quiz-segments">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All questions
          </button>
          <button
            type="button"
            aria-pressed={filter === "missed"}
            onClick={() => setFilter("missed")}
          >
            Missed ({missed.length})
          </button>
        </div>
      </header>
      {rows.length === 0 && <p className="quiz-source-note">No missed questions.</p>}
      <div className="quiz-review-list">
        {rows.map((item) => (
          <article className="quiz-review-card" key={item.question.id} data-outcome={item.outcome}>
            <div className="quiz-review-card-top">
              <span className="quiz-overline">
                Question {item.question.position} · {item.question.concept}
              </span>
              <span className="quiz-outcome">
                {item.outcome} · {item.earned}/{item.question.points}
              </span>
            </div>
            <h3>{item.question.prompt}</h3>
            <div className="quiz-review-answers">
              <div>
                <span>Your answer</span>
                <p>{responseText(item)}</p>
              </div>
              <div>
                <span>
                  {item.question.question_type === "short_answer"
                    ? "Reference answer"
                    : "Expected answer"}
                </span>
                <p>{responseText(item, true)}</p>
              </div>
            </div>
            {item.question.question_type === "statement_matrix" && (
              <div className="quiz-option-grades">
                {item.option_grades.map((grade) => (
                  <span key={grade.id}>
                    {grade.id}: {grade.earned > 0 ? "+" : ""}
                    {grade.earned}
                  </span>
                ))}
              </div>
            )}
            <details open={item.outcome !== "correct"}>
              <summary>Explanation and sources</summary>
              <p className="quiz-explanation">{item.explanation}</p>
              {item.sources.map((source) => (
                <blockquote key={source.chunk_id}>
                  <p>{source.excerpt}</p>
                  <cite>
                    <BookOpen size={13} /> {source.title}
                    {source.page ? ` · page ${source.page}` : ""}
                  </cite>
                </blockquote>
              ))}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
