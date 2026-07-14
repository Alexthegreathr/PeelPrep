import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Shared helpers for the opt-in Supabase integration suite. Enabled only when
 * SUPABASE_INTEGRATION=1 and the local stack env is present. See
 * src/test/integration/supabase.test.ts for the run command.
 */

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const integrationEnabled =
  process.env.SUPABASE_INTEGRATION === "1" &&
  !!url &&
  !!anonKey &&
  !!serviceKey;

let adminClient: SupabaseClient | undefined;
export function admin(): SupabaseClient {
  adminClient ??= createClient(url!, serviceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: "peelprep-it-admin",
    },
  });
  return adminClient;
}

export function anon(): SupabaseClient {
  return createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `peelprep-it-anon-${randomUUID()}`,
    },
  });
}

export type TestUser = { id: string; email: string; pw: string };

export async function makeUser(): Promise<TestUser> {
  const email = `it-${randomUUID()}@example.com`;
  const pw = "abcd1234!";
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, pw };
}

export async function signedInClient(u: TestUser): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: `peelprep-it-${randomUUID()}`,
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: u.email,
    password: u.pw,
  });
  if (error) throw error;
  return client;
}

export async function deleteUser(id: string): Promise<void> {
  await admin().auth.admin.deleteUser(id);
}

/**
 * Seed one row into every owner-scoped table for `userId`, returning the id of
 * each so cross-user isolation can be asserted table by table. Uses the service
 * role (RLS-bypassing) so the fixture is independent of the policies under test.
 */
export async function seedUserGraph(
  userId: string,
): Promise<Record<string, string>> {
  const a = admin();
  const ids: Record<string, string> = {};

  const ins = async (
    table: string,
    row: Record<string, unknown>,
  ): Promise<string> => {
    const { data, error } = await a
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(`seed ${table}: ${error.message}`);
    ids[table] = data!.id as string;
    return ids[table];
  };

  const documentId = await ins("candidate_documents", {
    user_id: userId,
    kind: "resume",
    title: "My Resume",
    storage_path: `${userId}/doc/resume.pdf`,
    mime_type: "application/pdf",
    size_bytes: 1024,
  });
  const interviewId = await ins("interviews", {
    user_id: userId,
    company_name: "Acme",
    position_title: "Engineer",
    status: "preparing",
  });
  await ins("interviewers", {
    user_id: userId,
    interview_id: interviewId,
    name: "Jane Doe",
  });
  const sourceId = await ins("interview_sources", {
    user_id: userId,
    interview_id: interviewId,
    kind: "job_description",
    origin: "user_provided",
    title: "JD",
    content: "Build things",
  });
  await ins("interview_documents", {
    user_id: userId,
    interview_id: interviewId,
    document_id: documentId,
    role: "resume",
  });
  await ins("saved_sources", {
    user_id: userId,
    interview_id: interviewId,
    title: "Company blog",
    url: "https://example.com",
  });
  const briefId = await ins("peel_briefs", {
    user_id: userId,
    interview_id: interviewId,
    status: "ready",
    depth: "basic",
  });
  const sectionId = await ins("brief_sections", {
    user_id: userId,
    brief_id: briefId,
    section_key: "snapshot",
    status: "ready",
    content: { text: "hi" },
  });
  await ins("brief_section_sources", {
    user_id: userId,
    section_id: sectionId,
    interview_source_id: sourceId,
  });
  const questionId = await ins("questions", {
    user_id: userId,
    interview_id: interviewId,
    category: "behavioral",
    text: "Tell me about a time…",
  });
  const storyId = await ins("stories", {
    user_id: userId,
    title: "Shipped the thing",
    skills: ["leadership"],
    tags: ["star"],
  });
  await ins("question_story_links", {
    user_id: userId,
    question_id: questionId,
    story_id: storyId,
  });
  const sessionId = await ins("practice_sessions", {
    user_id: userId,
    interview_id: interviewId,
    config: { length: 3 },
  });
  const turnId = await ins("practice_turns", {
    user_id: userId,
    session_id: sessionId,
    turn_index: 0,
    role: "interviewer",
    turn_type: "question",
    content: "Q1?",
  });
  const answerId = await ins("answers", {
    user_id: userId,
    session_id: sessionId,
    turn_id: turnId,
    question_id: questionId,
    text: "My answer",
  });
  await ins("feedback", {
    user_id: userId,
    answer_id: answerId,
    rubric: { relevance: { score: 4 } },
    top_improvement: "Be concise",
  });
  await ins("generation_feedback", {
    user_id: userId,
    target_type: "brief_section",
    target_id: sectionId,
    rating: "up",
  });
  const checklistId = await ins("checklists", {
    user_id: userId,
    interview_id: interviewId,
  });
  await ins("checklist_items", {
    user_id: userId,
    checklist_id: checklistId,
    label: "Research the company",
  });
  const scoreId = await ins("readiness_scores", {
    user_id: userId,
    interview_id: interviewId,
    score: 42,
  });
  await ins("readiness_components", {
    user_id: userId,
    score_id: scoreId,
    component: "company_understanding",
    raw_value: 0.5,
    weighted_points: 7.5,
    explanation: "Halfway there",
  });
  await ins("outcomes", {
    user_id: userId,
    interview_id: interviewId,
    advanced: true,
  });
  await ins("ai_generations", {
    user_id: userId,
    task: "company_analysis",
    provider: "mock",
    model: "mock",
    status: "succeeded",
  });
  await ins("audit_logs", {
    user_id: userId,
    actor: "user",
    action: "test.seed",
  });
  // usage_events via the ledger function (its normal write path).
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();
  const { data: evId, error: rErr } = await a.rpc("reserve_usage", {
    p_user: userId,
    p_feature: "brief_generate",
    p_quantity: 1,
    p_limit: 100,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_interview: interviewId,
  });
  if (rErr) throw new Error(`seed usage_events: ${rErr.message}`);
  ids["usage_events"] = evId as string;

  return ids;
}

/** Tables where an owner can SELECT their own rows (isolation must still hold). */
export const USER_READABLE_OWNED = [
  "candidate_documents",
  "interviews",
  "interviewers",
  "interview_sources",
  "interview_documents",
  "saved_sources",
  "peel_briefs",
  "brief_sections",
  "brief_section_sources",
  "questions",
  "stories",
  "question_story_links",
  "practice_sessions",
  "practice_turns",
  "answers",
  "feedback",
  "generation_feedback",
  "checklists",
  "checklist_items",
  "readiness_scores",
  "readiness_components",
  "outcomes",
  "usage_events",
] as const;

/** Tables with NO user SELECT policy — even the owner sees nothing. */
export const SERVER_ONLY_TABLES = [
  "ai_generations",
  "audit_logs",
  "organizations",
  "organization_members",
  "prompt_versions",
  "stripe_webhook_events",
] as const;
