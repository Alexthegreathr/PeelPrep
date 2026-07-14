-- PeelPrep migration 002 — Phase 3: organizations (future-proofing).
--
-- The beta ships NO organization UI, but owned tables carry a nullable
-- organization_id from the first core migration so org features can be added
-- later without reshaping the model (docs/DATABASE.md §1, ARCHITECTURE.md §7).
-- RLS is deny-by-default: no user-facing policies exist in the beta — these
-- tables are reachable only by the service role. Beta code never reads them.

create type public.organization_kind as enum (
  'university',
  'bootcamp',
  'career_center',
  'employer_program',
  'other'
);

create type public.org_member_role as enum ('member', 'org_admin');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.organization_kind not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.org_member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members (user_id);

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row
  execute function public.set_updated_at();

-- RLS enabled, deny-by-default: NO policies grant user access in the beta.
-- Org features later expand access by ADDING policies (DATABASE.md §8.6),
-- never by loosening owner policies elsewhere.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Service-role only (BYPASSRLS still needs table privileges; DATABASE.md §8).
grant select, insert, update, delete on public.organizations to service_role;
grant select, insert, update, delete on public.organization_members to service_role;
