import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import { generateNextSection, regenerateSection } from "@/lib/brief/generate";
import { BRIEF_STEPS } from "@/lib/brief/plan";

/**
 * Peel Brief generation integration (IMPLEMENTATION_PLAN Phase 6): section-by-
 * section generation on the mock provider, depth gating (free skips risks_gaps),
 * brief_generate metering, no fabricated citations, and metered regeneration.
 */
describe.skipIf(!integrationEnabled)("peel brief generation", () => {
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
          job_description: "Build reliable systems.",
        })
        .select("id")
        .single()
    ).data!.id;
    // One grounding source so citation mapping has a valid id available.
    await a.from("interview_sources").insert({
      user_id: userId,
      interview_id: interviewId,
      kind: "job_description",
      origin: "user_provided",
      title: "JD",
      content: "Build reliable produce-logistics systems at scale.",
    });
  });

  afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  it("generates the whole brief section by section (resumable)", async () => {
    let done = false;
    let guard = 0;
    while (!done && guard++ < BRIEF_STEPS.length + 3) {
      const progress = await generateNextSection(interviewId, userId);
      expect(progress.limitExceeded).toBeFalsy();
      done = progress.done;
    }
    expect(done).toBe(true);

    const a = admin();
    const { data: brief } = await a
      .from("peel_briefs")
      .select("status, generated_at")
      .eq("interview_id", interviewId)
      .single();
    expect(["ready", "partial"]).toContain(brief?.status);
    expect(brief?.generated_at).toBeTruthy();

    const { data: sections } = await a
      .from("brief_sections")
      .select("section_key, status, content")
      .eq("brief_id", (await briefId(interviewId))!);

    const bySection = new Map((sections ?? []).map((s) => [s.section_key, s]));

    // Free plan → basic depth → risks_gaps skipped; others ready with content.
    expect(bySection.get("risks_gaps")?.status).toBe("skipped");
    expect(bySection.get("company_overview")?.status).toBe("ready");
    expect(bySection.get("company_overview")?.content).toBeTruthy();
    expect(bySection.get("snapshot")?.status).toBe("ready");

    // brief_generate was metered exactly once and completed.
    const { data: usage } = await a
      .from("usage_events")
      .select("status")
      .eq("user_id", userId)
      .eq("feature", "brief_generate");
    expect(usage).toHaveLength(1);
    expect(usage?.[0]?.status).toBe("completed");
  });

  it("does not fabricate citations (mock cites nothing)", async () => {
    const a = admin();
    const { data: sources } = await a
      .from("brief_section_sources")
      .select("id")
      .eq("user_id", userId);
    // The mock provider cites no source ids, so no citation rows were minted.
    expect(sources ?? []).toHaveLength(0);
  });

  it("meters a section regeneration", async () => {
    const before = await countFeature(userId, "section_regenerate");
    const progress = await regenerateSection(
      interviewId,
      userId,
      "role_analysis",
    );
    expect(progress.limitExceeded).toBeFalsy();
    const after = await countFeature(userId, "section_regenerate");
    expect(after).toBe(before + 1);
  });
});

async function briefId(interviewId: string): Promise<string | undefined> {
  const { data } = await admin()
    .from("peel_briefs")
    .select("id")
    .eq("interview_id", interviewId)
    .single();
  return data?.id;
}

async function countFeature(userId: string, feature: string): Promise<number> {
  const { count } = await admin()
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("status", "completed");
  return count ?? 0;
}
