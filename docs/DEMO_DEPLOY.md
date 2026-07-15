# PeelPrep — Public Beta Demo Deploy (QR-code ready)

Goal: a public **`https://yourdomain`** that people scan (QR), tap **“Try the demo”**,
and use — with a beta banner + limitations modal, and the camera/voice features
working. No paid AI keys are needed (the app runs on the built-in **mock** AI
provider in demo mode).

## What we're building

- **Database/auth:** free **Supabase Cloud** project (managed, already HTTPS —
  this is what makes the whole thing reliable and avoids self-hosting a 10-container
  stack on your droplet).
- **App:** your **DigitalOcean droplet** runs the Next.js production build.
- **HTTPS:** **Caddy** on the droplet auto-provisions a certificate for your domain
  (required — browsers block camera/mic on non-HTTPS pages).
- **Entry:** the **“Try the demo”** button (already built) signs everyone into one
  shared demo account. QR points at `https://yourdomain/login`.

> Time: ~1–1.5 hours. You'll run commands over SSH on the droplet; every command is
> copy-paste below.

---

## Prerequisites

1. A **domain** (or subdomain) you can edit DNS for. A cheap `.xyz`/`.com` is fine;
   or use a spare subdomain of a domain you already own. **Required** for HTTPS +
   the camera features.
2. Your **DigitalOcean droplet** (4 GB RAM — fine) and its **public IP**.
3. A free **Supabase** account (supabase.com).
4. The **Supabase CLI** on your laptop (to push the schema):
   `brew install supabase/tap/supabase` (macOS) or see supabase.com/docs/guides/cli.

---

## Part A — Database on Supabase Cloud (~15 min, from your laptop)

1. **Create a project** at https://supabase.com → New project. Pick a region near
   your audience. Save the **database password**.
2. From **Project Settings → API**, copy and keep:
   - Project URL: `https://<ref>.supabase.co`
   - `anon` public key
   - `service_role` secret key (server-only — never in the browser)
3. **Push the schema** (from this repo folder on your laptop):
   ```bash
   supabase link --project-ref <ref>      # paste the db password when asked
   supabase db push                        # applies everything in supabase/migrations
   ```
4. **Auth settings** (Authentication → URL Configuration):
   - **Site URL:** `https://yourdomain`
   - **Redirect URLs:** add `https://yourdomain/auth/confirm`
   - (Optional, only if you also want open email signup) Authentication → Providers →
     Email → turn **“Confirm email” OFF** so signups are instant. Not needed for the
     shared “Try the demo” button.
5. **Seed the shared demo account + sample data** into the cloud DB (from your laptop):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<cloud service_role key> \
   node scripts/seed-demo.mjs
   ```
   This creates `demo@peelprep.example` / `peelprep-demo-123` with a sample
   interview, brief, questions, stories, a practice session, and readiness — which
   is exactly what the “Try the demo” button logs into.
6. (High traffic only) Authentication → **Rate Limits**: raise the sign-in limit if
   you expect many people tapping “Try the demo” in the same minute. Each visitor
   signs in once, then keeps their own session, so a normal booth is fine.

---

## Part B — App on the droplet (~30 min, over SSH)

SSH in: `ssh root@<droplet-ip>`

1. **Install Node 20 + git:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs git
   npm i -g pm2
   ```
2. **Get the code** onto the droplet (git clone your repo, or `scp`/rsync it up):
   ```bash
   git clone <your-repo-url> peelprep && cd peelprep
   ```
3. **Create `.env.production`** (or `.env.local`) in the project folder:
   ```bash
   cat > .env.local <<'EOF'
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<cloud anon key>
   SUPABASE_SERVICE_ROLE_KEY=<cloud service_role key>
   RATE_LIMIT_SALT=<run: openssl rand -hex 16>
   NEXT_PUBLIC_APP_URL=https://yourdomain
   NEXT_PUBLIC_DEMO_MODE=1
   AI_PROVIDER=mock
   EOF
   ```
   That's all it needs — no Anthropic key (mock AI), no Stripe (billing shows a
   clearly-labeled test-mode notice).
4. **Build and run** (binds to `127.0.0.1:3000`; Caddy exposes it):
   ```bash
   npm ci
   npm run build
   pm2 start "npm run start" --name peelprep
   pm2 save && pm2 startup     # keep it running across reboots
   ```
5. **Firewall:**
   ```bash
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
   ```

---

## Part C — Domain + HTTPS with Caddy (~10 min + DNS wait)

1. **Point DNS at the droplet.** At your domain registrar, add an **A record**:
   - Host: `@` (or a subdomain like `demo`) → Value: your droplet's public IP.
   - (Optional) `www` → same IP.
   Wait a few minutes for it to propagate (`dig yourdomain` should show the IP).
2. **Install Caddy** on the droplet:
   ```bash
   apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
   apt-get update && apt-get install -y caddy
   ```
3. **Configure it** — replace `/etc/caddy/Caddyfile` with:
   ```
   yourdomain {
       reverse_proxy 127.0.0.1:3000
   }
   ```
4. **Reload:** `systemctl reload caddy`. Caddy fetches a Let's Encrypt cert
   automatically. Visit **`https://yourdomain`** — you should see the navy **Beta**
   strip and the app; the first-visit limitations modal appears once per browser.

---

## Part D — QR code + final check

1. Point the QR at **`https://yourdomain/login`** (the page with the one-tap
   **“Try the demo”** button). Any QR generator works; I can generate the PNG/SVG
   for you once the domain is live — just send me the final URL.
2. **Smoke test on your phone:** scan → tap **“Try the demo”** → you land on the
   dashboard as the demo user. Open a **mock interview** and click **Turn on camera**
   / **Answer by voice** to confirm the HTTPS camera path works.

---

## Reset between sessions (optional)

To wipe the shared sandbox back to clean sample data (e.g. between events), re-run
the seed from your laptop — it's idempotent:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<cloud service_role key> \
node scripts/seed-demo.mjs
```

## Redeploy after code changes

```bash
cd peelprep && git pull && npm ci && npm run build && pm2 restart peelprep
```

---

## Troubleshooting

- **“Try the demo” shows “demo account isn't ready”** → run the Part A step 5 seed.
- **Camera/mic don't turn on** → you're not on `https://` (check the padlock), or the
  domain/cert isn't ready yet. Everything else (typed practice, briefs, etc.) still works.
- **Login bounces back to /login** → check `NEXT_PUBLIC_SUPABASE_URL`/keys in
  `.env.local` match the cloud project, then `pm2 restart peelprep`.
- **Blank/500** → `pm2 logs peelprep`.

---

## Alternative: everything on the droplet (no Supabase Cloud)

Possible on your 4 GB box but noticeably more work: run Supabase self-hosted via its
official `supabase/docker` compose, then reverse-proxy **two** HTTPS hostnames with
Caddy (`yourdomain` → app, `db.yourdomain` → Supabase Kong on :8000), because the
browser talks to Supabase directly and an HTTPS page can't call an HTTP database.
You'd also regenerate the default JWT/secret keys before exposing it publicly. The
Supabase-Cloud path above avoids all of that, which is why it's recommended for a
next-day demo.
