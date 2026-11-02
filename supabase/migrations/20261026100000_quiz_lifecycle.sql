-- Server-owned assessments. Existing quiz rows and completed results are preserved.
BEGIN;
ALTER TABLE public.quizzes ADD COLUMN university_id uuid REFERENCES public.universities(id);
UPDATE public.quizzes q SET university_id=u.university_id FROM public.users u WHERE u.id=q.user_id;
ALTER TABLE public.quizzes ADD COLUMN topic text NOT NULL DEFAULT '';
ALTER TABLE public.quizzes ADD COLUMN question_format text NOT NULL DEFAULT 'objective'
  CHECK (question_format IN ('objective','multi_select','statement_matrix','true_false','short_answer'));

ALTER TABLE public.quiz_questions DROP CONSTRAINT quiz_questions_question_type_check;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_question_type_check
  CHECK (question_type IN ('mcq','tf','short','clinical_scenario','fill_blank',
    'objective','multi_select','statement_matrix','true_false','short_answer'));
ALTER TABLE public.quiz_questions ADD COLUMN answer_key jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.quiz_questions ADD COLUMN sources jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.quiz_questions ADD COLUMN concept text NOT NULL DEFAULT '';

ALTER TABLE public.quiz_generation_jobs ADD COLUMN university_id uuid REFERENCES public.universities(id);
UPDATE public.quiz_generation_jobs j SET university_id=u.university_id FROM public.users u WHERE u.id=j.user_id;
ALTER TABLE public.quiz_generation_jobs ADD COLUMN request_key uuid;
ALTER TABLE public.quiz_generation_jobs ADD COLUMN attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_generation_jobs ADD COLUMN lease_id uuid;
ALTER TABLE public.quiz_generation_jobs ADD COLUMN lease_until timestamptz;
CREATE UNIQUE INDEX idx_quiz_job_request ON public.quiz_generation_jobs(user_id,request_key);
CREATE INDEX idx_quiz_dispatch ON public.quiz_generation_jobs(status,lease_until);

CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','grading','grading_failed','completed')),
  answers jsonb NOT NULL DEFAULT '[]',
  flagged_ids uuid[] NOT NULL DEFAULT '{}',
  revision integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  grading_lease uuid,
  grading_until timestamptz,
  result_id uuid REFERENCES public.quiz_attempts(id) ON DELETE SET NULL
);
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_quiz_session_active ON public.quiz_sessions(user_id,quiz_id)
  WHERE status IN ('in_progress','grading','grading_failed');
CREATE INDEX idx_quiz_session_owner ON public.quiz_sessions(user_id,university_id,started_at DESC);
ALTER TABLE public.quiz_attempts ADD COLUMN session_id uuid REFERENCES public.quiz_sessions(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_quiz_attempt_session ON public.quiz_attempts(session_id);
ALTER TABLE public.quiz_attempts ADD COLUMN feedback jsonb NOT NULL DEFAULT '[]';

CREATE TABLE public.quiz_result_shares (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE public.quiz_result_shares ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quiz_shares_result ON public.quiz_result_shares(result_id,user_id);

-- RLS row ownership cannot protect individual answer-key columns or computed grades.
-- Route every read/write through authorized API serializers instead.
DROP POLICY IF EXISTS quizzes_owner ON public.quizzes;
DROP POLICY IF EXISTS quiz_questions_owner ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_attempts_owner ON public.quiz_attempts;
DROP POLICY IF EXISTS quiz_jobs_owner ON public.quiz_generation_jobs;
REVOKE ALL ON public.quizzes, public.quiz_questions, public.quiz_attempts,
  public.quiz_generation_jobs, public.quiz_sessions, public.quiz_result_shares FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.quizzes, public.quiz_questions, public.quiz_attempts,
  public.quiz_generation_jobs, public.quiz_sessions, public.quiz_result_shares TO service_role;
COMMIT;
