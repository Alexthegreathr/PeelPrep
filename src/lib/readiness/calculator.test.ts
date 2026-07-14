import { describe, expect, it } from "vitest";

import {
  computeReadiness,
  READINESS_WEIGHTS,
  type ReadinessInputs,
} from "./calculator";

const EMPTY: ReadinessInputs = {
  companySectionsReady: 0,
  roleReady: false,
  interviewerIntelReady: false,
  interviewersCount: 0,
  storiesCount: 0,
  answersCount: 0,
  avgRubric: null,
  questionsToAskReady: false,
};

const FULL: ReadinessInputs = {
  companySectionsReady: 2,
  roleReady: true,
  interviewerIntelReady: true,
  interviewersCount: 1,
  storiesCount: 3,
  answersCount: 5,
  avgRubric: 5,
  questionsToAskReady: true,
};

describe("computeReadiness", () => {
  it("weights sum to exactly 100", () => {
    const sum = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("empty inputs → 0, and every component explains itself", () => {
    const r = computeReadiness(EMPTY);
    expect(r.score).toBe(0);
    expect(r.components).toHaveLength(7);
    expect(r.components.every((c) => c.explanation.length > 0)).toBe(true);
  });

  it("full inputs → exactly 100 (achievable without any camera/mic)", () => {
    expect(computeReadiness(FULL).score).toBe(100);
  });

  it("reproduces a hand-calculated partial score", () => {
    // company 2/2*15=15, role 15, interviewer 0.5*10=5, stories 2/3*20=13.33,
    // practice 3/5*20=12, answer_quality 3.5/5*15=10.5, q_to_ask 0.
    // sum = 15+15+5+13.33+12+10.5+0 = 70.83 → round 71
    const r = computeReadiness({
      companySectionsReady: 2,
      roleReady: true,
      interviewerIntelReady: false,
      interviewersCount: 2,
      storiesCount: 2,
      answersCount: 3,
      avgRubric: 3.5,
      questionsToAskReady: false,
    });
    expect(r.score).toBe(71);
  });

  it("clamps over-target counts to full credit", () => {
    const r = computeReadiness({ ...FULL, storiesCount: 99, answersCount: 99 });
    expect(r.score).toBe(100);
  });
});
