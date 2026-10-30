import { z } from "zod";
import type {
  QuizAnswer,
  QuizAttempt,
  QuizConfig,
  QuizCourse,
  QuizHistory,
  QuizJob,
  QuizQuestion,
  QuizResult,
  QuizShareSummary,
} from "@pansgpt/types";

const id = z.string().uuid();
const optionId = z.enum(["A", "B", "C", "D", "E"]);
const truthValues = z.partialRecord(optionId, z.boolean());
const kind = z.enum([
  "objective",
  "multi_select",
  "statement_matrix",
  "true_false",
  "short_answer",
]);
export const quizQuestionSchema: z.ZodType<QuizQuestion> = z
  .object({
    id,
    position: z.number().int().positive(),
    question_type: kind,
    prompt: z.string(),
    options: z.array(z.object({ id: optionId, text: z.string() }).strict()),
    points: z.number().positive(),
    concept: z.string(),
  })
  .strict();
export const quizAnswerSchema: z.ZodType<QuizAnswer> = z
  .object({
    question_id: id,
    selected_option_ids: z.array(optionId),
    truth_values: truthValues,
    text: z.string(),
  })
  .strict();
const info = z.object({
  id,
  title: z.string(),
  course_code: z.string(),
  topic: z.string(),
  question_type: kind,
  difficulty: z.string(),
  count: z.number().int().positive(),
  time_limit_sec: z.number().int().positive().nullable(),
});
export const quizJobSchema: z.ZodType<QuizJob> = z
  .object({
    id,
    quiz_id: id,
    status: z.enum([
      "queued",
      "retrieving",
      "generating",
      "saving",
      "completed",
      "failed",
      "cancelled",
    ]),
    can_start: z.boolean().default(false),
    generated_count: z.number().int().nonnegative(),
    target_count: z.number().int().positive(),
    current_step: z.string(),
    error_message: z.string().nullable(),
  })
  .strict();
export const quizAttemptSchema: z.ZodType<QuizAttempt> = z
  .object({
    id,
    quiz: info,
    questions: z.array(quizQuestionSchema),
    answers: z.array(quizAnswerSchema),
    flagged_ids: z.array(id),
    revision: z.number().int().nonnegative(),
    status: z.enum(["in_progress", "grading", "grading_failed", "completed"]),
    started_at: z.string().datetime({ offset: true }),
    deadline_at: z.string().datetime({ offset: true }).nullable(),
    server_now: z.string().datetime({ offset: true }),
    result_id: id.nullable(),
    generation_job_id: id.nullable().default(null),
    generation_status: z
      .enum(["queued", "retrieving", "generating", "saving", "completed", "failed", "cancelled"])
      .default("completed"),
  })
  .strict();
export const quizResultSchema: z.ZodType<QuizResult> = z
  .object({
    id,
    quiz: info,
    score: z.number(),
    max_score: z.number().positive(),
    percentage: z.number().min(0).max(100),
    time_taken_sec: z.number().int().nonnegative(),
    completed_at: z.string(),
    feedback: z.array(
      z.object({
        question: quizQuestionSchema,
        answer: quizAnswerSchema,
        answer_key: z.object({
          choice_ids: z.array(optionId),
          truth_values: truthValues,
          text: z.string(),
        }),
        earned: z.number(),
        explanation: z.string(),
        sources: z.array(
          z.object({
            chunk_id: id,
            document_id: id,
            title: z.string(),
            page: z.number().nullable(),
            excerpt: z.string(),
          })
        ),
        option_grades: z.array(
          z.object({ id: optionId, earned: z.number(), correct: z.boolean().nullable() })
        ),
        outcome: z.enum(["correct", "partial", "incorrect", "unanswered"]),
      })
    ),
  })
  .strict();
export const quizHistorySchema: z.ZodType<QuizHistory> = z.object({
  items: z.array(
    z.object({
      id,
      quiz_id: id,
      title: z.string(),
      course_code: z.string(),
      question_type: z.enum([
        "objective",
        "multi_select",
        "statement_matrix",
        "true_false",
        "short_answer",
      ]),
      percentage: z.number(),
      time_taken_sec: z.number().nullable(),
      completed_at: z.string(),
    })
  ),
  next_offset: z.number().int().nullable(),
  stats: z.object({
    completed: z.number().int(),
    average: z.number(),
    best: z.number(),
    study_seconds: z.number().int(),
  }),
  jobs: z.array(quizJobSchema),
  active_attempts: z.array(quizAttemptSchema),
});
const coursesSchema: z.ZodType<QuizCourse[]> = z.array(
  z.object({
    code: z.string(),
    title: z.string(),
    topics: z.array(z.string()),
    document_count: z.number().int(),
  })
);
export const quizShareSchema: z.ZodType<QuizShareSummary> = z
  .object({
    title: z.string(),
    course_code: z.string(),
    percentage: z.number(),
    question_count: z.number(),
    completed_at: z.string(),
  })
  .strict();

