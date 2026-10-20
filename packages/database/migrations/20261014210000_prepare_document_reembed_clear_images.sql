-- ==============================================================================
-- Migration: 20261014210000_prepare_document_reembed_clear_images.sql
-- Purpose: Update prepare_document_reembed to clear document_images on re-embed [PHASE2 FIX]
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prepare_document_reembed(doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.document_chunks WHERE document_id = doc_id;
  DELETE FROM public.document_elements WHERE document_id = doc_id;
  DELETE FROM public.document_segments WHERE document_id = doc_id;
  DELETE FROM public.document_pages WHERE document_id = doc_id;
  DELETE FROM public.document_images WHERE document_id = doc_id;
  UPDATE public.documents
  SET
    embedding_status = 'pending',
    embedding_progress = 0,
    total_chunks = 0,
    updated_at = now()
  WHERE id = doc_id;
END;
$function$;
