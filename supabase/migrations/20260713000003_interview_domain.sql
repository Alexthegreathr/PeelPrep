-- PeelPrep migration 003 — Phase 3: interview domain (docs/DATABASE.md §3).
-- candidate_documents, interviews, interviewers, interview_sources,
-- interview_documents, saved_sources + profiles.default_resume_id.
--
-- Ownership is denormalized: every user-owned table carries
-- `user_id references profiles(id) on delete cascade` so RLS stays a simple,
-- indexed `user_id = auth.uid()` (DATABASE.md conventions). Parent FKs enforce
-- integrity independently.

-- ── Shared ownership guard ──────────────────────────────────────────────
-- Defense in depth beyond RLS with-check: a row's owner/id can never be
-- rewritten by a user (DATABASE.md §10 guard_protected_columns). Attached to
-- every owner-writable table via a DO block at the end of each domain
-- migration.
create or replace function public.guard_owned_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id is immutable';
    end if;
    if new.id is distinct from old.id then
      raise exception 'id is immutable';
    end if;
  end if;
  return new;
end;
$$;

-- ── Enums ───────────────────────────────────────────────────────────────
create type public.candidate_document_kind as enum (
  'resume', 'cover_letter', 'portfolio_note', 'other'
);
create type public.document_extraction_status as enum (
  'pending', 'succeeded', 'failed'
);
create type public.interview_status as enum (
  'draft', 'preparing', 'completed', 'archived'
);
create type public.employment_type as enum (
  'full_time', 'part_time', 'internship', 'contract', 'other'
);
create type public.interview_format as enum (
  'phone', 'video', 'onsite', 'take_home', 'other'
);
create type public.interview_stage as enum (
  'screen', 'technical', 'behavioral', 'panel', 'final', 'other'
);
create type public.interview_source_kind as enum (
  'job_description', 'company_info', 'interviewer_background',
  'candidate_note', 'document_text', 'url_reference'
);
create type public.interview_source_origin as enum (
  'user_provided', 'document_extract', 'mock_research'
);
create type public.interview_document_role as enum (
  'resume', 'cover_letter', 'other'
);

-- ── candidate_documents (user-level, reusable across interviews) ─────────
create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  kind public.candidate_document_kind not null default 'resume',
  title text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes int not null,
  extracted_text text,
  extraction_status public.document_extraction_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidate_documents_user_kind_idx
  on public.candidate_documents (user_id, kind);
create trigger candidate_documents_set_updated_at
  before update on public.candidate_documents
  for each row execute function public.set_updated_at();

-- profiles.default_resume_id (deferred from migration 001 until the FK target
-- exists — DATABASE.md §1).
alter table public.profiles
  add column default_resume_id uuid
    references public.candidate_documents (id) on delete set null;

-- ── interviews ──────────────────────────────────────────────────────────
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  status public.interview_status not null default 'draft',
  intake_step smallint not null default 1,
  company_name text not null default '',
  position_title text not null default '',
  job_description text,
  job_posting_url text,
  location text,
  employment_type public.employment_type,
  interview_at timestamptz,
  interview_timezone text,
  format public.interview_format,
  stage public.interview_stage,
  duration_minutes int,
  meeting_location text,
  portfolio_url text,
  notes text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interviews_user_status_idx on public.interviews (user_id, status);
create index interviews_user_interview_at_idx
  on public.interviews (user_id, interview_at);
create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

-- ── interviewers (many per interview; only public/professional fields) ───
create table public.interviewers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  name text not null,
  title text,
  public_profile_url text,
  manual_background text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interviewers_interview_idx on public.interviewers (interview_id);
create trigger interviewers_set_updated_at
  before update on public.interviewers
  for each row execute function public.set_updated_at();

-- ── interview_sources (grounding inputs, stored separately from AI output) ─
create table public.interview_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  kind public.interview_source_kind not null,
  origin public.interview_source_origin not null default 'user_provided',
  title text not null,
  content text,
  url text,
  document_id uuid references public.candidate_documents (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_sources_interview_kind_idx
  on public.interview_sources (interview_id, kind);
create trigger interview_sources_set_updated_at
  before update on public.interview_sources
  for each row execute function public.set_updated_at();

-- ── interview_documents (join: which documents an interview uses) ────────
create table public.interview_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  document_id uuid not null references public.candidate_documents (id) on delete cascade,
  role public.interview_document_role not null default 'resume',
  created_at timestamptz not null default now(),
  unique (interview_id, document_id)
);
create index interview_documents_interview_idx
  on public.interview_documents (interview_id);

-- ── saved_sources (user-curated / mock-research citations) ───────────────
create table public.saved_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid references public.interviews (id) on delete cascade,
  title text not null,
  url text,
  publisher text,
  published_at date,
  snippet text,
  created_at timestamptz not null default now()
);
create index saved_sources_interview_idx on public.saved_sources (interview_id);

-- ── RLS: full owner CRUD on every table here ─────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'candidate_documents', 'interviews', 'interviewers', 'interview_sources',
    'interview_documents', 'saved_sources'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$create policy "%1$s_select_own" on public.%1$I
      for select to authenticated using (user_id = (select auth.uid()))$f$, t);
    execute format($f$create policy "%1$s_insert_own" on public.%1$I
      for insert to authenticated with check (user_id = (select auth.uid()))$f$, t);
    execute format($f$create policy "%1$s_update_own" on public.%1$I
      for update to authenticated using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()))$f$, t);
    execute format($f$create policy "%1$s_delete_own" on public.%1$I
      for delete to authenticated using (user_id = (select auth.uid()))$f$, t);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'grant select, insert, update, delete on public.%I to service_role', t);
    -- Ownership immutability guard (interview_documents / saved_sources have
    -- no updated_at but still take the guard on any UPDATE).
    execute format($f$create trigger %1$s_guard_owned before update
      on public.%1$I for each row execute function public.guard_owned_row()$f$, t);
  end loop;
end $$;
