import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import { generateQuestions } from "@/lib/questions/generate";
import { requestStorySuggestions } from "@/lib/stories/suggest";

/**
 * Questions & stories integration (IMPLEMENTATION_PLAN Phase 7): question
 * generation metered by count with the free 5-question limit + upgrade path,
 * grounded AI story drafts (never invented), and story survival across
 * interview deletion. Opt-in.
 */
describe.skipIf(!integrationEnabled)("questions & stories", () => {
  let userId: string;
  let interviewId: string;

  beforeAll(async () => {
    userId = (await makeUser()).id;
    const a = admin();
    interviewId = (
      await a
        .from("interviews")
        .insert({
          user_id: userId,
          company_name: "Acme",
          position_title: "Engineer",
          status: "preparing",
        })
        .select("id")
        .single()
    ).data!.id;
    await a.from("interview_sources").insert({
      user_id: userId,
      interview_id: interviewId,
      kind: "job_description",
      origin: "user_provided",
      title: "JD",
      content: "Build reliable systems.",
    });
  });

  afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  it("generates predicted questions and enforces the free limit", async () => {
    const first = await generateQuestions(interviewId, userId);
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.count).toBeGreaterThan(0);

    const { count } = await admin()
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", interviewId);
    expect(count).toBeGreaterThan(0);

    // Free plan gets 5 questions/period → a second batch is blocked.
    const second = await generateQuestions(interviewId, userId);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("limit_exceeded");
  });

  it("AI story suggestions are Plus+ only on the free plan", async () => {
    const res = await requestStorySuggestions(interviewId, userId);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("limit_exceeded");
  });

  it("story suggestions ground drafts and never invent measurements", async () => {
    // Give the user a Plus subscription so suggestions are allowed.
    await admin()
      .from("subscriptions")
      .update({ plan_key: "plus", status: "active" })
      .eq("user_id", userId);

    const res = await requestStorySuggestions(interviewId, userId);
    expect(res.ok).toBe(true);

    const { data: stories } = await admin()
      .from("stories")
      .select("origin, answers_questions, situation")
      .eq("user_id", userId)
      .eq("origin", "ai_draft");
    expect((stories ?? []).length).toBeGreaterThan(0);
    // Draft cites the basis and asks for missing info rather than inventing it.
    expect(stories?.[0]?.answers_questions).toContain("grounded on");
  });

  it("stories survive interview deletion", async () => {
    const { data: story } = await admin()
      .from("stories")
      .insert({ user_id: userId, title: "Reusable story" })
      .select("id")
      .single();
    await admin().from("interviews").delete().eq("id", interviewId);
    const { data } = await admin()
      .from("stories")
      .select("id")
      .eq("id", story!.id);
    expect(data ?? []).toHaveLength(1);
  });
});
