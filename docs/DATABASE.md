# PeelPrep — Database Design (Supabase PostgreSQL)

Status: **Approved 2026-07-13** — no migrations exist yet; core tables are created in Phases 2–3, and the §5b Video Delivery Analysis tables ship with optional Phase 8B.

Conventions used throughout:

- All primary keys are `uuid` (`gen_random_uuid()`), all timestamps are `timestamptz`.
- Every table has `created_at timestamptz not null default now()`; mutable tables also have `updated_at` maintained by a shared `set_updated_at()` trigger.
- **Ownership is denormalized:** every user-owned table carries `user_id uuid not null references profiles(id) on delete cascade`, even when reachable through a parent. This keeps RLS policies simple (`user_id = auth.uid()`), fast (indexed), and avoids policy-time joins. Parent FKs still enforce integrity.
- `organization_id uuid null references organizations(id) on delete set null` appears on institution-relevant tables (interviews, candidate_documents, usage_events) for future org features. It is unused in the beta.
- There is **no application `users` table.** Identities live in Supabase `auth.users`; `profiles` is 1:1 with it.
- Enums are Postgres enum types (listed with each table).

---

## 1. Identity & account

### `profiles` (1:1 with `auth.users`)
| column | type | notes |
|---|---|---|
| id | uuid PK, FK → `auth.users(id)` **on delete cascade** | created by `handle_new_user()` trigger on signup |
| full_name | text null | |
| headline | text null | e.g. "CS senior seeking SWE roles" |
| timezone | text not null default 'UTC' | IANA zone for scheduling display |
| role | `user_role` enum: `user` \| `admin`, default `user` | admin checked server-side only |
| default_resume_id | uuid null FK → candidate_documents(id) on delete set null | convenience for intake step 4 |
| onboarding_completed_at | timestamptz null | drives first-run empty states |
| created_at / updated_at | timestamptz | |

Indexes: PK only. RLS: user selects/updates own row (`id = auth.uid()`); no user insert/delete (trigger + auth cascade handle those). `role` is **not** updatable through the user policy (enforced with a trigger guard).

### `organizations` / `organization_members` (future-proofing, no beta UI)
`organizations`: id, name text not null, kind enum (`university`, `bootcamp`, `career_center`, `employer_program`, `other`), created_at/updated_at.
`organization_members`: id, organization_id FK on delete cascade, user_id FK → profiles on delete cascade, member_role enum (`member`,`org_admin`), unique (organization_id, user_id).
RLS in beta: **no policies granting user access** (service role only) — deny-by-default until org features ship. Beta code never reads them.

### `user_consents`
| column | type |
|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles on delete cascade |
| consent_type | enum: `terms_of_service` \| `privacy_policy` \| `outcome_research_optin` \| `marketing_emails` — Phase 8B adds `vda_camera` \| `vda_microphone` \| `vda_recording` \| `vda_media_upload` \| `vda_ai_analysis` |
| version | text not null (document version accepted, e.g. `2026-07-01`) |
| granted | boolean not null |
| granted_at / revoked_at | timestamptz |

Unique: `(user_id, consent_type, version)`. Index on `(user_id, consent_type)`. RLS: user select/insert own; revocation updates `revoked_at` on own row. `outcome_research_optin` defaults to absent (= not granted); nothing is trained on user content without it (see SECURITY.md §9). The five `vda_*` consents (Video Delivery Analysis, Phase 8B) are separate, all default-absent, revocable in settings, and each gate a distinct capability — camera access, microphone access, recording, uploading or saving media (`vda_media_upload` covers **any** media leaving the device, including temporary transcription uploads), and AI analysis (SECURITY.md §13). Media rows additionally snapshot the acknowledgment timestamps in force when a recording was made.

---

## 2. Billing & usage

### `plans` (reference data, seeded by migration)
| column | type | notes |
|---|---|---|
| key | text PK: `free` \| `plus` \| `pro` | |
| name / description | text | display |
| stripe_price_id_monthly | text null | null for free; set per environment |
| price_cents_monthly | int not null | display only |
| is_active | boolean default true | |

