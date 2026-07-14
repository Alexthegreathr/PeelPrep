import { describe, it, expect, vi, beforeEach } from "vitest";

// Fakes wired into the module under test.
const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

async function loadDal() {
  // Fresh module each test so React `cache()` never memoizes across cases.
  vi.resetModules();
  return import("./dal");
}

const USER = { id: "user-1", email: "a@b.co" };

beforeEach(() => {
  getUser.mockReset();
  maybeSingle.mockReset();
});

describe("verifySession / requireUser", () => {
  it("returns the user when the session is valid", async () => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    const { verifySession, requireUser } = await loadDal();
    await expect(verifySession()).resolves.toEqual({ user: USER });
    await expect(requireUser()).resolves.toEqual(USER);
  });

  it("verifySession returns null with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { verifySession } = await loadDal();
    await expect(verifySession()).resolves.toBeNull();
  });

  it("requireUser redirects to /login with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { requireUser } = await loadDal();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("treats an auth error as unauthenticated", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "x" },
    });
    const { verifySession } = await loadDal();
    await expect(verifySession()).resolves.toBeNull();
  });
});

describe("requireOwner (404 semantics)", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
  });

  it("returns the row when owned by the caller", async () => {
    const row = { id: "iv-1", user_id: "user-1", company_name: "Acme" };
    maybeSingle.mockResolvedValue({ data: row, error: null });
    const { requireOwner } = await loadDal();
    await expect(requireOwner("interviews", "iv-1")).resolves.toEqual(row);
  });

  it("404s when the row does not exist", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { requireOwner } = await loadDal();
    await expect(requireOwner("interviews", "missing")).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("404s (not 403) when the row belongs to another user", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: "iv-2", user_id: "someone-else" },
      error: null,
    });
    const { requireOwner } = await loadDal();
    await expect(requireOwner("interviews", "iv-2")).rejects.toThrow(
      "NOT_FOUND",
    );
  });
});
