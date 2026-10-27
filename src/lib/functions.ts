import { supabase } from "@/integrations/supabase/client";
import type { Comparison } from "@/lib/versions";
import type { DesignFeedback } from "@/hooks/useDesignAnalysis";

/** Pulls the user-facing message out of an edge function error response. */
export const functionErrorMessage = async (error: unknown, fallback = "Something went wrong. Please try again.") => {
  try {
    const ctx = (error as { context?: { json: () => Promise<{ error?: string }> } }).context;
    const parsed = ctx ? await ctx.json() : null;
    if (parsed?.error) return parsed.error;
  } catch {
    // fall through to the fallback
  }
  return fallback;
};

const invoke = async <T>(name: string, body: Record<string, unknown>, fallback: string): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await functionErrorMessage(error, fallback));
  if (data?.error) throw new Error(data.error);
  return data as T;
};

/** Critiques a stored design server-side; the result is saved as a verified critique. */
export const analyzeStoredDesign = (designId: string) =>
  invoke<{ feedback: DesignFeedback; critiqueId: string }>(
    "analyze-design",
    { designId },
    "Your design was saved, but we couldn't analyze it. Try again with a PNG or JPG screenshot."
  );

/** Compares a design with the version it was built from. */
export const compareWithPreviousVersion = (designId: string) =>
  invoke<{ comparison: Comparison; comparisonId: string | null }>(
    "compare-versions",
    { designId },
    "We couldn't compare the two versions. Please try again."
  );
