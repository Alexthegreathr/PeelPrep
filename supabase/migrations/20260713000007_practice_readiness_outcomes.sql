-- PeelPrep migration 007 — Phase 3: practice, feedback, readiness, checklist,
-- outcomes (DATABASE.md §5, §6).

-- ── Enums ───────────────────────────────────────────────────────────────
-- practice_modality: 'text' only in beta; Phase 8B extends to audio/video.
create type public.practice_modality as enum ('text');
create type public.practice_session_status as enum (
  'in_progress', 'completed', 'abandoned'
);
create type public.practice_turn_role as enum ('interviewer', 'candidate');
create type public.practice_turn_type as enum (
  'question', 'followup', 'answer', 'wrapup', 'candidate_question'
);
create type public.answer_feedback_status as enum (
  'none', 'pending', 'ready', 'failed'
);
create type public.generation_feedback_target as enum (
  'brief_section', 'question', 'feedback', 'practice_turn', 'story'
);
create type public.generation_feedback_rating as enum ('up', 'down');
create type public.checklist_item_source as enum (
  'template', 'ai_suggested', 'user_added'
);
create type public.readiness_component_key as enum (
  'company_understanding', 'role_understanding', 'interviewer_context',
  'stories_prepared', 'questions_practiced', 'answer_quality', 'questions_to_ask'
);

-- ── practice_sessions ────────────────────────────────────────────────────
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  status public.practice_session_status not null default 'in_progress',
  config jsonb not null default '{}',
  modality public.practice_modality not null default 'text',
  summary_feedback jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index practice_sessions_user_interview_idx
  on public.practice_sessions (user_id, interview_id);
create trigger practice_sessions_set_updated_at
  before update on public.practice_sessions
  for each row execute function public.set_updated_at();

-- ── practice_turns (immutable transcript: owner select/insert only) ──────
create table public.practice_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  turn_index int not null,
  role public.practice_turn_role not null,
  turn_type public.practice_turn_type not null,
  content text not null,
  question_id uuid references public.questions (id) on delete set null,
  media_path text,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);
create index practice_turns_session_idx on public.practice_turns (session_id);
alter table public.practice_turns enable row level security;
create policy "practice_turns_select_own" on public.practice_turns
  for select to authenticated using (user_id = (select auth.uid()));
create policy "practice_turns_insert_own" on public.practice_turns
  for insert to authenticated with check (user_id = (select auth.uid()));
-- No update/delete policies: past turns are immutable (DATABASE.md §5).
grant select, insert on public.practice_turns to authenticated;
grant select, insert, update, delete on public.practice_turns to service_role;

-- ── answers (feedback-metering target) ───────────────────────────────────
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.practice_sessions (id) on delete cascade,
  turn_id uuid references public.practice_turns (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  text text not null,
  feedback_status public.answer_feedback_status not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index answers_user_created_idx on public.answers (user_id, created_at);
create trigger answers_set_updated_at
  before update on public.answers
  for each row execute function public.set_updated_at();

-- ── feedback (structured answer evaluation; server-written) ──────────────
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer_id uuid not null unique references public.answers (id) on delete cascade,
  rubric jsonb not null,
  worked_well text,
  unclear text,
  missing text,
  top_improvement text not null,
  improved_outline text,
  example_answer text,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "feedback_select_own" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.feedback to authenticated;
grant select, insert, update, delete on public.feedback to service_role;

-- ── generation_feedback (user thumbs on AI content) ─────────────────────
create table public.generation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.generation_feedback_target not null,
  target_id uuid not null,
  rating public.generation_feedback_rating not null,
  comment text,
  created_at timestamptz not null default now()
);
create index generation_feedback_target_idx
  on public.generation_feedback (target_type, target_id);

-- ── checklists / checklist_items ─────────────────────────────────────────
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null unique references public.interviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger checklists_set_updated_at
  before update on public.checklists
  for each row execute function public.set_updated_at();

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  label text not null,
  detail text,
  source public.checklist_item_source not null default 'user_added',
  completed_at timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checklist_items_checklist_idx
  on public.checklist_items (checklist_id);
create trigger checklist_items_set_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- ── readiness_scores / readiness_components (deterministic; server-written) ─
create table public.readiness_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null references public.interviews (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  computed_at timestamptz not null default now(),
  trigger_event text,
  recommended_action text,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index readiness_scores_interview_computed_idx
  on public.readiness_scores (interview_id, computed_at desc);
alter table public.readiness_scores enable row level security;
create policy "readiness_scores_select_own" on public.readiness_scores
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.readiness_scores to authenticated;
grant select, insert, update, delete on public.readiness_scores to service_role;

create table public.readiness_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score_id uuid not null references public.readiness_scores (id) on delete cascade,
  component public.readiness_component_key not null,
  raw_value numeric not null,
  weighted_points numeric not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  unique (score_id, component)
);
alter table public.readiness_components enable row level security;
create policy "readiness_components_select_own" on public.readiness_components
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.readiness_components to authenticated;
grant select, insert, update, delete on public.readiness_components to service_role;

-- ── outcomes (one per interview) ─────────────────────────────────────────
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid not null unique references public.interviews (id) on delete cascade,
  completed_on date,
  difficulty smallint check (difficulty between 1 and 5),
  questions_encountered text,
  went_well text,
  went_poorly text,
  confidence smallint check (confidence between 1 and 5),
  advanced boolean,
  received_offer boolean,
  private_notes text,
  lessons text,
  research_optin_snapshot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger outcomes_set_updated_at
  before update on public.outcomes
  for each row execute function public.set_updated_at();

-- ── RLS: full owner CRUD on the user-editable tables here ────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'practice_sessions', 'answers', 'generation_feedback',
    'checklists', 'checklist_items', 'outcomes'
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
    execute format($f$create trigger %1$s_guard_owned before update
      on public.%1$I for each row execute function public.guard_owned_row()$f$, t);
  end loop;
end $$;
