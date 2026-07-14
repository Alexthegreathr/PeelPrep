-- PeelPrep migration 005 — Phase 3: AI bookkeeping & audit (DATABASE.md §7).
-- prompt_versions, ai_generations, audit_logs. Metadata only — no prompt/
-- response bodies, no chain-of-thought (spec prohibition). All service-written.

create type public.ai_generation_status as enum (
  'succeeded', 'validation_failed', 'provider_error', 'refused', 'timeout'
);
create type public.audit_actor as enum (
  'user', 'system', 'admin', 'stripe_webhook'
);

-- ── prompt_versions (traceability: which prompt produced which artifact) ─
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  version text not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (task, version, content_hash)
);
alter table public.prompt_versions enable row level security;
grant select, insert, update, delete on public.prompt_versions to service_role;

-- Idempotent upsert returning the row id (used by the prompt registry, Ph5).
create or replace function public.upsert_prompt_version(
  p_task text, p_version text, p_content_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.prompt_versions (task, version, content_hash)
  values (p_task, p_version, p_content_hash)
  on conflict (task, version, content_hash)
    do update set task = excluded.task
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.upsert_prompt_version(text, text, text) from public;
grant execute on function public.upsert_prompt_version(text, text, text) to service_role;

-- ── ai_generations (metadata for every AI call) ─────────────────────────
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interview_id uuid references public.interviews (id) on delete set null,
  task text not null,
  provider text not null,
  model text not null,
  prompt_version_id uuid references public.prompt_versions (id),
  status public.ai_generation_status not null,
  input_tokens int,
  output_tokens int,
  estimated_cost_cents numeric(10, 4),
  duration_ms int,
  error_code text,
  usage_event_id uuid references public.usage_events (id) on delete set null,
  created_at timestamptz not null default now()
);
create index ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at);
create index ai_generations_task_created_idx
  on public.ai_generations (task, created_at);
-- No user policies: service-written, surfaced later via admin (DATABASE.md §7).
alter table public.ai_generations enable row level security;
grant select, insert, update, delete on public.ai_generations to service_role;

-- Complete the deferred circular FK: usage_events.ai_generation_id.
alter table public.usage_events
  add constraint usage_events_ai_generation_id_fkey
  foreign key (ai_generation_id)
  references public.ai_generations (id) on delete set null;

-- ── audit_logs (ids/counters only — never content; survive account delete) ─
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  actor public.audit_actor not null default 'user',
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_user_created_idx on public.audit_logs (user_id, created_at);
create index audit_logs_action_created_idx on public.audit_logs (action, created_at);
-- Service-written, no user policies in the beta (DATABASE.md §7).
alter table public.audit_logs enable row level security;
grant select, insert, update, delete on public.audit_logs to service_role;
