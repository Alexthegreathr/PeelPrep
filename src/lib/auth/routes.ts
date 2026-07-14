/**
 * Optimistic route classification shared by src/proxy.ts and its tests.
 * Pure functions only — the proxy is never the security boundary
 * (SECURITY.md §2); real checks live in the DAL.
 */

/** Path prefixes that require an authenticated session ((app) + future (admin)). */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/interviews",
  "/history",
  "/profile",
  "/billing",
  "/settings",
  "/admin",
] as const;

/** Paths from which authenticated visitors are sent to the dashboard. */
export const AUTHENTICATED_REDIRECT_PATHS = ["/", "/login", "/signup"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * Decide the optimistic redirect for a request, or null to pass through.
 * `pathWithSearch` preserves the query string so login can return the user
 * to exactly where they were headed.
 */
export function getOptimisticRedirect(
  pathname: string,
  pathWithSearch: string,
  isAuthenticated: boolean,
): string | null {
  if (!isAuthenticated && isProtectedPath(pathname)) {
    return `/login?next=${encodeURIComponent(pathWithSearch)}`;
  }

  if (
    isAuthenticated &&
    (AUTHENTICATED_REDIRECT_PATHS as readonly string[]).includes(pathname)
  ) {
    return "/dashboard";
  }

  return null;
}
