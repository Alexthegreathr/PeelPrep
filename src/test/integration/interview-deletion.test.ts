import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";

/**
 * Interview deletion cascade (IMPLEMENTATION_PLAN Phase 4): deleting an
 * interview hard-deletes its generated children, but reusable documents and
 * the story bank survive, and usage_events keep their row with interview_id
 * nulled (DATABASE.md §9). Opt-in.
 */
describe.skipIf(!integrationEnabled)("interview deletion cascade", () => {
  let userId: string;
  let interviewId: string;
  let documentId: string;
  let storyId: string;
  let interviewerId: string;
  let briefId: string;
  let questionId: string;
  let usageEventId: string;

  beforeAll(async () => {
    userId = (await makeUser()).id;
    const a = admin();

    documentId = (
      await a
        .from("candidate_documents")
        .insert({
          user_id: userId,
          kind: "resume",
          title: "Resume",
          storage_path: `${userId}/x/resume.pdf`,
          mime_type: "application/pdf",
          size_bytes: 100,
        })
        .select("id")
        .single()
    ).data!.id;

    interviewId = (
      await a
        .from("interviews")
        .insert({ user_id: userId, company_name: "Acme", status: "preparing" })
        .select("id")
        .single()
    ).data!.id;

    interviewerId = (
      await a
        .from("interviewers")
        .insert({ user_id: userId, interview_id: interviewId, name: "Jane" })
        .select("id")
        .single()
    ).data!.id;

    await a.from("interview_documents").insert({
      user_id: userId,
      interview_id: interviewId,
      document_id: documentId,
      role: "resume",
    });

    briefId = (
      await a
        .from("peel_briefs")
        .insert({ user_id: userId, interview_id: interviewId })
        .select("id")
        .single()
    ).data!.id;

    questionId = (
      await a
        .from("questions")
        .insert({
          user_id: userId,
          interview_id: interviewId,
          category: "behavioral",
          text: "Tell me…",
        })
        .select("id")
        .single()
    ).data!.id;

    storyId = (
      await a
        .from("stories")
        .insert({ user_id: userId, title: "A story" })
        .select("id")
        .single()
    ).data!.id;

    const now = new Date();
    usageEventId = (
      await a.rpc("reserve_usage", {
        p_user: userId,
        p_feature: "brief_generate",
        p_quantity: 1,
        p_limit: 100,
        p_period_start: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        ).toISOString(),
        p_period_end: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
        ).toISOString(),
        p_interview: interviewId,
      })
    ).data as string;
  });

  afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  it("cascades children and preserves reusable assets", async () => {
    const a = admin();
    const { error } = await a.from("interviews").delete().eq("id", interviewId);
    expect(error).toBeNull();

    const gone = async (table: string, id: string) => {
      const { data } = await a.from(table).select("id").eq("id", id);
      return (data ?? []).length === 0;
    };
    const survives = async (table: string, id: string) =>
      !(await gone(table, id));

    // Interview + generated children are gone.
    expect(await gone("interviews", interviewId)).toBe(true);
    expect(await gone("interviewers", interviewerId)).toBe(true);
    expect(await gone("peel_briefs", briefId)).toBe(true);
    expect(await gone("questions", questionId)).toBe(true);

    // Reusable document and story bank survive.
    expect(await survives("candidate_documents", documentId)).toBe(true);
    expect(await survives("stories", storyId)).toBe(true);

    // Usage event keeps its row with interview_id nulled (spend history).
    const { data: usage } = await a
      .from("usage_events")
      .select("interview_id")
      .eq("id", usageEventId)
      .single();
    expect(usage?.interview_id).toBeNull();
  });
});
