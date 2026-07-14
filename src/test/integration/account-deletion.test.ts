import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";

import { admin, integrationEnabled, makeUser, seedUserGraph } from "./helpers";

/**
 * Account deletion completeness (IMPLEMENTATION_PLAN Phase 11): deleting the
 * auth user cascades every owned row via the profiles FK, while audit_logs
 * survive anonymized (user_id → null). This is the data-integrity guarantee the
 * account-deletion flow relies on. Opt-in.
 */
describe.skipIf(!integrationEnabled)("account deletion cascade", () => {
  it("removes all owned data and anonymizes audit rows", async () => {
    const user = await makeUser();
    const a = admin();
    await seedUserGraph(user.id);

    // A distinct audit row that must survive, anonymized.
    const auditAction = `test.delete.${randomUUID()}`;
    await a.from("audit_logs").insert({
      user_id: user.id,
      actor: "user",
      action: auditAction,
    });

    // Delete the auth user → profiles cascade removes everything owned.
    const { error } = await a.auth.admin.deleteUser(user.id);
    expect(error).toBeNull();

    const empty = async (table: string) => {
      const { data } = await a.from(table).select("id").eq("user_id", user.id);
      return (data ?? []).length === 0;
    };

    expect(await empty("interviews")).toBe(true);
    expect(await empty("candidate_documents")).toBe(true);
    expect(await empty("stories")).toBe(true);
    expect(await empty("questions")).toBe(true);
    expect(await empty("practice_sessions")).toBe(true);
    expect(await empty("answers")).toBe(true);
    expect(await empty("usage_events")).toBe(true);
    expect(await empty("subscriptions")).toBe(true);
    expect(await empty("user_consents")).toBe(true);

    const { data: profile } = await a
      .from("profiles")
      .select("id")
      .eq("id", user.id);
    expect(profile ?? []).toHaveLength(0);

    // The audit row survives with user_id nulled (anonymized skeleton).
    const { data: audit } = await a
      .from("audit_logs")
      .select("user_id, action")
      .eq("action", auditAction)
      .single();
    expect(audit?.action).toBe(auditAction);
    expect(audit?.user_id).toBeNull();
  });
});
