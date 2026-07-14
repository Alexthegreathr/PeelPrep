/**
 * PeelPrep demo seed (PRODUCT_SPEC §Development and Demo Mode).
 *
 * Creates a demo@peelprep.example account with clearly-fictional data — a
 * sample interview, Peel Brief, predicted questions, candidate stories, a
 * completed practice session with feedback, a readiness snapshot, and a
 * checklist — so the product can be demonstrated without any paid API calls.
 *
 * Idempotent: re-running resets the demo user's interviews.
 *
 * Run with:
 *   set -a; source .env.local; set +a; node scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Source .env.local first.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@peelprep.example";
const DEMO_PASSWORD = "peelprep-demo-123";

async function getOrCreateUser() {
  // Find an existing demo user by paging through admin list.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Candidate" },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const userId = await getOrCreateUser();
  console.log(`Demo user: ${DEMO_EMAIL} (${userId})`);

  // Reset: remove existing demo interviews (cascades their children).
  await admin.from("interviews").delete().eq("user_id", userId);
  await admin
    .from("stories")
    .delete()
    .eq("user_id", userId)
    .eq("origin", "user_created");

  const ins = async (table, row, select = "id") => {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select(select)
      .single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data;
  };

  const interviewAt = new Date(Date.now() + 3 * 86400000).toISOString();
  const interview = await ins("interviews", {
    user_id: userId,
    company_name: "Acme Fruit Logistics",
    position_title: "Senior Software Engineer",
    status: "preparing",
    intake_step: 5,
    job_description:
      "Build and own reliable services for a produce-logistics platform at scale. (Demo — fictional.)",
    location: "Remote · US",
    employment_type: "full_time",
    interview_at: interviewAt,
    interview_timezone: "America/New_York",
    format: "video",
    stage: "technical",
    duration_minutes: 60,
    meeting_location: "Google Meet",
    confirmed_at: new Date().toISOString(),
  });

  await ins("interviewers", {
    user_id: userId,
    interview_id: interview.id,
    name: "Jordan Vale",
    title: "Engineering Manager",
    manual_background:
      "Engineering leader focused on platform reliability (fictional public background).",
  });

  const jdSource = await ins("interview_sources", {
    user_id: userId,
    interview_id: interview.id,
    kind: "job_description",
    origin: "user_provided",
    title: "Job description",
    content: "Build reliable produce-logistics systems at scale.",
  });

  // ── Peel Brief ──────────────────────────────────────────────────────
  const brief = await ins("peel_briefs", {
    user_id: userId,
    interview_id: interview.id,
    status: "ready",
    depth: "detailed",
    generated_at: new Date().toISOString(),
  });
  const now = new Date().toISOString();
  const section = (key, content, sort) => ({
    user_id: userId,
    brief_id: brief.id,
    section_key: key,
    status: "ready",
    content,
    generated_at: now,
    sort_order: sort,
  });
  await admin.from("brief_sections").insert([
    section(
      "snapshot",
      {
        company_name: "Acme Fruit Logistics",
        position_title: "Senior Software Engineer",
        interview_at: interviewAt,
        interview_timezone: "America/New_York",
        format: "video",
        stage: "technical",
        interviewers: [{ name: "Jordan Vale", title: "Engineering Manager" }],
      },
      0,
    ),
    section(
      "company_overview",
      {
        overview:
          "Acme Fruit Logistics is a fictional company moving perishable produce with a technology-first supply chain. (Demo content — fictional.)",
        basis: "source",
        products: ["ColdChain tracking", "Ripeness forecasting"],
        culture_signals: ["Bias to action", "Customer obsession"],
        role_connections: ["This role owns tracking-platform reliability."],
        uncertainty_notes:
          "Current external research isn't available in this version.",
      },
      1,
    ),
    section(
      "company_priorities",
      {
        priorities: [
          { text: "Reduce spoilage in transit", why: "Protects margin." },
          { text: "Expand into new regions", why: "Growth objective." },
        ],
        challenges: ["Thin logistics margins"],
      },
      2,
    ),
    section(
      "role_analysis",
      {
        responsibilities: ["Own reliability", "Build resilient services"],
        required_skills: ["Distributed systems", "TypeScript"],
        emphasize: ["A reliability story with measurable impact."],
        basis: "source",
      },
      3,
    ),
    section(
      "interviewer_intel",
      {
        interviewers: [
          {
            name: "Jordan Vale",
            professional_summary:
              "Engineering leader focused on platform reliability.",
            expertise: ["Reliability", "Platform engineering"],
            likely_perspective: "Will probe failure-mode reasoning.",
            basis: "source",
          },
        ],
      },
      4,
    ),
    section(
      "likely_themes",
      {
        likely_themes: [
          {
            theme: "System design under constraints",
            why: "Core to the role.",
          },
        ],
      },
      5,
    ),
    section(
      "questions_to_ask",
      {
        questions: [
          {
            text: "How does the team measure reliability today?",
            why_it_lands: "Shows outcome focus.",
          },
        ],
      },
      6,
    ),
    section(
      "risks_gaps",
      {
        risks_gaps: [
          {
            risk: "Limited streaming detail",
            mitigation: "Prepare an example.",
          },
        ],
      },
      7,
    ),
    section(
      "next_action",
      { next_action: "Draft one reliability STAR story." },
      8,
    ),
    section(
      "condensed_summary",
      {
        tldr: "Senior reliability role at a fictional produce-logistics company.",
        last_minute_checklist: [
          "Re-read your reliability story",
          "Prepare 2 questions",
        ],
      },
      9,
    ),
  ]);
  await admin.from("brief_section_sources").insert({
    user_id: userId,
    section_id: (
      await admin
        .from("brief_sections")
        .select("id")
        .eq("brief_id", brief.id)
        .eq("section_key", "company_overview")
        .single()
    ).data.id,
    interview_source_id: jdSource.id,
  });

  // ── Questions ───────────────────────────────────────────────────────
  await admin.from("questions").insert([
    {
      user_id: userId,
      interview_id: interview.id,
      category: "behavioral",
      text: "Tell me about a time you improved the reliability of a system.",
      why_asked: "Reliability is central to this role.",
      evaluates: "Ownership and systems thinking.",
      suggested_structure: "STAR — quantify the before/after.",
      origin: "predicted",
      saved: true,
      sort_order: 0,
    },
    {
      user_id: userId,
      interview_id: interview.id,
      category: "technical",
      text: "How would you design a resilient shipment-tracking pipeline?",
      why_asked: "Maps to the team's core system.",
      evaluates: "System design depth.",
      origin: "predicted",
      sort_order: 1,
    },
  ]);

  // ── Stories ─────────────────────────────────────────────────────────
  await admin.from("stories").insert({
    user_id: userId,
    title: "Improved tracking reliability (Demo)",
    situation: "Our tracking pipeline had frequent gaps.",
    task: "Make it reliable before peak season.",
    action: "Added retries, observability, and a fallback path.",
    result: "Cut tracking gaps by ~80%.",
    skills: ["reliability", "observability"],
    measurable_result: "80% fewer tracking gaps",
    tags: ["star", "reliability"],
    origin: "user_created",
  });

  // ── Completed practice session with feedback ───────────────────────
  const session = await ins("practice_sessions", {
    user_id: userId,
    interview_id: interview.id,
    status: "completed",
    config: { length: 1, difficulty: "medium" },
    modality: "text",
    started_at: now,
    completed_at: now,
    summary_feedback: { answered: 1, note: "Great start." },
  });
  const q1 = await ins("practice_turns", {
    user_id: userId,
    session_id: session.id,
    turn_index: 0,
    role: "interviewer",
    turn_type: "question",
    content: "Tell me about a time you improved reliability.",
  });
  const a1 = await ins("practice_turns", {
    user_id: userId,
    session_id: session.id,
    turn_index: 1,
    role: "candidate",
    turn_type: "answer",
    content: "I led a project that cut tracking gaps by ~80%.",
  });
  const answer = await ins("answers", {
    user_id: userId,
    session_id: session.id,
    turn_id: a1.id,
    text: "I led a project that cut tracking gaps by ~80%.",
    feedback_status: "ready",
  });
  const rubric = Object.fromEntries(
    [
      "relevance",
      "clarity",
      "structure",
      "specificity",
      "evidence",
      "measurable_results",
      "conciseness",
      "authenticity",
      "confidence",
      "completion",
    ].map((k) => [k, { score: 4, comment: "Solid." }]),
  );
  await admin.from("feedback").insert({
    user_id: userId,
    answer_id: answer.id,
    rubric,
    worked_well: "Clear ownership and a measurable result.",
    top_improvement: "Name one specific action you personally took.",
    improved_outline: "Situation → your action → measured result → lesson.",
  });
  void q1;

  // ── Readiness snapshot ──────────────────────────────────────────────
  const score = await ins("readiness_scores", {
    user_id: userId,
    interview_id: interview.id,
    score: 78,
    trigger_event: "seed",
    recommended_action: "Practice one more behavioral answer to reach 85+.",
  });
  await admin.from("readiness_components").insert(
    [
      ["company_understanding", 1, 15],
      ["role_understanding", 1, 15],
      ["interviewer_context", 1, 10],
      ["stories_prepared", 0.33, 6.67],
      ["questions_practiced", 0.2, 4],
      ["answer_quality", 0.8, 12],
      ["questions_to_ask", 1, 5],
    ].map(([component, raw, pts]) => ({
      user_id: userId,
      score_id: score.id,
      component,
      raw_value: raw,
      weighted_points: pts,
      explanation: "Demo readiness component.",
    })),
  );

  // ── Checklist ───────────────────────────────────────────────────────
  const checklist = await ins("checklists", {
    user_id: userId,
    interview_id: interview.id,
  });
  await admin.from("checklist_items").insert(
    [
      "Research the company's recent priorities",
      "Prepare at least 3 STAR stories",
      "Prepare 2–3 questions to ask",
    ].map((label, i) => ({
      user_id: userId,
      checklist_id: checklist.id,
      label,
      source: "template",
      completed_at: i === 0 ? now : null,
      sort_order: i,
    })),
  );

  console.log("✅ Demo data seeded.");
  console.log(`   Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("   Set NEXT_PUBLIC_DEMO_MODE=1 to show the demo banner.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
