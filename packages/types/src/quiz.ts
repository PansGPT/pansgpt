/** Quiz wire contracts. Taking questions deliberately exclude grading/source fields. */
export type QuizQuestionType =
  "objective" | "multi_select" | "statement_matrix" | "true_false" | "short_answer";
export type QuizOptionId = "A" | "B" | "C" | "D" | "E";
export interface QuizConfig {
  course_code: string;
  topic: string;
  question_type: QuizQuestionType;
  count: 5 | 10 | 15 | 20 | 25;
  difficulty: "easy" | "medium" | "hard";
  time_limit_sec: 300 | 600 | 900 | 1200 | 1800 | 2700 | 3600 | null;
  revision_result_id: string | null;
}
export interface QuizOption {
  id: QuizOptionId;
  text: string;
}
export interface QuizQuestion {
  id: string;
  position: number;
  question_type: QuizQuestionType;
  prompt: string;
  options: QuizOption[];
  points: number;
  concept: string;
}
export interface QuizAnswer {
  question_id: string;
  selected_option_ids: QuizOptionId[];
  truth_values: Partial<Record<QuizOptionId, boolean>>;
  text: string;
}
export interface QuizJob {
  id: string;
  quiz_id: string;
  status: "queued" | "retrieving" | "generating" | "saving" | "completed" | "failed" | "cancelled";
  /** New attempts require completed status and the full requested question count. */
  can_start: boolean;
  generated_count: number;
  target_count: number;
  current_step: string;
  error_message: string | null;
}
export interface QuizInfo {
  id: string;
  title: string;
  course_code: string;
  topic: string;
  question_type: QuizQuestionType;
  difficulty: string;
  count: number;
  time_limit_sec: number | null;
}
export interface QuizAttempt {
  id: string;
  quiz: QuizInfo;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  flagged_ids: string[];
  revision: number;
  status: "in_progress" | "grading" | "grading_failed" | "completed";
  started_at: string;
  deadline_at: string | null;
  server_now: string;
  result_id: string | null;
  generation_job_id: string | null;
  generation_status: QuizJob["status"];
}
export interface QuizSource {
  chunk_id: string;
  document_id: string;
  title: string;
  page: number | null;
  excerpt: string;
}
export interface QuizAnswerKey {
  choice_ids: QuizOptionId[];
  truth_values: Partial<Record<QuizOptionId, boolean>>;
  text: string;
}
export interface QuizFeedback {
  question: QuizQuestion;
  answer: QuizAnswer;
  answer_key: QuizAnswerKey;
  earned: number;
  explanation: string;
  sources: QuizSource[];
  option_grades: { id: QuizOptionId; earned: number; correct: boolean | null }[];
  outcome: "correct" | "partial" | "incorrect" | "unanswered";
}
export interface QuizResult {
  id: string;
  quiz: QuizInfo;
  score: number;
  max_score: number;
  percentage: number;
  time_taken_sec: number;
  completed_at: string;
  feedback: QuizFeedback[];
}
export interface QuizHistoryItem {
  id: string;
  quiz_id: string;
  title: string;
  course_code: string;
  question_type: QuizQuestionType;
  percentage: number;
  time_taken_sec: number | null;
  completed_at: string;
}
export interface QuizHistory {
  items: QuizHistoryItem[];
  next_offset: number | null;
  stats: { completed: number; average: number; best: number; study_seconds: number };
  jobs: QuizJob[];
  active_attempts: QuizAttempt[];
}
export interface QuizCourse {
  code: string;
  title: string;
  topics: string[];
  document_count: number;
}
export interface QuizShareSummary {
  title: string;
  course_code: string;
  percentage: number;
  question_count: number;
  completed_at: string;
}
