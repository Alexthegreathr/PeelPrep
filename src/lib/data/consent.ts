import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENT_VERSIONS, type ConsentType } from "@/lib/auth/consent";

/** Whether a consent is currently granted (latest row, not revoked). */
export async function getConsentState(): Promise<Record<ConsentType, boolean>> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_consents")
    .select("consent_type, granted, revoked_at, created_at")
    .order("created_at", { ascending: false });

  const state = {
    terms_of_service: false,
    privacy_policy: false,
    outcome_research_optin: false,
    marketing_emails: false,
  } as Record<ConsentType, boolean>;

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const type = row.consent_type as ConsentType;
    if (seen.has(type)) continue; // newest row per type wins
    seen.add(type);
    state[type] = Boolean(row.granted) && !row.revoked_at;
  }
  return state;
}

/** Whether outcome-research use is currently opted in (for snapshots). */
export async function isOutcomeResearchOptedIn(): Promise<boolean> {
  const state = await getConsentState();
  return state.outcome_research_optin;
}

export function consentVersion(type: ConsentType): string {
  return CONSENT_VERSIONS[type];
}
