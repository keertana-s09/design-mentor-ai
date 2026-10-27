import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { functionErrorMessage } from "@/lib/functions";

export interface EvaluationCriterion {
  name: string;
  weight: number;
}

export const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  { name: "Problem Understanding", weight: 3 },
  { name: "Problem Fit", weight: 3 },
  { name: "Usability", weight: 2 },
  { name: "Information Hierarchy", weight: 2 },
  { name: "Visual Hierarchy", weight: 2 },
  { name: "Accessibility", weight: 1 },
  { name: "Visual Design", weight: 1 },
];

export const AI_CATEGORIES = [
  "Problem Understanding",
  "Problem Fit",
  "Usability",
  "Information Architecture",
  "Visual Hierarchy",
  "Accessibility",
  "Visual Design",
] as const;

export interface AiCategory {
  name: string;
  score: number;
  verdict?: string;
  explanation?: string;
}

export interface AiEvaluation {
  overallScore: number;
  summary?: string;
  rationale?: string;
  categories?: AiCategory[];
  strengths?: string[];
  issues?: string[];
  recommendations?: string[];
}

export interface RecruiterFeedback {
  overallAssessment?: string;
  strengths?: string;
  improvements?: string;
  comments?: string;
}

export interface Challenge {
  id: string;
  recruiter_id: string;
  title: string;
  problem_statement: string | null;
  target_user: string | null;
  primary_goal: string | null;
  constraints: string | null;
  evaluation_criteria: Json;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeSubmission {
  id: string;
  challenge_id: string;
  designer_id: string;
  design_id: string;
  status: string;
  ai_evaluation: Json;
  ai_overall_score: number | null;
  ai_verified: boolean;
  recruiter_feedback: Json;
  recruiter_recommendation: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const RECOMMENDATIONS = [
  { key: "shortlist", label: "Shortlist" },
  { key: "under_review", label: "Keep Under Review" },
  { key: "needs_improvement", label: "Needs Improvement" },
  { key: "reject", label: "Reject" },
] as const;

export const recommendationLabel = (key: string | null | undefined) =>
  RECOMMENDATIONS.find((r) => r.key === key)?.label ?? "Not reviewed";

export const parseCriteria = (value: Json): EvaluationCriterion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => {
      const obj = (c ?? {}) as Record<string, unknown>;
      return { name: String(obj.name ?? ""), weight: Number(obj.weight ?? 1) };
    })
    .filter((c) => c.name);
};

export const parseAiEvaluation = (value: Json): AiEvaluation | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as AiEvaluation;
};

export const parseRecruiterFeedback = (value: Json): RecruiterFeedback => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as unknown as RecruiterFeedback;
};

export const categoryScore = (evaluation: AiEvaluation | null, name: string) => {
  const found = evaluation?.categories?.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  return typeof found?.score === "number" ? found.score : null;
};

/* ---------- Queries ---------- */

export const listRecruiterChallenges = async (recruiterId: string) => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Challenge[];
};

export const listPublishedChallenges = async () => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Challenge[];
};

export const getChallenge = async (id: string) => {
  const { data, error } = await supabase.from("challenges").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Challenge | null;
};

export const listSubmissionsForChallenge = async (challengeId: string) => {
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChallengeSubmission[];
};

export const listSubmissionsForChallenges = async (challengeIds: string[]) => {
  if (challengeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select("*")
    .in("challenge_id", challengeIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChallengeSubmission[];
};

export const listMySubmissions = async (designerId: string) => {
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ChallengeSubmission[];
};

export const getSubmission = async (id: string) => {
  const { data, error } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as ChallengeSubmission | null;
};

export const fetchDesignsByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("designs").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
};

export const fetchProfilesByUserIds = async (ids: string[]) => {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("user_id", ids);
  if (error) throw error;
  return data ?? [];
};

/* ---------- AI evaluation ---------- */

/**
 * Evaluates a submission on the server, which loads the brief and the stored
 * design itself and saves a verified score on the submission row.
 */
export const evaluateSubmission = async (params: { submissionId: string; submissionNotes?: string }) => {
  const { data, error } = await supabase.functions.invoke("analyze-submission", {
    body: { submissionId: params.submissionId, submissionNotes: params.submissionNotes ?? "" },
  });
  if (error) {
    throw new Error(await functionErrorMessage(error, "We couldn't evaluate that design. Please try again."));
  }
  return (data?.evaluation ?? null) as AiEvaluation | null;
};
