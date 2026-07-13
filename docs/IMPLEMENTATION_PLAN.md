# PeelPrep — Implementation Plan

Status: **Approved 2026-07-13** (all seven open decisions ratified as proposed — see §Ratified decisions). Work proceeds one phase at a time, with an explicit stop at the end of every phase (per AGENTS.md).

## Phase overview

| # | Phase | Ships |
|---|---|---|
| 0 | Planning (this document set) | docs only — done |
| 1 | Foundations & tooling | deps, Tailwind/shadcn theme, layout shells, test/lint/format infra, env template |
| 2 | Auth & protected shell | Supabase auth, proxy, DAL, (auth)+(app) skeleton with empty states |
| 3 | Core schema & RLS | full DB migration set, RLS test suite, generated types |
| 4 | Interviews & documents | 5-step intake w/ drafts, uploads + extraction, interviewers, sources |
| 5 | AI foundation & usage ledger | provider abstraction, mock+Anthropic, prompts/schemas, reservations |
| 6 | Peel Brief | section-by-section generation, sources UI, notes, print/condensed view |
| 7 | Questions & stories | predicted questions, story bank, linking, recommendations |
| 8 | Mock practice & feedback | typed practice sessions, answer evaluation, metering |
| 8B | *(optional, outside the launch definition)* Video Delivery Analysis | recorded answers → browser-side aggregate metrics + transcript → structured delivery coaching; separate consents; scheduled after Phase 12 unless re-prioritized |
| 9 | Readiness, checklist, dashboard | deterministic score, checklist, real dashboard, history |
| 10 | Billing | Stripe checkout/portal/webhooks, plan gates live, upgrade dialogs |
| 11 | Outcomes, privacy & account | outcome tracking, export, deletion, consent center, settings/profile |
| 12 | Marketing, demo & launch hardening | public pages, demo seed, a11y pass, E2E, README/deploy docs |
| 12b | *(optional)* Minimal admin | `/admin` overview + account disable + usage view |

Dependencies are strictly linear except: 7 and 8 both depend on 6’s generation plumbing but not on each other; 12b depends on 10–11. Optional Phase 8B depends on 8, 10, and 11, never blocks or precedes any core phase (authentication, intake, briefs, questions/stories, typed practice, answer feedback, readiness, limits/billing all ship first), and runs only on explicit approval.

## Standing quality gate (every phase, run before stopping)

```bash
npm run format:check      # prettier
npm run lint              # eslint (Next 16: separate CLI, build does not lint)
npm run typecheck         # next typegen && tsc --noEmit
npm run test              # vitest (unit + integration for the phase)
npm run build             # next build (production, Turbopack)
# phases 3+: supabase db reset  (migrations + seed apply cleanly from scratch)
# phase 12+: npm run test:e2e   (playwright)
```

Every phase ends with: all gate commands passing, failures reported honestly, changed-files list, remaining-limitations list, then **stop for approval**.

---

## Phase 1 — Foundations & tooling

**Scope:** install approved deps (`@supabase/supabase-js`, `@supabase/ssr`, `stripe`, `@anthropic-ai/sdk`, `zod`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `date-fns`, shadcn/ui + its Radix deps, `vitest` + Testing Library, `playwright`, `prettier`); Tailwind v4 theme tokens for the banana palette + typography; root layout with fonts (Geist/Inter); shared UI primitives via shadcn; `src/lib` skeleton with `server-only` markers; scripts in package.json (`typecheck`, `test`, `test:e2e`, `format`, `format:check`); populate `.env.example`; `/api/health`.
**Dependencies:** approval of this plan.
**Acceptance criteria:** clean scaffold renders a themed placeholder landing page; all gate commands pass on a fresh clone with only `.env.example` copied (no external services needed yet); no shadcn component is added that isn't used.
**Tests:** one smoke unit test (utils), one component render test — proves the harness works.
**Deferred:** everything functional; no auth, no DB.

