BEGIN;
-- Artifact cards are serialized in tool_calls; extra_parts is an API projection.
CREATE OR REPLACE FUNCTION public.enqueue_chat_artifact_cleanup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owned_prefix text;
BEGIN
  SELECT 'artifacts/'||university_id::text||'/'||OLD.user_id::text||'/' INTO owned_prefix FROM public.users WHERE id=OLD.user_id;
  INSERT INTO public.storage_cleanup_jobs(object_key)
    SELECT DISTINCT item->>'storage_key' FROM public.chat_messages m
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.tool_calls->'artifacts')='array' THEN m.tool_calls->'artifacts' ELSE '[]'::jsonb END) item
    WHERE m.session_id=OLD.id AND starts_with(item->>'storage_key',owned_prefix)
      AND NOT EXISTS(SELECT 1 FROM public.chat_messages other
        WHERE other.session_id<>OLD.id AND other.tool_calls->'artifacts' @> jsonb_build_array(jsonb_build_object('storage_key',item->>'storage_key')))
    ON CONFLICT(object_key) DO NOTHING;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_chat_artifact_cleanup() FROM PUBLIC,anon,authenticated;
COMMIT;
