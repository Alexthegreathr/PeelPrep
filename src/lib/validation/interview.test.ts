import { describe, expect, it } from "vitest";

import {
  opportunitySchema,
  confirmInterviewSchema,
  materialsSchema,
  intakeDraftSchema,
  combineInterviewDateTime,
} from "./interview";

describe("opportunitySchema", () => {
  it("allows a blank draft (defaults company/position to '')", () => {
    const r = opportunitySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.companyName).toBe("");
      expect(r.data.jobPostingUrl).toBeUndefined();
    }
  });

  it("rejects a non-http job posting URL (no SSRF-prone schemes)", () => {
    expect(
      opportunitySchema.safeParse({ jobPostingUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      opportunitySchema.safeParse({ jobPostingUrl: "https://jobs.example.com" })
        .success,
    ).toBe(true);
  });

  it("maps an empty enum value to undefined", () => {
    const r = opportunitySchema.safeParse({ employmentType: "" });
    expect(r.success && r.data.employmentType).toBeUndefined();
  });
});

describe("materialsSchema", () => {
  it("accepts uuid document ids or blank", () => {
    expect(materialsSchema.safeParse({ resumeDocumentId: "" }).success).toBe(
      true,
    );
    expect(
      materialsSchema.safeParse({
        resumeDocumentId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
    expect(
      materialsSchema.safeParse({ resumeDocumentId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});

describe("confirmInterviewSchema", () => {
  it("requires company name and position title", () => {
    expect(
      confirmInterviewSchema.safeParse({ companyName: "", positionTitle: "" })
        .success,
    ).toBe(false);
    expect(
      confirmInterviewSchema.safeParse({
        companyName: "Acme",
        positionTitle: "Engineer",
      }).success,
    ).toBe(true);
  });
});

describe("intakeDraftSchema", () => {
  it("validates a full draft including interviewers", () => {
    const r = intakeDraftSchema.safeParse({
      companyName: "Acme",
      positionTitle: "Engineer",
      interviewers: [{ name: "Jane" }, { name: "" }],
    });
    expect(r.success).toBe(true);
  });
});

describe("combineInterviewDateTime", () => {
  it("combines wall-clock time in a zone into the correct UTC instant", () => {
    const iso = combineInterviewDateTime(
      "2026-07-20",
      "09:30",
      "America/New_York",
    );
    expect(iso).not.toBeNull();
    // 09:30 EDT (-04:00) == 13:30 UTC
    expect(new Date(iso!).toISOString()).toBe("2026-07-20T13:30:00.000Z");
  });

  it("returns null when date or time is missing", () => {
    expect(combineInterviewDateTime(undefined, "09:30", "UTC")).toBeNull();
    expect(combineInterviewDateTime("2026-07-20", undefined, "UTC")).toBeNull();
  });
});
