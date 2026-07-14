import * as z from "zod";

/**
 * URL handling for user-supplied links (job posting, portfolio, profiles).
 * URLs are validated and STORED but never fetched server-side in the beta —
 * not fetching is how we avoid SSRF (SECURITY.md §4). A future fetcher would
 * need an allowlist + IP-range guards.
 */
export function isSafeHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** Optional http(s) URL: empty string → undefined; invalid → error. */
export const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048, { error: "That link is too long." })
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || isSafeHttpUrl(v), {
    error: "Enter a valid http(s) link, or leave it blank.",
  });
