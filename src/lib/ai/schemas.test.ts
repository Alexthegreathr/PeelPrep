import { describe, expect, it } from "vitest";

import {
  TASK_SCHEMAS,
  companyAnalysisSchema,
  answerEvaluationSchema,
  questionGenerationSchema,
} from "./schemas";
import { AI_TASKS } from "./tasks";

describe("task schemas", () => {
  it("has a schema for every task", () => {
    for (const task of AI_TASKS) {
      expect(TASK_SCHEMAS[task]).toBeTruthy();
    }
  });

  it("applies defaults for optional array fields", () => {
    const parsed = companyAnalysisSchema.parse({
      overview: "x",
      overview_basis: "source",
    });
    expect(parsed.products).toEqual([]);
    expect(parsed.cited_source_ids).toEqual([]);
    expect(parsed.business_model).toBeNull();
  });

  it("rejects an invalid basis", () => {
    expect(
      companyAnalysisSchema.safeParse({
        overview: "x",
        overview_basis: "made_up",
      }).success,
    ).toBe(false);
  });

  it("enforces the 10-criterion rubric with 0–5 scores", () => {
    const bad = answerEvaluationSchema.safeParse({
      rubric: { relevance: { score: 9 } },
      top_improvement: "x",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects an unknown question category", () => {
    expect(
      questionGenerationSchema.safeParse({
        questions: [{ category: "nonsense", text: "q" }],
      }).success,
    ).toBe(false);
  });
});
