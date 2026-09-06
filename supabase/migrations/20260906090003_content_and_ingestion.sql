-- ==============================================================================
-- Migration: 20260906090003_content_and_ingestion.sql
-- Purpose: Unified documents repository, 1536d HNSW vector chunks, sections,
--          cropped notes, and reader highlights.
-- ==============================================================================

-- 1. Documents (University-scoped content library)
CREATE TABLE IF NOT EXISTS public.documents (
  id                  uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id       uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  uploaded_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title               text NOT NULL,
  course_code         text NOT NULL,
  course_title        text NOT NULL,
  topic               text,
  lecturer_name       text,
  storage_key         text NOT NULL UNIQUE, -- Cloudflare R2 storage key
  converted_key       text,                 -- Cloudflare R2 converted slide PDF key
  file_size_bytes     bigint NOT NULL DEFAULT 0,
  mime_type           text NOT NULL DEFAULT 'application/pdf',
  page_count          integer NOT NULL DEFAULT 0,
  status              document_status NOT NULL DEFAULT 'pending_review',
  reviewed_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  review_note         text,
  target_levels       university_level[] NOT NULL DEFAULT '{}',
  academic_session    text,
  semester            text CHECK (semester IN ('first', 'second')),
  embedding_status    text NOT NULL DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
  embedding_progress  integer NOT NULL DEFAULT 0 CHECK (embedding_progress BETWEEN 0 AND 100),
  total_chunks        integer NOT NULL DEFAULT 0,
  ingestion_lock_id   uuid,
  ingestion_heartbeat timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_lookup ON public.documents(university_id, course_code, status);
CREATE INDEX IF NOT EXISTS idx_documents_ingestion ON public.documents(embedding_status) WHERE embedding_status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_documents_deleted ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Document Chunks (1536d vector embeddings for gemini-embedding-002)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id          uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content     text NOT NULL,
  content_fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  page_start  integer,
  page_end    integer,
  chunk_index integer NOT NULL,
  embedding   vector(1536) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_hnsw ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON public.document_chunks USING gin(content_fts);

-- 3. Document Sections (Structured Learn Mode curriculum breakdown)
CREATE TABLE IF NOT EXISTS public.document_sections (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  section_index   integer NOT NULL,
  title           text NOT NULL,
  page_start      integer NOT NULL,
  page_end        integer NOT NULL,
  summary         text NOT NULL,
  explanation     text,
  check_questions jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_sections_doc ON public.document_sections(document_id, section_index);

-- 4. Document Notes (Cropped PDF snips and commentary)
CREATE TABLE IF NOT EXISTS public.document_notes (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  storage_key     text NOT NULL, -- R2 key for cropped screenshot
  ai_explanation  text,
  category        text DEFAULT 'Key Point' CHECK (category IN ('Definition', 'Key Point', 'Formula', 'Important')),
  page_number     integer,
  user_annotation text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_notes_user_doc ON public.document_notes(user_id, document_id);

CREATE TRIGGER trg_document_notes_updated_at
  BEFORE UPDATE ON public.document_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Document Highlights (Persistent text selections and bounding boxes)
CREATE TABLE IF NOT EXISTS public.document_highlights (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  page_number     integer NOT NULL,
  color           text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  selected_text   text NOT NULL,
  rects           jsonb NOT NULL, -- Array of [{ x, y, width, height }] relative coordinates
  note_text       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_highlights_lookup ON public.document_highlights(user_id, document_id, page_number);

CREATE TRIGGER trg_document_highlights_updated_at
  BEFORE UPDATE ON public.document_highlights
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
