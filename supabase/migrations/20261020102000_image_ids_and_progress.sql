BEGIN;
ALTER TABLE public.document_images ALTER COLUMN id SET DEFAULT public.uuid_generate_v7();
-- Realtime remains an optional transport; HTTP status polling is authoritative.
-- Do not publish private ingestion tables to browser subscriptions.
COMMENT ON COLUMN public.documents.embedding_status IS
  'Text phase status. Image completeness is separately reported by the status API; completed text may still have pending images.';
COMMIT;
