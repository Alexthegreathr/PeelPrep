import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocked before importing the module under test.
const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "203.0.113.7"]]),
}));

import { hashIdentifier, checkAuthRateLimit } from "./rate-limit";

describe("hashIdentifier", () => {
  it("is deterministic and case-insensitive", () => {
    expect(hashIdentifier("USER@example.com")).toBe(
      hashIdentifier("user@example.com"),
    );
  });

  it("never contains the raw value", () => {
    const h = hashIdentifier("user@example.com");
    expect(h).not.toContain("user@example.com");
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("checkAuthRateLimit", () => {
  beforeEach(() => rpc.mockReset());

  it("allows when both IP and email windows are under the limit", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(checkAuthRateLimit("login", "a@b.co")).resolves.toBe(true);
    // Once for the IP key, once for the email key.
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("blocks when either window is over the limit", async () => {
    rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    await expect(checkAuthRateLimit("login", "a@b.co")).resolves.toBe(false);
  });

  it("fails open when the limiter errors (Supabase auth limits still apply)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(checkAuthRateLimit("signup", "a@b.co")).resolves.toBe(true);
  });
});
