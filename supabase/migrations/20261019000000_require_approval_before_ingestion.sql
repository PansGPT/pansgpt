-- [CHAT FIX 2] A queued or stale job must never process unapproved or deleted material.
CREATE OR REPLACE FUNCTION public.claim_document_ingestion(doc_id uuid, worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed integer := 0;
BEGIN
  UPDATE public.documents
  SET embedding_status = 'processing',
      ingestion_lock_id = worker_id,
      ingestion_heartbeat = now(),
      updated_at = now()
  WHERE id = doc_id
    AND status = 'active'
    AND deleted_at IS NULL
    AND (
      embedding_status = 'pending'
      OR (embedding_status = 'processing' AND ingestion_heartbeat < now() - interval '10 minutes')
    );
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed > 0;
END;
$$;
