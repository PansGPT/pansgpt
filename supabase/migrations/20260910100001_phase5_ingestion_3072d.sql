-- ==============================================================================
-- Migration: 20260910100001_phase5_ingestion_3072d.sql
-- Purpose: Upgrade document_chunks embedding to vector(3072) (gemini-embedding-002),
--          create document_pages, document_segments, document_elements,
--          update match RPCs to vector(3072), add prepare_document_reembed.
-- ==============================================================================

-- 1. Create document_pages (Per-page text layer detection tracking)
CREATE TABLE IF NOT EXISTS public.document_pages (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number     integer NOT NULL,
  has_text_layer  boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_document_pages_lookup ON public.document_pages(document_id, page_number);

-- 2. Create document_segments (AI Hierarchy pass & topics)
CREATE TABLE IF NOT EXISTS public.document_segments (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  title           text NOT NULL,
  title_source    text NOT NULL CHECK (title_source IN ('explicit', 'synthesized', 'inherited')),
  start_page      integer NOT NULL,
  end_page        integer NOT NULL,
  order_index     integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_segments_lookup ON public.document_segments(document_id, order_index);

-- 3. Create document_elements (Raw extracted primitives: text, tables, diagrams)
CREATE TABLE IF NOT EXISTS public.document_elements (
  id                uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  segment_id        uuid NOT NULL REFERENCES public.document_segments(id) ON DELETE CASCADE,
  document_id       uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number       integer NOT NULL,
  content_type      text NOT NULL CHECK (content_type IN ('text', 'diagram', 'table')),
  extraction_method text NOT NULL CHECK (extraction_method IN ('native', 'ocr', 'vision_transcription', 'vision_description', 'structural_table', 'vision_table')),
  raw_content       text NOT NULL,
  table_data        jsonb,
  order_index       integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_elements_segment ON public.document_elements(segment_id, order_index);

-- 4. Upgrade document_chunks embedding to vector(3072) and link segment/element
DROP INDEX IF EXISTS public.idx_document_chunks_hnsw;

ALTER TABLE public.document_chunks
  ALTER COLUMN embedding TYPE vector(3072);

-- Note: pgvector standard vector_cosine_ops has a 2000-dim limit.
-- Using (embedding::halfvec(3072)) halfvec_cosine_ops allows HNSW indexing up to 4000 dims.
CREATE INDEX IF NOT EXISTS idx_document_chunks_hnsw ON public.document_chunks
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS segment_id uuid REFERENCES public.document_segments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS element_id uuid REFERENCES public.document_elements(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_document_chunks_segment ON public.document_chunks(document_id, segment_id);

-- 5. Update RPC Functions for vector(3072)
DROP FUNCTION IF EXISTS public.match_document_chunks(vector(1536), double precision, integer, uuid);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(3072),
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
    1 - ((dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) AS similarity
  FROM public.document_chunks dc
  WHERE dc.document_id = doc_id
    AND 1 - ((dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) >= match_threshold
  ORDER BY (dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072)) ASC
  LIMIT match_count;
$$;

DROP FUNCTION IF EXISTS public.match_documents_global(vector(1536), double precision, integer, uuid[]);

CREATE OR REPLACE FUNCTION public.match_documents_global(
  query_embedding vector(3072),
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
    1 - ((dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) AS similarity
  FROM public.document_chunks dc
  WHERE dc.document_id = ANY(doc_ids)
    AND 1 - ((dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) >= match_threshold
  ORDER BY (dc.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072)) ASC
  LIMIT match_count;
$$;

-- 6. RPC: Atomic re-embedding flush procedure
CREATE OR REPLACE FUNCTION public.prepare_document_reembed(doc_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.document_chunks WHERE document_id = doc_id;
  DELETE FROM public.document_elements WHERE document_id = doc_id;
  DELETE FROM public.document_segments WHERE document_id = doc_id;
  DELETE FROM public.document_pages WHERE document_id = doc_id;
  UPDATE public.documents
  SET
    embedding_status = 'pending',
    embedding_progress = 0,
    total_chunks = 0,
    updated_at = now()
  WHERE id = doc_id;
END;
$$;

-- 7. Row Level Security for new tables
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_select ON public.document_pages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_pages.document_id
        AND d.deleted_at IS NULL
        AND (
          (d.university_id = public.current_user_university_id() AND d.status = 'active')
          OR public.current_user_has_role('super_admin')
          OR public.current_user_has_role('university_admin')
        )
    )
  );

CREATE POLICY segments_select ON public.document_segments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_segments.document_id
        AND d.deleted_at IS NULL
        AND (
          (d.university_id = public.current_user_university_id() AND d.status = 'active')
          OR public.current_user_has_role('super_admin')
          OR public.current_user_has_role('university_admin')
        )
    )
  );

CREATE POLICY elements_select ON public.document_elements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_elements.document_id
        AND d.deleted_at IS NULL
        AND (
          (d.university_id = public.current_user_university_id() AND d.status = 'active')
          OR public.current_user_has_role('super_admin')
          OR public.current_user_has_role('university_admin')
        )
    )
  );
