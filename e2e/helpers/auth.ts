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

/** Seed a confirmed interview (status=preparing) with one grounding source. */
export async function seedPreparingInterview(userId: string): Promise<string> {
  const a = adminClient();
  const { data, error } = await a
    .from("interviews")
    .insert({
      user_id: userId,
      company_name: "Acme Fruit Logistics",
      position_title: "Senior Engineer",
      status: "preparing",
      job_description: "Build reliable produce-logistics systems at scale.",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("seed interview failed");
  await a.from("interview_sources").insert({
    user_id: userId,
    interview_id: data.id,
    kind: "job_description",
    origin: "user_provided",
    title: "Job description",
    content: "Build reliable produce-logistics systems at scale.",
  });
  return data.id as string;
}

/** Upgrade the user to an active Pro subscription (row created at signup). */
export async function makeUserPro(userId: string): Promise<void> {
  const { error } = await adminClient()
    .from("subscriptions")
    .update({ plan_key: "pro", status: "active" })
    .eq("user_id", userId);
  if (error) throw error;
}

/** Grant all five VDA consents (record, analyze, and voice answers). */
export async function grantVdaConsents(userId: string): Promise<void> {
  const version = "2026-07-13";
  const now = new Date().toISOString();
  const rows = [
    "vda_camera",
    "vda_microphone",
    "vda_recording",
    "vda_media_upload",
    "vda_ai_analysis",
  ].map((consent_type) => ({
    user_id: userId,
    consent_type,
    version,
    granted: true,
    granted_at: now,
  }));
  const { error } = await adminClient().from("user_consents").insert(rows);
  if (error) throw error;
}

/** Seed a completed practice session with one interviewer turn, ready to review. */
export async function seedCompletedSession(
  userId: string,
  interviewId: string,
): Promise<string> {
  const a = adminClient();
  const { data: session, error } = await a
    .from("practice_sessions")
    .insert({
      user_id: userId,
      interview_id: interviewId,
      status: "completed",
      config: { length: 1 },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !session) throw error ?? new Error("seed session failed");
  await a.from("practice_turns").insert({
    user_id: userId,
    session_id: session.id,
    turn_index: 0,
    role: "interviewer",
    turn_type: "question",
    content: "Tell me about a project you're proud of.",
  });
  return session.id as string;
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
