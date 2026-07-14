# PeelPrep

**Know the room. Own the interview.** PeelPrep is a secure, AI-powered
interview-preparation web app. It turns one upcoming interview into a
personalized briefing (the **Peel Brief**), predicted questions, a reusable
story bank, typed mock interviews with structured feedback, and a transparent
readiness score.

Built with **Next.js 16** (App Router, strict TypeScript, Node runtime),
**Supabase** (Auth + Postgres + Storage, Row Level Security), **Stripe**
(subscriptions), and an AI-provider abstraction with **Anthropic** in production
and a deterministic **mock provider** for development, demos, and tests.

## Features

- Email/password auth with verification, password reset, and server-enforced
  protected routes.
- 5-step interview intake with autosave, private résumé/document uploads
  (validated + text-extracted), and reusable documents.
- **Peel Brief**: section-by-section, resumable generation — company/role/
  interviewer analysis, likely themes, questions to ask, risks, next action —
  with source labels, "AI-generated guidance" labels, copy/notes/feedback/
  regenerate, and a print-optimized / last-minute view.
- Predicted questions by category; a reusable STAR **story bank** with grounded
  AI drafts (never invented); question↔story linking.
- Typed **mock interviews** (one question at a time, follow-ups, no mid-session
  feedback) with per-answer rubric feedback.
- Deterministic **readiness score** (0–100) with a transparent breakdown, a
  preparation checklist, and a full dashboard.
- **Stripe** billing (Free / Plus / Pro) with webhook-confirmed state, usage
  meters, and server-enforced limits.
- **Outcome tracking**, a consent center, **data export**, and **account
  deletion**.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  (`brew install supabase/tap/supabase`)
- Docker (the Supabase CLI runs the local stack in containers)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Start the local Supabase stack (Postgres, Auth, Storage, Studio, Mailpit)
supabase start

# 3. Apply all migrations to a clean database
supabase db reset

# 4. Configure environment
cp .env.example .env.local
#    Fill in the three Supabase values printed by `supabase start`:
#      NEXT_PUBLIC_SUPABASE_URL       -> "API URL"
#      NEXT_PUBLIC_SUPABASE_ANON_KEY  -> "anon key"
#      SUPABASE_SERVICE_ROLE_KEY      -> "service_role key"
#    (Re-print anytime with `supabase status`.)
#    Leave AI_PROVIDER=mock and the Stripe keys blank for local dev.

