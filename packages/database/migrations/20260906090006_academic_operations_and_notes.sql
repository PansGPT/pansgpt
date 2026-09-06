-- ==============================================================================
-- Migration: 20260906090006_academic_operations_and_notes.sql
-- Purpose: Lecture timetables, student tasks, institutional knowledge, exam lockouts,
--          general notes, runtime system settings, and audit logs.
-- ==============================================================================

-- 1. Timetables (Weekly recurring schedule per university/level)
CREATE TABLE IF NOT EXISTS public.timetables (
  id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  level         university_level NOT NULL,
  day           text NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  time_slot     text NOT NULL, -- e.g. '08:00 - 10:00'
  start_time    text,
  course_code   text NOT NULL,
  course_title  text NOT NULL,
  venue         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, level, day, time_slot, course_code)
);

CREATE INDEX IF NOT EXISTS idx_timetables_lookup ON public.timetables(university_id, level, day);

CREATE TRIGGER trg_timetables_updated_at
  BEFORE UPDATE ON public.timetables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Student Tasks (Action items, assignments, and timetable study sessions)
CREATE TABLE IF NOT EXISTS public.student_tasks (
  id                    uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  university_id         uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  subtitle              text,
  course_code           text,
  task_type             text NOT NULL DEFAULT 'custom' 
                        CHECK (task_type IN ('class', 'reading', 'assignment', 'lab', 'presentation', 'meeting', 'custom')),
  due_date              date NOT NULL,
  due_time              time,
  is_completed          boolean NOT NULL DEFAULT false,
  completed_at          timestamptz,
  source                text NOT NULL DEFAULT 'custom' CHECK (source IN ('custom', 'timetable', 'ai_generated')),
  linked_resource_type  text NOT NULL DEFAULT 'none' CHECK (linked_resource_type IN ('document', 'note', 'chat_session', 'quiz', 'none')),
  linked_resource_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_tasks_active ON public.student_tasks(user_id, due_date ASC) WHERE is_completed IS FALSE;
CREATE INDEX IF NOT EXISTS idx_student_tasks_user ON public.student_tasks(user_id, created_at DESC);

CREATE TRIGGER trg_student_tasks_updated_at
  BEFORE UPDATE ON public.student_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Course Knowledge (Curriculum context injected into LLM prompt)
CREATE TABLE IF NOT EXISTS public.course_knowledge (
  id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  level         university_level NOT NULL,
  course_code   text,
  knowledge_text text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_knowledge_lookup ON public.course_knowledge(university_id, level);

-- 4. Exam Restrictions (Time-locked exam lockout windows)
CREATE TABLE IF NOT EXISTS public.exam_restrictions (
  id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES public.users(id),
  title         text NOT NULL,
  course_code   text,
  level         university_level NOT NULL,
  start_time    timestamptz NOT NULL,
  end_time      timestamptz NOT NULL,
  reason        text,
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_exam_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_exam_restrictions_window ON public.exam_restrictions(university_id, level, start_time, end_time);

-- 5. General Notes (Independent student notes)
CREATE TABLE IF NOT EXISTS public.general_notes (
  id          uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Untitled Note',
  content     text NOT NULL DEFAULT '',
  is_pinned   boolean NOT NULL DEFAULT false,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_general_notes_user ON public.general_notes(user_id, updated_at DESC);

CREATE TRIGGER trg_general_notes_updated_at
  BEFORE UPDATE ON public.general_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. System Settings & Audit Log
CREATE TABLE IF NOT EXISTS public.system_settings (
  id                  integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  system_prompt       text NOT NULL,
  temperature         double precision NOT NULL DEFAULT 0.7 CHECK (temperature BETWEEN 0.0 AND 1.0),
  maintenance_mode    boolean NOT NULL DEFAULT false,
  web_search_enabled  boolean NOT NULL DEFAULT true,
  rag_threshold       double precision NOT NULL DEFAULT 0.50,
  updated_by          uuid REFERENCES public.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings_history (
  id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  system_prompt       text,
  temperature         double precision,
  maintenance_mode    boolean,
  web_search_enabled  boolean,
  rag_threshold       double precision,
  changed_by          uuid REFERENCES public.users(id),
  change_reason       text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_email   text,
  actor_role    text,
  university_id uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  action        text NOT NULL,
  target_type   text NOT NULL,
  target_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_uni ON public.audit_logs(university_id, created_at DESC);
