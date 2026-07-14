import { describe, expect, it } from "vitest";

import { outcomeSchema } from "./outcome";

describe("outcomeSchema", () => {
  it("accepts an empty outcome (all fields optional)", () => {
    const r = outcomeSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("parses tri-state yes/no/unknown to boolean|undefined", () => {
    expect(outcomeSchema.parse({ advanced: "yes" }).advanced).toBe(true);
    expect(outcomeSchema.parse({ advanced: "no" }).advanced).toBe(false);
    expect(outcomeSchema.parse({ advanced: "" }).advanced).toBeUndefined();
  });

  it("coerces and bounds 1–5 ratings", () => {
    expect(outcomeSchema.parse({ difficulty: "4" }).difficulty).toBe(4);
    expect(outcomeSchema.safeParse({ difficulty: "9" }).success).toBe(false);
    expect(outcomeSchema.parse({ confidence: "" }).confidence).toBeUndefined();
  });

  it("validates the completed date format", () => {
    expect(outcomeSchema.safeParse({ completedOn: "2026-07-20" }).success).toBe(
      true,
    );
    expect(outcomeSchema.safeParse({ completedOn: "not-a-date" }).success).toBe(
      false,
    );
  });
});
