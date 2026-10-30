-- Minimal pre-quiz baseline for isolated PostgreSQL 18 transaction tests.
-- Full Supabase migration replay remains covered by the database-contracts CI job.
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE TYPE public.university_level AS ENUM ('100','200','300','400','500','600');
CREATE TYPE public.user_role AS ENUM ('student','lecturer','university_admin','super_admin');
CREATE TYPE public.quiz_job_status AS ENUM ('queued','retrieving','generating','saving','completed','failed','cancelled');
CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid LANGUAGE sql VOLATILE AS 'SELECT uuidv7()';
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE public.universities(id uuid PRIMARY KEY DEFAULT uuidv7());
CREATE TABLE public.users(id uuid PRIMARY KEY DEFAULT uuidv7(),email text,roles public.user_role[] NOT NULL DEFAULT '{student}',university_id uuid REFERENCES public.universities(id),current_level public.university_level,deleted_at timestamptz);
CREATE TABLE public.documents(id uuid PRIMARY KEY DEFAULT uuidv7(),university_id uuid REFERENCES public.universities(id),title text,course_code text,course_title text,topic text,status text DEFAULT 'active',embedding_status text DEFAULT 'completed',target_levels public.university_level[] DEFAULT '{}',deleted_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE public.exam_restrictions(id uuid PRIMARY KEY DEFAULT uuidv7(),university_id uuid,level public.university_level,course_code text,status text,start_time timestamptz,end_time timestamptz);
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;

CREATE TABLE public.document_chunks(id uuid PRIMARY KEY DEFAULT uuidv7(), document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE, content text NOT NULL, page_start integer, chunk_index integer);
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
