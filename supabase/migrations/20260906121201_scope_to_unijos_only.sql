-- ==============================================================================
-- Migration: 20260906121201_scope_to_unijos_only.sql
-- Purpose: Scope platform strictly to University of Jos (UNIJOS) as the sole institution.
-- ==============================================================================

-- 1. Ensure UNIJOS exists and is active
INSERT INTO public.universities (name, short_name, slug, state, country, status)
VALUES ('University of Jos', 'UNIJOS', 'unijos', 'Plateau', 'Nigeria', 'active')
ON CONFLICT (lower(name)) DO UPDATE SET
  short_name = 'UNIJOS',
  slug = 'unijos',
  state = 'Plateau',
  country = 'Nigeria',
  status = 'active';

-- 2. Remove all non-UNIJOS universities
DELETE FROM public.universities
WHERE short_name != 'UNIJOS';
