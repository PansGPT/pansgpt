import { ArrowLeft, ArrowRight, Check, Clock3 } from "lucide-react";
import type { QuizJob } from "@pansgpt/types";
import { Button } from "./button";

const preparationCopy: Record<QuizJob["status"], { label: string; title: string; detail: string }> =
  {
    queued: {
      label: "In queue",
      title: "Preparing quiz",
      detail: "Your request is in the queue. Preparation will begin when a slot is available.",
    },
    retrieving: {
      label: "In progress",
      title: "Preparing quiz",
      detail: "Finding relevant content in your course materials.",
    },
    generating: {
      label: "In progress",
      title: "Preparing quiz",
      detail:
        "Preparing questions from your course materials. Progress updates here automatically.",
    },
    saving: {
      label: "Finishing up",
      title: "Preparing quiz",
      detail: "Saving your questions and getting the quiz ready to begin.",
    },
    completed: {
      label: "Ready",
      title: "Quiz ready",
      detail: "Your questions are ready. Begin whenever you are ready.",
    },
    failed: {
      label: "Needs attention",
      title: "Could not create quiz",
      detail:
        "Preparation stopped. You can retry this request without losing the questions already saved.",
    },
    cancelled: {
      label: "Cancelled",
      title: "Quiz cancelled",
      detail: "Preparation has stopped. Return to your quizzes to create another.",
    },
  };

export function QuizPreparation({
  job,
  busy,
  error,
  onBack,
  onStart,
  onRetry,
  onCancel,
}: {
  job: QuizJob;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onStart: () => void;
  onRetry: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const ended = job.status === "failed" || job.status === "cancelled";
  const complete = job.status === "completed" && job.generated_count === job.target_count;
  const copy = preparationCopy[job.status === "completed" && !complete ? "saving" : job.status];
  const startable = complete && job.can_start;
  const paused = job.status === "queued" && job.generated_count > 0;
  const waitingDetails: Record<string, string> = {
    "Waiting for AI service capacity":
      "The shared AI service is at its current usage limit. This is not a personal quiz allowance. Your request is saved; automatic retries are limited.",
    "Waiting for AI service recovery":
      "The AI service did not respond successfully. Your request is saved; automatic retries are limited.",
    "Waiting for quiz service connection":
      "The quiz service is having trouble connecting. Your request is saved; automatic retries are limited.",
  };
  const waitDetail = job.status === "queued" ? waitingDetails[job.current_step] : undefined;
  const capacityWait = Boolean(waitDetail);
  const percent =
    job.target_count > 0
      ? Math.min(100, Math.max(0, (job.generated_count / job.target_count) * 100))
      : 0;
  const steps = [
    {
      title: "Request received",
      detail: "Your quiz settings are saved.",
      done: true,
      current: false,
    },
    {
      title: "Prepare questions",
      detail:
        job.status === "queued"
          ? capacityWait
            ? job.current_step
            : paused
              ? "Waiting to resume"
              : "Waiting to begin"
          : ended
            ? "Preparation stopped"
            : complete
              ? "All questions prepared"
              : "Using your course materials",
      done: complete,
      current: !complete && !ended && (job.status !== "queued" || paused),
    },
    {
      title: "Ready to begin",
      detail: complete
        ? "Start whenever you are ready"
        : "Available when all questions are prepared",
      done: complete,
      current: false,
    },
  ];
  return (
    <section className="quiz-generation quiz-preparation">
      <button type="button" className="quiz-text-button" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Quizzes
      </button>
      <div className="quiz-preparation-panel" data-status={job.status}>
        <header className="quiz-preparation-heading">
          <span className="quiz-preparation-status">
            <span aria-hidden="true" />
            {capacityWait ? "Waiting for AI service" : paused ? "Preparation paused" : copy.label}
          </span>
          <h1>{copy.title}</h1>
          <p role="status">
            {capacityWait
              ? waitDetail
              : paused
                ? "Your progress is saved. The remaining questions are waiting to be prepared."
                : copy.detail}
          </p>
        </header>
        <div className="quiz-preparation-progress">
          <div className="quiz-preparation-count">
            <strong>
              {job.generated_count}
              <span> / {job.target_count}</span>
            </strong>
            <span>questions prepared</span>
          </div>
          <div
            className="quiz-progress-track"
            role="progressbar"
            aria-label="Questions prepared"
            aria-valuenow={job.generated_count}
            aria-valuemin={0}
            aria-valuemax={job.target_count}
            aria-valuetext={`${job.generated_count} of ${job.target_count} questions prepared`}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="quiz-preparation-progress-note">
            {complete
              ? "All questions are ready."
              : ended
                ? `${job.generated_count} questions prepared before stopping.`
                : job.status === "queued"
                  ? job.generated_count === 0
                    ? "No questions prepared yet. Your request is saved."
                    : "Saved questions are kept while this request waits to resume."
                  : `Your full quiz will be available when all ${job.target_count} questions are prepared.`}
          </p>
        </div>
        <ol className="quiz-preparation-steps" aria-label="Quiz preparation stages">
          {steps.map((step, index) => (
            <li
              key={step.title}
              data-done={step.done}
              aria-current={step.current ? "step" : undefined}
            >
              <span className="quiz-preparation-step-number" aria-hidden="true">
                {step.done ? <Check size={14} /> : index + 1}
              </span>
              <div>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
        {job.error_message && (
          <p className="quiz-preparation-error" role="alert">
            {job.error_message}
          </p>
        )}
        {error && (
          <p className="quiz-error" role="alert">
            {error}
          </p>
        )}
        <footer className="quiz-preparation-footer">
          {!ended && (
            <div className="quiz-preparation-reassurance">
              <Clock3 size={16} aria-hidden="true" />
              <p>
                {complete ? (
                  "Your timer starts only when you begin."
                ) : (
                  <>
                    No need to stay on this page.
                    <span>
                      Find this quiz under <strong>In progress</strong> when you return.
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
          <div className="quiz-preparation-actions">
            {startable ? (
              <>
                <Button
                  disabled={busy}
                  loading={busy}
                  loadingText="Starting quiz..."
                  onClick={onStart}
                >
                  Start quiz
                </Button>
                <button type="button" className="quiz-text-button" disabled={busy} onClick={onBack}>
                  Back to quizzes
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </>
            ) : job.status === "failed" ? (
              <>
                <Button disabled={busy} loading={busy} loadingText="Retrying..." onClick={onRetry}>
                  Retry this quiz
                </Button>
                <button type="button" className="quiz-text-button" disabled={busy} onClick={onBack}>
                  Back to quizzes
                </button>
              </>
            ) : job.status === "cancelled" ? (
              <Button onClick={onBack}>Back to quizzes</Button>
            ) : (
              <>
                <Button onClick={onBack}>Back to quizzes</Button>
                <button
                  type="button"
                  className="quiz-text-button quiz-preparation-cancel"
                  disabled={busy}
                  onClick={onCancel}
                >
                  {busy ? "Cancelling..." : "Cancel generation"}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}
