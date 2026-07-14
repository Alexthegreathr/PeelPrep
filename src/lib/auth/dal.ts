import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Data Access Layer — the single server-side authorization choke point
 * (SECURITY.md §2). Every (app) page, Server Action, and route handler calls
 * one of these before touching data. RLS backstops everything.
 */

export type SessionInfo = {
  user: User;
};

/**
 * Server-verified session check, memoized per request. Uses
 * `auth.getUser()` (validates against the Supabase Auth server) — never the
 * unverified `getSession()` payload (SECURITY.md §1).
 * Returns null when there is no valid session; never redirects.
 */
export const verifySession = cache(async (): Promise<SessionInfo | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { user };
});

/**
 * For pages and Server Actions: returns the verified user or redirects to
 * /login. Route handlers should call verifySession() and return 401 instead.
 */
export async function requireUser(): Promise<User> {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session.user;
}

type OwnedRow = Record<string, unknown> & { user_id?: string; id?: string };

/**
 * Fetch a row by id through the RLS-scoped client and 404 when it is missing
 * or not owned by the caller. 404 — never 403 — so the response does not act
 * as a resource-existence oracle (SECURITY.md §2).
 */
export async function requireOwner<T extends OwnedRow = OwnedRow>(
  table: string,
  id: string,
  columns = "*",
): Promise<T> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("id", id)
    .maybeSingle<T>();

  if (error || !data) notFound();
  // RLS already scopes reads to the owner; this re-check is defense in depth
  // for tables that denormalize user_id (DATABASE.md conventions).
  if (typeof data.user_id === "string" && data.user_id !== user.id) notFound();

  return data;
}

export type Profile = {
  id: string;
  full_name: string | null;
  headline: string | null;
  timezone: string;
  role: "user" | "admin";
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The caller's own profile row (RLS-scoped). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const session = await verifySession();
  if (!session) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle<Profile>();

  if (error) return null;
  return data;
});
