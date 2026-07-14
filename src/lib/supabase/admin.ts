import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/env";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * Server-only by construction (`server-only` fails any client-side import).
 * Confined to narrow server flows per SECURITY.md §3: signup consent capture,
 * rate limiting (`hit_rate_limit`), and — in later phases — webhooks, ledger
 * functions, deletion/export, and seeding. Never pass its results to the
 * client without an explicit ownership check first.
 */
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (server-only). " +
        "Copy .env.example to .env.local and fill in the value from `supabase start`.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
