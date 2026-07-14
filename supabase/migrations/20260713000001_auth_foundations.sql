-- PeelPrep migration 001 — Phase 2 auth foundations.
-- Creates: profiles, user_consents, rate_limit_counters, the signup trigger,
-- shared updated_at trigger, protected-column guards, hit_rate_limit(), and
-- RLS policies (docs/DATABASE.md §1, §2 rate_limit_counters, §8, §10).
--
-- Phase 3 adds the remaining core tables and extends handle_new_user() to
-- also create the free `subscriptions` row (docs/DATABASE.md §10).

-- ── Enums ───────────────────────────────────────────────────────────────

create type public.user_role as enum ('user', 'admin');

-- Phase 8B (optional) later extends this enum with the five vda_* values.
create type public.consent_type as enum (
  'terms_of_service',
  'privacy_policy',
  'outcome_research_optin',
  'marketing_emails'
);

-- ── Shared trigger functions ────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles (1:1 with auth.users) ──────────────────────────────────────
-- default_resume_id is added in a later migration once candidate_documents
-- exists (FK target ships with Phase 3/4).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  timezone text not null default 'UTC',
  role public.user_role not null default 'user',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Users may update their own profile, but never their own role
-- (DATABASE.md §1: enforced with a trigger guard, not just policy shape).
create or replace function public.guard_profiles_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed by users';
    end if;
    if new.id is distinct from old.id then
      raise exception 'profiles.id cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_protected_columns
  before update on public.profiles
  for each row
  execute function public.guard_profiles_protected_columns();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No user insert/delete policies: rows are created by handle_new_user()
-- and removed by the auth.users cascade (DATABASE.md §1).

-- Table privileges. RLS is a row filter, not a grant: every role still needs
-- table privileges, and BYPASSRLS (service_role) does not confer them.
--   anon:          nothing — profiles are never publicly readable.
--   authenticated: only the commands its policies back (select/update own row);
--                  no insert/delete, matching the absent policies above.
--   service_role:  the server-only admin client (src/lib/supabase/admin.ts,
--                  DATABASE.md §8.4) — deletion/export/seeding need full CRUD.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- ── user_consents ───────────────────────────────────────────────────────

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type public.consent_type not null,
  version text not null,
  granted boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, consent_type, version)
);

create index user_consents_user_type_idx
  on public.user_consents (user_id, consent_type);

-- Users may only revoke (set revoked_at) on their own rows; the identity of
-- a recorded consent is immutable (DATABASE.md §1 user_consents).
create or replace function public.guard_user_consents_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.user_id is distinct from old.user_id
      or new.consent_type is distinct from old.consent_type
      or new.version is distinct from old.version
      or new.granted_at is distinct from old.granted_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'user_consents rows are immutable except granted/revoked_at';
    end if;
  end if;
  return new;
end;
$$;

create trigger user_consents_guard_protected_columns
  before update on public.user_consents
  for each row
  execute function public.guard_user_consents_protected_columns();

alter table public.user_consents enable row level security;

create policy "user_consents_select_own"
  on public.user_consents
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_consents_insert_own"
  on public.user_consents
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_consents_update_own"
  on public.user_consents
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No user delete policy: consent history is retained (revocation is an update).

-- Table privileges (see the profiles note above for the rationale).
--   authenticated: select/insert/update own rows (no delete — history is kept).
--   service_role:  full CRUD for signup consent capture and deletion/export.
grant select, insert, update on public.user_consents to authenticated;
grant select, insert, update, delete on public.user_consents to service_role;

-- ── rate_limit_counters (fixed-window limiter) ──────────────────────────

create table public.rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limit_counters enable row level security;
-- Deny-by-default: no user policies and, deliberately, no table grants to any
-- role. Reached only through hit_rate_limit() below, whose security-definer
-- owner supplies the privileges; anon/authenticated/service_role never touch
-- this table directly.

-- Atomic fixed-window rate limiting (SECURITY.md §7, DATABASE.md §2).
-- Returns true when the hit is allowed, false when the limit is exceeded.
create or replace function public.hit_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max_hits int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters as c (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = c.count + 1
  returning c.count into v_count;

  return v_count <= p_max_hits;
end;
$$;

revoke execute on function public.hit_rate_limit(text, int, int) from public;
revoke execute on function public.hit_rate_limit(text, int, int) from anon;
revoke execute on function public.hit_rate_limit(text, int, int) from authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- ── Signup trigger ──────────────────────────────────────────────────────
-- Phase 3 extends this to also insert the free `subscriptions` row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