**Decision:** enforcement limits (briefs/month, feedback/month, …) live in versioned server code (`src/lib/billing/plans.ts`), not in this table — one type-safe source of truth per the spec's "centralized server-side configuration." The DB table maps Stripe price ids → plan keys and feeds display. RLS: readable by authenticated users; writable by service role only.

### `subscriptions` (one row per user; the app's subscription source of truth)
| column | type | notes |
|---|---|---|
| id | uuid PK |
| user_id | uuid unique, FK → profiles on delete cascade |
| plan_key | text not null default 'free' FK → plans(key) |
| status | enum: `active` \| `trialing` \| `past_due` \| `canceled` \| `incomplete`, default `active` | free = `active` |
| stripe_customer_id | text unique null |
| stripe_subscription_id | text unique null |
| current_period_start / current_period_end | timestamptz null | from Stripe for paid plans |
| cancel_at_period_end | boolean default false |
| trial_end | timestamptz null | trial-ready, unused in beta |
| created_at / updated_at | | |

Created with `plan_key='free'` by the signup trigger. Mutated **only** by verified Stripe webhook processing and admin tooling (service role). Indexes: unique(user_id), unique(stripe_customer_id), unique(stripe_subscription_id). RLS: user selects own row; no user writes. On `past_due`/`canceled` the effective plan downgrades to free limits in code — data is never deleted on downgrade (spec: never delete work when a limit is hit).

### `stripe_webhook_events` (idempotency ledger)
| column | type |
|---|---|
| id | text PK (Stripe event id, `evt_…`) |
| type | text not null |
| payload | jsonb not null |
| processed_at | timestamptz null |
| error | text null |

Insert-first with `on conflict do nothing` → replays/retries become no-ops; processing errors recorded for replay. Service role only (no user policies). Retention: prune > 90 days (deferred housekeeping job).

### `usage_events` (append-only usage ledger — the enforcement record)
| column | type | notes |
|---|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles on delete cascade |
| organization_id | uuid null | future |
| interview_id | uuid null FK → interviews on delete set null | kept for spend history even if interview deleted |
| feature | enum: `brief_generate` \| `section_regenerate` \| `questions_generate` \| `story_suggest` \| `practice_session` \| `practice_turn` \| `answer_feedback` \| `readiness_advice` — Phase 8B adds `delivery_feedback` \| `transcription` |
| quantity | int not null default 1 | e.g. number of questions generated |
| status | enum: `reserved` \| `completed` \| `refunded` \| `failed` |
| period_start / period_end | timestamptz not null | billing period the event counts against |
| provider / model | text null | filled on completion |
| input_tokens / output_tokens | int null |
| estimated_cost_cents | numeric(10,4) null |
| ai_generation_id | uuid null FK → ai_generations on delete set null |
| created_at / updated_at | | `updated_at` = status transitions |

Indexes: `(user_id, feature, period_start)` (the quota query), `(status, created_at)` (stale-reservation sweep), `(interview_id)`.
Writes happen **only** through two SECURITY DEFINER functions (called from server code):

- `reserve_usage(p_user, p_feature, p_quantity, p_limit, p_period_start, p_period_end, p_interview)` — takes a per-user advisory lock, counts `reserved + completed` quantity in-period, compares against the limit passed in by server code (which owns plan config), and inserts a `reserved` row or raises `limit_exceeded`. Atomic — two concurrent requests cannot double-spend. The period is computed in server code: Stripe billing period for paid plans, UTC calendar month for free.
- `settle_usage(p_event_id, p_status, tokens/cost/model/generation)` — transitions `reserved → completed | refunded | failed` only.

Stale `reserved` rows older than 15 minutes are excluded by the quota count and swept to `refunded` by a cleanup script. RLS: user may **select** own rows (dashboard "usage remaining"); no direct user writes.

### `rate_limit_counters` (fixed-window rate limiting)
`key text`, `window_start timestamptz`, `count int` — PK `(key, window_start)`. Accessed only via `hit_rate_limit(key, window_seconds, max_hits)` SECURITY DEFINER function. Key shapes: `user:{id}:{action}`, `ip:{hash}:{action}`. No user policies. (Postgres-backed limiting is sufficient at beta scale; Redis/Upstash is a documented future swap — see SECURITY.md §7.)

---

## 3. Interview domain

