import { askModel, MODEL } from "../_shared/ai.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { loadDesignImages } from "../_shared/images.ts";
import { admin, requireUser, withinRateLimit } from "../_shared/supabase.ts";

const SYSTEM_PROMPT = `You are a supportive senior design mentor reviewing how a designer iterated on their own work. You will see the PREVIOUS version's screenshots first, then the NEW version's screenshots. You also get the feedback the previous version received.

Judge what actually changed between the two versions. Be specific about what you can see, and be honest when something got worse.

Return ONLY valid JSON in exactly this shape:
{
  "verdict": "improved" | "mixed" | "regressed" | "unchanged",
  "summary": "<2-3 encouraging sentences on how the design moved between versions>",
  "addressedFeedback": [{ "feedback": "<a point from the previous feedback>", "status": "fixed" | "partly" | "not yet", "evidence": "<what you see in the new version>" }],
  "improvements": ["<a specific change that made the design better>"],
  "regressions": ["<a specific change that made the design worse, or something that broke>"],
  "nextStep": "<the single most valuable thing to do in the next iteration>"
}

Rules:
- Only describe differences you can see. If the versions look identical, say so and use "unchanged".
- Cover each of the previous version's top priorities in "addressedFeedback".
- Keep each list to at most 5 items.`;

interface DesignRow {
  id: string;
  title: string;
  designer_id: string;
  parent_design_id: string | null;
  image_url: string;
  storage_path: string | null;
  storage_paths: unknown;
  source_url: string | null;
}

const DESIGN_COLUMNS =
  "id, title, designer_id, parent_design_id, image_url, storage_path, storage_paths, source_url";

async function latestVerifiedCritique(designId: string) {
  const { data } = await admin
    .from("ai_critiques")
    .select("overall_score, quick_wins, detailed_feedback")
    .eq("design_id", designId)
    .eq("verified", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

Deno.serve(
  handle(async (req) => {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    if (!body.designId) throw new HttpError(400, "No design provided");

    const { data: current } = await admin
      .from("designs")
      .select(DESIGN_COLUMNS)
      .eq("id", body.designId)
      .maybeSingle<DesignRow>();
    if (!current || current.designer_id !== user.id) throw new HttpError(404, "Design not found");
    if (!current.parent_design_id) throw new HttpError(400, "This design isn't a new version of another design.");

    const { data: previous } = await admin
      .from("designs")
      .select(DESIGN_COLUMNS)
      .eq("id", current.parent_design_id)
      .maybeSingle<DesignRow>();
    if (!previous || previous.designer_id !== user.id) throw new HttpError(404, "Previous version not found");

    if (!(await withinRateLimit(`compare-versions:user:${user.id}`, 20, 3600))) {
      throw new HttpError(429, "Too many comparisons this hour. Please try again a little later.");
    }

    const [beforeCritique, afterCritique, beforeImages, afterImages] = await Promise.all([
      latestVerifiedCritique(previous.id),
      latestVerifiedCritique(current.id),
      loadDesignImages(previous),
      loadDesignImages(current),
    ]);

    const priorFeedback = (beforeCritique?.quick_wins ?? []).map((p: string) => `- ${p}`).join("\n") || "None recorded";
    const ai = await askModel<Record<string, unknown>>(SYSTEM_PROMPT, [
      { type: "text", text: `PREVIOUS VERSION ("${previous.title}") — ${beforeImages.length} screenshot(s):` },
      ...beforeImages.slice(0, 3),
      { type: "text", text: `NEW VERSION ("${current.title}") — ${afterImages.length} screenshot(s):` },
      ...afterImages.slice(0, 3),
      { type: "text", text: `Top priorities the previous version was given:\n${priorFeedback}` },
    ]);

    // Score movement comes from the stored verified critiques, never from the model.
    const scoreBefore = beforeCritique?.overall_score ?? null;
    const scoreAfter = afterCritique?.overall_score ?? null;
    const result = {
      ...ai,
      scoreBefore,
      scoreAfter,
      scoreDelta: scoreBefore !== null && scoreAfter !== null ? scoreAfter - scoreBefore : null,
      model: MODEL,
    };

    const { data: saved, error } = await admin
      .from("design_comparisons")
      .insert({
        owner_id: user.id,
        title: `${previous.title} → ${current.title}`,
        design_ids: [previous.id, current.id],
        result,
      })
      .select("id")
      .single();
    if (error) console.error("Could not save comparison", error);

    return { comparison: result, comparisonId: saved?.id ?? null };
  })
);
