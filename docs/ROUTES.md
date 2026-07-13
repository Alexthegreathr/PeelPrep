# PeelPrep — Route Map

Status: **Proposed (Phase 0 planning)**.

Conventions:

- Next.js 16 App Router. Route groups: `(marketing)` public, `(auth)` authentication, `(app)` authenticated product, `(admin)` future admin. Groups do not appear in URLs.
- **Protection model:** `src/proxy.ts` refreshes the Supabase session cookie on every request and performs *optimistic* redirects (no DB reads). The real boundary is the Data Access Layer: every `(app)` page, Server Action, and API route calls `verifySession()` / `requireUser()` server-side; RLS backstops everything (see SECURITY.md §2–3).
- Mutations are Server Actions colocated with their route segment (`actions.ts`); route handlers exist only where actions don't fit (webhooks, downloads, long-running generation, export, health).
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

## 4. API route handlers — `app/api/`

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | Stripe signature (`STRIPE_WEBHOOK_SECRET`), raw body via `req.text()` | verify → insert `stripe_webhook_events` (idempotent) → sync `subscriptions`; events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`. Always 2xx on handled/duplicate; 4xx on bad signature |
| `/api/interviews/[id]/brief/generate` | POST | session + ownership + usage reservation | body: `{ section?: sectionKey }`. No body/first call: reserves `brief_generate` usage, creates/refreshes brief + pending sections, generates the next pending section; with `section`: regenerates one section (reserves `section_regenerate`). One section per request → resumable, progress-friendly, timeout-safe (AI_ARCHITECTURE.md §6) |
| `/api/interviews/[id]/questions/generate` | POST | session + ownership + usage reservation | generate predicted questions (`questions_generate`, quantity = count) |
| `/api/documents/[id]/download` | GET | session + ownership | issues short-lived signed URL (60 s) and 302-redirects; audit-logged |
| `/api/export` | POST | session + rate limit (1/day) | assembles full JSON export server-side, stores in `exports` bucket, returns signed URL; audit-logged (SECURITY.md §10) |
| `/api/health` | GET | none | `{ ok: true, version }` for deploy checks; no secrets, no DB details |

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
