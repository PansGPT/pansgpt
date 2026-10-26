-- ==============================================================================
-- Migration: 20261013233000_document_images.sql
-- Purpose: Two-phase ingestion queue for document images & full-page vision [IMAGES PHASE]
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.document_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    page_number int NOT NULL,
    content_hash text NOT NULL,
    source text NOT NULL CHECK (source IN ('embedded', 'full_page')),
    width int,
    height int,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed', 'skipped')),
    attempts int NOT NULL DEFAULT 0,
    route text,
    description text,
    last_error text,
    element_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, content_hash, source)
);
ALTER TABLE public.document_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_document_images_document_status
    ON public.document_images (document_id, status);

ALTER TABLE public.document_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.document_images FROM public, anon, authenticated;

COMMIT;
