BEGIN;
CREATE TABLE public.storage_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  object_key text NOT NULL UNIQUE,
  is_prefix boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.storage_cleanup_jobs TO service_role;

-- Preserve institutional history without preventing an expired account's deletion.
ALTER TABLE public.invitations ALTER COLUMN issued_by DROP NOT NULL;
ALTER TABLE public.invitations DROP CONSTRAINT invitations_issued_by_fkey;
ALTER TABLE public.invitations ADD FOREIGN KEY(issued_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.exam_restrictions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.exam_restrictions DROP CONSTRAINT exam_restrictions_created_by_fkey;
ALTER TABLE public.exam_restrictions ADD FOREIGN KEY(created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.system_settings DROP CONSTRAINT system_settings_updated_by_fkey;
ALTER TABLE public.system_settings ADD FOREIGN KEY(updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.system_settings_history DROP CONSTRAINT system_settings_history_changed_by_fkey;
ALTER TABLE public.system_settings_history ADD FOREIGN KEY(changed_by) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.storage_cleanup_jobs(object_key)
    SELECT storage_key FROM public.documents WHERE deleted_at < now()-interval '30 days'
    UNION SELECT converted_key FROM public.documents WHERE deleted_at < now()-interval '30 days' AND converted_key IS NOT NULL
    ON CONFLICT(object_key) DO NOTHING;
  INSERT INTO public.storage_cleanup_jobs(object_key,is_prefix)
    SELECT 'artifacts/'||university_id::text||'/'||id::text||'/',true FROM public.users
    WHERE deleted_at < now()-interval '30 days' AND university_id IS NOT NULL
    ON CONFLICT(object_key) DO NOTHING;
  DELETE FROM public.documents WHERE deleted_at < now()-interval '30 days';
  DELETE FROM public.chat_sessions WHERE deleted_at < now()-interval '30 days';
  DELETE FROM public.quizzes WHERE deleted_at < now()-interval '30 days';
  DELETE FROM public.general_notes WHERE deleted_at < now()-interval '30 days';
  DELETE FROM auth.users WHERE id IN(SELECT id FROM public.users WHERE deleted_at < now()-interval '30 days');
END; $$;
REVOKE ALL ON FUNCTION public.purge_soft_deleted_records() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_soft_deleted_records() TO service_role;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('pansgpt-retention','0 2 * * *','SELECT public.purge_soft_deleted_records()');
SELECT cron.schedule('pansgpt-chat-credit-reconciliation','*/5 * * * *','SELECT public.reconcile_chat_credits()');
COMMIT;
