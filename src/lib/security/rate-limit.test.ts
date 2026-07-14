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

  it("uses the standard IP ceiling by default (no test seam active)", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await checkAuthRateLimit("login", "a@b.co");
    const ipCall = rpc.mock.calls.find(([, args]) =>
      String(args.p_key).startsWith("ip:"),
    );
    expect(ipCall?.[1].p_max_hits).toBe(10);
  });

  it("relaxes ONLY the IP ceiling under the non-production E2E seam", async () => {
    vi.stubEnv("E2E_RELAX_AUTH_RATE_LIMIT", "1");
    vi.stubEnv("NODE_ENV", "test");
    rpc.mockResolvedValue({ data: true, error: null });
    await checkAuthRateLimit("login", "a@b.co");
    const calls = Object.fromEntries(
      rpc.mock.calls.map(([, args]) => [
        String(args.p_key).split(":")[0],
        args.p_max_hits,
      ]),
    );
    expect(calls.ip).toBeGreaterThan(10); // IP bucket relaxed
    expect(calls.email).toBe(10); // per-account limit intact
    vi.unstubAllEnvs();
  });

  it("never relaxes the IP ceiling in production", async () => {
    vi.stubEnv("E2E_RELAX_AUTH_RATE_LIMIT", "1");
    vi.stubEnv("NODE_ENV", "production");
    rpc.mockResolvedValue({ data: true, error: null });
    await checkAuthRateLimit("login", "a@b.co");
    const ipCall = rpc.mock.calls.find(([, args]) =>
      String(args.p_key).startsWith("ip:"),
    );
    expect(ipCall?.[1].p_max_hits).toBe(10);
    vi.unstubAllEnvs();
  });
});
