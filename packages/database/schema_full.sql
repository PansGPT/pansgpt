-- ========================================================
-- MIGRATION: 20260906090001_extensions_and_uuidv7.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090001_extensions_and_uuidv7.sql
-- Purpose: Enable core extensions, custom enum types, RFC 9562 UUIDv7 generator,
--          and standard updated_at trigger function.
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE university_level AS ENUM ('100', '200', '300', '400', '500', '600');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'university_admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending_review', 'active', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ai_provider AS ENUM ('google', 'groq', 'openrouter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE interaction_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE skill_type AS ENUM ('prompt', 'python_tool', 'api_webhook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE quiz_job_status AS ENUM ('queued', 'retrieving', 'generating', 'saving', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. RFC 9562 UUIDv7 Function (Time-ordered primary keys)
CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_unix_ts bigint := (extract(epoch from v_time) * 1000)::bigint;
  v_rand bytea := gen_random_bytes(10);
  v_bytes bytea;
BEGIN
  v_bytes := substring(int8send(v_unix_ts) from 3 for 6) ||
             set_byte(
               set_byte(v_rand, 0, (get_byte(v_rand, 0) & 15) | 112),
               2, (get_byte(v_rand, 2) & 63) | 128
             );
  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ========================================================
-- MIGRATION: 20260906090002_identity_and_tenancy.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090002_identity_and_tenancy.sql
-- Purpose: Institutional tenancy, academic sessions, unified profiles, and invite links.
-- ==============================================================================

-- 1. Universities (Multi-tenant isolation boundary)
CREATE TABLE IF NOT EXISTS public.universities (
  id          uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  name        text NOT NULL,
  short_name  text,
  slug        text NOT NULL UNIQUE,
  country     text NOT NULL DEFAULT 'Nigeria',
  state       text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS unq_universities_name_lower ON public.universities (lower(name));

CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Academic Terms (Active academic calendar per institution)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id                uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id     uuid NOT NULL UNIQUE REFERENCES public.universities(id) ON DELETE CASCADE,
  academic_session  text NOT NULL, -- e.g. '2024/2025'
  semester          text NOT NULL CHECK (semester IN ('first', 'second')),
  updated_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Unified Users (Consolidates profiles, roles array, and academic cohort)
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL UNIQUE,
  first_name        text NOT NULL,
  last_name         text,
  avatar_key        text, -- Cloudflare R2 key
  university_id     uuid REFERENCES public.universities(id) ON DELETE RESTRICT,
  current_level     university_level,
  roles             user_role[] NOT NULL DEFAULT '{student}',
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  terms_accepted_at timestamptz,
  deleted_at        timestamptz, -- Soft delete grace period
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_university ON public.users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_roles ON public.users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Invitations (Controlled institutional onboarding)
CREATE TABLE IF NOT EXISTS public.invitations (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  token           text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  university_id   uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  issued_by       uuid NOT NULL REFERENCES public.users(id),
  grant_roles     user_role[] NOT NULL DEFAULT '{student}',
  target_level    university_level,
  max_uses        integer NOT NULL DEFAULT 1, -- 0 = unlimited
  current_uses    integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token) WHERE is_active IS TRUE;


-- ========================================================
-- MIGRATION: 20260906090003_content_and_ingestion.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090003_content_and_ingestion.sql
-- Purpose: Unified documents repository, 1536d HNSW vector chunks, sections,
--          cropped notes, and reader highlights.
-- ==============================================================================

-- 1. Documents (University-scoped content library)
CREATE TABLE IF NOT EXISTS public.documents (
  id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id       uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  uploaded_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title               text NOT NULL,
  course_code         text NOT NULL,
  course_title        text NOT NULL,
  topic               text,
  lecturer_name       text,
  storage_key         text NOT NULL UNIQUE, -- Cloudflare R2 storage key
  converted_key       text,                 -- Cloudflare R2 converted slide PDF key
  file_size_bytes     bigint NOT NULL DEFAULT 0,
  mime_type           text NOT NULL DEFAULT 'application/pdf',
  page_count          integer NOT NULL DEFAULT 0,
  status              document_status NOT NULL DEFAULT 'pending_review',
  reviewed_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  review_note         text,
  target_levels       university_level[] NOT NULL DEFAULT '{}',
  academic_session    text,
  semester            text CHECK (semester IN ('first', 'second')),
  embedding_status    text NOT NULL DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
  embedding_progress  integer NOT NULL DEFAULT 0 CHECK (embedding_progress BETWEEN 0 AND 100),
  total_chunks        integer NOT NULL DEFAULT 0,
  ingestion_lock_id   uuid,
  ingestion_heartbeat timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_lookup ON public.documents(university_id, course_code, status);
CREATE INDEX IF NOT EXISTS idx_documents_ingestion ON public.documents(embedding_status) WHERE embedding_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Document Chunks (1536d vector embeddings for gemini-embedding-002)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id          uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content     text NOT NULL,
  content_fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  page_start  integer,
  page_end    integer,
  chunk_index integer NOT NULL,
  embedding   vector(1536) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_hnsw ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON public.document_chunks USING gin(content_fts);

-- 3. Document Sections (Structured Learn Mode curriculum breakdown)
CREATE TABLE IF NOT EXISTS public.document_sections (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  section_index   integer NOT NULL,
  title           text NOT NULL,
  page_start      integer NOT NULL,
  page_end        integer NOT NULL,
  summary         text NOT NULL,
  explanation     text,
  check_questions jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_sections_doc ON public.document_sections(document_id, section_index);

-- 4. Document Notes (Cropped PDF snips and commentary)
CREATE TABLE IF NOT EXISTS public.document_notes (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  storage_key     text NOT NULL, -- R2 key for cropped screenshot
  ai_explanation  text,
  category        text DEFAULT 'Key Point' CHECK (category IN ('Definition', 'Key Point', 'Formula', 'Important')),
  page_number     integer,
  user_annotation text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_notes_user_doc ON public.document_notes(user_id, document_id);

CREATE TRIGGER trg_document_notes_updated_at
  BEFORE UPDATE ON public.document_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Document Highlights (Persistent text selections and bounding boxes)
CREATE TABLE IF NOT EXISTS public.document_highlights (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number     integer NOT NULL,
  color           text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  selected_text   text NOT NULL,
  rects           jsonb NOT NULL, -- Array of [{ x, y, width, height }] relative coordinates
  note_text       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_highlights_lookup ON public.document_highlights(user_id, document_id, page_number);

CREATE TRIGGER trg_document_highlights_updated_at
  BEFORE UPDATE ON public.document_highlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ========================================================
-- MIGRATION: 20260906090004_learning_and_quizzes.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260906090005_ai_and_chat.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090005_ai_and_chat.sql
-- Purpose: Dynamic Claude-style ai_skills registry, branching chat message tree,
--          and observability telemetry.
-- ==============================================================================

-- 1. AI Skills Registry (Dynamic Agent Tools & Clinical Prompts)
CREATE TABLE IF NOT EXISTS public.ai_skills (
  id                uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  slug              text NOT NULL UNIQUE, -- e.g. 'dosage_calculator', 'pubchem_drawer'
  name              text NOT NULL,
  description       text NOT NULL, -- Semantic guidance for AI router
  instructions      text NOT NULL, -- On-demand markdown system prompt
  parameters_schema jsonb,        -- JSON schema of parameters
  skill_type        skill_type NOT NULL DEFAULT 'prompt',
  target_levels     university_level[], -- null = all levels
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ai_skills_updated_at
  BEFORE UPDATE ON public.ai_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Chat Sessions (Conversation threads)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id            uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id   uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title         text NOT NULL DEFAULT 'New Chat',
  summary       text,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_deleted ON public.chat_sessions(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Chat Messages (Branching tree architecture)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  session_id          uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  parent_message_id   uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  branch_index        smallint NOT NULL DEFAULT 0,
  is_active_branch    boolean NOT NULL DEFAULT true,
  role                interaction_role NOT NULL,
  content             text NOT NULL,
  image_keys          text[],           -- R2 storage keys
  extracted_image_text text,           -- Background OCR text
  image_hash          text,           -- SHA-256 digest
  image_metadata      jsonb,
  tool_calls          jsonb,            -- Invoked tools, parameters, and outputs
  citations           jsonb,            -- Retrieved chunk citations with scores
  thinking_text       text,             -- Model reasoning trace
  edited_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON public.chat_messages(session_id, parent_message_id, is_active_branch);
CREATE INDEX IF NOT EXISTS idx_chat_messages_image_hash ON public.chat_messages(image_hash) WHERE image_hash IS NOT NULL;

-- 4. AI Telemetry (Per-request token usage, latency, and status)
CREATE TABLE IF NOT EXISTS public.ai_telemetry (
  id                uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  university_id     uuid REFERENCES public.universities(id) ON DELETE SET NULL,
  provider          ai_provider NOT NULL,
  model_id          text NOT NULL,
  request_type      text NOT NULL, -- 'chat', 'quiz_gen', 'vision', 'learn_gen'
  prompt_tokens     integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  latency_ms        integer NOT NULL DEFAULT 0,
  tools_invoked     text[],
  status            text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'failover')),
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_telemetry_time ON public.ai_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_user ON public.ai_telemetry(user_id, created_at DESC);


-- ========================================================
-- MIGRATION: 20260906090006_academic_operations_and_notes.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 20260906090007_functions_and_procedures.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090007_functions_and_procedures.sql
-- Purpose: Vector similarity search (single and multi-doc), atomic worker claim,
--          worker heartbeat, and soft-delete retention purge.
-- ==============================================================================

-- 1. match_document_chunks (Vector search over a specific document)
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer,
  doc_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  page_start integer,
  page_end integer,
  chunk_index integer,
  similarity double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_start,
    dc.page_end,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.document_id = doc_id
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- 2. match_documents_global (Vector search across an array of authorized documents)
CREATE OR REPLACE FUNCTION public.match_documents_global(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer,
  doc_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  page_start integer,
  page_end integer,
  chunk_index integer,
  similarity double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_start,
    dc.page_end,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.document_id = ANY(doc_ids)
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- 3. claim_document_ingestion (Atomic lock for background workers)
CREATE OR REPLACE FUNCTION public.claim_document_ingestion(
  doc_id uuid,
  worker_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  UPDATE public.documents
  SET
    embedding_status = 'processing',
    ingestion_lock_id = worker_id,
    ingestion_heartbeat = now(),
    updated_at = now()
  WHERE id = doc_id
    AND (
      embedding_status = 'pending'
      OR (embedding_status = 'processing' AND ingestion_heartbeat < now() - interval '10 minutes')
    );
  
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed;
END;
$$;

-- 4. heartbeat_document_ingestion (Keep-alive for long embedding batches)
CREATE OR REPLACE FUNCTION public.heartbeat_document_ingestion(
  doc_id uuid,
  worker_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated boolean := false;
BEGIN
  UPDATE public.documents
  SET
    ingestion_heartbeat = now(),
    updated_at = now()
  WHERE id = doc_id
    AND ingestion_lock_id = worker_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- 5. purge_soft_deleted_records (30-day grace period data purge)
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_records()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Hard delete chat sessions past 30 days
  DELETE FROM public.chat_sessions
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  -- 2. Hard delete quizzes past 30 days
  DELETE FROM public.quizzes
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  -- 3. Hard delete general notes past 30 days
  DELETE FROM public.general_notes
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';

  -- 4. Hard delete users past 30 days
  DELETE FROM public.users
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';
END;
$$;


-- ========================================================
-- MIGRATION: 20260906090008_row_level_security.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090008_row_level_security.sql
-- Purpose: Enable Row-Level Security (RLS) on all tables and define tenant isolation policies.
-- ==============================================================================

-- 1. Helper function to inspect current user's roles
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql STABLE
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
LANGUAGE sql STABLE
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


-- ========================================================
-- MIGRATION: 20260906090009_seed_nigerian_universities.sql
-- ========================================================

-- ==============================================================================
-- Migration: 20260906090009_seed_nigerian_universities.sql
-- Purpose: Seed accredited Nigerian faculties of pharmacy and initial runtime configurations.
-- ==============================================================================

-- 1. Initial Nigerian Universities with Pharmacy Faculties
INSERT INTO public.universities (name, short_name, slug, state, country, status)
VALUES
  ('University of Jos', 'UNIJOS', 'unijos', 'Plateau', 'Nigeria', 'active'),
  ('University of Ibadan', 'UI', 'ui', 'Oyo', 'Nigeria', 'active'),
  ('Ahmadu Bello University', 'ABU', 'abu', 'Kaduna', 'Nigeria', 'active'),
  ('University of Lagos', 'UNILAG', 'unilag', 'Lagos', 'Nigeria', 'active'),
  ('Obafemi Awolowo University', 'OAU', 'oau', 'Osun', 'Nigeria', 'active'),
  ('University of Benin', 'UNIBEN', 'uniben', 'Edo', 'Nigeria', 'active'),
  ('University of Nigeria, Nsukka', 'UNN', 'unn', 'Enugu', 'Nigeria', 'active'),
  ('Bayero University Kano', 'BUK', 'buk', 'Kano', 'Nigeria', 'active'),
  ('Olabisi Onabanjo University', 'OOU', 'oou', 'Ogun', 'Nigeria', 'active'),
  ('Nnamdi Azikiwe University', 'UNIZIK', 'unizik', 'Anambra', 'Nigeria', 'active')
ON CONFLICT (lower(name)) DO NOTHING;

-- 2. Default System Settings
INSERT INTO public.system_settings (id, system_prompt, temperature, maintenance_mode, web_search_enabled, rag_threshold)
VALUES (
  1,
  'You are the PansGPT AI Study Companion, an intelligent, curriculum-grounded clinical pharmacology mentor designed for Nigerian pharmacy students. Teach with patient rigor, provide step-by-step pharmacokinetic calculations with explicit units, anchor pharmacology concepts to high-yield clinical mnemonics, and cite course lecture slides when answering from uploaded monographs.',
  0.7,
  false,
  true,
  0.50
)
ON CONFLICT (id) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature,
  web_search_enabled = EXCLUDED.web_search_enabled;

-- 3. Core Dynamic AI Skills
INSERT INTO public.ai_skills (slug, name, description, instructions, skill_type, is_active)
VALUES
  (
    'dosage_calculator',
    'Clinical Dosage & PK Calculator',
    'Calculates pediatric, renal-adjusted, and loading/maintenance doses with full formula derivations.',
    'When calculating drug dosages or pharmacokinetics parameters (Clearance, Half-life, Volume of Distribution, Creatinine Clearance via Cockcroft-Gault), always show every step, include measurement units at every stage, and flag clinical cautions for narrow therapeutic index drugs.',
    'prompt',
    true
  ),
  (
    'drug_interaction_checker',
    'Pharmacological Drug Interaction Checker',
    'Analyzes drug-drug, drug-food, and pharmacokinetic enzyme interactions (CYP450 induction/inhibition).',
    'Identify mechanisms of interaction (pharmacokinetic vs pharmacodynamic), specify the clinical severity (Major, Moderate, Minor), describe the biological consequence (e.g. QT prolongation, bleeding risk), and provide concrete monitoring or dosing adjustments.',
    'prompt',
    true
  ),
  (
    'chemical_drawer',
    'PubChem SMILES & Mechanism Drawer',
    'Extracts and renders chemical reaction mechanisms, functional groups, and 2D molecular structures.',
    'When explaining medicinal chemistry and structure-activity relationships (SAR), provide standard SMILES strings for the active pharmaceutical ingredient, explain key pharmacophores, and analyze how chemical modifications alter receptor affinity.',
    'prompt',
    true
  )
ON CONFLICT (slug) DO NOTHING;


