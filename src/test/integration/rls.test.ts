import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  admin,
  anon,
  integrationEnabled,
  makeUser,
  signedInClient,
  deleteUser,
  seedUserGraph,
  USER_READABLE_OWNED,
  SERVER_ONLY_TABLES,
  type TestUser,
} from "./helpers";

/**
 * Phase 3 RLS suite (IMPLEMENTATION_PLAN Phase 3): two users + anon assert
 * cross-user isolation on every private table + storage prefix, plus the guard
 * triggers that keep ownership/plan/role/settlement immutable to users. Opt-in
 * (SUPABASE_INTEGRATION=1); run after `supabase db reset`.
 */
describe.skipIf(!integrationEnabled)("RLS cross-user isolation", () => {
  let userA: TestUser;
  let userB: TestUser;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let anonClient: SupabaseClient;
  let ids: Record<string, string>;

  beforeAll(async () => {
    userA = await makeUser();
    userB = await makeUser();
    clientA = await signedInClient(userA);
    clientB = await signedInClient(userB);
    anonClient = anon();
    ids = await seedUserGraph(userA.id);
  });

  afterAll(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  it("owner can read each of their own seeded rows", async () => {
    for (const table of USER_READABLE_OWNED) {
      const { data, error } = await clientA
        .from(table)
        .select("id")
        .eq("id", ids[table]);
      expect(error, `${table} owner read error`).toBeNull();
      expect(
        (data ?? []).map((r) => r.id),
        `${table} owner should see own row`,
      ).toContain(ids[table]);
    }
  });

  it("user B cannot read user A's rows on any owned table", async () => {
    for (const table of USER_READABLE_OWNED) {
      const { data } = await clientB
        .from(table)
        .select("id")
        .eq("id", ids[table]);
      expect(data ?? [], `${table} leaked to user B`).toHaveLength(0);
    }
  });

  it("the anon client cannot read any owned table", async () => {
    for (const table of USER_READABLE_OWNED) {
      const { data } = await anonClient
        .from(table)
        .select("id")
        .eq("id", ids[table]);
      expect(data ?? [], `${table} leaked to anon`).toHaveLength(0);
    }
  });

  it("server-only tables are invisible to owner, other user, and anon", async () => {
    for (const table of SERVER_ONLY_TABLES) {
      for (const [who, client] of [
        ["owner", clientA],
        ["other", clientB],
        ["anon", anonClient],
      ] as const) {
        const { data } = await client.from(table).select("id").limit(5);
        expect(data ?? [], `${table} readable by ${who}`).toHaveLength(0);
      }
    }
  });

  it("user B cannot update or delete user A's interview", async () => {
    const interviewId = ids["interviews"];

    const upd = await clientB
      .from("interviews")
      .update({ company_name: "hacked" })
      .eq("id", interviewId)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);

    const del = await clientB
      .from("interviews")
      .delete()
      .eq("id", interviewId)
      .select("id");
    expect(del.data ?? []).toHaveLength(0);

    // Confirm A's row is untouched.
    const { data } = await admin()
      .from("interviews")
      .select("company_name")
      .eq("id", interviewId)
      .single();
    expect(data?.company_name).toBe("Acme");
  });

  it("a user cannot insert a row owned by someone else (with-check)", async () => {
    const { error } = await clientB.from("interviews").insert({
      user_id: userA.id,
      company_name: "spoof",
      position_title: "x",
    });
    expect(error).not.toBeNull();
  });

  it("plans are readable by any authenticated user (reference data)", async () => {
    const { data } = await clientB.from("plans").select("key");
    expect((data ?? []).map((r) => r.key).sort()).toEqual([
      "free",
      "plus",
      "pro",
    ]);
  });
});

describe.skipIf(!integrationEnabled)("RLS guard triggers", () => {
  let user: TestUser;
  let client: SupabaseClient;
  let other: TestUser;
  let ids: Record<string, string>;

  beforeAll(async () => {
    user = await makeUser();
    other = await makeUser();
    client = await signedInClient(user);
    ids = await seedUserGraph(user.id);
  });

  afterAll(async () => {
    if (user) await deleteUser(user.id);
    if (other) await deleteUser(other.id);
  });

  it("cannot reassign ownership of a row", async () => {
    const { error } = await client
      .from("interviews")
      .update({ user_id: other.id })
      .eq("id", ids["interviews"]);
    expect(error).not.toBeNull();
  });

  it("cannot change plan/billing state (no user write policy)", async () => {
    const upd = await client
      .from("subscriptions")
      .update({ plan_key: "pro", status: "active" })
      .eq("user_id", user.id)
      .select("plan_key");
    expect(upd.data ?? []).toHaveLength(0);
    const { data } = await admin()
      .from("subscriptions")
      .select("plan_key")
      .eq("user_id", user.id)
      .single();
    expect(data?.plan_key).toBe("free");
  });

  it("cannot settle usage directly (no user write policy)", async () => {
    const ins = await client.from("usage_events").insert({
      user_id: user.id,
      feature: "brief_generate",
      period_start: new Date().toISOString(),
      period_end: new Date().toISOString(),
    });
    expect(ins.error).not.toBeNull();

    const upd = await client
      .from("usage_events")
      .update({ status: "completed" })
      .eq("id", ids["usage_events"])
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
  });

  it("brief_sections: user may edit notes/completion but not content or status", async () => {
    const sectionId = ids["brief_sections"];

    const ok = await client
      .from("brief_sections")
      .update({
        user_notes: "my note",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sectionId)
      .select("user_notes");
    expect(ok.error).toBeNull();
    expect(ok.data?.[0]?.user_notes).toBe("my note");

    const badContent = await client
      .from("brief_sections")
      .update({ content: { hacked: true } })
      .eq("id", sectionId);
    expect(badContent.error).not.toBeNull();

    const badStatus = await client
      .from("brief_sections")
      .update({ status: "pending" })
      .eq("id", sectionId);
    expect(badStatus.error).not.toBeNull();
  });
});

describe.skipIf(!integrationEnabled)("Storage prefix isolation", () => {
  let userA: TestUser;
  let userB: TestUser;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let path: string;

  beforeAll(async () => {
    userA = await makeUser();
    userB = await makeUser();
    clientA = await signedInClient(userA);
    clientB = await signedInClient(userB);
    path = `${userA.id}/rls-test.txt`;
    const up = await clientA.storage
      .from("documents")
      .upload(path, Buffer.from("private resume text"), {
        contentType: "text/plain",
        upsert: true,
      });
    expect(up.error, up.error?.message).toBeNull();
  });

  afterAll(async () => {
    await admin().storage.from("documents").remove([path]);
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  it("owner can download their own object", async () => {
    const { data, error } = await clientA.storage
      .from("documents")
      .download(path);
    expect(error).toBeNull();
    expect(await data?.text()).toBe("private resume text");
  });

  it("another user cannot download or list the owner's prefix", async () => {
    const dl = await clientB.storage.from("documents").download(path);
    expect(dl.error).not.toBeNull();

    const list = await clientB.storage.from("documents").list(userA.id);
    expect(list.data ?? []).toHaveLength(0);
  });

  it("the anon client cannot download the object", async () => {
    const dl = await anon().storage.from("documents").download(path);
    expect(dl.error).not.toBeNull();
  });
});
