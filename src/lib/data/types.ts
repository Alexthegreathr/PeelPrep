import type { Database } from "@/types/database";

/** Convenience row/enum aliases derived from the generated database types. */
type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type InterviewRow = Tables["interviews"]["Row"];
export type InterviewerRow = Tables["interviewers"]["Row"];
export type CandidateDocumentRow = Tables["candidate_documents"]["Row"];
export type InterviewDocumentRow = Tables["interview_documents"]["Row"];
export type SubscriptionRow = Tables["subscriptions"]["Row"];
export type InterviewSourceRow = Tables["interview_sources"]["Row"];
export type PeelBriefRow = Tables["peel_briefs"]["Row"];
export type BriefSectionRow = Tables["brief_sections"]["Row"];
export type QuestionRow = Tables["questions"]["Row"];
export type StoryRow = Tables["stories"]["Row"];
export type UsageEventRow = Tables["usage_events"]["Row"];

export type InterviewStatus = Enums["interview_status"];
export type DocumentKind = Enums["candidate_document_kind"];
export type UsageFeatureEnum = Enums["usage_feature"];
