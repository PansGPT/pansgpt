-- ==============================================================================
-- Migration: 20260922000004_create_web_search_usage.sql
-- Description: Web search per-user daily quota tracking & atomic increment RPC
-- Reference: Section 8 (Roadmap 6B.13) & pansgpt-eli/backend/supabase_setup.sql
-- ==============================================================================

create table if not exists public.web_search_usage (
    user_id uuid not null references public.users(id) on delete cascade,
    date date not null default (now() at time zone 'utc')::date,
    count integer not null default 0 check (count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, date)
);

create index if not exists idx_web_search_usage_user_date on public.web_search_usage (user_id, date);

-- Atomic increment stored procedure with row-level lock safety
create or replace function public.increment_web_search_usage(p_user_id uuid, p_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    new_count integer;
begin
    insert into public.web_search_usage as wsu (user_id, date, count, updated_at)
    values (p_user_id, p_date, 1, now())
    on conflict (user_id, date)
    do update set count = wsu.count + 1, updated_at = now()
    returning count into new_count;

    return new_count;
end;
$$;

revoke all on function public.increment_web_search_usage(uuid, date) from public;
grant execute on function public.increment_web_search_usage(uuid, date) to service_role;
grant execute on function public.increment_web_search_usage(uuid, date) to authenticated;

alter table public.web_search_usage enable row level security;

drop policy if exists "web_search_usage_select_own" on public.web_search_usage;
drop policy if exists "web_search_usage_service_role_all" on public.web_search_usage;

create policy "web_search_usage_select_own"
on public.web_search_usage for select
to authenticated
using (user_id = auth.uid());

create policy "web_search_usage_service_role_all"
on public.web_search_usage for all
to service_role
using (true)
with check (true);
