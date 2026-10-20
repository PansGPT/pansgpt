BEGIN;
CREATE TABLE public.background_jobs (
  id uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  job_name text NOT NULL CHECK (job_name IN ('ingest_document_job', 'describe_document_images_job')),
  storage_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'completed', 'failed')),
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, job_name)
);
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.background_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.background_jobs TO service_role;
CREATE INDEX background_jobs_pending ON public.background_jobs(updated_at) WHERE status IN ('pending', 'delivered');

-- Preserve the currently searchable content until a replacement commits successfully.
CREATE OR REPLACE FUNCTION public.prepare_document_reembed(doc_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE d public.documents;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = doc_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR d.status <> 'active' THEN RAISE EXCEPTION 'Document is not active'; END IF;
  IF d.embedding_status = 'processing' AND d.ingestion_heartbeat > now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'Document ingestion is already running';
  END IF;
  UPDATE public.documents SET embedding_status = 'pending', embedding_progress = 0,
    ingestion_lock_id = NULL, ingestion_heartbeat = NULL, updated_at = now() WHERE id = doc_id;
  INSERT INTO public.background_jobs(document_id, job_name, storage_key)
    VALUES(doc_id, 'ingest_document_job', d.storage_key)
  ON CONFLICT(document_id, job_name) DO UPDATE SET
    id = CASE WHEN background_jobs.status IN ('completed','failed') THEN public.uuid_generate_v7() ELSE background_jobs.id END,
    status = 'pending', dispatched_at = NULL, storage_key = EXCLUDED.storage_key, updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.prepare_document_reembed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_document_reembed(uuid) TO service_role;
COMMIT;
