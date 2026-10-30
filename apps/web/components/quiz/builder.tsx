"use client";

import { useState } from "react";
import {
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  ListChecks,
  ListFilter,
  PenLine,
  Rows3,
  Sparkles,
  ToggleLeft,
  X,
} from "lucide-react";
import { DialogPrimitive as Dialog } from "@pansgpt/ui/shell";
import { Button } from "./button";
import type { QuizConfig, QuizCourse } from "@pansgpt/types";
import { quizFormats } from "@/lib/quiz-api";

const formatIcons = {
  objective: ListChecks,
  multi_select: ListFilter,
  statement_matrix: Rows3,
  true_false: ToggleLeft,
  short_answer: PenLine,
};

export function QuizBuilder({
  courses,
  open,
  onOpenChange,
  onCreate,
  initial,
  busy,
  error,
}: {
  courses: QuizCourse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (config: QuizConfig) => void;
  initial?: Partial<QuizConfig>;
  busy: boolean;
  error: string | null;
}): React.ReactElement {
  const [config, setConfig] = useState<QuizConfig>({
    course_code: courses[0]?.code ?? "",
    topic: "",
    question_type: "objective",
    count: 10,
    difficulty: "medium",
    time_limit_sec: null,
    revision_result_id: null,
    ...initial,
  });
  const course = courses.find((item) => item.code === config.course_code);
  const format = quizFormats.find((item) => item.id === config.question_type)!;
  const update = <K extends keyof QuizConfig>(key: K, value: QuizConfig[K]): void =>
    setConfig((old) => ({ ...old, [key]: value }));
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="quiz-dialog-overlay" />
        <Dialog.Content className="quiz-builder quiz-builder-redesign">
          <header className="quiz-builder-heading">
            <div>
              <span className="quiz-builder-eyebrow">COURSE PRACTICE</span>
              <Dialog.Title>Build your quiz</Dialog.Title>
            </div>
            <Dialog.Close
              className="quiz-icon-button"
              aria-label="Close quiz builder"
              disabled={busy}
            >
              <X size={20} />
            </Dialog.Close>
          </header>
          <Dialog.Description>
            Choose what to practise and how you want to be challenged.
          </Dialog.Description>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (course && !busy) onCreate(config);
            }}
          >
            <div className="quiz-builder-body">
              <div className="quiz-builder-controls">
                <fieldset className="quiz-settings-grid" disabled={busy}>
                  <legend className="quiz-visually-hidden">Quiz settings</legend>
                  <div className="quiz-section-heading quiz-field-wide">
                    <span>01</span>
                    <h3>Choose your focus</h3>
                  </div>
                  <label className="quiz-field-wide">
                    Course
                    <select
                      required
                      value={config.course_code}
                      onChange={(event) =>
                        setConfig((old) => ({
                          ...old,
                          course_code: event.target.value,
                          topic: "",
                          revision_result_id: null,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Select a course
                      </option>
                      {courses.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} - {item.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {course && (
                    <div className="quiz-material-count quiz-field-wide">
                      <BookOpen size={15} aria-hidden="true" />
                      <span>
                        {course.document_count} course material
                        {course.document_count === 1 ? "" : "s"} available
                      </span>
                    </div>
                  )}
                  <label className="quiz-field-wide">
                    Topic <span className="quiz-muted">(optional)</span>
                    <input
                      value={config.topic}
                      maxLength={300}
                      list="quiz-topic-options"
                      placeholder="All course topics"
                      onChange={(event) => update("topic", event.target.value)}
                    />
                    <datalist id="quiz-topic-options">
                      {course?.topics.map((topic) => (
                        <option value={topic} key={topic} />
                      ))}
                    </datalist>
                  </label>
                  <div className="quiz-section-heading quiz-field-wide">
                    <span>02</span>
                    <h3>Make it your own</h3>
                  </div>
                  <fieldset className="quiz-format-field quiz-field-wide">
                    <legend>Question type</legend>
                    <div className="quiz-format-options">
                      {quizFormats.map((item) => {
                        const Icon = formatIcons[item.id];
                        return (
                          <label
                            className="quiz-format-choice"
                            key={item.id}
                            data-selected={config.question_type === item.id}
                          >
                            <input
                              type="radio"
                              name="quiz-format"
                              value={item.id}
                              checked={config.question_type === item.id}
                              onChange={() => update("question_type", item.id)}
                            />
                            <Icon size={19} aria-hidden="true" />
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.detail}</small>
                            </span>
                            <Check className="quiz-format-check" size={15} aria-hidden="true" />
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="quiz-choice-field quiz-field-wide">
                    <legend>Questions</legend>
                    <div className="quiz-setting-options">
                      {([5, 10, 15, 20, 25] as const).map((count) => (
                        <label key={count} data-selected={config.count === count}>
                          <input
                            type="radio"
                            name="quiz-count"
                            aria-label={`${count} questions`}
                            checked={config.count === count}
                            onChange={() => update("count", count)}
                          />
                          {count}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="quiz-choice-field quiz-field-wide">
                    <legend>Difficulty</legend>
                    <div className="quiz-setting-options quiz-difficulty-options">
                      {(["easy", "medium", "hard"] as const).map((difficulty, index) => (
                        <label key={difficulty} data-selected={config.difficulty === difficulty}>
                          <input
                            type="radio"
                            name="quiz-difficulty"
                            aria-label={difficulty}
                            checked={config.difficulty === difficulty}
                            onChange={() => update("difficulty", difficulty)}
                          />
                          <span className="quiz-difficulty-bars" aria-hidden="true">
                            {[0, 1, 2].map((bar) => (
                              <i key={bar} data-filled={bar <= index} />
                            ))}
                          </span>
                          {difficulty}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="quiz-field-wide">
                    Time limit
                    <select
                      value={config.time_limit_sec ?? ""}
                      onChange={(event) => {
                        const selected = ([300, 600, 900, 1200, 1800, 2700, 3600] as const).find(
                          (seconds) => seconds === Number(event.target.value)
                        );
                        update("time_limit_sec", selected ?? null);
                      }}
                    >
                      <option value="">Untimed</option>
                      {[300, 600, 900, 1200, 1800, 2700, 3600].map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds / 60} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              </div>
              <section
                className="quiz-setup-guide"
                aria-label="Scoring and quiz information"
                aria-live="polite"
              >
                <div className="quiz-preview-heading">
                  <span className="quiz-builder-eyebrow">YOUR QUIZ</span>
                  <h3>{course?.code || "Select a course"}</h3>
                  <p>
                    {config.topic.trim() || course?.title || "Choose your course to get started"}
                  </p>
                </div>
                <dl className="quiz-preview-stats">
                  <div>
                    <dt>Questions</dt>
                    <dd>{config.count}</dd>
                  </div>
                  <div>
                    <dt>Difficulty</dt>
                    <dd>{config.difficulty}</dd>
                  </div>
                  <div>
                    <dt>Time limit</dt>
                    <dd>
                      {config.time_limit_sec === null
                        ? "Untimed"
                        : `${config.time_limit_sec / 60} min`}
                    </dd>
                  </div>
                </dl>
                <div className="quiz-marking">
                  <div className="quiz-guide-heading">
                    <CheckCheck size={17} aria-hidden="true" />
                    <h3>How scoring works</h3>
                    <span>
                      {config.question_type === "short_answer" ? "AI assessed" : "Auto-marked"}
                    </span>
                  </div>
                  {config.question_type === "short_answer" ? (
                    <>
                      <div className="quiz-credit-scale" aria-label="Points per answer">
                        <div>
                          <strong>
                            0<span> pts</span>
                          </strong>
                          <span>No credit</span>
                        </div>
                        <div>
                          <strong>
                            0.5<span> pts</span>
                          </strong>
                          <span>Partial credit</span>
                        </div>
                        <div>
                          <strong>
                            1<span> pt</span>
                          </strong>
                          <span>Full credit</span>
                        </div>
                      </div>
                      <p>
                        AI grades against a rubric drawn from your course materials. Accurate
                        answers in your own words earn credit.
                      </p>
                    </>
                  ) : (
                    <p>{format.marking}</p>
                  )}
                </div>
                <div className="quiz-timing-note">
                  <Clock3 size={17} aria-hidden="true" />
                  <div>
                    <strong>
                      {config.time_limit_sec === null
                        ? "Go at your own pace"
                        : `${config.time_limit_sec / 60} minutes, once you start`}
                    </strong>
                    <p>
                      {config.time_limit_sec === null
                        ? "No countdown. Take the time you need for each question."
                        : "The timer starts when you begin, not during setup. It keeps running if you leave."}
                    </p>
                  </div>
                </div>
                <div className="quiz-ai-note">
                  <Sparkles size={15} aria-hidden="true" />
                  <p>
                    Questions
                    {config.question_type === "short_answer"
                      ? " and written-answer grading"
                      : ""}{" "}
                    use AI. Check the sources and explanations in your results.
                  </p>
                </div>
              </section>
            </div>
            {error && (
              <p role="alert" className="quiz-error">
                {error}
              </p>
            )}
            <footer className="quiz-builder-footer">
              <span className="quiz-footer-hint">
                <BookOpen size={15} aria-hidden="true" />
                Built from your course materials
              </span>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy || !course}
                  loading={busy}
                  loadingText="Creating quiz..."
                >
                  Create quiz
                </Button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
