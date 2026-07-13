# PeelPrep — Route Map

Status: **Approved 2026-07-13.**

Conventions:

- Next.js 16 App Router. Route groups: `(marketing)` public, `(auth)` authentication, `(app)` authenticated product, `(admin)` future admin. Groups do not appear in URLs.
- **Protection model:** `src/proxy.ts` refreshes the Supabase session cookie on every request and performs *optimistic* redirects (no DB reads). The real boundary is the Data Access Layer: every `(app)` page, Server Action, and API route calls `verifySession()` / `requireUser()` server-side; RLS backstops everything (see SECURITY.md §2–3).
- Mutations are Server Actions colocated with their route segment (`actions.ts`); route handlers exist only where actions don't fit (webhooks, downloads, long-running generation, export, health; Phase 8B adds media upload/playback URLs and job polling).
- All dynamic `params` / `searchParams` are Promises (Next 16) and are awaited; handlers use the `RouteContext<'/path'>` helper.

---

## 1. Public routes — `(marketing)`

| Route | Page | Rendering | Notes |
|---|---|---|---|
| `/` | Landing | static | hero, problem, 3-step process, brief + practice previews, pricing summary, privacy/trust, CTA |
| `/features` | Features | static | |
| `/pricing` | Pricing | static | plan cards from the same `plans.ts` config used for enforcement (display copy only) |
| `/how-it-works` | How It Works | static | |
| `/privacy` | Privacy policy | static | includes AI-processing and consent explanations |
| `/terms` | Terms | static | |

Also: `robots.ts`, `sitemap.ts`, `opengraph-image` at the root; `not-found.tsx` global 404.
Logged-in visitors to `/`, `/login`, `/signup` are optimistically redirected to `/dashboard` by proxy.

## 2. Auth routes — `(auth)`

| Route | Kind | Notes |
|---|---|---|
| `/login` | page + action | email/password sign-in; rate-limited |
| `/signup` | page + action | account creation + ToS/privacy consent capture; email verification required |
| `/reset-password` | page + action | request reset email |
| `/update-password` | page + action | set new password from recovery link |
| `/auth/confirm` | **route handler** (GET) | verifies email-confirmation / recovery `token_hash` (`verifyOtp`), then redirects |
| `/auth/callback` | **route handler** (GET) | OAuth/PKCE code exchange — reserved; OAuth providers are deferred |
| `/auth/signout` | action (POST) | sign out + redirect to `/` |

## 3. Authenticated app — `(app)` (server-protected, per spec list)

| Route | Purpose |
|---|---|
| `/dashboard` | next-interview countdown, readiness, next action, upcoming interviews, recent briefs, usage remaining, practice streak, recent outcomes, add-interview CTA; rich empty states |
| `/interviews/new` | 5-step intake wizard (opportunity → interview → interviewers → materials → confirm); draft-saving per step; free-tier active-interview gate |
| `/interviews/[id]` | interview hub: status, snapshot, links to sub-pages, generate-brief entry point, delete/archive |
| `/interviews/[id]/brief` | Peel Brief: all sections, per-section timestamps/labels/sources/regenerate/feedback/copy/notes/complete; generation progress UI |
| `/interviews/[id]/brief/print` | condensed + print-optimized view (browser print-to-PDF); also serves the "last-minute version" |
| `/interviews/[id]/questions` | predicted questions by category, save, link stories, practice buttons, "suggestions not guarantees" notice |
| `/interviews/[id]/stories` | story bank scoped to this interview's recommendations + global stories; STAR editor |
| `/interviews/[id]/practice` | session config + list of past sessions |
| `/interviews/[id]/practice/[sessionId]` | typed mock-interview chat; turn-by-turn; end-of-session feedback |
| `/interviews/[id]/readiness` | score, component breakdown (Recharts), history, explanation, next action |
| `/interviews/[id]/outcome` | outcome recording form; consent-gated research opt-in note |
| `/history` | past interviews + outcomes list, filters |
| `/profile` | name, headline, timezone, default résumé, document library (upload/delete) |
| `/billing` | current plan, usage meters, upgrade/downgrade (Checkout), manage (Customer Portal), invoices link |
| `/settings` | consent management, data export, account deletion, demo-mode indicator |

Layout: `(app)/layout.tsx` renders sidebar (desktop) / compact header + sheet (mobile), fetches session + subscription once, wraps children; per-segment `loading.tsx` and `error.tsx`.

Key Server Actions (colocated; all Zod-validated + `requireUser()` + ownership + rate-limit where noted):

- intake: `saveIntakeStep`, `confirmInterview`, `saveDraftAndExit`, `deleteInterview` (confirm), `archiveInterview`
- documents: `uploadDocument` (rate-limited, validated), `deleteDocument`, `setDefaultResume`
- brief: `markSectionComplete`, `saveSectionNotes`, `submitGenerationFeedback`
- questions: `saveQuestion`, `addQuestion`, `linkStory`, `unlinkStory`
- stories: `createStory`, `updateStory`, `deleteStory`, `requestStorySuggestions` (usage-metered)
- practice: `startPracticeSession` (usage-metered), `submitPracticeTurn` (AI turn), `endPracticeSession`, `requestAnswerFeedback` (usage-metered)
- outcome: `saveOutcome`
- billing: `createCheckoutSession`, `createPortalSession`
- settings: `updateProfile`, `updateConsent`, `requestAccountDeletion` (confirm phrase)

### Phase 8B — Video Delivery Analysis screens (planned, optional)

