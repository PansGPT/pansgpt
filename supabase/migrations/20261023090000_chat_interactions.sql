-- Phase 11: durable feedback, private attachments and serialized conversation runs.
BEGIN;
ALTER TABLE public.chat_sessions ADD COLUMN active_run_id uuid;
ALTER TABLE public.chat_sessions ADD COLUMN active_run_started_at timestamptz;
CREATE UNIQUE INDEX chat_sessions_id_owner ON public.chat_sessions(id, user_id);
CREATE UNIQUE INDEX chat_messages_id_session ON public.chat_messages(id, session_id);
-- Tree writes and run leases are server-authoritative.
REVOKE INSERT, UPDATE, DELETE ON public.chat_sessions, public.chat_messages FROM authenticated;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_parent_same_session
  FOREIGN KEY(parent_message_id, session_id) REFERENCES public.chat_messages(id, session_id);

CREATE TABLE public.chat_message_feedback (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  session_id uuid NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment text CHECK (length(comment) <= 1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id),
  FOREIGN KEY(session_id, user_id) REFERENCES public.chat_sessions(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(message_id, session_id) REFERENCES public.chat_messages(id, session_id) ON DELETE CASCADE
);
ALTER TABLE public.chat_message_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_message_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.chat_message_feedback TO authenticated;
GRANT ALL ON public.chat_message_feedback TO service_role;
CREATE POLICY feedback_owner_read ON public.chat_message_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_sessions s WHERE s.id = session_id AND s.deleted_at IS NULL
  ));

CREATE TABLE public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message_id uuid,
  object_key text NOT NULL UNIQUE,
  filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 160),
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  extracted_text text NOT NULL CHECK (length(extracted_text) <= 40000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(session_id, user_id) REFERENCES public.chat_sessions(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(message_id, session_id) REFERENCES public.chat_messages(id, session_id) ON DELETE CASCADE
);
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_attachments FROM PUBLIC, anon, authenticated;
-- Attachment text and private object keys are API-only, including for the owner.
GRANT ALL ON public.chat_attachments TO service_role;
CREATE INDEX chat_attachments_session ON public.chat_attachments(session_id, message_id);

-- R2 cleanup survives account/session deletion and removal of unused uploads.
CREATE FUNCTION public.enqueue_chat_attachment_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.storage_cleanup_jobs(object_key) VALUES(OLD.object_key)
    ON CONFLICT(object_key) DO NOTHING;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_chat_attachment_cleanup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chat_attachment_cleanup AFTER DELETE ON public.chat_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_chat_attachment_cleanup();
SELECT cron.schedule('expire-unused-chat-attachments', '17 * * * *',
  $$DELETE FROM public.chat_attachments WHERE message_id IS NULL AND created_at < now() - interval '24 hours'$$);

-- Restore parent links for historical active linear turns written without a user parent.
WITH ordered AS (
  SELECT id, role, parent_message_id,
    lag(id) OVER w AS previous_id, lag(role) OVER w AS previous_role
  FROM public.chat_messages WHERE is_active_branch
  WINDOW w AS (PARTITION BY session_id ORDER BY created_at, id)
)
UPDATE public.chat_messages m SET parent_message_id = o.previous_id FROM ordered o
WHERE m.id = o.id AND o.role = 'user' AND o.parent_message_id IS NULL
  AND o.previous_role = 'assistant';
COMMIT;