## Phase 2 — Auth & protected shell

**Scope:** Supabase local setup (`supabase init`, `config.toml`); migration 001 (`profiles`, `user_consents`, `handle_new_user`, `set_updated_at`, RLS); `@supabase/ssr` client factories (server/browser/admin); `src/proxy.ts` (session refresh + optimistic redirects); DAL (`verifySession`, `requireUser`, `requireOwner`, 404 semantics); (auth) pages: login/signup (with versioned ToS+privacy consent capture)/reset/update-password + `/auth/confirm`, `/auth/signout`; (app) shell: sidebar/mobile nav, dashboard with **empty states only**, profile stub; auth rate limiting via `hit_rate_limit` (migration includes `rate_limit_counters`).
**Dependencies:** Phase 1.
**Acceptance criteria:** signup → verification email (local inbucket) → login → dashboard; unauthenticated access to any (app) URL redirects to `/login?next=…`; direct POST to a protected action without a session is rejected; consent rows written at signup; `supabase db reset` clean.
**Tests:** DAL unit tests; auth-flow integration tests (verified/unverified); proxy redirect tests; RLS tests for `profiles`/`user_consents`; rate-limit function test.
**Deferred:** OAuth providers; profile editing beyond basics.

## Phase 3 — Core schema & RLS

**Scope:** migrations for every remaining core table in DATABASE.md (§§2–7, excluding §5b — those five tables ship with the Phase 8B migrations): billing/usage, interview domain, generated content, practice, readiness/checklist/outcomes, AI bookkeeping, audit; all enums, indexes, triggers (`guard_protected_columns`), SECURITY DEFINER functions (`reserve_usage`, `settle_usage`); storage buckets + policies; `plans` seed rows; `supabase gen types typescript` wired to `src/types/database.ts`; RLS integration test suite (two users + anon across **every** table + storage prefixes).
**Dependencies:** Phase 2.
**Acceptance criteria:** `supabase db reset` builds the entire schema from scratch; RLS suite green (every cross-user access fails, every owner access succeeds); `reserve_usage` race test passes (two concurrent reservations against limit 1 → exactly one wins).
**Tests:** the RLS suite; ledger function tests (reserve/settle/limit/stale-sweep semantics); trigger guards.
**Deferred:** all UI on these tables.

## Phase 4 — Interviews & documents

**Scope:** 5-step intake wizard (React Hook Form + shared Zod schemas; per-step server actions writing drafts; `intake_step` resume; step-5 confirmation explaining what will be analyzed → `confirmed_at`); free-tier active-interview gate (server); multiple interviewers; document library on `/profile` (upload with MIME+magic-byte validation, size cap, sanitized paths; server-side text extraction pdf/docx/txt/md; delete with storage cleanup + audit); interview↔document linking; `interview_sources` creation from intake inputs + extracts; `/interviews/[id]` hub; `/history` basic list; delete/archive interview (cascade + audit + confirm dialog listing consequences); `/api/documents/[id]/download` signed-URL flow.
**Dependencies:** Phase 3.
**Acceptance criteria:** full intake round trip incl. save-draft-and-exit + resume; uploads rejected for wrong type/size and accepted then extracted for valid files; user B can never read/download user A's interview or document (RLS + DAL); deleting an interview leaves documents/stories intact and no orphans.
**Tests:** intake action validation; ownership tests; upload validation (type/size/magic-byte spoof); extraction failure fallback (paste text); deletion cascade assertions; signed-URL ownership test.
**Deferred:** AI everything; job-posting URL fetching (never in beta).

## Phase 5 — AI foundation & usage ledger integration

