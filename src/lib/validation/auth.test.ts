import { describe, expect, it } from "vitest";

import {
  loginSchema,
  signupSchema,
  resetRequestSchema,
  updatePasswordSchema,
  passwordSchema,
  profileSchema,
} from "./auth";

describe("passwordSchema", () => {
  it("accepts a strong-enough password", () => {
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });

  it("rejects passwords that are too short or missing a letter/number", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false); // < 8
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false); // no digit
    expect(passwordSchema.safeParse("12345678").success).toBe(false); // no letter
  });
});

describe("loginSchema", () => {
  it("normalizes email and accepts valid credentials", () => {
    const parsed = loginSchema.safeParse({
      email: "  USER@Example.com ",
      password: "whatever",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("user@example.com");
  });

  it("rejects an invalid email or empty password", () => {
    expect(
      loginSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });
});

describe("signupSchema", () => {
  it("requires the terms checkbox to be checked", () => {
    const base = {
      email: "a@b.co",
      password: "abcd1234",
      fullName: "Ada",
    };
    expect(signupSchema.safeParse({ ...base, acceptTerms: "on" }).success).toBe(
      true,
    );
    expect(signupSchema.safeParse(base).success).toBe(false);
    expect(
      signupSchema.safeParse({ ...base, acceptTerms: "false" }).success,
    ).toBe(false);
  });

  it("treats an empty full name as absent", () => {
    const parsed = signupSchema.safeParse({
      email: "a@b.co",
      password: "abcd1234",
      fullName: "",
      acceptTerms: "on",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fullName).toBeUndefined();
  });
});

describe("resetRequestSchema", () => {
  it("validates the email", () => {
    expect(resetRequestSchema.safeParse({ email: "a@b.co" }).success).toBe(
      true,
    );
    expect(resetRequestSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("requires the confirmation to match", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "abcd1234",
        confirmPassword: "abcd1234",
      }).success,
    ).toBe(true);
    const mismatch = updatePasswordSchema.safeParse({
      password: "abcd1234",
      confirmPassword: "abcd9999",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(
        mismatch.error.issues.some((i) => i.path.includes("confirmPassword")),
      ).toBe(true);
    }
  });
});

describe("profileSchema", () => {
  it("accepts a valid IANA timezone", () => {
    const parsed = profileSchema.safeParse({
      fullName: "Ada Lovelace",
      headline: "Engineer",
      timezone: "America/New_York",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown timezone", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Ada",
        headline: "",
        timezone: "Mars/Olympus_Mons",
      }).success,
    ).toBe(false);
  });
});
