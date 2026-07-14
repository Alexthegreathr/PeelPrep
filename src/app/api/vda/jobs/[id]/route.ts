import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Job-status polling for the processing screen (ROUTES.md §4). Owner-only. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("processing_jobs")
    .select("id, kind, status, error_code")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