### `candidate_documents` (résumés, cover letters, other materials)
| column | type | notes |
|---|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles on delete cascade |
| organization_id | uuid null | future |
| kind | enum: `resume` \| `cover_letter` \| `portfolio_note` \| `other` |
| title | text not null | user-facing label |
| storage_path | text not null | `{userId}/{documentId}/{sanitized-filename}` in the private `documents` bucket |
| mime_type | text not null | validated allowlist (PDF, DOCX, TXT, MD) |
| size_bytes | int not null | ≤ 5 MB |
| extracted_text | text null | server-side extraction at upload |
| extraction_status | enum: `pending` \| `succeeded` \| `failed` | on failure UI asks user to paste text |
| created_at / updated_at | | |

Documents are **user-level and reusable** across interviews (spec: "select or upload résumé"). Interviews reference them via `interview_documents`. Indexes: `(user_id, kind)`. RLS: full owner CRUD. Deleting a document also removes the storage object (application logic + audit entry).

### `interviews`
| column | type | notes |
|---|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles on delete cascade |
| organization_id | uuid null | future |
| status | enum: `draft` \| `preparing` \| `completed` \| `archived` | `draft` until intake confirmed; `preparing` = active prep; `completed` when outcome recorded; `archived` = user hid it |
| intake_step | smallint not null default 1 | resume-a-draft support (1–5) |
| company_name | text not null default '' | drafts may be partially blank |
| position_title | text not null default '' | |
| job_description | text null | pasted text (primary grounding source) |
| job_posting_url | text null | stored, **never auto-fetched** in beta (SSRF; see SECURITY.md) |
| location | text null | |
| employment_type | enum: `full_time` \| `part_time` \| `internship` \| `contract` \| `other`, null | |
| interview_at | timestamptz null | date + time |
| interview_timezone | text null | IANA, for display |
| format | enum: `phone` \| `video` \| `onsite` \| `take_home` \| `other`, null | |
| stage | enum: `screen` \| `technical` \| `behavioral` \| `panel` \| `final` \| `other`, null | |
| duration_minutes | int null | |
| meeting_location | text null | video platform or address |
| portfolio_url / notes | text null | |
| confirmed_at | timestamptz null | step-5 confirmation ("what will be analyzed") timestamp |
| created_at / updated_at | | |

Indexes: `(user_id, status)`, `(user_id, interview_at)`. RLS: full owner CRUD.
**"Active interview"** (free-tier limit of 1) ≙ status in (`draft`, `preparing`) — enforced in server code at creation/unarchive time.
**Deletion is hard delete** (see §9): cascade removes all child rows below.

### `interviewers` (many per interview)
id, user_id (denormalized), interview_id FK on delete cascade, name text not null, title text null, public_profile_url text null, manual_background text null (user-entered professional background), sort_order smallint. Index `(interview_id)`. RLS: owner CRUD. Only public/professional fields exist by design — no personal-attribute columns (spec: sensitive inference prohibited).

### `interview_sources` (raw inputs available to AI, per interview)
| column | type | notes |
|---|---|---|
| id / user_id / interview_id | | FK interview on delete cascade |
| kind | enum: `job_description` \| `company_info` \| `interviewer_background` \| `candidate_note` \| `document_text` \| `url_reference` |
| origin | enum: `user_provided` \| `document_extract` \| `mock_research` | beta has no live-research origin |
| title | text not null | |
| content | text null | the actual text used for grounding |
| url | text null | reference only, never fetched |
| document_id | uuid null FK → candidate_documents on delete cascade | for `document_extract` |
| created_at | | |

Index `(interview_id, kind)`. RLS: owner CRUD. Sources are stored **separately from AI interpretation** (spec) and are what brief sections cite.

### `interview_documents` (join: which documents an interview uses)
id, user_id, interview_id FK on delete cascade, document_id FK → candidate_documents on delete cascade, role enum (`resume`,`cover_letter`,`other`), unique (interview_id, document_id). RLS: owner CRUD. Deleting an interview removes join rows but **not** the reusable documents.

### `saved_sources` (user-curated external sources)
id, user_id, interview_id null FK on delete cascade, title text not null, url text null, publisher text null, published_at date null, snippet text null, created_at. RLS: owner CRUD. Rows originate from user input or clearly-labeled mock research only — the model can never mint one (no fabricated citations); brief sections reference them via `brief_section_sources`.

