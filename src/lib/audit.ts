import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Audit logging for security-sensitive actions (SECURITY.md §10). Written with
 * the service role. Metadata is ids/counters ONLY — never document text,
 * answers, or other content. Rows survive account deletion (user_id → null).
 * Failures are logged, never thrown: auditing must not break the user action.
 */
export type AuditActor = "user" | "system" | "admin" | "stripe_webhook";

export type AuditEntry = {
  userId?: string | null;
  actor?: AuditActor;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("audit_logs").insert({
      user_id: entry.userId ?? null,
      actor: entry.actor ?? "user",
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    console.error("audit log write failed", { action: entry.action, error });
  }
}