**Scope:** `AiProvider` interface + `MockAiProvider` (deterministic, seeded, `_mock`-labeled, failure injection) + `AnthropicProvider` (structured outputs via `messages.parse` + `zodOutputFormat`, usage capture, error taxonomy); prompt registry with versioning + `prompt_versions` upsert + shared guardrail preamble; all task Zod schemas (AI_ARCHITECTURE.md §4); context builder + source tagging + truncation; cost table; `ai_generations` writes; generation service wiring reserve→run→settle with refund policy; plan config `src/lib/billing/plans.ts` (free limits enforceable now); demo-mode badge plumbing.
**Dependencies:** Phase 3 (ledger tables), Phase 4 (sources to ground on).
**Acceptance criteria:** with `AI_PROVIDER=mock`, a scripted call for each task returns schema-valid data, writes `ai_generations` + settles usage correctly on success, refund on injected failure, `validation_failed` after one repair retry; Anthropic provider verified manually behind a flag (one real smoke call, documented cost); no raw prompts/responses persisted.
**Tests:** heavy unit coverage: every schema (valid/invalid/repair), reservation/settlement paths incl. concurrency + stale sweep, cost computation, prompt-version upsert idempotency, provider selection, mock determinism.
**Deferred:** all product UI for generation (next phases); OpenAI provider.

## Phase 6 — Peel Brief

**Scope:** `/api/interviews/[id]/brief/generate` (one section per request; queue-driving client hook with live progress; resumability; plan-depth section selection; regeneration per section); brief page UI: all §4 sections with generation timestamp, "AI-generated preparation guidance" label, `basis` (source vs general-knowledge) labels, source chips from `brief_section_sources`, copy button, per-section feedback (thumbs), notes, mark-complete; interviewer-intel notice (spec wording); "research unavailable" statement where applicable; stale-inputs indicator (`inputs_fingerprint`); condensed/last-minute view + print stylesheet (`/brief/print`); failed-section retry (free within 24 h).
**Dependencies:** Phase 5.
**Acceptance criteria:** free user generates a basic brief end-to-end on mock provider with visible per-section progress; kill-and-resume mid-generation loses at most one section; regenerate meters `section_regenerate`; every AI section shows label + timestamp + sources; print view produces a clean PDF via browser print; zero fabricated citations possible (unknown source ids dropped + flagged, covered by test).
**Tests:** generation orchestration (order, resume, partial-failure settle), depth gating by plan, citation-mapping rejection, notes/complete actions, print route ownership.
**Deferred:** true server-side PDF; live research provider.

## Phase 7 — Questions & stories

**Scope:** question generation (categories per spec, metered by question count); questions page (category tabs, why-asked/evaluates/structure, save, add-own, practice + save buttons, "suggestions not guarantees" notice); story bank CRUD (STAR editor, tags, skills); AI story recommendations + draft suggestions (grounded-only; `missing_info_questions` UX asks the user instead of inventing); question↔story linking (both directions).
**Dependencies:** Phase 6 (uses brief context), Phase 5.
**Acceptance criteria:** free user hits the 5-question limit with an upgrade dialog and no data loss; drafts are clearly editable and marked AI-origin; a recommendation never references a story/question id that doesn't exist (validated); stories persist after interview deletion.
**Tests:** metering by quantity; link/unlink; draft grounding validation; limit-dialog flow; RLS on new paths.
**Deferred:** cross-interview story analytics.

## Phase 8 — Mock practice & answer feedback

**Scope:** session config UI (length, categories, difficulty, stage, interviewer style, weaknesses); typed chat (`submitPracticeTurn` action: one question at a time, follow-ups, no mid-session feedback, closes with candidate-questions opportunity, stays in role/company context, refuses discriminatory questions by prompt contract); transcript persistence (`practice_turns`, `answers`); per-answer feedback on request + end-of-session summary (`answer_evaluation`, metered); retry button; session limits by plan (free: 1 short; plus: 3 full; pro: 10 + advanced follow-ups flag); practice streak data for dashboard.
**Dependencies:** Phase 7 (questions feed sessions), Phase 5.
**Acceptance criteria:** complete session on mock provider: config → N questions with follow-ups → end → summary feedback; answer feedback shows all rubric criteria + one top improvement + outline (+ example answer only when facts suffice, otherwise asks for info); limits enforced server-side with upgrade dialog; abandoned sessions resumable or cleanly abandoned.
**Tests:** turn orchestration (ordering, immutability), feedback schema + insufficient-facts path, metering (sessions + answers), transcript RLS, streak calculation.
**Deferred:** audio/video modalities (columns exist — recorded Video Delivery Analysis is optional Phase 8B); adaptive difficulty.

