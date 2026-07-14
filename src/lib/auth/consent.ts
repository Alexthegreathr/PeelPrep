/**
 * Versioned consent documents captured at signup (SECURITY.md §9).
 * Bump a version whenever the corresponding document text changes; consents
 * are stored per (user, type, version), never overwritten.
 */
export const CONSENT_VERSIONS = {
  terms_of_service: "2026-07-13",
  privacy_policy: "2026-07-13",
  outcome_research_optin: "2026-07-13",
  marketing_emails: "2026-07-13",
} as const;

export type ConsentType = keyof typeof CONSENT_VERSIONS;

/** Consents captured (as accepted) at signup. */
export const SIGNUP_CONSENT_TYPES: ConsentType[] = [
  "terms_of_service",
  "privacy_policy",
];

/** Optional consents the user manages in settings (default off). */
export const MANAGEABLE_CONSENT_TYPES: ConsentType[] = [
  "outcome_research_optin",
  "marketing_emails",
];
