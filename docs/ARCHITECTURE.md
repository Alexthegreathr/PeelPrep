# PeelPrep — System Architecture

Status: **Proposed (Phase 0 planning)** — awaiting approval.
Companion documents: [DATABASE.md](./DATABASE.md), [ROUTES.md](./ROUTES.md), [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md), [SECURITY.md](./SECURITY.md), [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

Every decision below is derived from [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) and targets a **launchable beta**, not the full future platform. Deferred capabilities are listed explicitly at the end.

---

## 1. High-level shape

PeelPrep is a single Next.js application backed by Supabase (Postgres + Auth + Storage), Stripe (subscriptions), and Anthropic (AI), with a deterministic mock AI provider for development and demos.

```
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 16 (App Router, Node runtime, Turbopack)                │
│                                                                 │
│  (marketing)  static public pages                               │
│  (auth)       login / signup / password reset                   │
│  (app)        authenticated product (server-rendered, dynamic)  │
│  api/         route handlers: webhooks, downloads, export,      │
│               brief generation, health                          │
│  proxy.ts     session refresh + optimistic route protection     │
│                                                                 │
│  src/lib      server-only business logic (DAL, AI, billing,     │
│               usage ledger, readiness, research, security)      │
└───────┬───────────────┬───────────────┬─────────────────────────┘
        │               │               │
   Supabase          Stripe         AI providers
   Auth / Postgres   Checkout,      AnthropicProvider (prod)
   (RLS) / Storage   Portal,        MockProvider (dev/demo/test)
   (private buckets) Webhooks       behind one interface
```

Key properties:

- **Server-authoritative.** All authorization, usage limits, and plan checks run on the server (Data Access Layer + Postgres RLS as a second layer). The client never decides what a user may do.
- **Two AI providers behind one interface** (`AiProvider`): Anthropic for production, a deterministic mock for development, demos, and tests. A separate `ResearchProvider` abstraction isolates "where facts come from" from "how the model interprets them."
- **Database is the source of truth** for subscription state (after verified Stripe webhooks), usage (append-only ledger), and all generated content.

---

## 2. Framework decisions (Next.js 16.2)

These are grounded in the bundled docs under `node_modules/next/dist/docs/` — Next 16 differs from earlier versions in ways that shape this plan:

| Decision | Rationale |
|---|---|
| `proxy.ts` (not `middleware.ts`) | Next 16 renamed middleware to proxy; it runs on the **Node.js runtime** (edge is not supported in proxy). We use it only for Supabase session cookie refresh and optimistic redirects — never as the authorization boundary (per the Next auth guide, real checks live in the DAL). |
| Async request APIs everywhere | `cookies()`, `headers()`, `params`, `searchParams` are Promise-only in Next 16. All code and examples must `await` them; we use the generated `PageProps<'/route'>` / `LayoutProps` / `RouteContext` helpers from `next typegen`. |
| `cacheComponents` **off** for the beta | Almost every authenticated view is per-user and dynamic; the marketing pages are static by default under the standard model. Cache Components (PPR/`use cache`) adds a new mental model without payoff at beta scale. Revisit post-beta if marketing/static surfaces grow. |
| Server Components by default | Client Components only for: multi-step intake form state, practice chat UI, interactive charts (Recharts), toasts/dialogs, copy buttons. |
| Mutations via **Server Actions** | Form-shaped mutations (intake steps, stories, notes, outcomes, settings) use Server Actions with Zod validation and per-action auth checks. Every action re-verifies the session and ownership — Server Functions are reachable by direct POST. |
| **Route Handlers** for non-form endpoints | Stripe webhook (raw-body signature verification), document download (signed URL issuance), data export, brief-generation orchestration, health check. Route handlers are uncached by default in Next 16 — correct for all of these. |
| `next build` does not lint | Next 16 removed `next lint`; ESLint runs via its own CLI (`npm run lint`), and CI/quality gates must invoke lint, `tsc --noEmit`, and tests separately (see IMPLEMENTATION_PLAN quality gates). |
| Turbopack | Default for `next dev`/`next build` in Next 16; no config needed. |

Revalidation: authenticated pages are dynamic (no caching), so mutations generally need only `revalidatePath`/`refresh()` after Server Actions. We avoid `use cache`/`cacheTag` in the beta.

---

## 3. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2, App Router, strict TypeScript | already scaffolded |
| Styling | Tailwind CSS v4 + shadcn/ui | shadcn provides accessible primitives (dialog, form, tabs, toast); themed with the banana palette via CSS variables |
| Forms | React Hook Form + Zod (`zodResolver`) | shared Zod schemas validate on client for UX **and again on the server** for security |
| Auth / DB / Storage | Supabase (`@supabase/supabase-js` + `@supabase/ssr`) | cookie-based sessions; RLS on every table; private storage buckets |
| Payments | Stripe (Checkout + Customer Portal + webhooks) | DB becomes subscription source of truth after verified webhook processing |
| AI | `@anthropic-ai/sdk` behind `AiProvider` interface; deterministic `MockAiProvider` | structured outputs validated with Zod; see AI_ARCHITECTURE.md |
| Charts | Recharts | readiness breakdown + history (client component) |
| Dates | date-fns (+ `@date-fns/tz`) | interview times stored as `timestamptz` + IANA zone string |
| Unit/integration tests | Vitest + Testing Library | includes RLS integration tests against local Supabase |
| E2E tests | Playwright | golden-path workflow with the mock AI provider |
| Formatting | Prettier | `format:check` is part of the quality gate |
| PDF export | **Print-optimized CSS** (browser print-to-PDF) for beta | a headless-browser PDF service is deferred; spec's "export as PDF" is satisfied via a dedicated print view — documented as a resolved trade-off in IMPLEMENTATION_PLAN.md §Resolved spec tensions |

No packages are installed during Phase 0; installation happens in Phase 1.

---

## 4. Folder structure

```
peelprep/
├─ docs/                        # planning + product docs (this folder)
├─ public/                      # static assets (logo, favicons, og images)
├─ supabase/
│  ├─ config.toml               # local Supabase (created by `supabase init`)
│  ├─ migrations/               # ordered SQL migrations (schema, RLS, functions)
│  └─ seed.sql                  # fictional demo data (clearly labeled)
├─ scripts/
│  └─ seed-demo.ts              # idempotent demo seeding via service role
├─ e2e/                         # Playwright tests + fixtures
├─ src/
│  ├─ proxy.ts                  # session refresh + optimistic redirects
│  ├─ app/
│  │  ├─ layout.tsx             # root layout: fonts, theme, toaster
│  │  ├─ globals.css            # Tailwind v4 theme tokens (banana palette)
│  │  ├─ (marketing)/           # public pages: /, /features, /pricing,
│  │  │                         # /how-it-works, /privacy, /terms
│  │  ├─ (auth)/                # /login, /signup, /reset-password,
│  │  │                         # auth/callback + auth/confirm route handlers
│  │  ├─ (app)/                 # authenticated shell (sidebar/mobile nav)
│  │  │  ├─ dashboard/
│  │  │  ├─ interviews/         # new/ + [id]/ + subroutes (brief, questions,
│  │  │  │                      # stories, practice, readiness, outcome)
│  │  │  ├─ history/  profile/  billing/  settings/
│  │  ├─ api/                   # route handlers (see ROUTES.md)
│  │  ├─ not-found.tsx  error.tsx  global-error.tsx
│  ├─ components/
│  │  ├─ ui/                    # shadcn/ui primitives (generated)
│  │  ├─ marketing/  dashboard/  interviews/  brief/  practice/
│  │  ├─ billing/  shared/      # feature-scoped composite components
│  ├─ lib/                      # server-first business logic (import 'server-only'
│  │  │                         # in modules that touch secrets)
│  │  ├─ supabase/              # client factories: server.ts, client.ts (browser),
│  │  │                         # admin.ts (service role, server-only), storage.ts
│  │  ├─ auth/                  # dal.ts (verifySession, requireUser, requireOwner)
│  │  ├─ ai/                    # provider interface, anthropic + mock providers,
│  │  │                         # prompts/ (versioned), schemas/ (Zod), costs.ts
│  │  ├─ research/              # ResearchProvider: manual + mock implementations
│  │  ├─ billing/               # plans.ts (central plan config), stripe.ts,
│  │  │                         # subscriptions.ts (webhook sync logic)
│  │  ├─ usage/                 # ledger.ts (reserve/complete/refund), features.ts
│  │  ├─ readiness/             # deterministic score calculator + explanations
│  │  ├─ security/              # rate-limit.ts, audit.ts, file-validation.ts
│  │  ├─ validation/            # shared Zod schemas for forms/entities
│  │  └─ utils/                 # dates, formatting, misc helpers
│  ├─ types/
│  │  ├─ database.ts            # generated: `supabase gen types typescript`
│  │  └─ domain.ts              # app-level types derived from DB types
│  └─ test/                     # Vitest setup, factories, RLS test helpers
├─ .env.example                 # safe template (populated in Phase 1)
├─ next.config.ts  tsconfig.json  eslint.config.mjs  postcss.config.mjs
└─ package.json
```

Purpose of each major folder:

- **`src/app`** — routing only. Pages stay thin: fetch via `src/lib`, render components. Server Actions live in colocated `actions.ts` files inside route segments; shared mutation logic lives in `src/lib`, never duplicated across actions.
- **`src/components`** — presentation. `ui/` is shadcn-generated primitives; feature folders hold composed components. Client Components are marked explicitly and kept as leaves.
- **`src/lib`** — the only place business rules live (limits, scoring, ledger, plan gates). Modules that use secrets or the service-role client import `server-only` so accidental client imports fail at build time.
- **`src/lib/auth/dal.ts`** — the Data Access Layer per the Next.js authentication guide: `verifySession()` (React `cache()`-memoized), `requireUser()`, and ownership assertions used by every page, action, and route handler.
- **`supabase/`** — declarative schema as ordered SQL migrations (tables, indexes, RLS policies, SECURITY DEFINER functions, storage policies) + seed data. Local dev runs `supabase start`/`supabase db reset`.
- **`scripts/`** — operational scripts (demo seed). Run with the service role against local or staging, never shipped to the client bundle.
- **`e2e/`** — Playwright specs, run against a local stack with `AI_PROVIDER=mock`.

---

## 5. Rendering & data-flow conventions

- **Reads:** Server Components call `src/lib` query functions, which call `verifySession()` and use the RLS-scoped Supabase server client. No fetch-from-own-API round trips.
- **Writes:** Server Actions validate input with Zod, call `requireUser()`, perform the mutation through `src/lib`, write audit entries where required, then `revalidatePath`/`redirect`.
- **AI generation:** long-running, multi-call flows (Peel Brief) run through a dedicated route handler that generates **one section per request** with per-section persistence — giving resumability, progress UI, and staying well inside serverless time limits. Short AI calls (one practice turn, one answer evaluation) run as Server Actions. Details in AI_ARCHITECTURE.md §6.
- **States:** every async surface defines loading (`loading.tsx`/Suspense + skeletons), empty (first-run dashboards, no-interviews), error (`error.tsx` + inline retry), and success states. AI content additionally shows "generating / failed / stale (inputs changed)" states.
- **Accessibility & responsiveness:** shadcn primitives (Radix) for focus/ARIA; desktop sidebar ↔ mobile header + sheet nav; WCAG AA contrast against the cream/navy palette; all charts get text alternatives.

---

## 6. Environment configuration

Defined in Phase 1 as `.env.example` (never real values):

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Supabase project + anon (RLS-scoped) key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | admin client (webhooks, ledger functions, deletion, seed) |
| `ANTHROPIC_API_KEY` | server only | production AI provider |
| `AI_PROVIDER` | server | `mock` \| `anthropic` (mock is the dev/test default) |
| `AI_MODEL_DEFAULT` (+ optional per-task overrides) | server | model id, default `claude-opus-4-8` (see AI_ARCHITECTURE.md §3) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | server only | API + webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Checkout redirect |
| `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY` | server | price ids mapped to plan keys |
| `NEXT_PUBLIC_APP_URL` | both | absolute URLs (Stripe return URLs, emails) |
| `NEXT_PUBLIC_DEMO_MODE` | both | shows the "demo / fictional data" banner when set |

Secret values never appear in client bundles; the only `NEXT_PUBLIC_` values are non-secret by design.

---

## 7. Institutional readiness (data model only)

Per the spec, the beta ships **no** organization UI, but the schema must not block it: `organizations` and `organization_members` tables exist from the first core migration, owned tables carry a nullable `organization_id`, and RLS policies are written so that today only owners have access — an org-grant policy can be added later without rewriting the model. See DATABASE.md §1 (organizations).

---

## 8. Explicitly deferred (beta boundary)

- Real-time voice/audio and video analysis (practice data model reserves modality/media columns).
- Automatic scraping of LinkedIn or any login-protected profile; automatic fetching of job-posting URLs (stored but not fetched — SSRF-safe fetcher is future work).
- Live web research provider (research abstraction ships with `manual` + `mock` implementations only; UI states clearly when current research is unavailable).
- Server-side PDF rendering (print CSS instead).
- Organization/institutional dashboards and seat management.
- OpenAI provider (interface accommodates it; not implemented).
- Admin UI (routes reserved and designed in ROUTES.md; minimal implementation is the final optional phase).
- Training on user content (blocked by default; consent model exists — see SECURITY.md §9).