## Phase 8B — Video Delivery Analysis *(optional; outside the launch definition)*

Recorded-response delivery coaching per PRODUCT_SPEC §Video Delivery Analysis. Typed practice (Phase 8) remains the first, required practice mode; users with no camera — or who decline any consent — keep every core feature, and the readiness score is completely unaffected (zero VDA weight). Runs only on explicit approval; default scheduling is after Phase 12 (see Open decisions — Phase 8B).

**Dependencies:** Phase 8 (practice sessions + answers), Phase 10 (Pro plan gating), Phase 11 (consent center, export/deletion flows); confirmed browser-support floor (open decision). New packages at phase start only: a browser landmark library with self-hostable WASM models, an STT provider SDK (TBD), Playwright fake-camera fixtures.

**Hard constraints (from spec — verified by tests, not intentions):** no facial or identity recognition; no emotion detection; no personality, deception, or psychological analysis; no biometric identity templates; aggregate metrics only (never raw landmark frames); raw video uploaded only on explicit save; observational coaching language with stated uncertainty; "eye contact" only ever described as approximate camera-facing behavior.

**Substeps (each independently reviewable, in order):**

1. **Consent & device preview** — five `vda_*` consent types wired into the consent center + per-session acknowledgments; permission-explainer and device-preview screens; every denial path lands in typed mode (ROUTES.md §3 fallback list).
2. **Local recording** — MediaRecorder capture with countdown, local review/playback, retry; capability detection (unsupported browser → typed); nothing leaves the browser in this substep.
3. **Transcript & audio metrics** — temp audio-only upload (gated by `vda_media_upload`) → `TranscriptionProvider` (mock + real) → transcript-review screen; pause/volume aggregates computed in the browser, speaking pace + filler-word counts derived server-side from the transcript; `processing_jobs` + polling; temp media deleted on completion (24 h failure cap + sweeper); declining the upload consent yields metrics-only feedback with the limitation stated.
4. **Landmark aggregation (browser)** — self-hosted WASM face/pose models in web workers; aggregates per DATABASE.md §5b `delivery_metrics` with `sample_coverage_pct` uncertainty; Zod-validated submission; low-coverage and no-face paths degrade gracefully.
5. **Structured delivery feedback** — `delivery_feedback` task + prohibited-claims linter (AI_ARCHITECTURE.md §10); report UI with uncertainty framing; metered (Pro) with refund-on-failure.
6. **Optional private recording storage** — explicit save choice (default: not saved) → `media` bucket via signed upload URLs; signed-URL playback; size/duration caps.
7. **Deletion & retention controls** — per-artifact deletion (recording / transcript / metrics / feedback / whole analysis), settings retention panel, export coverage, audit events (SECURITY.md §13).
8. **Cross-browser & mobile testing** — device matrix (Chrome, Firefox, Safari desktop; iOS Safari, Android Chrome), permission permutations, low-light/no-face/off-center capture, slow networks.

**Acceptance criteria:** the full flow completes in CI with mock providers and a fixture camera stream; declining any single consent leaves typed practice fully functional; an integration test inspecting the network layer proves **no request ever contains raw video or landmark frames** (only save-recording uploads carry media, and only when chosen); temp media is provably deleted after processing; each artifact deletes independently with no orphans; generated feedback passes the prohibited-claims linter (dictionary covers confidence/nervous/honesty/personality/liked/guaranteed and emotion/health/disability/mental-state terms); readiness output is byte-identical for a user with and without VDA activity; all §13 SECURITY items demonstrably hold.

