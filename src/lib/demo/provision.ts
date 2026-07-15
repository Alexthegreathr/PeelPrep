import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const VDA_CONSENTS = [
  "vda_camera",
  "vda_microphone",
  "vda_recording",
  "vda_media_upload",
  "vda_ai_analysis",
] as const;

/**
 * Provision a freshly-created (anonymous) demo visitor so each person gets their
 * own private, fully-featured sandbox: unlock Pro + the five VDA consents, and
 * drop in the fictional "Acme Fruit Logistics" sample (interview, Peel Brief,
 * questions, a story, readiness, checklist). Mirrors scripts/seed-demo.mjs.
 *
 * Best-effort: the caller wraps this so a partial failure still lands the
 * visitor on a working dashboard.
 */
export async function provisionDemoUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();
  const interviewAt = new Date(Date.now() + 3 * 86_400_000).toISOString();

  // Unlock everything — Video Delivery Analysis is Pro-gated.
  await admin
    .from("subscriptions")
    .update({ plan_key: "pro", status: "active" })
    .eq("user_id", userId);
  await admin.from("user_consents").upsert(
    VDA_CONSENTS.map((consent_type) => ({
      user_id: userId,
      consent_type,
      version: "2026-07-13",
      granted: true,
      granted_at: now,
      revoked_at: null,
    })),
    { onConflict: "user_id,consent_type,version" },
  );

  const ins = async (table: string, row: Record<string, unknown>) => {
    const { data, error } = await admin
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data as { id: string };
  };

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
    confirmed_at: now,
  });

  await admin.from("interviewers").insert({
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

  const brief = await ins("peel_briefs", {
    user_id: userId,
    interview_id: interview.id,
    status: "ready",
    depth: "detailed",
    generated_at: now,
  });

  const section = (key: string, content: unknown, sort: number) => ({
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

  const { data: overview } = await admin
    .from("brief_sections")
    .select("id")
    .eq("brief_id", brief.id)
    .eq("section_key", "company_overview")
    .single();
  if (overview) {
    await admin.from("brief_section_sources").insert({
      user_id: userId,
      section_id: (overview as { id: string }).id,
      interview_source_id: jdSource.id,
    });
  }

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

  const score = await ins("readiness_scores", {
    user_id: userId,
    interview_id: interview.id,
    score: 78,
    trigger_event: "seed",
    recommended_action: "Practice one more behavioral answer to reach 85+.",
  });
  await admin.from("readiness_components").insert(
    (
      [
        ["company_understanding", 1, 15],
        ["role_understanding", 1, 15],
        ["interviewer_context", 1, 10],
        ["stories_prepared", 0.33, 6.67],
        ["questions_practiced", 0.2, 4],
        ["answer_quality", 0.8, 12],
        ["questions_to_ask", 1, 5],
      ] as const
    ).map(([component, raw, pts]) => ({
      user_id: userId,
      score_id: score.id,
      component,
      raw_value: raw,
      weighted_points: pts,
      explanation: "Demo readiness component.",
    })),
  );

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

  // A completed, turn-less "delivery" session so the dashboard surfaces an
  // "Analyze my delivery" shortcut that jumps straight to the camera/VDA screen
  // (the session page renders the recorder directly when a session has no turns).
  await admin.from("practice_sessions").insert({
    user_id: userId,
    interview_id: interview.id,
    status: "completed",
    config: { delivery: true },
    modality: "text",
    started_at: now,
    completed_at: now,
  });
}
