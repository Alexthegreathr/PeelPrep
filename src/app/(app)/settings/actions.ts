"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { writeAuditLog } from "@/lib/audit";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import {
  CONSENT_VERSIONS,
  MANAGEABLE_CONSENT_TYPES,
  type ConsentType,
} from "@/lib/auth/consent";
import { isStripeConfigured, getStripe } from "@/lib/billing/stripe";

export type SettingsResult = { ok: true } | { ok: false; message: string };

export async function updateConsent(
  type: ConsentType,
  granted: boolean,
): Promise<SettingsResult> {
  const user = await requireUser();
  if (!MANAGEABLE_CONSENT_TYPES.includes(type)) {
    return { ok: false, message: "That consent can't be changed here." };
  }
  const version = CONSENT_VERSIONS[type];
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("user_consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("consent_type", type)
    .eq("version", version)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    // Guard trigger allows changing only granted / revoked_at.
    await supabase
      .from("user_consents")
      .update({ granted, revoked_at: granted ? null : now })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_consents").insert({
      user_id: user.id,
      consent_type: type,
      version,
      granted,
      granted_at: granted ? now : null,
      revoked_at: granted ? null : now,
    });
  }

  await writeAuditLog({
    userId: user.id,
    action: granted ? "consent.granted" : "consent.revoked",
    resourceType: "user_consent",
    metadata: { type, version },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function requestAccountDeletion(
  password: string,
  phrase: string,
): Promise<SettingsResult> {
  const user = await requireUser();
  if (phrase.trim() !== "DELETE") {
    return { ok: false, message: "Type DELETE to confirm." };
  }
  if (!(await checkUserRateLimit(user.id, "account_delete"))) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  // Re-authenticate with a throwaway client (never touches the live session).
  const { url, anonKey } = getSupabasePublicConfig();
  const reauth = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: authError } = await reauth.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (authError) {
    return { ok: false, message: "Password is incorrect." };
  }

  // Final audit entry (survives, anonymized: user_id → null on cascade).
  await writeAuditLog({
    userId: user.id,
    action: "account.delete_requested",
    resourceType: "account",
  });

  const admin = createSupabaseAdminClient();

  // Cancel any Stripe subscription immediately.
  if (isStripeConfigured()) {
    try {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sub?.stripe_subscription_id) {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      }
    } catch (error) {
      console.error("stripe cancel on account delete failed", error);
    }
  }

  // Destroy stored files before deleting rows (no orphaned objects).
  const { data: docs } = await admin
    .from("candidate_documents")
    .select("storage_path")
    .eq("user_id", user.id);
  const docPaths = (docs ?? []).map((d) => d.storage_path);
  if (docPaths.length) await admin.storage.from("documents").remove(docPaths);
  const { data: exportObjects } = await admin.storage
    .from("exports")
    .list(user.id);
  if (exportObjects?.length) {
    await admin.storage
      .from("exports")
      .remove(exportObjects.map((o) => `${user.id}/${o.name}`));
  }

  // Delete the auth user → profiles cascade removes every owned row.
  await admin.auth.admin.deleteUser(user.id);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
