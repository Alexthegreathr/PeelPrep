import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Integration tests against a LOCAL Supabase stack (migration 001 applied).
 *
 * Opt-in — these are skipped in the standard `npm test` run so a fresh clone
 * passes without any services. To run them:
 *
 *   supabase start && supabase db reset
 *   SUPABASE_INTEGRATION=1 \
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... npm test
 *
 * Covers (IMPLEMENTATION_PLAN Phase 2 Tests): profiles/user_consents RLS,
 * the signup trigger, and hit_rate_limit().
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled =
  process.env.SUPABASE_INTEGRATION === "1" &&
  !!url &&
  !!anonKey &&
  !!serviceKey;

// supabase-js warns when several GoTrueClient instances share one storage key
// (the default is derived from the project URL, which every client here shares).
// Each client below sets persistSession:false and a distinct storageKey so no
// browser session is written and no two instances collide. Test-only — the
// production clients in src/lib/supabase/* are unaffected.
let adminClient: SupabaseClient | undefined;
function admin(): SupabaseClient {
  adminClient ??= createClient(url!, serviceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: "peelprep-test-admin",
    },
  });
  return adminClient;
}

async function makeUser(): Promise<{ id: string; email: string; pw: string }> {
  const email = `test-${randomUUID()}@example.com`;
  const pw = "abcd1234!";
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, pw };
}

async function signedInClient(
  email: string,
  pw: string,
): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `peelprep-test-${randomUUID()}`,
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: pw,
  });
  if (error) throw error;
  return client;
}

describe.skipIf(!enabled)("Supabase migration 001 (integration)", () => {
  let userA: { id: string; email: string; pw: string };
  let userB: { id: string; email: string; pw: string };

  beforeAll(async () => {
    userA = await makeUser();
    userB = await makeUser();
  });

  it("handle_new_user() creates a profile row on signup", async () => {
    const { data, error } = await admin()
      .from("profiles")
      .select("id, role, timezone")
      .eq("id", userA.id)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(userA.id);
    expect(data?.role).toBe("user");
    expect(data?.timezone).toBe("UTC");
  });

  it("a user can read only their own profile (RLS)", async () => {
    const clientA = await signedInClient(userA.email, userA.pw);
    const { data } = await clientA.from("profiles").select("id");
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(userA.id);
    expect(ids).not.toContain(userB.id);
  });

  it("a user cannot escalate their own role (guard trigger)", async () => {
    const clientA = await signedInClient(userA.email, userA.pw);
    const { error } = await clientA
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userA.id);
    expect(error).not.toBeNull();

    // Confirm it did not take effect.
    const { data } = await admin()
      .from("profiles")
      .select("role")
      .eq("id", userA.id)
      .single();
    expect(data?.role).toBe("user");
  });

  it("consents are per-user and not cross-readable (RLS)", async () => {
    // Seed a consent row for B via service role.
    await admin().from("user_consents").insert({
      user_id: userB.id,
      consent_type: "terms_of_service",
      version: "2026-07-13",
      granted: true,
      granted_at: new Date().toISOString(),
    });

    const clientA = await signedInClient(userA.email, userA.pw);
    const { data } = await clientA.from("user_consents").select("id, user_id");
    // A must not see B's consent row.
    expect((data ?? []).every((r) => r.user_id !== userB.id)).toBe(true);
  });

  it("the anon client cannot read any profile (RLS default deny)", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: `peelprep-test-anon-${randomUUID()}`,
      },
    });
    const { data } = await anon.from("profiles").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("hit_rate_limit() allows up to the max then blocks", async () => {
    const key = `test:${randomUUID()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { data, error } = await admin().rpc("hit_rate_limit", {
        p_key: key,
        p_window_seconds: 3600,
        p_max_hits: 3,
      });
      expect(error).toBeNull();
      results.push(data as boolean);
    }
    // First 3 allowed, 4th blocked.
    expect(results).toEqual([true, true, true, false]);
  });
});
