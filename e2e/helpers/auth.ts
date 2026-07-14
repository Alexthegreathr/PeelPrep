import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * E2E helpers for the auth flows: a local service-role client (to mint
 * confirmed users without spending signup rate limits) and a Mailpit reader
 * (to pull the real confirmation / recovery links Supabase sends locally).
 *
 * Requires the local Supabase env to be present in the test process — run with
 * `set -a; source .env.local; set +a; npx playwright test`. Values fall back to
 * the well-known local defaults printed by `supabase start`.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function hasSupabaseEnv(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | undefined;
function adminClient(): SupabaseClient {
  admin ??= createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return admin;
}

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Create an already-confirmed user (skips the email-verification step). */
export async function createConfirmedUser(
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

export async function deleteUser(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}

type MailpitMessage = {
  ID: string;
  To: { Address: string }[];
  Created: string;
};

/**
 * Poll Mailpit for the newest message addressed to `recipient` and return the
 * first http(s) link in its body that points at `/auth/confirm`.
 */
export async function waitForAuthLink(
  recipient: string,
  timeoutMs = 15000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const target = recipient.toLowerCase();

  while (Date.now() < deadline) {
    const listRes = await fetch(
      `${MAILPIT_URL}/api/v1/messages?limit=50`,
    ).catch(() => null);
    if (listRes?.ok) {
      const list = (await listRes.json()) as { messages: MailpitMessage[] };
      const match = list.messages.find((m) =>
        m.To.some((t) => t.Address.toLowerCase() === target),
      );
      if (match) {
        const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const msg = (await msgRes.json()) as { HTML?: string; Text?: string };
        const body = `${msg.HTML ?? ""}\n${msg.Text ?? ""}`;
        const link = body.match(
          /https?:\/\/[^\s"'<>]+\/auth\/confirm[^\s"'<>]*/i,
        )?.[0];
        if (link) return decodeHtmlEntities(link);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No /auth/confirm email arrived for ${recipient} in time`);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
