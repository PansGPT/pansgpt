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