---

## 4. Generated preparation content

### `peel_briefs` (one brief per interview)
id, user_id, interview_id unique FK on delete cascade, status enum (`empty`,`generating`,`partial`,`ready`,`failed`), depth enum (`basic`,`detailed`) — plan-determined at generation time, generated_at timestamptz null, inputs_fingerprint text null (hash of grounding sources; UI shows "stale" when inputs changed since generation), created_at/updated_at. RLS: owner select/update; content-bearing writes via server code; delete cascades from interview.

### `brief_sections`
| column | type | notes |
|---|---|---|
| id / user_id / brief_id | | brief FK on delete cascade |
| section_key | enum: `snapshot` \| `company_overview` \| `company_priorities` \| `role_analysis` \| `interviewer_intel` \| `likely_themes` \| `questions_to_ask` \| `risks_gaps` \| `next_action` \| `condensed_summary` | predicted questions, stories, checklist live in their own tables |
| status | enum: `pending` \| `generating` \| `ready` \| `failed` \| `skipped` | `skipped` = not included at this plan depth |
| content | jsonb null | validated against the section's Zod schema (AI_ARCHITECTURE.md §4) |
| ai_generation_id | uuid null FK → ai_generations on delete set null | provenance: model, prompt version, tokens, timestamp |
| generated_at | timestamptz null | shown in UI per spec |
| user_notes | text null | private per-section notes |
| completed_at | timestamptz null | "mark section complete" |
| sort_order | smallint | |

Unique `(brief_id, section_key)`. Index `(brief_id)`. RLS: owner select + update restricted to `user_notes`/`completed_at` (trigger guard); `content`/`status` written by server code only.

### `brief_section_sources` (which sources ground a section)
id, user_id, section_id FK on delete cascade, interview_source_id uuid null FK on delete cascade, saved_source_id uuid null FK on delete cascade, check (exactly one of the two is non-null). RLS: owner select; server-written. Powers the "source labels" UI without letting the model invent citations.

### `questions` (predicted + user-saved interview questions)
| column | type | notes |
|---|---|---|
| id / user_id / interview_id | | interview FK on delete cascade |
| category | enum: `introductory` \| `behavioral` \| `situational` \| `role_specific` \| `technical` \| `company_specific` \| `interviewer_informed` \| `motivation_fit` \| `leadership` \| `conflict` \| `failure` \| `closing` |
| text | text not null | |
| why_asked | text null | AI rationale |
| evaluates | text null | what the interviewer likely evaluates |
| suggested_structure | text null | e.g. STAR outline |
| origin | enum: `predicted` \| `user_added` \| `outcome_import` |
| saved | boolean default false | user pinned it |
| ai_generation_id | uuid null FK on delete set null | |
| sort_order | smallint | |

Indexes: `(interview_id, category)`, `(user_id, saved)`. RLS: owner CRUD.

### `stories` (reusable story bank — user-level)
id, user_id, title text not null, situation / task / action / result text null, skills text[] default '{}', measurable_result text null, resume_reference text null, answers_questions text null (what kinds of questions it answers), tags text[] default '{}', origin enum (`user_created`,`ai_draft`) — AI drafts are always editable and grounded only in user materials, ai_generation_id uuid null, created_at/updated_at. Index `(user_id)`, GIN on `tags`. RLS: owner CRUD. **Stories survive interview deletion** (user asset, like documents).

### `question_story_links`
id, user_id, question_id FK on delete cascade, story_id FK on delete cascade, source enum (`ai_recommended`,`user_linked`), unique (question_id, story_id). RLS: owner CRUD.

---

## 5. Practice & feedback

### `practice_sessions`
| column | type | notes |
|---|---|---|
| id / user_id / interview_id | | interview FK on delete cascade |
| status | enum: `in_progress` \| `completed` \| `abandoned` |
| config | jsonb not null | length, categories[], difficulty, stage, interviewer_style, focus_weaknesses[] — Zod-validated |
| modality | enum: `text` — Phase 8B extends to `audio` \| `video` | recorded modes only; live/real-time coaching stays deferred |
| summary_feedback | jsonb null | end-of-session structured feedback |
| started_at / completed_at | timestamptz | |

