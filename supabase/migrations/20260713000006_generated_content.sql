-- PeelPrep migration 006 — Phase 3: generated content (DATABASE.md §4).
-- peel_briefs, brief_sections, brief_section_sources, questions, stories,
-- question_story_links.

-- ── Enums ───────────────────────────────────────────────────────────────
create type public.brief_status as enum (
  'empty', 'generating', 'partial', 'ready', 'failed'
);
create type public.brief_depth as enum ('basic', 'detailed');
create type public.brief_section_key as enum (
  'snapshot', 'company_overview', 'company_priorities', 'role_analysis',
  'interviewer_intel', 'likely_themes', 'questions_to_ask', 'risks_gaps',
  'next_action', 'condensed_summary'
);
create type public.brief_section_status as enum (
  'pending', 'generating', 'ready', 'failed', 'skipped'
);
create type public.question_category as enum (
  'introductory', 'behavioral', 'situational', 'role_specific', 'technical',
  'company_specific', 'interviewer_informed', 'motivation_fit', 'leadership',
  'conflict', 'failure', 'closing'
);
create type public.question_origin as enum (
  'predicted', 'user_added', 'outcome_import'
);
create type public.story_origin as enum ('user_created', 'ai_draft');
create type public.question_story_source as enum ('ai_recommended', 'user_linked');

-- ── peel_briefs (one per interview; server-managed) ──────────────────────
create table public.peel_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null unique references public.interviews (id) on delete cascade,
  status public.brief_status not null default 'empty',
  depth public.brief_depth not null default 'basic',
  generated_at timestamptz,
  inputs_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger peel_briefs_set_updated_at
  before update on public.peel_briefs
  for each row execute function public.set_updated_at();
alter table public.peel_briefs enable row level security;
-- Select-only for users; status/depth/generation are written by server code.
create policy "peel_briefs_select_own" on public.peel_briefs
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.peel_briefs to authenticated;
grant select, insert, update, delete on public.peel_briefs to service_role;

-- ── brief_sections (content jsonb validated by Zod before persistence) ───
create table public.brief_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brief_id uuid not null references public.peel_briefs (id) on delete cascade,
  section_key public.brief_section_key not null,
  status public.brief_section_status not null default 'pending',
  content jsonb,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  generated_at timestamptz,
  user_notes text,
  completed_at timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, section_key)
);
create index brief_sections_brief_idx on public.brief_sections (brief_id);
create trigger brief_sections_set_updated_at
  before update on public.brief_sections
  for each row execute function public.set_updated_at();

-- Users may update ONLY user_notes / completed_at; content/status are
-- server-written (DATABASE.md §4).
create or replace function public.guard_brief_sections_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.id is distinct from old.id
      or new.user_id is distinct from old.user_id
      or new.brief_id is distinct from old.brief_id
      or new.section_key is distinct from old.section_key
      or new.status is distinct from old.status
      or new.content is distinct from old.content
      or new.ai_generation_id is distinct from old.ai_generation_id
      or new.generated_at is distinct from old.generated_at
      or new.sort_order is distinct from old.sort_order
    then
      raise exception 'brief_sections: only user_notes and completed_at are user-editable';
    end if;
  end if;
  return new;
end;
$$;
create trigger brief_sections_guard_protected_columns
  before update on public.brief_sections
  for each row execute function public.guard_brief_sections_protected_columns();

alter table public.brief_sections enable row level security;
create policy "brief_sections_select_own" on public.brief_sections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "brief_sections_update_own" on public.brief_sections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, update on public.brief_sections to authenticated;
grant select, insert, update, delete on public.brief_sections to service_role;

-- ── brief_section_sources (source labels; server-written) ────────────────
create table public.brief_section_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  section_id uuid not null references public.brief_sections (id) on delete cascade,
  interview_source_id uuid references public.interview_sources (id) on delete cascade,
  saved_source_id uuid references public.saved_sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (interview_source_id is not null)::int
    + (saved_source_id is not null)::int = 1
  )
);
create index brief_section_sources_section_idx
  on public.brief_section_sources (section_id);
alter table public.brief_section_sources enable row level security;
create policy "brief_section_sources_select_own" on public.brief_section_sources
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.brief_section_sources to authenticated;
grant select, insert, update, delete on public.brief_section_sources to service_role;

-- ── questions (predicted + user-saved) ───────────────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  category public.question_category not null,
  text text not null,
  why_asked text,
  evaluates text,
  suggested_structure text,
  origin public.question_origin not null default 'predicted',
  saved boolean not null default false,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_interview_category_idx
  on public.questions (interview_id, category);
create index questions_user_saved_idx on public.questions (user_id, saved);
create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ── stories (reusable user-level bank; survive interview deletion) ───────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  situation text,
  task text,
  action text,
  result text,
  skills text[] not null default '{}',
  measurable_result text,
  resume_reference text,
  answers_questions text,
  tags text[] not null default '{}',
  origin public.story_origin not null default 'user_created',
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stories_user_idx on public.stories (user_id);
create index stories_tags_gin_idx on public.stories using gin (tags);
create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

-- ── question_story_links ─────────────────────────────────────────────────
create table public.question_story_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  source public.question_story_source not null default 'user_linked',
  created_at timestamptz not null default now(),
  unique (question_id, story_id)
);
create index question_story_links_story_idx
  on public.question_story_links (story_id);

-- ── RLS: full owner CRUD on questions/stories/links ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['questions', 'stories', 'question_story_links'] loop
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
    execute format($f$create trigger %1$s_guard_owned before update
      on public.%1$I for each row execute function public.guard_owned_row()$f$, t);
  end loop;
end $$;
