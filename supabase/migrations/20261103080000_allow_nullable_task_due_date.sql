-- Migration: Allow tasks without an explicit due date
-- Rule 3: Versioned migration file for Supabase CLI

ALTER TABLE public.student_tasks
  ALTER COLUMN due_date DROP NOT NULL;
