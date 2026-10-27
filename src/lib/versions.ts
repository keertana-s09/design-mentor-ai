import { supabase } from "@/integrations/supabase/client";

export interface Comparison {
  verdict?: "improved" | "mixed" | "regressed" | "unchanged";
  summary?: string;
  addressedFeedback?: { feedback: string; status: "fixed" | "partly" | "not yet"; evidence?: string }[];
  improvements?: string[];
  regressions?: string[];
  nextStep?: string;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number | null;
}

export interface VersionNode {
  id: string;
  parent_design_id: string | null;
  created_at: string;
  title: string;
  score: number | null;
}

/**
 * Groups designs into version chains (v1 → v2 → …), oldest first. A design
 * whose parent isn't in the list starts its own chain.
 */
export function buildVersionChains<T extends VersionNode>(designs: T[]): T[][] {
  const byId = new Map(designs.map((d) => [d.id, d]));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const d of designs) {
    if (d.parent_design_id && byId.has(d.parent_design_id) && d.parent_design_id !== d.id) {
      const list = children.get(d.parent_design_id) ?? [];
      list.push(d);
      children.set(d.parent_design_id, list);
    } else {
      roots.push(d);
    }
  }

  const byDate = (a: T, b: T) => a.created_at.localeCompare(b.created_at);
  const queue = roots.sort(byDate);
  const seen = new Set<string>();
  const chains: T[][] = [];
  while (queue.length > 0) {
    const root = queue.shift()!;
    if (seen.has(root.id)) continue;
    // Follow the newest child at each step; older siblings start chains of their own.
    const chain = [root];
    seen.add(root.id);
    let kids = (children.get(root.id) ?? []).sort(byDate);
    while (kids.length > 0) {
      const next = kids[kids.length - 1];
      queue.push(...kids.slice(0, -1));
      if (seen.has(next.id)) break;
      chain.push(next);
      seen.add(next.id);
      kids = (children.get(next.id) ?? []).sort(byDate);
    }
    chains.push(chain);
  }
  return chains;
}

/** First-to-latest score change across a chain, ignoring unscored versions. */
export function chainGrowth(chain: VersionNode[]): number | null {
  const scored = chain.filter((d) => d.score !== null);
  if (scored.length < 2) return null;
  return scored[scored.length - 1].score! - scored[0].score!;
}

export const getLatestComparison = async (ownerId: string, previousId: string, currentId: string) => {
  const { data, error } = await supabase
    .from("design_comparisons")
    .select("result, created_at")
    .eq("owner_id", ownerId)
    .contains("design_ids", [previousId, currentId])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.result ?? null) as unknown as Comparison | null;
};