export class QuizApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
async function request<T>(
  token: string | undefined,
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  if (!token) throw new QuizApiError("Your session has expired. Sign in again to continue.", 401);
  const response = await fetch(`/api/quiz${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const failure = z.object({ detail: z.string() }).safeParse(data);
    throw new QuizApiError(
      failure.success
        ? failure.data.detail
        : "We couldn't complete that quiz request. Please retry.",
      response.status
    );
  }
  return schema.parse(data);
}
export function quizApi(token: string | undefined) {
  return {
    courses: (signal?: AbortSignal) =>
      request(token, "/courses", coursesSchema, "GET", undefined, signal),
    history: (offset = 0, course = "", signal?: AbortSignal) =>
      request(
        token,
        `/history?offset=${offset}${course ? `&course=${encodeURIComponent(course)}` : ""}`,
        quizHistorySchema,
        "GET",
        undefined,
        signal
      ),
    create: (config: QuizConfig, request_key: string) =>
      request(token, "/jobs", quizJobSchema, "POST", { ...config, request_key }),
    job: (jobId: string, signal?: AbortSignal) =>
      request(token, `/jobs/${jobId}`, quizJobSchema, "GET", undefined, signal),
    cancel: (jobId: string) => request(token, `/jobs/${jobId}/cancel`, quizJobSchema, "POST"),
    retry: (jobId: string) => request(token, `/jobs/${jobId}/retry`, quizJobSchema, "POST"),
    start: (quizId: string) =>
      request(token, `/quizzes/${quizId}/attempts`, quizAttemptSchema, "POST"),
    attempt: (attemptId: string, signal?: AbortSignal) =>
      request(token, `/attempts/${attemptId}`, quizAttemptSchema, "GET", undefined, signal),
    save: (attemptId: string, revision: number, answers: QuizAnswer[], flagged_ids: string[]) =>
      request(token, `/attempts/${attemptId}/answers`, quizAttemptSchema, "PUT", {
        revision,
        answers,
        flagged_ids,
      }),
    submit: (attemptId: string) =>
      request(token, `/attempts/${attemptId}/submit`, quizResultSchema, "POST"),
    result: (resultId: string, signal?: AbortSignal) =>
      request(token, `/results/${resultId}`, quizResultSchema, "GET", undefined, signal),
    share: (resultId: string) =>
      request(token, `/results/${resultId}/share`, z.object({ token: z.string() }), "POST"),
    revoke: (resultId: string) => request(token, `/results/${resultId}/share`, z.null(), "DELETE"),
  };
}
export type QuizApi = ReturnType<typeof quizApi>;
export const quizFormats = [
  {
    id: "objective",
    title: "Single best answer",
    detail: "Choose one of four options.",
    marking: "1 point for a correct answer. No penalties.",
  },
  {
    id: "multi_select",
    title: "Select three",
    detail: "Select three of five options.",
    marking: "Select up to three. 1 point per correct selection, up to 3 points.",
  },
  {
    id: "statement_matrix",
    title: "True / false matrix",
    detail: "Judge each of five statements.",
    marking:
      "+1 correct, −1 incorrect, 0 unanswered for each statement. Overall percentage is floored at zero.",
  },
  {
    id: "true_false",
    title: "True or false",
    detail: "Mark a statement true or false.",
    marking: "1 point for a correct answer. No penalties.",
  },
  {
    id: "short_answer",
    title: "Written response",
    detail: "Write a short answer.",
    marking:
      "AI grading against a source-based rubric: 0, 0.5 or 1 point. Accurate paraphrases earn credit.",
  },
] as const;
export function hasAnswer(answer: QuizAnswer | undefined): boolean {
  return Boolean(
    answer &&
    (answer.selected_option_ids.length ||
      Object.keys(answer.truth_values).length ||
      answer.text.trim())
  );
}
