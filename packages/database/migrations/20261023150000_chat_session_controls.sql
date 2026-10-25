-- Owner-controlled organization; existing RLS and API-only write grants remain in force.
ALTER TABLE public.chat_sessions
  ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

CREATE INDEX chat_sessions_visible_order
  ON public.chat_sessions (user_id, is_pinned DESC, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL;
