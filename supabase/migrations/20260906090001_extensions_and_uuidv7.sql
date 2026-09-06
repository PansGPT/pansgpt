-- ==============================================================================
-- Migration: 20260906090001_extensions_and_uuidv7.sql
-- Purpose: Enable core extensions, custom enum types, RFC 9562 UUIDv7 generator,
--          and standard updated_at trigger function.
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE university_level AS ENUM ('100', '200', '300', '400', '500', '600');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'university_admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending_review', 'active', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ai_provider AS ENUM ('google', 'groq', 'openrouter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE interaction_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE skill_type AS ENUM ('prompt', 'python_tool', 'api_webhook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE quiz_job_status AS ENUM ('queued', 'retrieving', 'generating', 'saving', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. RFC 9562 UUIDv7 Function (Time-ordered primary keys)
CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_unix_ts bigint := (extract(epoch from v_time) * 1000)::bigint;
  v_rand bytea := gen_random_bytes(10);
  v_bytes bytea;
BEGIN
  v_bytes := substring(int8send(v_unix_ts) from 3 for 6) ||
             set_byte(
               set_byte(v_rand, 0, (get_byte(v_rand, 0) & 15) | 112),
               2, (get_byte(v_rand, 2) & 63) | 128
             );
  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