# 5. Run the app
npm run dev
```

Open http://localhost:3000. Confirmation and password-reset emails are captured
locally by **Mailpit** at http://127.0.0.1:54324 (nothing is actually sent). The
app also works if the dev server falls back to port 3001 — auth links resolve to
whichever localhost port is serving the app.

### Environment variables

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | **Yes** | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | **Yes** | RLS-scoped anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Yes** | Admin client — bypasses RLS, never sent to the client |
| `RATE_LIMIT_SALT` | server only | Optional | Salt for hashing IPs/emails in rate-limit keys |
| `AI_PROVIDER` | server | Optional | `mock` (default) or `anthropic` |
| `ANTHROPIC_API_KEY` | server only | If `anthropic` | Production AI provider |
| `AI_MODEL_DEFAULT` | server | Optional | Model id, default `claude-opus-4-8` |
| `RESEARCH_PROVIDER` | server | Optional | `manual` or `mock` (defaults to mock in mock/demo mode) |
| `STRIPE_SECRET_KEY` | server only | For billing | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | server only | For billing | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | For billing | Checkout |
| `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY` | server | For billing | Price ids → plan keys |
| `NEXT_PUBLIC_APP_URL` | both | Prod | Canonical app URL for auth/Stripe return links |
| `NEXT_PUBLIC_DEMO_MODE` | both | Optional | Set to `1` to show the demo banner |
| `SUPABASE_INTEGRATION` | server | Optional | Set to `1` to run the opt-in Supabase integration tests |

## Supabase setup

- **Local:** `supabase start` + `supabase db reset`. Migrations live in
  `supabase/migrations/` and apply cleanly from an empty database. Auth email
  templates and redirect-URL allowlist are in `supabase/config.toml`.
- **Hosted:** create a project, run `supabase link` then `supabase db push`, set
  the auth `Site URL` and additional redirect URLs to your deployed domain,
  and upload the `supabase/templates/*.html` email templates. Copy the project
  URL and keys into your host's environment.

## AI-provider setup

- **Mock (default):** `AI_PROVIDER=mock`. Deterministic, clearly-fictional
  output; no API key or cost. Used for all dev/demo/tests.
- **Anthropic:** set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. Structured
  output is obtained via a forced tool call validated with Zod; no chain-of-
  thought or raw prompts are stored — only metadata in `ai_generations`.

## Stripe setup (test mode)

1. Create products/prices for Plus ($19/mo) and Pro ($39/mo) in the Stripe
   dashboard (test mode). Put the price ids in `STRIPE_PRICE_PLUS_MONTHLY` /
   `STRIPE_PRICE_PRO_MONTHLY` and set `STRIPE_SECRET_KEY`.
2. Forward webhooks locally: `stripe listen --forward-to
   localhost:3000/api/webhooks/stripe` and put the printed signing secret in
   `STRIPE_WEBHOOK_SECRET`.
3. The database is the source of truth: checkout redirects grant nothing until
   the webhook is verified and processed (idempotently).

Without Stripe configured, the billing page runs in test mode and shows plans
and usage; limits are still enforced from the database.

## Demo mode

```bash
set -a; source .env.local; set +a
npm run seed:demo         # seeds demo@peelprep.example with fictional data
# then set NEXT_PUBLIC_DEMO_MODE=1 and restart `npm run dev`
```

Sign in as `demo@peelprep.example` / `peelprep-demo-123`. All demo data is
clearly labeled fictional and uses the mock AI provider.

## Testing

```bash
npm run format:check   # prettier
npm run lint           # eslint (Next 16 lints separately from build)
npm run typecheck      # next typegen && tsc --noEmit
npm test               # vitest (unit; Supabase integration when enabled)
npm run build          # production build
```

The **integration** suite (RLS isolation, the usage ledger, generation service,
brief/questions/practice/readiness, Stripe webhook sync, account-deletion
cascade) runs against a local Supabase stack. Enable it:

```bash
supabase db reset
set -a; source .env.local; set +a
SUPABASE_INTEGRATION=1 npm test
```

**End-to-end (Playwright):**

```bash
npx playwright install chromium   # first time
supabase db reset                 # clears rate-limit counters
set -a; source .env.local; set +a
npx playwright test               # auth, intake, brief, questions/stories,
                                  # practice, readiness, billing, outcomes,
                                  # and the golden-path workflow
```

## Deployment (Vercel + hosted Supabase + Stripe)

1. Push the repo to GitHub and import it in Vercel.
2. Create a hosted Supabase project; run `supabase db push`; set the auth Site
   URL + redirect URLs to your domain; upload the email templates.
3. In Vercel, set all environment variables (Supabase URL/keys, `AI_PROVIDER=
   anthropic` + `ANTHROPIC_API_KEY`, Stripe keys + price ids,
   `NEXT_PUBLIC_APP_URL=https://your-domain`).
4. Add the Stripe webhook endpoint (`https://your-domain/api/webhooks/stripe`)
   and set `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Verify the golden path against the deployed app before going live.

## Privacy & safety notes

- Row-level security on every table + private storage buckets with signed URLs;
  authorization is re-checked server-side on every request (RLS is the second
  layer). Secrets never reach the client.
- AI output is grounded in supplied context, labeled as guidance, and marks
  general knowledge as unverified. It never fabricates citations, invents
  candidate experiences, or infers sensitive interviewer characteristics.
- No training on user content. The outcome-research opt-in (default off) governs
  only anonymized system-wide analysis, not model training.
- Full data export and hard account deletion (files purged, rows cascaded, audit
  rows anonymized).

## Known limitations

- Research is `manual`/`mock` only — no live web research; the UI states when
  current research is unavailable.
- Job-posting URLs are stored but never fetched (SSRF-safe).
- PDF export is browser print-to-PDF (no server-side renderer).
- Fair-use daily sub-caps for "unlimited" plans are a documented follow-up;
  per-period quotas are enforced.
- The Anthropic provider is implemented but exercised manually behind a flag
  (tests/demos use the mock provider).

## Roadmap / deferred

- Optional **Video Delivery Analysis** (recorded practice → browser-side
  aggregate metrics + coaching) — designed across the docs, outside the launch
  definition (see `docs/`).
- Live research provider, organization/institutional dashboards, OpenAI
  provider, admin area, and scheduled retention jobs.

## Learn more

- Product & architecture docs: `docs/`
- Next.js 16 bundled docs: `node_modules/next/dist/docs/`
