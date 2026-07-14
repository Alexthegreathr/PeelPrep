# PeelPrep

Secure, AI-powered interview preparation. Built with Next.js 16 (App Router,
strict TypeScript), Supabase (Auth + Postgres + Storage with Row Level
Security), and a mock-first AI provider layer.

This repository is being built in phases (see `docs/IMPLEMENTATION_PLAN.md`).
**Currently implemented: Phase 1 (foundations) and Phase 2 (authentication &
protected shell).** Interview creation, AI generation, billing, and the rest
arrive in later phases.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  (`brew install supabase/tap/supabase` or see the docs) — needed from Phase 2
- Docker (the Supabase CLI runs the local stack in containers)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Start the local Supabase stack (Postgres, Auth, Storage, Studio, Inbucket)
supabase start

# 3. Apply migrations to a clean database (creates profiles, user_consents,
#    rate_limit_counters, the signup trigger, and RLS policies)
supabase db reset

# 4. Configure environment variables
cp .env.example .env.local
#    Fill in the three Supabase values printed by `supabase start`:
#      NEXT_PUBLIC_SUPABASE_URL          -> "API URL"
#      NEXT_PUBLIC_SUPABASE_ANON_KEY     -> "anon key"
#      SUPABASE_SERVICE_ROLE_KEY         -> "service_role key"
#    (Re-print them anytime with `supabase status`.)

# 5. Run the app
npm run dev
```

Open http://localhost:3000. Confirmation and password-reset emails are captured
locally by **Inbucket** at http://127.0.0.1:54324 (nothing is actually sent).

### Environment variables

| Variable | Scope | Required now? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | **Yes** | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | **Yes** | RLS-scoped anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Yes** | Admin client (consent capture, rate limiting). Bypasses RLS — never sent to the client |
| `RATE_LIMIT_SALT` | server only | Optional | Salt for hashing IPs/emails in rate-limit keys (falls back to the service-role key) |
| `NEXT_PUBLIC_APP_URL` | both | Optional | Absolute URLs in auth emails (default `http://localhost:3000`) |
| `NEXT_PUBLIC_DEMO_MODE` | both | Optional | Set to `1` to show the demo banner |
| `SUPABASE_INTEGRATION` | server | Optional | Set to `1` to run the opt-in Supabase integration tests |
| AI / Stripe keys | server | Later phases | Unused until Phases 5 / 10 |

The full variable set (AI, Stripe) is documented in `.env.example` and
`docs/ARCHITECTURE.md` §6.

## Quality gate

```bash
npm run format:check   # prettier
npm run lint           # eslint (Next 16 lints separately from build)
npm run typecheck      # next typegen && tsc --noEmit
npm test               # vitest (unit; integration tests skip unless enabled)
npm run build          # next build (production, Turbopack)
```

### Tests

`npm test` runs the unit suite (redirect validation, proxy route decisions,
DAL 404/redirect behavior, auth Zod schemas, rate-limit helper). It passes on a
fresh clone with **no** services running.

The **integration** suite (`src/test/integration/`) exercises the real
migration against a local Supabase stack — the signup trigger, `profiles` /
`user_consents` RLS, the role-escalation guard, and `hit_rate_limit()`. It is
opt-in:

```bash
supabase start && supabase db reset
SUPABASE_INTEGRATION=1 \
NEXT_PUBLIC_SUPABASE_URL=<url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service> \
npm test
```

## Manual auth smoke test

With `npm run dev` and Supabase running:

1. **Sign up** at `/signup` (email + password + accept terms). You'll see a
   "check your email" message.
2. Open **Inbucket** (http://127.0.0.1:54324), open the confirmation email, and
   click the link. It hits `/auth/confirm`, verifies the token, and lands on
   `/login?confirmed=1`.
3. **Log in** at `/login`. You're redirected to `/dashboard`.
4. Try visiting `/dashboard`, `/profile`, `/billing`, `/settings` — all render
   the authenticated shell.
5. **Edit your profile** at `/profile` (name, headline, timezone) and save.
6. **Sign out** from the sidebar. You're returned to the marketing home page.
7. Visit `/dashboard` while signed out → redirected to
   `/login?next=%2Fdashboard`; signing in returns you there.
8. **Forgot password:** at `/reset-password`, request a link; open it in
   Inbucket; set a new password at `/update-password`.

## Security model (Phase 2)

- **Server-authoritative.** `src/proxy.ts` only refreshes the session cookie and
  performs *optimistic* redirects. The real boundary is the Data Access Layer
  (`src/lib/auth/dal.ts`): every protected page, Server Action, and route
  handler calls `verifySession()` / `requireUser()`, and Postgres RLS backstops
  every query.
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`) live only in `server-only` modules
  and never reach the client bundle.
- **Email verification** is required before login. Auth endpoints are
  rate-limited (per IP-hash and per email).
- `?next=` redirects are validated to same-origin paths only (no open redirect).

## Learn more

- Product and architecture docs: `docs/`
- Next.js 16 bundled docs: `node_modules/next/dist/docs/`
