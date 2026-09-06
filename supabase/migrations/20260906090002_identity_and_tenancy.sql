-- ==============================================================================
-- Migration: 20260906090002_identity_and_tenancy.sql
-- Purpose: Institutional tenancy, academic sessions, unified profiles, and invite links.
-- ==============================================================================

-- 1. Universities (Multi-tenant isolation boundary)
CREATE TABLE IF NOT EXISTS public.universities (
  id          uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  name        text NOT NULL,
  short_name  text,
  slug        text NOT NULL UNIQUE,
  country     text NOT NULL DEFAULT 'Nigeria',
  state       text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS unq_universities_name_lower ON public.universities (lower(name));

CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Academic Terms (Active academic calendar per institution)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id                uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  university_id     uuid NOT NULL UNIQUE REFERENCES public.universities(id) ON DELETE CASCADE,
  academic_session  text NOT NULL, -- e.g. '2024/2025'
  semester          text NOT NULL CHECK (semester IN ('first', 'second')),
  updated_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Unified Users (Consolidates profiles, roles array, and academic cohort)
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL UNIQUE,
  first_name        text NOT NULL,
  last_name         text,
  avatar_key        text, -- Cloudflare R2 key
  university_id     uuid REFERENCES public.universities(id) ON DELETE RESTRICT,
  current_level     university_level,
  roles             user_role[] NOT NULL DEFAULT '{student}',
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  terms_accepted_at timestamptz,
  deleted_at        timestamptz, -- Soft delete grace period
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_university ON public.users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_roles ON public.users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Invitations (Controlled institutional onboarding)
CREATE TABLE IF NOT EXISTS public.invitations (
  id              uuid PRIMARY KEY DEFAULT public.uuid_generate_v7(),
  token           text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  university_id   uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  issued_by       uuid NOT NULL REFERENCES public.users(id),
  grant_roles     user_role[] NOT NULL DEFAULT '{student}',
  target_level    university_level,
  max_uses        integer NOT NULL DEFAULT 1, -- 0 = unlimited
  current_uses    integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token) WHERE is_active IS TRUE;
