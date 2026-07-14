import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getOptimisticRedirect } from "@/lib/auth/routes";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

/**
 * Session refresh + optimistic redirects only (ROUTES.md §6).
 *
 * This is NOT the security boundary: it reads auth cookies (no database) and
 * pre-filters obviously unauthenticated traffic. Every (app) page, Server
 * Action, and route handler independently verifies the session in the DAL,
 * with RLS as the final backstop (SECURITY.md §2).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabasePublicConfig());
  } catch {
    // Supabase env not configured (fresh clone): public pages still work,
    // and every protected surface fails closed in the DAL.
    return response;
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes expired tokens if needed and writes them back via setAll.
  // getClaims() verifies the JWT — an optimistic check without a DB read.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const target = getOptimisticRedirect(
    pathname,
    `${pathname}${search}`,
    isAuthenticated,
  );

  if (target) {
    const redirectResponse = NextResponse.redirect(
      new URL(target, request.url),
    );
    // Preserve any refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  // Return the response holding the refreshed session cookies as-is;
  // replacing it would desynchronize browser and server sessions.
  return response;
}

export const config = {
  matcher: [
    /*
     * All routes except static assets and image optimization files.
     * API routes stay covered so /api/* is session-refreshed too.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
