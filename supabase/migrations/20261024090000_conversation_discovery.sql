BEGIN;
ALTER TABLE public.chat_sessions
  ADD COLUMN title_source text NOT NULL DEFAULT 'pending'
    CHECK (title_source IN ('pending','generated','manual')),
  ADD COLUMN last_message_at timestamptz,
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, title)) STORED;
UPDATE public.chat_sessions SET title_source='manual' WHERE title <> 'New Chat';
UPDATE public.chat_sessions s SET last_message_at=(SELECT max(created_at) FROM public.chat_messages m WHERE m.session_id=s.id);
ALTER TABLE public.chat_messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, content)) STORED;
CREATE INDEX chat_sessions_search ON public.chat_sessions USING gin(search_vector) WHERE deleted_at IS NULL;
CREATE INDEX chat_messages_search ON public.chat_messages USING gin(search_vector)
  WHERE is_active_branch AND role IN ('user','assistant');
CREATE INDEX chat_sessions_activity_order ON public.chat_sessions(user_id,is_pinned DESC,(coalesce(last_message_at,created_at)) DESC,id DESC) WHERE deleted_at IS NULL;

CREATE FUNCTION public.track_chat_message_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  UPDATE public.chat_sessions SET last_message_at=greatest(coalesce(last_message_at,NEW.created_at),NEW.created_at)
    WHERE id=NEW.session_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_chat_message_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER chat_message_activity AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.track_chat_message_activity();

-- A session purge must clean up its generated files as well as attached files.
-- Enqueue only keys in this owner's namespace, and retain shared chat references.
CREATE FUNCTION public.enqueue_chat_artifact_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owned_prefix text;
BEGIN
  SELECT 'artifacts/'||university_id::text||'/'||OLD.user_id::text||'/' INTO owned_prefix FROM public.users WHERE id=OLD.user_id;
  INSERT INTO public.storage_cleanup_jobs(object_key)
    SELECT DISTINCT item->>'storage_key' FROM public.chat_messages m
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.extra_parts->'artifacts')='array' THEN m.extra_parts->'artifacts' ELSE '[]'::jsonb END) item
    WHERE m.session_id=OLD.id AND starts_with(item->>'storage_key',owned_prefix)
      AND NOT EXISTS(SELECT 1 FROM public.chat_messages other
        WHERE other.session_id<>OLD.id AND other.extra_parts->'artifacts' @> jsonb_build_array(jsonb_build_object('storage_key',item->>'storage_key')))
    ON CONFLICT(object_key) DO NOTHING;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_chat_artifact_cleanup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER chat_artifact_cleanup BEFORE DELETE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_chat_artifact_cleanup();
COMMIT;
