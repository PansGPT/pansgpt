BEGIN;
ALTER TABLE public.ai_telemetry ADD COLUMN usage_source text NOT NULL DEFAULT 'unknown'
  CHECK (usage_source IN ('unknown','estimated','reported'));
COMMENT ON COLUMN public.ai_telemetry.usage_source IS
  'Estimated orchestration counts are not provider billing measurements. Reported provider usage is logged only when supplied.';
COMMIT;
