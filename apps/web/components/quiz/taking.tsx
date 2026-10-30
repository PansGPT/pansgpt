"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Flag, LoaderCircle } from "lucide-react";
import { DialogPrimitive as Dialog } from "@pansgpt/ui/shell";
import { Button } from "./button";
import type {
  QuizAnswer,
  QuizAttempt,
  QuizOptionId,
  QuizQuestion,
  QuizResult,
} from "@pansgpt/types";
import { hasAnswer, quizFormats, type QuizApi } from "@/lib/quiz-api";

const blank = (question_id: string): QuizAnswer => ({
  question_id,
  selected_option_ids: [],
  truth_values: {},
  text: "",
});
export function QuestionInput({
  question,
  answer,
  onChange,
  disabled,
}: {
  question: QuizQuestion;
  answer: QuizAnswer;
  onChange: (answer: QuizAnswer) => void;
  disabled: boolean;
}): React.ReactElement {
  if (question.question_type === "short_answer")
    return (
      <label className="quiz-written">
        Your answer
        <textarea
          rows={7}
          maxLength={4000}
          value={answer.text}
          onChange={(event) => onChange({ ...answer, text: event.target.value })}
          disabled={disabled}
          placeholder="Enter your answer."
        />
        <span className="quiz-muted">{answer.text.length} / 4000 characters</span>
      </label>
    );
  if (question.question_type === "statement_matrix" || question.question_type === "true_false") {
    const statements =
      question.question_type === "true_false"
        ? [{ id: "A" as const, text: "This statement is…" }]
        : question.options;
    return (
      <div className="quiz-statements">
        {statements.map((option) => (
          <fieldset key={option.id}>
            <legend>
              {question.question_type === "statement_matrix" && <b>{option.id}</b>}
              {option.text}
            </legend>
            <div>
              {([true, false] as const).map((truth) => (
                <button
                  type="button"
                  key={String(truth)}
                  aria-pressed={answer.truth_values[option.id] === truth}
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...answer,
                      truth_values: { ...answer.truth_values, [option.id]: truth },
                    })
                  }
                >
                  {truth ? "True" : "False"}
                </button>
              ))}
              <button
                type="button"
                disabled={disabled || answer.truth_values[option.id] === undefined}
                aria-label={`Clear statement ${option.id}`}
                onClick={() => {
                  const next = { ...answer.truth_values };
                  delete next[option.id];
                  onChange({ ...answer, truth_values: next });
                }}
              >
                Clear
              </button>
            </div>
          </fieldset>
        ))}
      </div>
    );
  }
  const multiple = question.question_type === "multi_select";
  function select(id: QuizOptionId): void {
    const selected = answer.selected_option_ids;
    onChange({
      ...answer,
      selected_option_ids: multiple
        ? selected.includes(id)
          ? selected.filter((value) => value !== id)
          : selected.length < 3
            ? [...selected, id]
            : selected
        : [id],
    });
  }
  return (
    <fieldset className="quiz-options">
      <legend className="quiz-muted">
        {multiple
          ? `Select up to three answers · ${answer.selected_option_ids.length} selected`
          : "Choose one answer"}
      </legend>
      {question.options.map((option) => (
        <label key={option.id} data-selected={answer.selected_option_ids.includes(option.id)}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={question.id}
            checked={answer.selected_option_ids.includes(option.id)}
            onChange={() => select(option.id)}
            disabled={
              disabled ||
              (multiple &&
                answer.selected_option_ids.length === 3 &&
                !answer.selected_option_ids.includes(option.id))
            }
          />
          <span className="quiz-option-letter">{option.id}</span>
          <span>{option.text}</span>
          <Check size={17} className="quiz-option-check" />
        </label>
      ))}
    </fieldset>
  );
}

