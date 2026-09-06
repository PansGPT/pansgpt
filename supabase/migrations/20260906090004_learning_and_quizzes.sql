-- ==============================================================================
-- Migration: 20260906090004_learning_and_quizzes.sql
-- Purpose: Study reading tracking, quizzes, question banks, async generation queue,
--          and Learn Mode spaced repetition mastery.
-- ==============================================================================

-- 1. Study Progress (Reading position tracking)
CREATE TABLE IF NOT EXISTS public.study_progress (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  last_page_read  integer NOT NULL DEFAULT 1,
  total_pages     integer NOT NULL DEFAULT 1,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_study_progress_user ON public.study_progress(user_id, updated_at DESC);

-- 2. Quizzes (Quiz sets and assessments)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title           text NOT NULL,
  course_code     text NOT NULL,
  course_title    text NOT NULL,
  level           university_level NOT NULL,
  difficulty      text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  num_questions   integer NOT NULL,
  time_limit_sec  integer, -- null = untimed
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id, created_at DESC);

CREATE TRIGGER trg_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Quiz Questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  quiz_id         uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_order  integer NOT NULL,
  question_type   text NOT NULL CHECK (question_type IN ('mcq', 'tf', 'short', 'clinical_scenario', 'fill_blank')),
  prompt          text NOT NULL,
  options         jsonb, -- Array of string choices for MCQ
  correct_answer  text NOT NULL,
  explanation     text,
  points          integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, question_order);

-- 4. Quiz Attempts (Student submissions and score breakdown)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  quiz_id         uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score           numeric(5,2) NOT NULL,
  max_score       numeric(5,2) NOT NULL,
  percentage      numeric(5,2) NOT NULL,
  time_taken_sec  integer,
  answers         jsonb NOT NULL, -- Maps question_id -> { selected_answer, is_correct, explanation }
  completed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, completed_at DESC);

-- 5. Quiz Generation Jobs (Async ARQ background queue)
CREATE TABLE IF NOT EXISTS public.quiz_generation_jobs (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  request_payload jsonb NOT NULL,
  status          quiz_job_status NOT NULL DEFAULT 'queued',
  progress        integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  current_step    text,
  error_message   text,
  quiz_id         uuid REFERENCES public.quizzes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quiz_jobs_user ON public.quiz_generation_jobs(user_id, status);

CREATE TRIGGER trg_quiz_generation_jobs_updated_at
  BEFORE UPDATE ON public.quiz_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Document Learn Progress (Section-level mastery)
CREATE TABLE IF NOT EXISTS public.document_learn_progress (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  section_index   integer NOT NULL,
  status          text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'needs_review', 'mastered')),
  last_score      integer,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id, section_index)
);

CREATE INDEX IF NOT EXISTS idx_learn_progress_user ON public.document_learn_progress(user_id, document_id);

-- 7. Document Learn Pending Retests (Spaced repetition retest queue)
CREATE TABLE IF NOT EXISTS public.document_learn_pending_retests (
  id                    uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id           uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  origin_section_index  integer NOT NULL,
  target_section_index  integer NOT NULL,
  question              jsonb NOT NULL,
  resolved              boolean NOT NULL DEFAULT false,
  resolved_correct      boolean,
  created_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_learn_retests_queue ON public.document_learn_pending_retests(user_id, document_id, target_section_index) WHERE resolved IS FALSE;