**Tests:** unit — aggregation math on synthetic landmark series, metric Zod contracts, retention/expiry computation, prohibited-claims linter; integration — consent-gating matrix (5 consents × grant/deny), processing-job authorization (cross-user job access fails), sweeper behavior, RLS on all five new tables + `media` bucket prefixes, export completeness incl. VDA artifacts; E2E — record → transcript review → report → per-artifact delete on a virtual camera; manual — the device matrix above with a written checklist; privacy checks — SECURITY.md §13 walked item-by-item and signed off before the phase closes.

**Commands:** the standing gate, plus `npm run test:e2e -- --grep vda`, plus the documented manual device checklist.

**Explicitly deferred (never in this phase):** real-time live coaching; emotion recognition; facial identity recognition; deception detection; automated hiring recommendations; accessibility judgments; attractiveness or appearance scoring; recording sharing or coach/organization review; model training on recordings.

## Phase 9 — Readiness, checklist, dashboard, history

**Scope:** deterministic readiness calculator (exact spec weights; explanations per component; snapshot on relevant events); `readiness_advice` AI next-action (metered lightly, cached per snapshot); readiness page with Recharts breakdown + history + "how this is calculated" + never-a-guarantee copy; checklist (template + AI suggestions + user items, completion wired into readiness); full dashboard (countdown, score, next action, upcoming, recent briefs, usage remaining, streak, recent outcomes, add CTA, prioritized next interview); `/history` complete.
**Dependencies:** Phases 6–8 (score inputs exist).
**Acceptance criteria:** score reproduces by hand-calculation from fixture data (property-based test over component weights summing to 100); recompute triggers fire on: section complete, story linked, feedback received, checklist change, questions-to-ask ready; dashboard states correct for zero/one/many interviews.
**Tests:** calculator unit tests (golden fixtures + weight-sum invariant), snapshot triggers, dashboard queries, chart a11y text alternative.
**Deferred:** long-term cross-interview analytics (Pro "advanced analytics" ships as readiness history in beta — documented limitation).

## Phase 10 — Billing (Stripe)

**Scope:** Stripe products/prices setup docs; `createCheckoutSession` / `createPortalSession` actions; `/api/webhooks/stripe` (signature, idempotency ledger, subscription sync incl. upgrades/downgrades/cancel/failed-payment → `past_due` downgrade behavior); `/billing` page (plan, usage meters from ledger, actions); upgrade dialogs wired everywhere limits fire; entitlement changes propagate to plan gates instantly; trial-ready fields respected (no trial enabled).
**Dependencies:** Phase 5 (plan config), Phase 9 (usage displays), Stripe test account + CLI.
**Acceptance criteria:** with Stripe test mode + `stripe listen`: subscribe → plus limits live without redeploy; downgrade/cancel at period end honored; replayed/duplicate webhook events are no-ops; checkout success page grants nothing until webhook lands; failed payment flips to `past_due` and free limits apply while data stays intact.
**Tests:** webhook signature/idempotency/out-of-order tests (mocked Stripe events), sync state machine, entitlement gate matrix (feature × plan), UI meter correctness.
**Deferred:** annual pricing, coupons, tax/invoicing config, seat/org billing.

## Phase 11 — Outcomes, privacy & account

**Scope:** outcome form (all spec fields) + post-interview prompt on dashboard + `outcomes → interview.status=completed`; outcome-informed prep hints (deterministic; feeds question `outcome_import` origin); consent center in `/settings` (view/change all consents incl. `outcome_research_optin` default-off); `/api/export` (full JSON + file links, exports bucket, 7-day expiry, 1/day); document deletion polish; interview deletion already live — add account deletion (re-auth + phrase, Stripe cancel, storage purge, auth delete cascade, anonymized audit skeleton); audit coverage completed for all §10 SECURITY.md actions; profile/settings pages finished.
**Dependencies:** Phase 10 (Stripe cancel on account delete).
**Acceptance criteria:** export archive contains every user-owned row + working signed file URLs; export-then-delete leaves zero user rows/objects (verified programmatically) except anonymized audit skeletons; consents versioned and immediately effective; outcome flow updates readiness/history/dashboard.
**Tests:** export completeness (table-by-table assertion), deletion completeness sweep, consent gating of outcome research flag, account-deletion E2E-style integration, audit-entry assertions per sensitive action.
**Deferred:** GDPR DSAR tooling/admin, scheduled retention jobs (manual scripts documented instead).

