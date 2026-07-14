/**
 * Versioned consent documents captured at signup (SECURITY.md §9).
 * Bump a version whenever the corresponding document text changes; consents
 * are stored per (user, type, version), never overwritten.
 */
export const CONSENT_VERSIONS = {
  terms_of_service: "2026-07-13",
  privacy_policy: "2026-07-13",
} as const;

export type SignupConsentType = keyof typeof CONSENT_VERSIONS;

export const SIGNUP_CONSENT_TYPES = Object.keys(
  CONSENT_VERSIONS,
) as SignupConsentType[];