export function QuizTaking({
  initial,
  api,
  onResult,
  onLeave,
}: {
  initial: QuizAttempt;
  api: QuizApi;
  onResult: (result: QuizResult) => void;
  onLeave: () => void;
}): React.ReactElement {
  const [answers, setAnswers] = useState<QuizAnswer[]>(initial.answers);
  const [questions, setQuestions] = useState(initial.questions);
  const [generation, setGeneration] = useState(initial.generation_status);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [flags, setFlags] = useState(initial.flagged_ids);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("All changes saved");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(() =>
    initial.deadline_at
      ? Math.max(
          0,
          Math.ceil((Date.parse(initial.deadline_at) - Date.parse(initial.server_now)) / 1000)
        )
      : null
  );
  const [status, setStatus] = useState(initial.status);
  const saved = useRef({
    revision: initial.revision,
    signature: JSON.stringify([initial.answers, initial.flagged_ids]),
  });
  const pending = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef({ answers, flags });
  useEffect(() => {
    latest.current = { answers, flags };
  }, [answers, flags]);
  const mounted = useRef(true);
  const submitting = useRef(false);
  const autoSubmitted = useRef(false);
  const clock = useRef({ server: Date.parse(initial.server_now), monotonic: 0 });
  useEffect(() => {
    mounted.current = true;
    clock.current.monotonic = performance.now();
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!initial.generation_job_id || ["completed", "failed", "cancelled"].includes(generation))
      return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async (): Promise<void> => {
      try {
        const fresh = await api.attempt(initial.id);
        if (stopped) return;
        // Keep the local answers, flags and autosave revision: this response may
        // have been read before an in-flight save finished.
        setQuestions(fresh.questions);
        setGeneration(fresh.generation_status);
        setGenerationError(null);
      } catch {
        if (!stopped) setGenerationError("Reconnecting…");
      }
      if (!stopped) timer = setTimeout(() => void refresh(), 2000);
    };
    timer = setTimeout(() => void refresh(), 500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [api, initial.id, initial.generation_job_id, generation]);
  async function retryRemaining(): Promise<void> {
    if (!initial.generation_job_id) return;
    setRetrying(true);
    try {
      const job = await api.retry(initial.generation_job_id);
      const fresh = await api.attempt(initial.id);
      if (mounted.current) {
        setQuestions(fresh.questions);
        setGeneration(fresh.generation_status ?? job.status);
        setGenerationError(null);
      }
    } catch (failure: unknown) {
      if (mounted.current)
        setGenerationError(
          failure instanceof Error ? failure.message : "Could not retry generation."
        );
    } finally {
      if (mounted.current) setRetrying(false);
    }
  }
  useEffect(() => {
    if (!initial.deadline_at) return;
    const deadline = Date.parse(initial.deadline_at);
    const tick = (): void =>
      setRemaining(
        Math.max(
          0,
          Math.ceil(
            (deadline - clock.current.server - (performance.now() - clock.current.monotonic)) / 1000
          )
        )
      );
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [initial.deadline_at]);
  const save = useCallback((): Promise<void> => {
    const snapshot = latest.current;
    const signature = JSON.stringify([snapshot.answers, snapshot.flags]);
    const next = pending.current.then(async () => {
      if (!mounted.current || signature === saved.current.signature) return;
      setSaveState("Saving your answers…");
      const result = await api.save(
        initial.id,
        saved.current.revision,
        snapshot.answers,
        snapshot.flags
      );
      saved.current = { revision: result.revision, signature };
      if (mounted.current) {
        setSaveState("All changes saved");
        setError(null);
      }
    });
    pending.current = next.catch(() => undefined);
    return next;
  }, [api, initial.id]);
  useEffect(() => {
    if (status !== "in_progress" || submitting.current || remaining === 0) return;
    const timer = setTimeout(() => {
      void save().catch((failure: unknown) => {
        if (mounted.current) {
          setSaveState("Changes not saved");
          setError(
            failure instanceof Error
              ? failure.message
              : "Saving is unavailable. Keep this tab open and retry."
          );
        }
      });
    }, 550);
    return () => clearTimeout(timer);
  }, [answers, flags, status, save, remaining]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => {
      if (
        JSON.stringify([latest.current.answers, latest.current.flags]) !==
          saved.current.signature &&
        status === "in_progress"
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);
  const submit = useCallback(
    async (expired = false): Promise<void> => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setConfirm(false);
      setError(null);
      try {
        await pending.current;
        if (!expired && status === "in_progress") await save();
        const result = await api.submit(initial.id);
        if (mounted.current) onResult(result);
      } catch (failure: unknown) {
        if (mounted.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Your answers could not be submitted. Retry here."
          );
          // Refresh authoritative state without replacing any unsaved local response.
          try {
            const current = await api.attempt(initial.id);
            setStatus(current.status);
          } catch {
            /* Preserve local answers while offline. */
          }
        }
      } finally {
        submitting.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [api, initial.id, onResult, save, status]
  );
  useEffect(() => {
    if (remaining === 0 && !autoSubmitted.current && status === "in_progress") {
      autoSubmitted.current = true;
      void submit(true);
    }
  }, [remaining, status, submit]);
  const current = questions[index];
  const answer = answers.find((item) => item.question_id === current.id) ?? blank(current.id);
  const answered = questions.filter((q) =>
    hasAnswer(answers.find((a) => a.question_id === q.id))
  ).length;
  const locked = busy || status !== "in_progress" || remaining === 0;
  const format = quizFormats.find((item) => item.id === current.question_type)!;
  async function leave(): Promise<void> {
    try {
      if (!locked) await save();
      onLeave();
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "Save your answers before leaving.");
    }
  }
  return (
    <section className="quiz-taking">
      <header className="quiz-taking-header">
        <button
          type="button"
          className="quiz-text-button"
          onClick={() => void leave()}
          disabled={busy}
        >
          <ArrowLeft size={16} /> Save & leave
        </button>
        <span>
          {initial.quiz.course_code} <span className="quiz-muted">/ Quiz</span>
        </span>
        <div className="quiz-clock" data-urgent={remaining !== null && remaining < 60}>
          <Clock3 size={17} />
          {remaining === null
            ? "Untimed"
            : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
        </div>
      </header>
      <div className="quiz-taking-layout">
        <aside className="quiz-navigator">
          <span className="quiz-overline">Your progress</span>
          <h2>
            {answered}
            <span> / {initial.quiz.count}</span>
          </h2>
          <p className="quiz-muted">questions answered</p>
          <div className="quiz-progress-track">
            <span style={{ width: `${(answered / initial.quiz.count) * 100}%` }} />
          </div>
          <nav aria-label="Question navigator">
            {questions.map((q, i) => (
              <button
                type="button"
                key={q.id}
                aria-label={`Question ${i + 1}${flags.includes(q.id) ? ", flagged" : ""}`}
                aria-current={index === i ? "step" : undefined}
                data-answered={hasAnswer(answers.find((a) => a.question_id === q.id))}
                data-flagged={flags.includes(q.id)}
                onClick={() => setIndex(i)}
              >
                {i + 1}
                {flags.includes(q.id) && <Flag size={9} />}
              </button>
            ))}
            {Array.from({ length: Math.max(0, initial.quiz.count - questions.length) }, (_, i) => (
              <button
                type="button"
                key={`pending-${i}`}
                disabled
                aria-label={`Question ${questions.length + i + 1}, preparing`}
              >
                {questions.length + i + 1}
              </button>
            ))}
          </nav>
          <div className="quiz-navigator-legend">
            <span>
              <i /> To answer
            </span>
            <span>
              <i data-answered /> Answered
            </span>
            <span>
              <Flag size={12} /> Flagged
            </span>
          </div>
          <p className="quiz-fine-print">{format.marking}</p>
        </aside>
        <div className="quiz-question-area">
          <div className="quiz-question-top">
            <span className="quiz-overline">
              Question {index + 1} of {initial.quiz.count}
            </span>
            <button
              type="button"
              className="quiz-text-button"
              aria-pressed={flags.includes(current.id)}
              disabled={locked}
              onClick={() =>
                setFlags((old) =>
                  old.includes(current.id)
                    ? old.filter((id) => id !== current.id)
                    : [...old, current.id]
                )
              }
            >
              <Flag size={15} />
              {flags.includes(current.id) ? "Flagged for review" : "Flag for review"}
            </button>
          </div>
          <span className="quiz-format-label">
            {format.title} · {current.points} {current.points === 1 ? "point" : "points"}
          </span>
          <h1 tabIndex={-1} key={current.id}>
            {current.prompt}
          </h1>
          <QuestionInput
            question={current}
            answer={answer}
            disabled={locked}
            onChange={(next) => {
              setAnswers((old) => [
                ...old.filter((item) => item.question_id !== next.question_id),
                next,
              ]);
              setSaveState("Unsaved changes");
            }}
          />
          {generation !== "completed" && (
            <div className="quiz-source-note" role="status">
              {generationError ??
                (generation === "failed"
                  ? "Could not load all questions. Your answers are saved."
                  : `${questions.length} of ${initial.quiz.count} questions ready. Remaining questions are loading.`)}
              {generation === "failed" && (
                <button
                  type="button"
                  className="quiz-text-button"
                  disabled={retrying}
                  onClick={() => void retryRemaining()}
                >
                  {retrying ? "Retrying…" : "Retry remaining questions"}
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="quiz-error" role="alert">
              <p>{error}</p>
              {status === "in_progress" && remaining !== 0 && (
                <button
                  type="button"
                  className="quiz-text-button"
                  disabled={busy}
                  onClick={() =>
                    void save().catch((failure: unknown) =>
                      setError(failure instanceof Error ? failure.message : "Could not save.")
                    )
                  }
                >
                  Retry saving
                </button>
              )}
              <button
                type="button"
                className="quiz-text-button"
                onClick={() => window.location.reload()}
              >
                Reload saved attempt
              </button>
            </div>
          )}
          {status !== "in_progress" && (
            <p role="status" className="quiz-source-note">
              Your submitted answers are saved.{" "}
              {status === "grading_failed"
                ? "Retry grading to finish your results."
                : "Your result is being prepared. Retry in a moment."}
            </p>
          )}
          <footer className="quiz-question-footer">
            <Button
              variant="secondary"
              leadingIcon={<ArrowLeft size={16} />}
              trailingIcon={null}
              disabled={index === 0 || busy}
              onClick={() => setIndex((old) => old - 1)}
            >
              Previous
            </Button>
            <span role="status" className="quiz-save-status">
              {busy ? <LoaderCircle size={14} className="quiz-spin" /> : <Check size={14} />}
              {busy ? "Preparing your results…" : saveState}
            </span>
            {index < questions.length - 1 && !locked ? (
              <Button
                trailingIcon={<ArrowRight size={16} />}
                onClick={() => setIndex((old) => old + 1)}
              >
                Next question
              </Button>
            ) : (
              <Button
                disabled={busy || generation !== "completed"}
                loading={busy}
                loadingText="Grading…"
                onClick={() =>
                  status !== "in_progress" || remaining === 0
                    ? void submit(remaining === 0)
                    : setConfirm(true)
                }
              >
                {generation !== "completed"
                  ? "Loading questions"
                  : status !== "in_progress"
                    ? "Retry grading"
                    : "Finish quiz"}
              </Button>
            )}
          </footer>
        </div>
      </div>
      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="quiz-dialog-overlay" />
          <Dialog.Content className="quiz-confirm">
            <Dialog.Title>Submit quiz?</Dialog.Title>
            <Dialog.Description>
              {answered < initial.quiz.count
                ? `${initial.quiz.count - answered} questions are unanswered. Submit anyway?`
                : "Submit your answers to see your results."}
              {flags.length > 0 ? ` ${flags.length} questions flagged.` : ""}
            </Dialog.Description>
            <div>
              <Dialog.Close asChild>
                <Button variant="secondary">Keep answering</Button>
              </Dialog.Close>
              <Button onClick={() => void submit()}>Submit answers</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