## Phase 12 — Marketing, demo & launch hardening

**Scope:** all six public pages with final copy (headline per spec) + pricing sourced from plan config + privacy/trust section; SEO (metadata, sitemap, robots, OG images); demo seed (`scripts/seed-demo.ts` + `supabase/seed.sql`): fictional company/interviewer/résumé/brief/questions/stories/session/score, all "fictional" labeled, demo banner via `NEXT_PUBLIC_DEMO_MODE`; accessibility pass (keyboard, focus, contrast vs cream/yellow palette, reduced-motion, chart alt text); responsive audit at 360/768/1280; empty/loading/error state sweep; Playwright golden path (spec's 9-step workflow: signup → interview → résumé → brief → save question → practice answer → feedback → readiness update → outcome) + auth + limits E2E; README + setup/Stripe/AI/testing/deployment instructions + privacy & safety notes + known limitations + next steps; security header verification; final `npm audit`.
**Dependencies:** Phases 1–11.
**Acceptance criteria:** a new developer follows README from clone → running app with mock AI + local Supabase in < 30 min; full gate incl. `npm run test:e2e` green; demo mode fully navigable without any paid API key; Lighthouse a11y ≥ 95 on key pages.
**Tests:** the E2E suite; link checker on marketing pages; axe checks in component tests for key screens.
**Deferred:** blog/changelog, i18n, analytics tooling selection.

## Phase 12b — Minimal admin (optional, post-launch ok)

**Scope:** `(admin)` group per ROUTES.md §5: overview metrics, user search + disable account, usage/cost view, prompt-version monitor, feedback queue; `requireAdmin()`; all actions audit-logged; admin routes return 404 to non-admins.
**Dependencies:** 10–11.
**Acceptance criteria:** non-admin gets 404 on every admin URL (test); disable-account takes effect on next request; metrics reconcile with ledger sums.
**Tests:** authz matrix, disable flow, metric queries.
**Deferred:** feature flags, refunds tooling, impersonation (never without explicit design).

---

## Resolved spec tensions (decisions to ratify)

| # | Tension in PRODUCT_SPEC | Decision |
|---|---|---|
| D1 | "Recent company developments when current information is available" vs. no scraping + no fake currency | Beta ships **manual + mock** research providers only; UI states clearly when current research is unavailable; AI general knowledge is always labeled unverified. Live research provider deferred behind the existing interface. |
| D2 | "Export the brief as a PDF" | Browser print-to-PDF via dedicated print-optimized route (doubles as the condensed last-minute view). Server-side PDF service deferred. |
| D3 | Job posting **URL** input | Stored and displayed, never fetched (SSRF + scraping policy). Users paste the description text; intake copy says so. |
| D4 | "Unlimited standard Peel Briefs (Plus), subject to reasonable abuse protection" | Fair-use caps: 30/period + 10/day (Plus), 60 + 15/day (Pro), enforced by ledger; marketing says "unlimited (fair use)". Numbers are config, not schema. |
| D5 | Soft deletion "when justified" | **Hard delete** everywhere + non-destructive `archived` status for interviews. Privacy-forward and simpler; trash/undo deferred. |
| D6 | Admin area "in beta" but also small/optional | Admin is designed (routes, `role` column, audit) but implemented last as optional 12b; launch does not block on it. |
| D7 | Readiness score AI vs deterministic | Score + components are pure functions of stored data (spec weights); AI contributes only the recommended next action. `answer_quality` uses stored rubric scores (AI-authored at feedback time, deterministically aggregated afterwards). |
| D8 | `feedback` table vs section "feedback controls" | `feedback` = structured answer evaluation; `generation_feedback` = user ratings of AI content. Two tables, documented deviation from the single-name list. |
| D9 | Spec table list (`AI generations`, `prompt versions`, `saved_sources`, `interview_sources`) | All present; naming normalized to snake_case; `brief_section_sources`, `interview_documents`, `generation_feedback`, `stripe_webhook_events`, `rate_limit_counters` added to make the listed behaviors actually enforceable. |
| D10 | Plan permissions "centralized configuration" | Enforced limits live in typed server code (`plans.ts`); DB `plans` table maps Stripe price ids + display. Single enforcement source, no scattering. |
| D11 | Voice/audio "prepare the data model" | `practice_sessions.modality` + `practice_turns.media_path` reserved; no audio code paths in beta. |
| D12 | Free period vs billing period | Free: UTC calendar month; paid: Stripe billing period. Documented in usage UI. |
| D13 | Delete-interview "removes … uploaded materials" | Interview-scoped generated content and sources are hard-deleted; **reusable user-level assets (documents, story bank) survive** because they are shared across interviews. The delete dialog states this; users delete documents from the library. |
| D14 | Spec originally deferred "video delivery analysis" entirely | Recorded **Video Delivery Analysis** is now defined as optional Phase 8B (PRODUCT_SPEC gained a dedicated section; the deferred list now defers only *live* video coaching). It stays outside the launch definition and behind explicit approval. |
| D15 | VDA vs the readiness score | VDA contributes **zero weight** — no readiness component reads VDA tables, and a 100 score requires no camera. Enforced by a byte-identical-score test in Phase 8B. |
| D16 | Media deletion vs D5 hard-delete rule | VDA artifacts hard-delete like everything else, with one nuance: destroying a recording's storage object leaves a metadata-only tombstone row (`media_assets.deleted_at`) so the UI and audit trail can prove deletion; tombstones purge with their parents. |
| D17 | Typed answer rubric scores "confidence"/"authenticity" vs the VDA prohibited-claims rules | The rubric criteria describe observable qualities of **the answer as given** (how confidently and authentically the wording reads) — never psychological judgments about the person. PRODUCT_SPEC §Answer Feedback now states this; `delivery_feedback` (VDA) additionally bans those words about the user entirely, enforced by its prohibited-claims linter. |

## Major risks

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| **AI cost overrun** (briefs are multi-call) | M / H | atomic reservations before every call, per-task token caps, fair-use daily caps, cost recorded per generation, mock provider for all dev/demo, admin cost view (12b); per-task model tiering decision open (below) |
| **Hallucinated company/interviewer facts** → user embarrassment, defamation exposure | M / H | grounding contract + `basis` labels, no live research claims, citation-id validation, "preparation suggestions, not verified facts" labels, respectful-use notice, feedback controls monitored |
| **Prompt injection via JD/résumé text** | M / M | data-not-instructions tagging, API-constrained structured outputs + Zod, no tool use, escaped rendering, no server-side URL fetching |
| **Privacy breach of sensitive career data** | L / **critical** | RLS on every table + storage, DAL 404 semantics, signed URLs, deletion/export tested programmatically, no content in logs/audit metadata |
| **Stripe state drift** (missed/out-of-order webhooks) | M / M | idempotency ledger, re-runnable sync from fetched subscription state, entitlements only via DB, manual reconcile script documented |
| **Next 16 novelty** (proxy, async APIs, Turbopack) drift vs team/AI familiarity | M / M | bundled-docs-first rule already in AGENTS.md; typegen helpers; conventions codified in ARCHITECTURE.md |
| **Serverless timeouts on generation** | M / M | one-section-per-request design; resumable queue; turn-level calls are small |
| **Free-tier abuse / account farming** | M / L | email verification, per-IP signup limits, ledger quotas, rate limits; residual risk accepted for beta |
| **Postgres-based rate limiting under load** | L / L | fine at beta scale; interface isolates a Redis swap |
| **Scope creep** (spec is broad) | H / M | phase gates with explicit stop; deferred lists per phase; beta boundary in ARCHITECTURE.md §9 |
| **(8B) Recording privacy exposure** — face/voice media is the most sensitive class we would hold | L / **critical** | feature optional + consent-gated (×5, default off); browser-first processing; aggregates only; raw video only on explicit save; temp-media sweeper with 24 h cap; per-artifact deletion; no biometric templates; phase closes on a signed §13 privacy checklist |
| **(8B) Mis-framed feedback** (coaching read as judgment: "you seem nervous") | M / H | schema + prompt guardrails + prohibited-claims linter with test dictionary; observational language tied to measurements; mandatory uncertainty section; "optional coaching" labeling |
| **(8B) Browser/device fragmentation** (capture APIs, WASM performance, mobile cameras) | M / M | capability detection with typed fallback everywhere; self-hosted version-pinned models; dedicated device-matrix substep; recorded (not live) design tolerates slow devices |
| **(8B) STT cost/quality** | M / M | provider abstraction + mock; transcript-review screen before feedback; per-day caps + ledger `transcription` cost tracking; provider choice is an open decision |
| **Legal/product: users treat predictions as promises** | M / M | pervasive "suggestions, not guarantees" copy (questions, readiness, outcome), terms language, no advancement/offer implications anywhere |

## Ratified decisions (approved 2026-07-13)

All seven previously open decisions were approved as proposed:

1. **AI model tiering** — single default model `claude-opus-4-8` for every task at launch (`AI_MODEL_DEFAULT`); per-task tiering stays a config-only change if costs warrant revisiting. (AI_ARCHITECTURE §3)
2. **Fair-use quotas** — launch with the per-plan numbers in AI_ARCHITECTURE §8.
3. **Free-tier brief depth** — `basic` = shorter analysis; `interviewer_intel` limited to a summary of user-provided background; `risks_gaps` skipped (`brief_sections.status = skipped`).
4. **Hard-delete policy (D5)** — confirmed; no trash/recovery window at launch.
5. **Admin phase 12b** — optional and outside the launch definition; may ship post-launch.
6. **Deployment target** — Vercel + hosted Supabase + Stripe live mode.
7. **Demo strategy** — both: the seed script creates `demo@peelprep.example` with fictional data, and `NEXT_PUBLIC_DEMO_MODE=1` shows the demo banner.

## Open decisions — Phase 8B (Video Delivery Analysis; none block the launch)

1. **Scheduling** — default is after Phase 12 (post-launch); confirm. Pulling it earlier means resequencing so it still follows Phases 10 and 11 (its plan-gating and consent/deletion dependencies) — it can never precede them.
2. **Transcription provider** — which STT service backs `TranscriptionProvider` (cost/quality/data-retention terms matter; not Anthropic); mock ships regardless.
3. **Plan gating & quota** — proposed Pro-only, 20 analyses/period + 10 recordings/day (matches the spec's Pro "future video delivery analysis"); confirm numbers and whether Plus gets a taste (e.g. 1/month).
4. **Saved-recording caps** — proposed 500 MB per user / 3-minute max answer duration; confirm.
5. **Transcript editing** — proposed: users may correct the transcript before feedback runs (better grounding, small gaming risk — coaching-only output makes this acceptable); confirm.
6. **Browser-support floor** — proposed: latest Chrome/Edge/Firefox/Safari + iOS Safari 17+ / Android Chrome; older browsers get typed mode only; confirm.
7. **Landmark library** — which self-hostable WASM face/pose landmark solution to pin (evaluated at phase start for license, model size, and on-device performance; must run fully offline from our origin).