Index `(user_id, interview_id)`. RLS: owner CRUD (updates via server actions).

### `practice_turns` (full transcript)
id, user_id, session_id FK on delete cascade, turn_index int not null, role enum (`interviewer`,`candidate`), turn_type enum (`question`,`followup`,`answer`,`wrapup`,`candidate_question`), content text not null, question_id uuid null FK → questions on delete set null, media_path text null (future audio), ai_generation_id uuid null, created_at. Unique `(session_id, turn_index)`. RLS: owner select/insert; no edits to past turns (immutable transcript).

### `answers` (candidate answers as first-class entities — feedback metering target)
id, user_id, session_id uuid null FK on delete cascade, turn_id uuid null FK → practice_turns on delete cascade, question_id uuid null FK on delete set null, text text not null, feedback_status enum (`none`,`pending`,`ready`,`failed`), created_at. Answers can also exist outside a session (single-question practice from the questions page). Index `(user_id, created_at)`. RLS: owner CRUD.

### `feedback` (structured answer evaluation)
| column | type | notes |
|---|---|---|
| id / user_id | | |
| answer_id | uuid unique FK → answers on delete cascade |
| rubric | jsonb not null | scores 0–5 + comment for: relevance, clarity, structure, specificity, evidence, measurable_results, conciseness, authenticity, confidence, completion (Zod-validated) |
| worked_well / unclear / missing | text | |
| top_improvement | text not null | single highest-priority improvement |
| improved_outline | text null | |
| example_answer | text null | built only from user-provided facts; null when facts are missing (UI asks the user instead) |
| ai_generation_id | uuid null FK on delete set null | |
| created_at | | |

RLS: owner select; server-written. Rubric scores feed the deterministic readiness `answer_quality` component.

### `generation_feedback` (user thumbs on AI content)
id, user_id, target_type enum (`brief_section`,`question`,`feedback`,`practice_turn`,`story`), target_id uuid, rating enum (`up`,`down`), comment text null, created_at. Index `(target_type, target_id)`. RLS: owner CRUD. (Polymorphic reference without FK by design; used for product-quality review, never joined in app queries.)

---

## 5b. Video Delivery Analysis (Phase 8B — planned; ships with the 8B migrations, not the core Phase 3 set)

Recorded-response delivery coaching per PRODUCT_SPEC §Video Delivery Analysis. Design invariants: **aggregate measurements only — no raw face/pose landmark frames are ever uploaded or stored; no biometric identity templates exist anywhere in the schema.** Raw video is uploaded only when the user explicitly chooses to save it; audio may be uploaded temporarily for transcription and is deleted after processing (§9 retention).

### `media_assets` (one row per uploaded/saved media object; browser-only recordings have no row)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles on delete cascade | owner |
| session_id | uuid FK → practice_sessions on delete cascade | |
| answer_id | uuid null FK → answers on delete cascade | the recorded response |
| media_kind | enum: `audio` \| `video` | |
| storage_path | text not null | `{userId}/{mediaAssetId}/{file}` in the private `media` bucket |
| mime_type | text not null | allowlist (webm/mp4 video, webm/ogg/m4a audio) |
| size_bytes | int not null | caps enforced at upload-URL issuance |
| duration_seconds | numeric null | |
| processing_status | enum: `pending` \| `processing` \| `processed` \| `failed` | |
| retention | enum: `processing_only` \| `saved` | `processing_only` = temp transcription input |
| retention_expires_at | timestamptz null | set for `processing_only` (24 h failure cap; deleted immediately on job success) |
| recording_consent_at / upload_consent_at | timestamptz not null | `vda_recording` / `vda_media_upload` acknowledgment snapshots at capture/upload time (`vda_media_upload` is required for **every** upload, `processing_only` transcription audio included) |
| deleted_at | timestamptz null | set when the storage object is destroyed; the metadata-only tombstone lets the UI show "recording deleted" and proves deletion (purged with its parents) |
| created_at / updated_at | | |

Indexes: `(user_id)`, `(session_id)`, `(retention, retention_expires_at)` (sweeper), `(processing_status)`. RLS: owner select; insert/update/delete via server flows only (consent + validation checked in the DAL first).

