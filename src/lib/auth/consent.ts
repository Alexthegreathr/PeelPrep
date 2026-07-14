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
  // Video Delivery Analysis (Phase 8B) — five separate consents, all default
  // off, each gating a distinct capability.
  vda_camera: "2026-07-13",
  vda_microphone: "2026-07-13",
  vda_recording: "2026-07-13",
  vda_media_upload: "2026-07-13",
  vda_ai_analysis: "2026-07-13",
} as const;

export type ConsentType = keyof typeof CONSENT_VERSIONS;

/** Consents captured (as accepted) at signup. */
export const SIGNUP_CONSENT_TYPES: ConsentType[] = [
  "terms_of_service",
  "privacy_policy",
];

/** The five Video Delivery Analysis consents (default off, revocable). */
export const VDA_CONSENT_TYPES: ConsentType[] = [
  "vda_camera",
  "vda_microphone",
  "vda_recording",
  "vda_media_upload",
  "vda_ai_analysis",
];

/** Optional consents the user manages in settings (default off). */
export const MANAGEABLE_CONSENT_TYPES: ConsentType[] = [
  "outcome_research_optin",
  "marketing_emails",
  ...VDA_CONSENT_TYPES,
];
