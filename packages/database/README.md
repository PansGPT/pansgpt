# @pansgpt/database

Contains the single source of truth for all Supabase database migrations, PostgreSQL functions, Row-Level Security (RLS) policies, and seed data.

## Migration Conventions
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Always verify locally first via `supabase db reset` before applying to staging or production.
