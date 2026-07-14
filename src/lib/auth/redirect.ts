/**
 * Safe internal redirect validation for `?next=` parameters.
 *
 * Only same-origin path redirects are ever honored: anything that could be
 * interpreted as an absolute or protocol-relative URL (open redirect) falls
 * back to the default destination.
 */
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

const MAX_NEXT_LENGTH = 2048;

// Reject control characters and spaces — internal route paths contain
// neither (a legitimate `next` value is percent-encoded in transit).
const CONTROL_CHARS = /[\u0000-\u0020\u007f]/;

export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_PATH,
): string {
  if (!raw || raw.length > MAX_NEXT_LENGTH) return fallback;
  // Must be an absolute path on this origin…
  if (!raw.startsWith("/")) return fallback;
  // …but not protocol-relative (`//evil.com`).
  if (raw.startsWith("//")) return fallback;
  // Backslashes are treated as `/` by some browsers (`/\evil.com`).
  if (raw.includes("\\")) return fallback;
  if (CONTROL_CHARS.test(raw)) return fallback;
  return raw;
}
