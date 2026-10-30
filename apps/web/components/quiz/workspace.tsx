"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LoaderCircle, Plus } from "lucide-react";
import { Button } from "./button";
import type {
  QuizAttempt,
  QuizConfig,
  QuizCourse,
  QuizHistory,
  QuizJob,
  QuizResult,
} from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { quizApi, quizFormats } from "@/lib/quiz-api";
import { QuizBuilder } from "./builder";
import { QuizPreparation } from "./preparation";
import { QuizTaking } from "./taking";
import { QuizResults } from "./results";
import "./quiz.css";

const quizTypeLabels: Record<QuizConfig["question_type"], string> = {
  objective: "MCQ",
  multi_select: "Select 3",
  statement_matrix: "T/F matrix",
  true_false: "T/F",
  short_answer: "Written",
};

export function QuizWorkspace(): React.ReactElement {
  const { session, profile } = useAuth();
  const params = useSearchParams();
  return (
    <QuizWorkspaceContent
      key={`${profile?.id}:${profile?.university_id}:${params.get("attempt") ?? ""}:${params.get("job") ?? ""}:${params.get("result") ?? ""}`}
      token={session?.access_token}
    />
  );
}
function QuizWorkspaceContent({ token }: { token: string | undefined }): React.ReactElement {
  const api = useMemo(() => quizApi(token), [token]);
  const router = useRouter();
  const params = useSearchParams();
  const attemptId = params.get("attempt"),
    resultId = params.get("result"),
    jobId = params.get("job");
  const [history, setHistory] = useState<QuizHistory | null>(null);
  const [courses, setCourses] = useState<QuizCourse[]>([]);
  const [job, setJob] = useState<QuizJob | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [builder, setBuilder] = useState(false);
  const [builderKey, setBuilderKey] = useState(0);
  const [initial, setInitial] = useState<Partial<QuizConfig>>({});
  const [busy, setBusy] = useState(false);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [course, setCourse] = useState("");
  const [offset, setOffset] = useState(0);
  const requestKey = useRef<string | null>(null);
  const requestSignature = useRef<string | null>(null);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const go = useCallback(
    (kind?: "job" | "attempt" | "result", id?: string): void => {
      router.push(kind && id ? `/app/quiz?${kind}=${encodeURIComponent(id)}` : "/app/quiz");
    },
    [router]
  );
  const showResult = useCallback(
    (value: QuizResult): void => {
      setResult(value);
      go("result", value.id);
    },
    [go]
  );
  useEffect(() => {
    const controller = new AbortController();
    async function load(): Promise<void> {
      if (attemptId) {
        const saved = await api.attempt(attemptId!, controller.signal);
        if (controller.signal.aborted) return;
        if (saved.result_id) {
          go("result", saved.result_id);
          return;
        }
        setAttempt(saved);
      } else if (resultId) {
        const saved = await api.result(resultId!, controller.signal);
        if (!controller.signal.aborted) setResult(saved);
      } else if (jobId) {
        const saved = await api.job(jobId!, controller.signal);
        if (!controller.signal.aborted) setJob(saved);
      } else {
        const [saved, available] = await Promise.all([
          api.history(offset, course, controller.signal),
          api.courses(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setHistory(saved);
          setCourses(available);
        }
      }
    }
    void load().catch((failure: unknown) => {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : "Quizzes could not be loaded.");
    });
    return () => controller.abort();
  }, [api, attemptId, resultId, jobId, refresh, offset, course, go]);
  useEffect(() => {
    if (!jobId || !job || ["completed", "cancelled", "failed"].includes(job.status)) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void api
          .job(jobId, controller.signal)
          .then((saved) => {
            if (!controller.signal.aborted) {
              setJob(saved);
              setError(null);
            }
          })
          .catch((failure: unknown) => {
            if (!controller.signal.aborted) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Progress is unavailable. Retry to reconnect."
              );
            }
          });
      },
      error ? 8000 : 3000
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, job, jobId, error]);
  function openBuilder(config: Partial<QuizConfig> = {}): void {
    setInitial(config);
    setBuilderKey((old) => old + 1);
    setBuilder(true);
    setBuilderError(null);
    requestKey.current = crypto.randomUUID();
    requestSignature.current = null;
  }
  async function create(config: QuizConfig): Promise<void> {
    if (busy) return;
    setBusy(true);
    setBuilderError(null);
    const signature = JSON.stringify(config);
    if (requestSignature.current && requestSignature.current !== signature)
      requestKey.current = crypto.randomUUID();
    requestSignature.current = signature;
    try {
      const created = await api.create(config, requestKey.current ?? crypto.randomUUID());
      if (live.current) {
        setBuilder(false);
        setJob(created);
        go("job", created.id);
      }
    } catch (failure: unknown) {
      if (live.current)
        setBuilderError(failure instanceof Error ? failure.message : "Could not start this quiz.");
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function start(quizId: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.start(quizId);
      if (live.current) {
        setAttempt(saved);
        go("attempt", saved.id);
      }
    } catch (failure: unknown) {
      if (live.current)
        setError(failure instanceof Error ? failure.message : "Could not start this attempt.");
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function revise(config: Partial<QuizConfig>): Promise<void> {
    try {
      const available = await api.courses();
      if (live.current) {
        setCourses(available);
        openBuilder(config);
      }
    } catch (failure: unknown) {
      if (live.current)
        setError(failure instanceof Error ? failure.message : "Could not load course materials.");
    }
  }
  const builderView = builder && (
    <QuizBuilder
      key={builderKey}
      open={builder}
      onOpenChange={setBuilder}
      courses={courses}
      initial={initial}
      busy={busy}
      error={builderError}
      onCreate={(config) => void create(config)}
    />
  );
  if (attemptId && attempt)
    return (
      <QuizTaking
        key={attempt.id}
        initial={attempt}
        api={api}
        onResult={showResult}
        onLeave={() => {
          setRefresh((old) => old + 1);
          go();
        }}
      />
    );
  if (resultId && result)
    return (
      <>
        <QuizResults
          result={result}
          api={api}
          onBack={() => {
            setRefresh((old) => old + 1);
            go();
          }}
          onRevise={(config) => void revise(config)}
          onRetake={(id) => void start(id)}
        />
        {error && (
          <p className="quiz-error" role="alert">
            {error}
          </p>
        )}
        {builderView}
      </>
    );
  if (jobId && job)
    return (
      <QuizPreparation
        job={job}
        busy={busy}
        error={error}
        onBack={() => go()}
        onStart={() => void start(job.quiz_id)}
        onRetry={() => {
          setBusy(true);
          setError(null);
          void api
            .retry(job.id)
            .then((saved) => {
              if (live.current) setJob(saved);
            })
            .catch((failure: unknown) => {
              if (live.current)
                setError(
                  failure instanceof Error ? failure.message : "This request could not be retried."
                );
            })
            .finally(() => {
              if (live.current) setBusy(false);
            });
        }}
        onCancel={() => {
          setBusy(true);
          setError(null);
          void api
            .cancel(job.id)
            .then((saved) => {
              if (live.current) setJob(saved);
            })
            .catch((failure: unknown) => {
              if (live.current)
                setError(failure instanceof Error ? failure.message : "Could not cancel.");
            })
            .finally(() => {
              if (live.current) setBusy(false);
            });
        }}
      />
    );
  if ((attemptId || resultId || jobId) && !error)
    return (
      <div className="quiz-loading" role="status">
        <LoaderCircle className="quiz-spin" /> Loading quiz…
      </div>
    );
  return (
    <section className="quiz-workspace">
      <header className="quiz-page-heading">
        <div>
          <h1>Quizzes</h1>
          <p>Practice with questions from your course materials.</p>
        </div>
        <Button
          leadingIcon={<Plus size={17} />}
          trailingIcon={null}
          disabled={!courses.length}
          onClick={() => openBuilder()}
        >
          New quiz
        </Button>
      </header>
      {error && (
        <div className="quiz-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="quiz-text-button"
            onClick={() => {
              setRefresh((old) => old + 1);
              if (attemptId || jobId || resultId) go();
            }}
          >
            Try again
          </button>
        </div>
      )}
      {!history && !error && (
        <p className="quiz-loading" role="status">
          <LoaderCircle className="quiz-spin" size={18} /> Loading history…
        </p>
      )}
      {history && (
        <>
          <div className="quiz-metrics">
            {[
              { label: "Quizzes completed", value: history.stats.completed },
              {
                label: "Average score",
                value: history.stats.completed ? `${Math.round(history.stats.average)}%` : "—",
              },
              {
                label: "Best score",
                value: history.stats.completed ? `${Math.round(history.stats.best)}%` : "—",
              },
              {
                label: "Time spent",
                value: `${Math.round(history.stats.study_seconds / 60)} min`,
              },
            ].map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {(history.active_attempts.length > 0 || history.jobs.length > 0) && (
            <div className="quiz-active">
              <h2>In progress</h2>
              {history.active_attempts.map((item) => (
                <button
                  type="button"
                  className="quiz-active-row"
                  key={item.id}
                  onClick={() => go("attempt", item.id)}
                >
                  <span>
                    <strong>{item.quiz.title}</strong>
                    <small>
                      {item.quiz.course_code} ·{" "}
                      {item.status === "in_progress"
                        ? "Answers saved"
                        : "Submitted · finish grading"}
                    </small>
                  </span>
                  <span>
                    Resume <ArrowRight size={15} />
                  </span>
                </button>
              ))}
              {history.jobs.map((item) => (
                <button
                  type="button"
                  className="quiz-active-row"
                  key={item.id}
                  onClick={() => go("job", item.id)}
                >
                  <span>
                    <strong>
                      {item.status === "completed" ? "Quiz ready" : item.current_step}
                    </strong>
                    <small>
                      {item.generated_count}/{item.target_count} questions · {item.status}
                    </small>
                  </span>
                  <span>
                    {item.status === "completed" ? "Begin" : "View"} <ArrowRight size={15} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <header className="quiz-history-heading">
            <div>
              <h2>History</h2>
            </div>
            <label className="quiz-course-filter">
              <span className="quiz-visually-hidden">Filter history by course</span>
              <select
                value={course}
                onChange={(event) => {
                  setCourse(event.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All courses</option>
                {courses.map((item) => (
                  <option key={item.code}>{item.code}</option>
                ))}
              </select>
            </label>
          </header>
          {history.items.length === 0 ? (
            <div className="quiz-empty">
              <h3>{course ? "No completed quizzes for this course" : "No completed quizzes"}</h3>
              <p>
                {courses.length
                  ? "Completed quizzes and scores will appear here."
                  : "No course materials are available for your university and level."}
              </p>
              {!courses.length && (
                <Link href="/app/library" className="quiz-text-button">
                  Open library <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : (
            <div className="quiz-history-table">
              <div className="quiz-history-labels">
                <span>Quiz</span>
                <span>Type</span>
                <span>Completed</span>
                <span>Score</span>
                <span />
              </div>
              {history.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="quiz-history-row"
                  onClick={() => go("result", item.id)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.course_code}
                      <span className="quiz-history-type-mobile">
                        {" "}
                        · {quizTypeLabels[item.question_type]}
                      </span>
                    </small>
                  </span>
                  <span
                    className="quiz-history-type"
                    title={quizFormats.find((format) => format.id === item.question_type)?.title}
                  >
                    {quizTypeLabels[item.question_type]}
                  </span>
                  <time dateTime={item.completed_at}>
                    {new Date(item.completed_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <span className="quiz-score-badge" data-strong={item.percentage >= 70}>
                    {Math.round(item.percentage)}%
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          )}
          {(offset > 0 || history.next_offset !== null) && (
            <div className="quiz-pagination">
              <Button
                variant="secondary"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Previous
              </Button>
              <span className="quiz-muted">Page {offset / 20 + 1}</span>
              <Button
                variant="secondary"
                disabled={history.next_offset === null}
                onClick={() => setOffset(history.next_offset ?? 0)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      {builderView}
    </section>
  );
}
