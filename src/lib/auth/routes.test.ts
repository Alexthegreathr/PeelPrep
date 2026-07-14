import { describe, expect, it } from "vitest";

import { isProtectedPath, getOptimisticRedirect } from "./routes";

describe("isProtectedPath", () => {
  it("matches (app) routes and their subpaths", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/interviews/abc")).toBe(true);
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/billing")).toBe(true);
    expect(isProtectedPath("/settings")).toBe(true);
    expect(isProtectedPath("/history")).toBe(true);
    expect(isProtectedPath("/admin/users")).toBe(true);
  });

  it("does not match public routes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/signup")).toBe(false);
    expect(isProtectedPath("/pricing")).toBe(false);
  });

  it("does not match prefixes that merely share a leading string", () => {
    // "/settings-guide" must not be treated as the protected "/settings"
    expect(isProtectedPath("/settingsxyz")).toBe(false);
    expect(isProtectedPath("/profiles")).toBe(false);
  });
});

describe("getOptimisticRedirect", () => {
  it("sends unauthenticated users on protected routes to /login with next", () => {
    expect(getOptimisticRedirect("/dashboard", "/dashboard", false)).toBe(
      "/login?next=%2Fdashboard",
    );
    expect(
      getOptimisticRedirect(
        "/interviews/1/brief",
        "/interviews/1/brief?x=1",
        false,
      ),
    ).toBe("/login?next=%2Finterviews%2F1%2Fbrief%3Fx%3D1");
  });

  it("sends authenticated users away from public entry pages", () => {
    expect(getOptimisticRedirect("/", "/", true)).toBe("/dashboard");
    expect(getOptimisticRedirect("/login", "/login", true)).toBe("/dashboard");
    expect(getOptimisticRedirect("/signup", "/signup", true)).toBe(
      "/dashboard",
    );
  });

  it("passes through when no redirect is warranted", () => {
    // Authenticated user on a protected route: allowed
    expect(getOptimisticRedirect("/dashboard", "/dashboard", true)).toBeNull();
    // Unauthenticated user on a public marketing page: allowed
    expect(getOptimisticRedirect("/pricing", "/pricing", false)).toBeNull();
    // Unauthenticated user on /login: allowed (they need to sign in)
    expect(getOptimisticRedirect("/login", "/login", false)).toBeNull();
  });
});
