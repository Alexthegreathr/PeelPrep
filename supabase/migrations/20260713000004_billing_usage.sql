-- PeelPrep migration 004 — Phase 3: billing & usage (docs/DATABASE.md §2).
-- plans, subscriptions, stripe_webhook_events, usage_events + the atomic
-- reserve/settle ledger functions + the extended signup trigger.

-- ── Enums ───────────────────────────────────────────────────────────────
create type public.subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete'
);
-- Phase 8B (optional) later adds 'delivery_feedback' and 'transcription'.
create type public.usage_feature as enum (
  'brief_generate', 'section_regenerate', 'questions_generate', 'story_suggest',
  'practice_session', 'practice_turn', 'answer_feedback', 'readiness_advice'
);
create type public.usage_status as enum (
  'reserved', 'completed', 'refunded', 'failed'
);

-- ── plans (reference data; enforcement limits live in code, not here) ────
create table public.plans (
  key text primary key,
  name text not null,
  description text,
  stripe_price_id_monthly text,
  price_cents_monthly int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

insert into public.plans (key, name, description, price_cents_monthly) values
  ('free', 'Free', 'Get started: one Peel Brief and one active interview per month.', 0),
  ('plus', 'Plus', 'Unlimited interviews and briefs (fair use), full practice and story tools.', 1900),
  ('pro',  'Pro',  'Higher limits, advanced practice, and readiness analytics.', 3900);

alter table public.plans enable row level security;
create policy "plans_select_all" on public.plans
  for select to authenticated using (true);
grant select on public.plans to authenticated;
grant select, insert, update, delete on public.plans to service_role;

-- ── subscriptions (one per user; app's subscription source of truth) ─────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan_key text not null default 'free' references public.plans (key),
  status public.subscription_status not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
-- User may read own subscription; ALL writes go through verified Stripe
-- webhooks / admin tooling via the service role (DATABASE.md §2). No user
-- write policy means users cannot alter plan/billing state.
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

-- ── stripe_webhook_events (idempotency ledger; service-role only) ────────
create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
grant select, insert, update, delete on public.stripe_webhook_events to service_role;

-- ── usage_events (append-only ledger; the enforcement record) ────────────
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  interview_id uuid references public.interviews (id) on delete set null,
  feature public.usage_feature not null,
  quantity int not null default 1,
  status public.usage_status not null default 'reserved',
  period_start timestamptz not null,
  period_end timestamptz not null,
  provider text,
  model text,
  input_tokens int,
  output_tokens int,
  estimated_cost_cents numeric(10, 4),
  ai_generation_id uuid, -- FK to ai_generations added in migration 005
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index usage_events_quota_idx
  on public.usage_events (user_id, feature, period_start);
create index usage_events_status_created_idx
  on public.usage_events (status, created_at);
create index usage_events_interview_idx on public.usage_events (interview_id);
create trigger usage_events_set_updated_at
  before update on public.usage_events
  for each row execute function public.set_updated_at();

alter table public.usage_events enable row level security;
-- User may read own usage (dashboard "remaining"); writes only via the ledger
-- functions below (DATABASE.md §2).
create policy "usage_events_select_own" on public.usage_events
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.usage_events to authenticated;
grant select, insert, update, delete on public.usage_events to service_role;

-- ── Atomic usage ledger functions ───────────────────────────────────────
-- reserve → run → settle. Reservation happens BEFORE the provider call so
-- concurrent requests cannot double-spend (AI_ARCHITECTURE.md §8). Raises
-- 'usage_limit_exceeded' when the reservation would exceed the passed limit;
-- the server owns plan config and passes p_limit.
create or replace function public.reserve_usage(
  p_user uuid,
  p_feature public.usage_feature,
  p_quantity int,
  p_limit int,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_interview uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used int;
  v_event_id uuid;
begin
  -- Per-user, transaction-scoped lock: two concurrent reservations for the
  -- same user serialize, so exactly one can win a limit-1 race (DATABASE.md §2).
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select coalesce(sum(quantity), 0) into v_used
  from public.usage_events
  where user_id = p_user
    and feature = p_feature
    and period_start = p_period_start
    and (
      status = 'completed'
      or (status = 'reserved' and created_at > now() - interval '15 minutes')
    );

  if v_used + p_quantity > p_limit then
    raise exception 'usage_limit_exceeded'
      using errcode = 'check_violation',
            detail = format('feature=%s used=%s limit=%s', p_feature, v_used, p_limit);
  end if;

  insert into public.usage_events (
    user_id, interview_id, feature, quantity, status, period_start, period_end
  ) values (
    p_user, p_interview, p_feature, p_quantity, 'reserved',
    p_period_start, p_period_end
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

-- settle_usage transitions a reserved row to completed | refunded | failed and
-- records provider metadata. The `status = 'reserved'` guard makes it a no-op
-- on an already-settled event (idempotent).
create or replace function public.settle_usage(
  p_event_id uuid,
  p_status public.usage_status,
  p_input_tokens int default null,
  p_output_tokens int default null,
  p_cost_cents numeric default null,
  p_model text default null,
  p_provider text default null,
  p_generation_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  if p_status not in ('completed', 'refunded', 'failed') then
    raise exception 'invalid settle status: %', p_status;
  end if;
  update public.usage_events set
    status = p_status,
    input_tokens = coalesce(p_input_tokens, input_tokens),
    output_tokens = coalesce(p_output_tokens, output_tokens),
    estimated_cost_cents = coalesce(p_cost_cents, estimated_cost_cents),
    model = coalesce(p_model, model),
    provider = coalesce(p_provider, provider),
    ai_generation_id = coalesce(p_generation_id, ai_generation_id),
    updated_at = now()
  where id = p_event_id and status = 'reserved';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

-- Sweep stale reservations (>15 min) to refunded — run by a cleanup script.
create or replace function public.sweep_stale_usage_reservations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  update public.usage_events set status = 'refunded', updated_at = now()
  where status = 'reserved' and created_at < now() - interval '15 minutes';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- Ledger functions are called only from server code via the service role.
revoke execute on function public.reserve_usage(uuid, public.usage_feature, int, int, timestamptz, timestamptz, uuid) from public;
revoke execute on function public.settle_usage(uuid, public.usage_status, int, int, numeric, text, text, uuid) from public;
revoke execute on function public.sweep_stale_usage_reservations() from public;
grant execute on function public.reserve_usage(uuid, public.usage_feature, int, int, timestamptz, timestamptz, uuid) to service_role;
grant execute on function public.settle_usage(uuid, public.usage_status, int, int, numeric, text, text, uuid) to service_role;
grant execute on function public.sweep_stale_usage_reservations() to service_role;

-- ── Extend the signup trigger to create the free subscription row ────────
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

  insert into public.subscriptions (user_id, plan_key, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;
