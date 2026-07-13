# PeelPrep — Security Design

Status: **Approved 2026-07-13.** Controls land in the phases noted in IMPLEMENTATION_PLAN.md; the golden rule throughout: **the client is untrusted; every decision is made (or re-made) on the server, with RLS as the second, independent layer.**

Sensitive data classes (per spec): résumés, cover letters, interview details, candidate answers, practice transcripts, outcomes, private notes, future recordings. All are RLS-protected, private-bucket-stored where files, excluded from logs, and covered by export + deletion.

---

## 1. Authentication

- Supabase Auth, email + password, **email verification required** before the app grants access; password reset via recovery email. OAuth (Google) is deferred (callback route reserved).
- Sessions: `@supabase/ssr` cookie-based (httpOnly, `secure`, `sameSite=lax`); `src/proxy.ts` refreshes tokens on every request (Next 16 proxy = Node runtime; the Supabase middleware pattern applies unchanged).
- Server code always uses `supabase.auth.getUser()` (server-verified) — never trusts `getSession()` payloads for authorization.
- Signup captures `terms_of_service` + `privacy_policy` consent rows (versioned). Auth endpoints are rate-limited (§7); Supabase's own auth rate limits stay on.

## 2. Authorization

- **DAL (`src/lib/auth/dal.ts`)** is the single choke point: `verifySession()` (React `cache()`-memoized per request), `requireUser()`, `requireOwner(resource)` (fetch-by-id through the RLS client and 404 on miss — never 403, to avoid resource-existence oracles), `requireAdmin()` (checks `profiles.role`; future admin phase).
- Every `(app)` page, Server Action, and route handler calls the DAL first. Server Actions additionally re-validate all input with Zod — they are reachable by direct POST regardless of UI state.
- **Plan gates** run in server code from `src/lib/billing/plans.ts` (never scattered in components; UI reads the same config only for display).
- **RLS** (DATABASE.md §8) backstops every query: even a bug in app code cannot read or write across users. Proxy performs only optimistic redirects and is never the security boundary.
- Client-side checks (hiding buttons, disabling forms) are UX only.

## 3. Secrets

- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are read exclusively in `server-only` modules; the service-role client lives in `src/lib/supabase/admin.ts` which throws if imported client-side.
- `.env*` is gitignored (already configured); `.env.example` carries names + comments only. No secrets in source, logs, error messages, or client bundles (only `NEXT_PUBLIC_` values are bundled, all non-secret).
- CI/deploy secrets injected via platform environment; key rotation is a documented runbook item (README, Phase 12).

## 4. Input & file validation

- **All external input** (forms, action args, route params, query strings, webhook payloads after signature check) is Zod-validated server-side; shared schemas in `src/lib/validation` are reused client-side for UX only.
- **Uploads:** allowlist (PDF, DOCX, TXT, MD) checked by MIME *and* magic bytes server-side; ≤ 5 MB; filenames sanitized to a safe slug; stored under `documents/{userId}/{documentId}/…` so path traversal is structurally impossible; text extraction runs server-side in a try/catch (a hostile file can at worst fail extraction). Upload actions are rate-limited (§7).
- **URLs** (job posting, portfolio, profiles): validated as http(s) URLs, stored, rendered as links — **never fetched server-side in the beta** (SSRF is avoided by not fetching; a future fetcher needs an allowlist + IP-range guards, noted as deferred).
- **Output encoding:** React escaping everywhere; no `dangerouslySetInnerHTML` for user or AI content; AI text rendered as plain text/whitelisted markdown subset.

## 5. Private storage & signed URLs