Video mode lives inside the existing practice flow (`/interviews/[id]/practice/[sessionId]`) as client-side steps, plus one settings surface. Typed mode remains the default; every screen below offers a "continue in text mode" path.

| screen / step | purpose |
|---|---|
| permission explainer | plain-language explanation of camera/mic use, what is measured, what is never done (no facial recognition, no emotion detection); links to the five VDA consents |
| device preview | local camera/mic preview, framing + lighting hints; nothing recorded yet |
| coaching goals | optional pick of focus areas (e.g. pacing, filler words, framing, posture) that steer `delivery_feedback`; skippable |
| recording countdown | 3-2-1 into a recorded answer for the current question |
| recorded response review | local playback; re-record (retry) or continue |
| upload/processing state | shows exactly what is leaving the browser (aggregate metrics; temp audio for transcription; video only if "save" was chosen) with live job status |
| transcript review | view/correct the transcript before feedback runs |
| delivery-feedback report | observable strengths/observations, top improvement, setup + speaking advice, practice exercise, uncertainty — all labeled as optional coaching |
| playback | local playback always; saved recordings via signed URL |
| save or delete recording | explicit choice; default is **not** saved |
| privacy & retention controls | in `/settings`: VDA consents, saved recordings list, per-artifact deletion (recording / transcript / metrics / feedback), retention policy text |

Failure & fallback states (each is a designed state, not an error page): permission denied → explainer with typed-mode continue; no camera → audio-only or typed; no microphone → typed; unsupported browser (capability-detected) → typed with an explanation; recording interrupted → keep partial locally, offer retry; upload failure → retry with backoff, nothing lost locally; transcription failure → analysis proceeds `partial` without transcript-based metrics; landmark-analysis failure (no face detected / low light) → audio-and-transcript-only feedback with the limitation stated; AI-feedback failure → metrics still shown, retry offered, usage refunded; user chooses text-only at any point → typed practice, zero VDA data created.

## 4. API route handlers — `app/api/`

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | Stripe signature (`STRIPE_WEBHOOK_SECRET`), raw body via `req.text()` | verify → insert `stripe_webhook_events` (idempotent) → sync `subscriptions`; events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`. Always 2xx on handled/duplicate; 4xx on bad signature |
| `/api/interviews/[id]/brief/generate` | POST | session + ownership + usage reservation | body: `{ section?: sectionKey }`. No body/first call: reserves `brief_generate` usage, creates/refreshes brief + pending sections, generates the next pending section; with `section`: regenerates one section (reserves `section_regenerate`). One section per request → resumable, progress-friendly, timeout-safe (AI_ARCHITECTURE.md §6) |
| `/api/interviews/[id]/questions/generate` | POST | session + ownership + usage reservation | generate predicted questions (`questions_generate`, quantity = count) |
| `/api/documents/[id]/download` | GET | session + ownership | issues short-lived signed URL (60 s) and 302-redirects; audit-logged |
| `/api/export` | POST | session + rate limit (1/day) | assembles full JSON export server-side, stores in `exports` bucket, returns signed URL; audit-logged (SECURITY.md §10) |
| `/api/health` | GET | none | `{ ok: true, version }` for deploy checks; no secrets, no DB details |

Phase 8B (planned, optional) adds:

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/vda/media/upload-url` | POST | session + `vda_recording` + `vda_media_upload` (+ `vda_ai_analysis` for transcription uploads) + rate limit | validates MIME/size/duration caps, creates the `media_assets` row, returns a short-lived signed **upload** URL (temp transcription audio or explicitly-saved recording) |
| `/api/vda/jobs/[id]` | GET | session + ownership | job-status polling for the processing screen |
| `/api/media/[id]/playback` | GET | session + ownership | 60 s signed URL for **saved** recordings; audit-logged |

Analysis creation and aggregate-metrics submission are **not** a route handler: the `submitDeliveryMetrics` Server Action (ownership + `vda_ai_analysis` consent + usage reservation) accepts the Zod-validated browser aggregates, creates `delivery_analyses` (+ `delivery_metrics`), and enqueues `processing_jobs` — consistent with the mutations-are-actions convention. Deletion of VDA artifacts (recording / transcript / metrics / feedback) likewise runs through Server Actions.

Not exposed as public API: everything else goes through Server Actions. There is no unauthenticated AI endpoint anywhere (spec: no unrestricted AI endpoints).

## 5. Future admin routes — `(admin)` (designed now, built in optional Phase 12b)

URL space reserved under `/admin`; every request requires session + `profiles.role = 'admin'` verified in the DAL (`requireAdmin()`), plus proxy optimistic redirect. Normal users get 404 (not 403) to avoid confirming the surface exists.

| Route | Purpose |
|---|---|
| `/admin` | overview: user count, subscription counts, AI usage + estimated cost (from `usage_events`/`ai_generations`), error rate |
| `/admin/users` | search; disable a compromised account (bans via Supabase admin API); adjust per-user usage overrides |
| `/admin/usage` | feature usage + cost dashboards |
| `/admin/prompts` | prompt-version monitoring (versions in use, failure/validation rates per version) |
| `/admin/feedback` | `generation_feedback` review queue |

Admin mutations are service-role Server Actions with mandatory `audit_logs` entries (`actor='admin'`).

## 6. proxy.ts matcher

Runs on all routes except static assets/images (standard matcher). Responsibilities, in order: (1) refresh Supabase auth cookies via `@supabase/ssr`; (2) optimistic redirects — unauthenticated → `/login?next=…` for `(app)`/`(admin)` paths; authenticated → `/dashboard` for `/login`, `/signup`, `/`. It never reads the database and never authorizes — that is the DAL's job.
