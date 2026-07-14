import { describe, expect, it } from "vitest";

import { sanitizeNextPath, DEFAULT_AUTHENTICATED_PATH } from "./redirect";

describe("sanitizeNextPath", () => {
  it("keeps a same-origin absolute path", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/interviews/123/brief")).toBe(
      "/interviews/123/brief",
    );
    expect(sanitizeNextPath("/dashboard?tab=usage")).toBe(
      "/dashboard?tab=usage",
    );
  });

  it("falls back for missing or empty input", () => {
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath(null)).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath("")).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it("rejects open-redirect vectors", () => {
    // Absolute URLs to another origin
    expect(sanitizeNextPath("https://evil.com")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    expect(sanitizeNextPath("http://evil.com/x")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
    // Protocol-relative
    expect(sanitizeNextPath("//evil.com")).toBe(DEFAULT_AUTHENTICATED_PATH);
    // Backslash tricks browsers normalize to //
    expect(sanitizeNextPath("/\\evil.com")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath("\\\\evil.com")).toBe(DEFAULT_AUTHENTICATED_PATH);
    // Not absolute
    expect(sanitizeNextPath("evil.com")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath("javascript:alert(1)")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
  });

  it("rejects control characters", () => {
    expect(sanitizeNextPath("/dash\tboard")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath("/dash\nboard")).toBe(DEFAULT_AUTHENTICATED_PATH);
    expect(sanitizeNextPath("/dash\u0000board")).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
  });

  it("rejects overly long paths", () => {
    expect(sanitizeNextPath(`/${"a".repeat(3000)}`)).toBe(
      DEFAULT_AUTHENTICATED_PATH,
    );
  });

  it("honors a custom fallback", () => {
    expect(sanitizeNextPath("//evil.com", "/login")).toBe("/login");
  });
});
