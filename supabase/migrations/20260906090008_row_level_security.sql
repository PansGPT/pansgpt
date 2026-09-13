-- ==============================================================================
-- Migration: 20260906090008_row_level_security.sql
-- Purpose: Enable Row-Level Security (RLS) on all tables and define tenant isolation policies.
-- ==============================================================================

-- 1. Helper function to inspect current user's roles
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND required_role = ANY(roles)
      AND deleted_at IS NULL
  );
$$;

-- 2. Helper function to inspect current user's university_id
CREATE OR REPLACE FUNCTION public.current_user_university_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT university_id FROM public.users
  WHERE id = auth.uid()
    AND deleted_at IS NULL;
$$;


-- 3. Enable RLS on all 27 tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_learn_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_learn_pending_retests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Institutional & User Policies
-- ------------------------------------------------------------------------------

-- Universities: active universities visible to all authenticated users
CREATE POLICY uni_select ON public.universities
  FOR SELECT TO authenticated
  USING (status = 'active' OR public.current_user_has_role('super_admin'));

-- Users: users can view and edit their own row; university admins can view students in their university
CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Documents: students see active approved documents in their university
CREATE POLICY documents_select_student ON public.documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND university_id = public.current_user_university_id()
    AND (
      status = 'active'
      OR uploaded_by = auth.uid()
      OR public.current_user_has_role('university_admin')
      OR public.current_user_has_role('super_admin')
    )
  );

CREATE POLICY documents_admin_all ON public.documents
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role('super_admin')
    OR (public.current_user_has_role('university_admin') AND university_id = public.current_user_university_id())
  );

-- Document Chunks: readable if parent document is accessible
CREATE POLICY chunks_select ON public.document_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id
        AND d.deleted_at IS NULL
        AND d.university_id = public.current_user_university_id()
        AND d.status = 'active'
    )
    OR public.current_user_has_role('super_admin')
  );

-- Personal Workspace Policies (Strictly User Scoped)
CREATE POLICY notes_owner ON public.document_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY highlights_owner ON public.document_highlights
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY study_progress_owner ON public.study_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quizzes_owner ON public.quizzes
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quiz_questions_owner ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.user_id = auth.uid())
  );

CREATE POLICY quiz_attempts_owner ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY quiz_jobs_owner ON public.quiz_generation_jobs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_sessions_owner ON public.chat_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_messages_owner ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid())
  );

CREATE POLICY student_tasks_owner ON public.student_tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY general_notes_owner ON public.general_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Shared Operational Data (Timetables & AI Skills)
CREATE POLICY timetables_select ON public.timetables
  FOR SELECT TO authenticated
  USING (university_id = public.current_user_university_id() OR public.current_user_has_role('super_admin'));

CREATE POLICY ai_skills_select ON public.ai_skills
  FOR SELECT TO authenticated
  USING (is_active IS TRUE OR public.current_user_has_role('super_admin'));

CREATE POLICY settings_select ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);
