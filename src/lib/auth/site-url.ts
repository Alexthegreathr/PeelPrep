/**
 * Resolves the base URL used for outbound Supabase auth email links
 * (signup confirmation, password recovery). See the Phase-2 auth fix:
 * auth links must never silently point at an inactive dev port.
 *
 * Rules:
 * - Production → always the configured canonical app URL (NEXT_PUBLIC_APP_URL).
 * - Local development → the actual request origin when it is on the strict
 *   internal dev allowlist (so a server started on :3001 emits :3001 links),
 *   otherwise the configured URL. Arbitrary Host/Origin headers are never
 *   trusted — only the fixed localhost / 127.0.0.1 dev origins are honored.
 *
 * The `/auth/confirm` route handler builds its *own* redirects from
 * `request.url`, so it is already origin-correct; only the email links
 * generated inside Server Actions need this resolver.
 */

/** Strict allowlist of local development origins we will emit links for. */
export const DEV_ORIGIN_ALLOWLIST: readonly string[] = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

/** The configured canonical application URL, trailing slashes stripped. */
export function getConfiguredAppUrl(): string {
  // `|| ` (not `??`) so an empty string also falls back to the default.
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Pure origin selection — unit-testable without any request context.
 * Chooses the base URL for auth email links from the available signals.
 */
export function pickAuthRedirectBase(opts: {
  isProduction: boolean;
  configuredUrl: string;
  origin?: string | null;
  host?: string | null;
}): string {
  const { isProduction, configuredUrl, origin, host } = opts;

  // Production: only ever the configured canonical URL.
  if (isProduction) return configuredUrl;

  // Development: prefer the browser-reported origin when it is a known dev
  // origin, so links target whichever localhost port the dev server is on.
  if (origin && DEV_ORIGIN_ALLOWLIST.includes(origin)) return origin;

  // Fallback for GET route handlers that carry a Host but no Origin header.
  if (host) {
    const candidate = `http://${host}`;
    if (DEV_ORIGIN_ALLOWLIST.includes(candidate)) return candidate;
  }

  return configuredUrl;
}

/**
 * Async wrapper reading the current request headers. Server-only by virtue of
 * `next/headers` (imported lazily so the pure helpers stay test-friendly).
 */
export async function getAuthRedirectBase(): Promise<string> {
  const configuredUrl = getConfiguredAppUrl();
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) return configuredUrl;

  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return pickAuthRedirectBase({
      isProduction,
      configuredUrl,
      origin: h.get("origin"),
      host: h.get("host"),
    });
  } catch {
    // headers() unavailable outside a request scope — fall back safely.
    return configuredUrl;
  }
}
