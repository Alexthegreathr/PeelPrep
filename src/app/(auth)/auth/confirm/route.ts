import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";

/**
 * Verifies an email-confirmation or password-recovery `token_hash` via
 * verifyOtp() and redirects to a validated internal path (ROUTES.md §2).
 * On failure it sends the user to /login with an error flag — never leaking
 * token details.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get("next"), "/dashboard");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=expired_link", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
