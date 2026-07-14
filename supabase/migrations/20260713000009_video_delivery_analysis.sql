-- PeelPrep migration 009 — Phase 8B: Video Delivery Analysis (DATABASE.md §5b).
--
-- Recorded-response delivery coaching. Design invariants: AGGREGATE measurements
-- only — no raw face/pose landmark frames are ever uploaded or stored; no
-- biometric identity templates exist anywhere. Raw video is uploaded only on an
-- explicit save; audio may be uploaded temporarily for transcription and is
-- deleted after processing. VDA contributes ZERO readiness weight.
--
-- Enum extensions are added here but only *used* at runtime, never within this
-- migration, so they are safe alongside the new tables (PG 17).

alter type public.consent_type add value if not exists 'vda_camera';
alter type public.consent_type add value if not exists 'vda_microphone';
alter type public.consent_type add value if not exists 'vda_recording';
alter type public.consent_type add value if not exists 'vda_media_upload';
alter type public.consent_type add value if not exists 'vda_ai_analysis';

alter type public.usage_feature add value if not exists 'delivery_feedback';
alter type public.usage_feature add value if not exists 'transcription';

alter type public.practice_modality add value if not exists 'audio';
alter type public.practice_modality add value if not exists 'video';

-- ── New enums ────────────────────────────────────────────────────────────
create type public.media_kind as enum ('audio', 'video');
create type public.media_retention as enum ('processing_only', 'saved');
create type public.media_processing_status as enum (
  'pending', 'processing', 'processed', 'failed'
);
create type public.delivery_analysis_status as enum (
  'pending', 'metrics_ready', 'feedback_ready', 'partial', 'failed'
);
create type public.transcript_source as enum ('stt_provider', 'mock', 'user_edited');
create type public.processing_job_kind as enum ('transcription', 'delivery_feedback');
create type public.processing_job_status as enum (
  'queued', 'running', 'succeeded', 'failed'
);

-- ── media_assets (one row per uploaded/saved media object) ───────────────
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  answer_id uuid references public.answers (id) on delete cascade,
  media_kind public.media_kind not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes int not null,
  duration_seconds numeric,
  processing_status public.media_processing_status not null default 'pending',
  retention public.media_retention not null default 'processing_only',
  retention_expires_at timestamptz,
  recording_consent_at timestamptz not null,
  upload_consent_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_assets_user_idx on public.media_assets (user_id);
create index media_assets_session_idx on public.media_assets (session_id);
create index media_assets_retention_idx
  on public.media_assets (retention, retention_expires_at);
create index media_assets_processing_idx on public.media_assets (processing_status);
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();
alter table public.media_assets enable row level security;
create policy "media_assets_select_own" on public.media_assets
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.media_assets to authenticated;
grant select, insert, update, delete on public.media_assets to service_role;

-- ── transcripts ──────────────────────────────────────────────────────────
create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer_id uuid references public.answers (id) on delete cascade,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  source public.transcript_source not null default 'mock',
  provider text,
  text text not null,
  word_count int not null default 0,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transcripts_user_created_idx on public.transcripts (user_id, created_at);
create index transcripts_answer_idx on public.transcripts (answer_id);
create trigger transcripts_set_updated_at
  before update on public.transcripts
  for each row execute function public.set_updated_at();
alter table public.transcripts enable row level security;
create policy "transcripts_select_own" on public.transcripts
  for select to authenticated using (user_id = (select auth.uid()));
-- Transcript-review corrections + deletion are user-permitted.
create policy "transcripts_update_own" on public.transcripts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transcripts_delete_own" on public.transcripts
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, update, delete on public.transcripts to authenticated;
grant select, insert, update, delete on public.transcripts to service_role;
create trigger transcripts_guard_owned before update
  on public.transcripts for each row execute function public.guard_owned_row();

-- ── delivery_analyses (one per recorded answer) ──────────────────────────
create table public.delivery_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  answer_id uuid references public.answers (id) on delete cascade,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  transcript_id uuid references public.transcripts (id) on delete set null,
  status public.delivery_analysis_status not null default 'pending',
  coaching_goals text[] not null default '{}',
  missing_measurements text[] not null default '{}',
  analysis_consent_at timestamptz not null,
  feedback jsonb,
  ai_generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delivery_analyses_user_created_idx
  on public.delivery_analyses (user_id, created_at);
create index delivery_analyses_answer_idx on public.delivery_analyses (answer_id);
create trigger delivery_analyses_set_updated_at
  before update on public.delivery_analyses
  for each row execute function public.set_updated_at();
alter table public.delivery_analyses enable row level security;
create policy "delivery_analyses_select_own" on public.delivery_analyses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "delivery_analyses_delete_own" on public.delivery_analyses
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.delivery_analyses to authenticated;
grant select, insert, update, delete on public.delivery_analyses to service_role;

-- ── delivery_metrics (1:1 with analysis — aggregates only) ───────────────
create table public.delivery_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  analysis_id uuid not null unique references public.delivery_analyses (id) on delete cascade,
  camera_facing_pct numeric,
  frame_centering_pct numeric,
  head_turns_per_min numeric,
  posture_stability_score numeric,
  shoulder_angle_variation_deg numeric,
  movement_events_per_min numeric,
  speaking_pace_wpm numeric,
  pause_count int,
  avg_pause_ms numeric,
  longest_pause_ms numeric,
  filler_word_count int,
  filler_words_per_100 numeric,
  volume_variation_coeff numeric,
  answer_duration_seconds numeric,
  sample_coverage_pct numeric,
  lighting_flag boolean not null default false,
  framing_flag boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.delivery_metrics enable row level security;
create policy "delivery_metrics_select_own" on public.delivery_metrics
  for select to authenticated using (user_id = (select auth.uid()));
create policy "delivery_metrics_delete_own" on public.delivery_metrics
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.delivery_metrics to authenticated;
grant select, insert, update, delete on public.delivery_metrics to service_role;

-- ── processing_jobs (async step tracking; owner select only) ─────────────
create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.processing_job_kind not null,
  analysis_id uuid references public.delivery_analyses (id) on delete cascade,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  status public.processing_job_status not null default 'queued',
  attempts smallint not null default 0,
  error_code text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index processing_jobs_status_created_idx
  on public.processing_jobs (status, created_at);
create index processing_jobs_user_created_idx
  on public.processing_jobs (user_id, created_at);
create index processing_jobs_analysis_idx on public.processing_jobs (analysis_id);
create trigger processing_jobs_set_updated_at
  before update on public.processing_jobs
  for each row execute function public.set_updated_at();
alter table public.processing_jobs enable row level security;
create policy "processing_jobs_select_own" on public.processing_jobs
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.processing_jobs to authenticated;
grant select, insert, update, delete on public.processing_jobs to service_role;

-- ── Retention sweeper: delete expired processing_only media, tombstone rows ─
create or replace function public.sweep_expired_media()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  update public.media_assets
  set deleted_at = now(), updated_at = now()
  where retention = 'processing_only'
    and deleted_at is null
    and retention_expires_at is not null
    and retention_expires_at < now();
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
revoke execute on function public.sweep_expired_media() from public;
grant execute on function public.sweep_expired_media() to service_role;

-- ── Private media bucket + owner-prefix storage policies ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 524288000,
  array[
    'video/webm', 'video/mp4', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'
  ]
)
on conflict (id) do nothing;

create policy "media_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "media_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "media_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
