import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import {
  computeAndSnapshot,
  currentScore,
  gatherReadinessInputs,
} from "@/lib/readiness/compute";
import { computeReadiness } from "@/lib/readiness/calculator";

/**
 * Readiness integration (IMPLEMENTATION_PLAN Phase 9): the deterministic score
 * reproduces the calculator from stored data, snapshots + components persist,
 * and recompute after new prep records a new snapshot. Opt-in.
 */
describe.skipIf(!integrationEnabled)("readiness", () => {
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

    const briefId = (
      await a
        .from("peel_briefs")
        .insert({
          user_id: userId,
          interview_id: interviewId,
          status: "partial",
        })
        .select("id")
        .single()
    ).data!.id;
    // company (2 ready) + role ready; others pending.
    await a.from("brief_sections").insert([
      {
        user_id: userId,
        brief_id: briefId,
        section_key: "company_overview",
        status: "ready",
      },
      {
        user_id: userId,
        brief_id: briefId,
        section_key: "company_priorities",
        status: "ready",
      },
      {
        user_id: userId,
        brief_id: briefId,
        section_key: "role_analysis",
        status: "ready",
      },
      {
        user_id: userId,
        brief_id: briefId,
        section_key: "interviewer_intel",
        status: "pending",
      },
      {
        user_id: userId,
        brief_id: briefId,
        section_key: "questions_to_ask",
        status: "pending",
      },
    ]);
    await a.from("interviewers").insert({
      user_id: userId,
      interview_id: interviewId,
      name: "Jane",
    });
    await a.from("stories").insert([
      { user_id: userId, title: "Story 1" },
      { user_id: userId, title: "Story 2" },
    ]);
  });

  afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  it("computes a deterministic score that matches the calculator", async () => {
    const inputs = await gatherReadinessInputs(interviewId, userId);
    // company 2, role true, interviewer 0.5 (1 added), 2 stories, no practice.
    expect(inputs.companySectionsReady).toBe(2);
    expect(inputs.roleReady).toBe(true);
    expect(inputs.interviewerIntelReady).toBe(false);
    expect(inputs.interviewersCount).toBe(1);
    expect(inputs.storiesCount).toBe(2);
    expect(inputs.answersCount).toBe(0);

    const expected = computeReadiness(inputs).score; // 15+15+5+13.33 = 48
    expect(expected).toBe(48);

    const { result } = await computeAndSnapshot(interviewId, userId);
    expect(result.score).toBe(48);

    const { data: snap } = await admin()
      .from("readiness_scores")
      .select("id, score, recommended_action")
      .eq("interview_id", interviewId)
      .single();
    expect(snap?.score).toBe(48);
    expect(snap?.recommended_action).toBeTruthy();

    const { count } = await admin()
      .from("readiness_components")
      .select("id", { count: "exact", head: true })
      .eq("score_id", snap!.id);
    expect(count).toBe(7);
  });

  it("recomputes and snapshots a new score after more preparation", async () => {
    await admin().from("stories").insert({ user_id: userId, title: "Story 3" });

    // 3 stories now → stories_prepared full: 15+15+5+20 = 55.
    expect(await currentScore(interviewId, userId)).toBe(55);

    const { result } = await computeAndSnapshot(interviewId, userId);
    expect(result.score).toBe(55);

    const { count } = await admin()
      .from("readiness_scores")
      .select("id", { count: "exact", head: true })
      .eq("interview_id", interviewId);
    expect(count).toBe(2); // history grew
  });
});