### `transcripts`
id, user_id FK cascade, answer_id FK → answers on delete cascade, session_id FK cascade, source enum (`stt_provider`,`mock`,`user_edited`), provider text null, text text not null, word_count int, language text default 'en', created_at/updated_at. Index `(user_id, created_at)`, `(answer_id)`. RLS: owner select/update (transcript-review corrections)/delete; created by server code after the transcription job.

### `delivery_analyses` (one per recorded answer)
| column | type | notes |
|---|---|---|
| id / user_id / session_id / answer_id | | user/session/answer FKs on delete cascade |
| media_asset_id | uuid null FK → media_assets on delete set null | survives recording deletion |
| transcript_id | uuid null FK → transcripts on delete set null | survives transcript deletion (limitation flagged) |
| status | enum: `pending` \| `metrics_ready` \| `feedback_ready` \| `partial` \| `failed` | |
| coaching_goals | text[] | user-selected focus areas |
| missing_measurements | text[] | what could not be measured (feeds uncertainty framing) |
| analysis_consent_at | timestamptz not null | `vda_ai_analysis` acknowledgment snapshot |
| feedback | jsonb null | validated `delivery_feedback` output (AI_ARCHITECTURE.md §10) |
| ai_generation_id | uuid null FK on delete set null | |
| created_at / updated_at | | |

Index `(user_id, created_at)`, `(answer_id)`. RLS: owner select/delete; content written by server code.

### `delivery_metrics` (1:1 with analysis — aggregates only)
id, user_id, analysis_id unique FK → delivery_analyses on delete cascade, then numeric aggregate columns: camera_facing_pct (approximate; the only "eye contact" measure), frame_centering_pct, head_turns_per_min, posture_stability_score (0–1), shoulder_angle_variation_deg, movement_events_per_min, speaking_pace_wpm, pause_count, avg_pause_ms, longest_pause_ms, filler_word_count, filler_words_per_100, volume_variation_coeff, answer_duration_seconds, sample_coverage_pct (share of frames with valid landmarks — the uncertainty signal), lighting_flag boolean, framing_flag boolean, created_at.
RLS: owner select/delete. Computation split (canonical across docs): video-derived values and the pause/volume aggregates are computed **in the browser** (workers / audio buffer) and submitted through the Zod-validated `submitDeliveryMetrics` server action — self-reported by design, acceptable because they influence only the user's own coaching, never the readiness score, ranking, or any other user (see §6 note). Speaking pace and filler-word counts are derived **server-side** from the transcript after the transcription job.

### `processing_jobs` (async step tracking)
id, user_id FK cascade, kind enum (`transcription`,`delivery_feedback`), analysis_id FK → delivery_analyses on delete cascade, media_asset_id uuid null FK on delete set null, status enum (`queued`,`running`,`succeeded`,`failed`), attempts smallint default 0, error_code text null (sanitized), started_at / finished_at timestamptz null, created_at/updated_at. Indexes `(status, created_at)`, `(user_id, created_at)`, `(analysis_id)`. RLS: owner **select only** (status polling); rows are created and transitioned by server code that re-validates ownership and consent snapshots before touching any media (SECURITY.md §13).

**Storage:** private `media` bucket; `storage.objects` RLS restricted to the owner's `{userId}/` prefix exactly like `documents`/`exports` (§8.5); uploads go through short-lived signed upload URLs issued server-side after consent + MIME/size validation; playback of saved recordings through 60 s signed URLs. A sweeper script deletes expired `processing_only` objects and tombstones their rows.

**Readiness:** Phase 8B adds **no** readiness component and changes no weights — a maximal score remains achievable with typed practice only (§6).

---

## 6. Readiness, checklist, outcomes

### `checklists` / `checklist_items`
`checklists`: id, user_id, interview_id unique FK on delete cascade, created_at/updated_at.
`checklist_items`: id, user_id, checklist_id FK on delete cascade, label text not null, detail text null, source enum (`template`,`ai_suggested`,`user_added`), completed_at timestamptz null, sort_order smallint. Index `(checklist_id)`. RLS: owner CRUD.

