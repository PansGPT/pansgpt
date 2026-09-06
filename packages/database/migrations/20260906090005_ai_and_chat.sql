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
