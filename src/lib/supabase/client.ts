"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client for Client Components (anon key only — RLS-scoped).
 * Phase 2 keeps auth mutations in Server Actions; this factory exists for
 * client-side reads/subscriptions in later phases.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}