### `readiness_scores` (snapshots; latest = current, history feeds trend chart)
id, user_id, interview_id FK on delete cascade, score smallint not null check (0–100), computed_at timestamptz not null, trigger_event text (what caused the recompute), recommended_action text null (AI-suggested next step — the **numeric score itself is deterministic**, per spec), ai_generation_id uuid null. Index `(interview_id, computed_at desc)`. RLS: owner select; server-written.

### `readiness_components` (per-snapshot breakdown)
id, user_id, score_id FK → readiness_scores on delete cascade, component enum: `company_understanding` (15%) \| `role_understanding` (15%) \| `interviewer_context` (10%) \| `stories_prepared` (20%) \| `questions_practiced` (20%) \| `answer_quality` (15%) \| `questions_to_ask` (5%), raw_value numeric not null (0–1), weighted_points numeric not null, explanation text not null (how it was measured). Unique `(score_id, component)`. RLS: owner select; server-written. Weights match the spec exactly; the calculator is pure TypeScript over measurable rows (sections completed, stories linked, answers with feedback, rubric averages, checklist state). **Video Delivery Analysis (Phase 8B) contributes zero weight: no component reads VDA tables, and a 100 score is achievable without ever enabling a camera.**

### `outcomes` (one per interview)
id, user_id, interview_id unique FK on delete cascade, completed_on date, difficulty smallint (1–5) null, questions_encountered text null, went_well text null, went_poorly text null, confidence smallint (1–5) null, advanced boolean null, received_offer boolean null, private_notes text null, lessons text null, research_optin_snapshot boolean not null default false (whether `outcome_research_optin` consent was active when recorded), created_at/updated_at. RLS: owner CRUD.

---

## 7. AI bookkeeping & audit

### `prompt_versions`
id uuid PK, task text not null (e.g. `company_analysis`), version text not null (semver, from code), content_hash text not null (sha256 of the prompt template), created_at. Unique `(task, version, content_hash)`. Rows are upserted lazily the first time a (task, version) runs. Service-role written; no user policies.

### `ai_generations` (metadata for every AI call — no chain-of-thought, no raw prompt text)
| column | type | notes |
|---|---|---|
| id / user_id | | user FK on delete cascade |
| interview_id | uuid null FK on delete set null | |
| task | text not null | AI_ARCHITECTURE.md §4 task list |
| provider | text not null | `anthropic` \| `mock` |
| model | text not null | |
| prompt_version_id | uuid FK → prompt_versions | |
| status | enum: `succeeded` \| `validation_failed` \| `provider_error` \| `refused` \| `timeout` |
| input_tokens / output_tokens | int null | from provider usage report |
| estimated_cost_cents | numeric(10,4) null | rate table in code |
| duration_ms | int null | |
| error_code | text null | sanitized, never content |
| usage_event_id | uuid null FK → usage_events on delete set null | |
| created_at | | |

Indexes: `(user_id, created_at)`, `(task, created_at)`. RLS: no user policies (service-written; surfaced later via admin). Stores **metadata only** — generated content lives in domain tables; hidden reasoning is never stored (spec requirement).

### `audit_logs`
id uuid PK, user_id uuid null FK → profiles **on delete set null** (rows outlive account deletion, anonymized), actor enum (`user`,`system`,`admin`,`stripe_webhook`), action text not null (e.g. `document.upload`, `document.delete`, `interview.delete`, `account.delete_requested`, `export.requested`, `subscription.updated`, `consent.granted`, `consent.revoked`, `admin.account_disabled`), resource_type text null, resource_id uuid null, metadata jsonb not null default '{}' (**never sensitive content** — ids/counters only), created_at. Indexes: `(user_id, created_at)`, `(action, created_at)`. Service-role written; no user policies in beta.

---

## 8. Row Level Security strategy

