/**
 * Publishable Supabase configuration (safe in client bundles).
 * Read at call time — not module load — so builds succeed on a fresh clone
 * before `.env.local` is populated.
 */
export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill in the values from `supabase start`.",
    );
  }

  return { url, anonKey };
}
