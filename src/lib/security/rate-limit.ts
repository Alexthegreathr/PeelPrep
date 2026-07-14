import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Application-level fixed-window rate limiting backed by the
 * `hit_rate_limit()` SECURITY DEFINER function (SECURITY.md §7).
 *
 * Keys never contain raw identifiers: IPs and emails are stored only as
 * salted SHA-256 hashes.
 */

export type RateLimitAction = "login" | "signup" | "reset";

/** login / signup / reset: 10 hits per 15 minutes (SECURITY.md §7 table). */
const AUTH_WINDOW_SECONDS = 15 * 60;
const AUTH_MAX_HITS = 10;

function salt(): string {
  // RATE_LIMIT_SALT is preferred; the service-role key is a server-only
  // fallback so hashes are always salted even without extra configuration.
  return (
    process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );
}

export function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(`${salt()}:${value.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

/** Best-effort client IP from proxy headers; "unknown" bucket otherwise. */
export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return headerStore.get("x-real-ip") ?? "unknown";
}

async function hitRateLimit(
  key: string,
  windowSeconds: number,
  maxHits: number,
): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("hit_rate_limit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    // Fail open: Supabase Auth's own rate limits remain as the backstop, and
    // a limiter outage must not lock every user out of authentication.
    console.error("rate-limit check failed (allowing request)", error);
    return true;
  }
}

/**
 * Rate-limit an auth action per client IP *and* per email
 * (SECURITY.md §7: 10 / 15 min each). Returns true when allowed.
 */
export async function checkAuthRateLimit(
  action: RateLimitAction,
  email: string,
): Promise<boolean> {
  const ip = await getClientIp();

  const [ipAllowed, emailAllowed] = await Promise.all([
    hitRateLimit(
      `ip:${hashIdentifier(ip)}:${action}`,
      AUTH_WINDOW_SECONDS,
      AUTH_MAX_HITS,
    ),
    hitRateLimit(
      `email:${hashIdentifier(email)}:${action}`,
      AUTH_WINDOW_SECONDS,
      AUTH_MAX_HITS,
    ),
  ]);

  return ipAllowed && emailAllowed;
}