1. **RLS enabled on every table**; default deny. Policies written per command (`select`/`insert`/`update`/`delete`) — no `for all` shortcuts.
2. **Owner policies** use the denormalized `user_id`: `using (user_id = auth.uid())` + `with check (user_id = auth.uid())`. All owned tables get the standard four, or a subset where user writes are disallowed (per-table notes above).
3. **Server-written tables** (`feedback`, `readiness_scores`, brief section `content`, ledger, generations, audit, webhook events) have select-only user policies or none; writes go through the service-role client or SECURITY DEFINER functions.
4. **Service role** bypasses RLS and is confined to `src/lib/supabase/admin.ts` (`import 'server-only'`): webhooks, ledger functions, deletion/export flows, seeding.
5. **Storage RLS** (`storage.objects`): private buckets `documents`, `exports`, and (Phase 8B) `media`; policies allow select/insert/delete only when `bucket_id` matches and `(storage.foldername(name))[1] = auth.uid()::text`. Downloads additionally go through short-lived signed URLs issued server-side after a DAL ownership check (defense in depth) — SECURITY.md §5.
6. **Organizations:** deliberately no user-facing policies in beta. Org features later expand access by *adding* policies — never by loosening owner policies.
7. **Tests:** RLS integration tests (two users + anon client) assert cross-user reads/writes fail on every table — IMPLEMENTATION_PLAN Phase 3.

---

## 9. Deletion behavior

**Decision: hard delete, cascade-based.** The spec allows soft deletion "when recovery or audit needs justify it"; for a privacy-sensitive beta, "deleted means deleted" is simpler and safer than a trash + purge pipeline. Non-destructive `archived` status covers the "hide but keep" need. (Documented in IMPLEMENTATION_PLAN §Resolved spec tensions.)

| Action | Behavior |
|---|---|
| Delete document | Confirm dialog → remove storage object → delete row (cascades `interview_documents` and `document_extract` sources) → audit entry (ids only). Brief sections that cited the extract show a "source removed" state. |
| Delete interview | Confirm dialog lists what is removed: brief + sections, questions, links, practice sessions/turns/answers/feedback, checklist, readiness, outcome, interview-scoped sources — and (8B) recordings, transcripts, and delivery analyses — all via FK cascade, **after** the flow first destroys any `media` bucket objects belonging to the interview's practice sessions (saved recordings and pending temp audio), so no face/voice object is ever orphaned in storage. Reusable documents and the story bank **survive**. `usage_events` / `ai_generations` keep rows with `interview_id` nulled (spend history is not user content). Audit entry written. |
| Archive interview | Non-destructive alternative (`status = archived`); frees the free-tier "active" slot. |
| Delete recording (8B) | Storage object destroyed immediately → `media_assets` row tombstoned (`deleted_at`, metadata only — proves deletion, purged with its parents); transcript, metrics, and feedback are unaffected and remain individually deletable. Audit entry. |
| Delete transcript (8B) | Hard delete of the `transcripts` row; `delivery_analyses.transcript_id` nulls and the analysis gains a "transcript removed" limitation. Audit entry. |
| Delete delivery metrics / feedback (8B) | Hard delete of the `delivery_metrics` row / null the `feedback` column; "delete entire analysis" removes the `delivery_analyses` row and cascades metrics + jobs. Audit entry. |
| Delete account | Re-auth + confirm phrase → server flow: cancel Stripe subscription immediately → delete storage prefixes (`documents/`, `exports/`, and 8B `media/` under the user id) → `auth.admin.deleteUser(id)` → `profiles` cascade removes **all** owned rows (including every 8B table); `audit_logs.user_id` set null (anonymized skeleton rows remain: action + timestamp only); Stripe retains its own financial records as legally required. Final audit entry written before deletion. |

Retention notes: `exports` bucket objects expire after 7 days (cleanup script); `stripe_webhook_events` pruned after 90 days; (8B) `processing_only` media is deleted immediately on job success and hard-capped at 24 h on failure via the sweeper — no other background retention jobs in beta.

---

## 10. Database functions & triggers (summary)

| object | kind | purpose |
|---|---|---|
| `handle_new_user()` | trigger on `auth.users` insert | create `profiles` row + free `subscriptions` row |
| `set_updated_at()` | trigger | maintain `updated_at` |
| `reserve_usage(...)` / `settle_usage(...)` | SECURITY DEFINER functions | atomic quota reservation / settlement (§2) |
| `hit_rate_limit(key, window, max)` | SECURITY DEFINER function | fixed-window rate limiting (§2) |
| `guard_protected_columns()` | triggers | block user-role updates to `profiles.role`, brief-section `content`/`status`, etc. |

All functions ship in migrations with `security definer set search_path = ''` and explicit grants (`execute` revoked from `anon`/`authenticated` except where intentionally callable).