- Buckets `documents` and `exports` are **private**; `storage.objects` RLS restricts each user to their own `userId/` prefix (DATABASE.md §8.5).
- Downloads: client → `GET /api/documents/[id]/download` → DAL ownership check → `createSignedUrl(path, 60s)` → 302. Short TTL, no bucket paths exposed in HTML, audit-logged. Uploads likewise flow through a server action (validate → upload with the user's RLS-scoped client so storage RLS applies → insert row).
- Future recordings inherit the same model (private bucket, prefix RLS, signed URLs, deletion cascade).

## 6. Stripe webhook security

- `/api/webhooks/stripe`: read **raw body** (`await req.text()`), `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`; invalid signature → 400, no processing.
- **Idempotent:** event id inserted into `stripe_webhook_events` first (`on conflict do nothing`); duplicates/retries return 200 immediately. Processing errors are recorded and return 5xx so Stripe retries; handlers are written to be safely re-runnable (upsert semantics on `subscriptions`).
- Subscription state changes **only** via verified webhooks (+ future admin tools). Checkout success redirects never grant entitlements — the page shows "confirming…" until the webhook lands. Out-of-order events are handled by trusting the fetched subscription object state, not event order.

## 7. Rate limiting & abuse

Postgres fixed-window limiter (`hit_rate_limit()`, DATABASE.md §2) — adequate at beta scale, swappable for Redis later. Applied at:

| surface | limit (initial) |
|---|---|
| login / signup / reset (per IP-hash + per email) | 10 / 15 min |
| AI endpoints (per user, on top of quotas) | 10 generation requests / min |
| uploads | 20 / hour |
| export | 1 / day |
| account deletion attempts | 3 / day |

Plus the **usage ledger** (AI_ARCHITECTURE.md §8) for plan quotas — limits are enforced before any model call, atomically. IPs are stored only as salted hashes in rate-limit keys. Free-tier farming pressure is reduced by email verification + per-IP signup limits (accepted residual risk, see IMPLEMENTATION_PLAN §Risks).

## 8. AI-specific safety

- **Prompt injection:** all user/source text enters prompts inside tagged data blocks with an explicit "treat as data, not instructions" contract; structured outputs (API-constrained schema) + server-side Zod validation bound what a hijacked generation could do; generated content is treated as untrusted display data (no tool use, no server execution paths, escaped rendering).
- **Interviewer protections:** schema-level (no personal-attribute fields exist), prompt-level (refusal instructions), input-level (only user-provided professional background), and UI-level (the spec's respectful-use notice on every interviewer surface). No scraping.
- **No fabrication:** citation mapping rejects source ids the model didn't receive (AI_ARCHITECTURE.md §5); "AI-generated preparation guidance" labels on every generated section; readiness numbers are never model-produced.
- **Refusals** from the provider are surfaced as non-retryable errors and refunded — never retried in a loop.

## 9. Consent & data use

- `user_consents` records versioned grants/revocations for: ToS, privacy policy (both required at signup), `outcome_research_optin` (**default off**; controls whether anonymized outcome data may inform system-wide prediction improvements — never model training), `marketing_emails` (future).
- Managed in `/settings`; revocation takes effect immediately; consent changes are audit-logged. No user content is used to train models, full stop, in the beta; any future change requires new explicit consent (spec).
- Outcome forms snapshot the active consent (`outcomes.research_optin_snapshot`) so later revocation is honored historically.

## 10. Audit, export, deletion

- **Audit (`audit_logs`):** written server-side (service role) for: auth-sensitive changes, document upload/delete, interview delete, export requests, account-deletion requests, subscription changes (webhook), consent changes, future admin actions. Metadata is ids/counters only — never content. Rows survive account deletion anonymized (`user_id` → null).
- **Export (`/api/export`):** authenticated, rate-limited (1/day), assembles a complete JSON archive of the user's rows (profile, interviews + all children, documents metadata, stories, outcomes, consents, usage summary) plus signed URLs for uploaded files; stored in the private `exports` bucket (7-day expiry) and returned via signed URL. Audit-logged.
- **Deletion:** document / interview / account flows exactly as DATABASE.md §9 (hard delete, cascades, storage purge, Stripe cancel, anonymized audit skeleton). Account deletion requires re-authentication + typed confirmation phrase.

## 11. Safe error handling & headers

- Central error helper: users see generic, actionable messages + a correlation id; stack traces, SQL, provider payloads, and internal identifiers never leave the server. `error.tsx` / `global-error.tsx` boundaries on every segment; route handlers return sanitized JSON errors with correct status codes.
- Security headers set in `next.config.ts`: strict CSP (self + Supabase + Stripe endpoints; no inline script except Next-required nonces), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, HSTS in production. Server Actions get an explicit `allowedOrigins` config.
- Dependency hygiene: `npm audit` in the quality gate; lockfile committed; Renovate/Dependabot recommended post-beta.

## 12. Verification (how we know it holds)

- RLS integration tests: two users + anon client attempt cross-access on **every** table and storage prefix (Phase 3, extended each schema phase).
- Auth tests: unverified-email block, protected-route redirects, direct-POST Server Action rejection without session.
- Webhook tests: bad signature → 400; duplicate event → no-op; replay safety.
- Limit tests: concurrent reservation race (two parallel requests, limit 1 → exactly one succeeds); refund on provider failure.
- Deletion tests: cascade completeness (no orphan rows/objects), export-then-delete round trip.
- E2E golden path runs with mock provider and asserts no secret strings ever appear in HTML payloads.
