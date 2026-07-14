import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/dal";
import { getInterview } from "@/lib/data/interviews";
import { checkUserRateLimit } from "@/lib/security/rate-limit";
import { generateNextSection, regenerateSection } from "@/lib/brief/generate";
import { SECTION_ORDER, type BriefSectionKey } from "@/lib/brief/plan";

/**
 * Peel Brief generation — one section (step) per request (ROUTES.md §4,
 * AI_ARCHITECTURE.md §6). No body / first call drives the resumable queue;
 * `{ section }` regenerates a single section (metered separately). There is no
 * unauthenticated AI endpoint anywhere.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const interview = await getInterview(id);
  if (!interview) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await checkUserRateLimit(session.user.id, "ai_generate"))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  let section: string | undefined;
  try {
    const body = (await request.json()) as { section?: string };
    section = body?.section;
  } catch {
    section = undefined;
  }

  if (section) {
    if (!SECTION_ORDER.includes(section as BriefSectionKey)) {
      return NextResponse.json({ error: "Bad section" }, { status: 400 });
    }
    const progress = await regenerateSection(
      id,
      session.user.id,
      section as BriefSectionKey,
    );
    return NextResponse.json(progress);
  }

  const progress = await generateNextSection(id, session.user.id);
  return NextResponse.json(progress);
}
