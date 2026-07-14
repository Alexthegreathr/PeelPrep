import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { admin, integrationEnabled, makeUser, deleteUser } from "./helpers";
import { startSession, submitTurn } from "@/lib/practice/session";
import { requestAnswerFeedback } from "@/lib/practice/feedback";
import { practiceConfigSchema } from "@/lib/validation/practice";

/**
 * Typed mock-practice integration (IMPLEMENTATION_PLAN Phase 8): a full session
 * (one question at a time → wrapup → candidate questions → complete), transcript
 * persistence, answer feedback + metering, and the free single-session limit.
 */
describe.skipIf(!integrationEnabled)("mock practice", () => {
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

  it("runs a full session and captures the transcript + feedback", async () => {
    const config = practiceConfigSchema.parse({
      length: 2,
      difficulty: "medium",
    });
    const start = await startSession(interviewId, userId, config);
    expect(start.ok).toBe(true);
    if (!start.ok) return;
    const sessionId = start.sessionId;

    const a = admin();
    const firstTurns = await a
      .from("practice_turns")
      .select("role, turn_type")
      .eq("session_id", sessionId);
    expect(firstTurns.data).toHaveLength(1);
    expect(firstTurns.data?.[0]?.role).toBe("interviewer");

    // Answer both questions, then answer the wrapup.
    expect((await submitTurn(sessionId, userId, "My first answer.")).ok).toBe(
      true,
    );
    expect((await submitTurn(sessionId, userId, "My second answer.")).ok).toBe(
      true,
    );
    const finalTurn = await submitTurn(
      sessionId,
      userId,
      "What does success look like in 90 days?",
    );
    expect(finalTurn.ok && finalTurn.done).toBe(true);

    const { data: session } = await a
      .from("practice_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();
    expect(session?.status).toBe("completed");

    // Two answers were recorded; feedback on the first.
    const { data: answers } = await a
      .from("answers")
      .select("id")
      .eq("session_id", sessionId);
    expect(answers).toHaveLength(2);

    const fb = await requestAnswerFeedback(answers![0].id, userId);
    expect(fb.ok).toBe(true);
    const { data: feedbackRow } = await a
      .from("feedback")
      .select("top_improvement, rubric")
      .eq("answer_id", answers![0].id)
      .single();
    expect(feedbackRow?.top_improvement).toBeTruthy();
    expect(Object.keys(feedbackRow?.rubric ?? {})).toHaveLength(10);

    // practice_session metered once (completed).
    const { data: usage } = await a
      .from("usage_events")
      .select("status")
      .eq("user_id", userId)
      .eq("feature", "practice_session");
    expect(usage).toHaveLength(1);
    expect(usage?.[0]?.status).toBe("completed");
  });

  it("enforces the free single-session limit", async () => {
    const config = practiceConfigSchema.parse({ length: 1 });
    const second = await startSession(interviewId, userId, config);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("limit_exceeded");
  });
});
