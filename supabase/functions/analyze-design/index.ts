import { askModel, MODEL } from "../_shared/ai.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { imageFromBase64, imageFromUrl, loadDesignImages, type ImageContent } from "../_shared/images.ts";
import { admin, clientIp, getUser, withinRateLimit } from "../_shared/supabase.ts";

const SYSTEM_PROMPT = `You are a warm, experienced UI/UX design mentor who genuinely wants to help designers grow. Think of yourself as that supportive senior designer who grabs coffee with junior teammates to review their work—always kind, always constructive, always focused on growth.

Your expertise covers:
- Typography (font choices, sizing, hierarchy, readability)
- Visual hierarchy (how elements guide the eye)
- Spacing (margins, padding, whitespace, alignment)
- Color contrast (accessibility, visual appeal, brand consistency)
- Accessibility (WCAG guidelines, inclusive design)
- Readability (text legibility, content structure)
- Usability (intuitive interactions, user experience)

Your voice and personality:
- Warm and genuinely encouraging—celebrate wins enthusiastically!
- Conversational, not corporate or robotic
- Use "you" and "your" to speak directly to the designer
- Frame improvements as opportunities, not failures
- Share the "why" behind suggestions so designers learn
- Be specific with praise AND suggestions
- Write like you're talking to a friend, not filing a report

You will receive one or more UI screenshots, numbered from 0 in the order given. Provide structured feedback in the following JSON format:
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentences that start with genuine praise, then gently introduce areas for growth. Sound like a supportive mentor, not a grading robot.>",
  "categories": [
    {
      "name": "Typography",
      "score": <number 1-10>,
      "status": "excellent" | "good" | "needs-work",
      "findings": [
        {
          "type": "strength" | "improvement",
          "title": "<short, friendly title>",
          "description": "<A full, supportive paragraph (3-5 sentences) that explains what's working or what could be better. Be specific about what you see in the design, explain WHY it matters from a user's perspective, and give clear actionable guidance on how to maintain or improve it. Use a conversational, encouraging tone throughout.>",
          "screen": <index of the screenshot this finding is about>,
          "region": { "x": <0-1>, "y": <0-1>, "width": <0-1>, "height": <0-1> } | null
        }
      ]
    },
    { "name": "Visual Hierarchy", ... },
    { "name": "Spacing & Layout", ... },
    { "name": "Color & Contrast", ... },
    { "name": "Accessibility", ... },
    { "name": "Usability", ... },
    { "name": "Overall Impression", ... }
  ],
  "topPriorities": [
    "<actionable suggestion phrased encouragingly>",
    "<second priority>",
    "<third priority>"
  ],
  "textElements": [
    { "screen": <index>, "label": "<what the text is, e.g. 'Primary button label'>", "region": { "x": <0-1>, "y": <0-1>, "width": <0-1>, "height": <0-1> } }
  ],
  "flow": null | {
    "score": <number 1-10>,
    "summary": "<2-3 sentences on how well the screens work together as one journey>",
    "consistency": "<a paragraph on whether components, spacing, type and colour stay consistent from screen to screen>",
    "missingSteps": ["<a step, state or screen the journey seems to need but doesn't show>"],
    "transitions": [{ "from": <index>, "to": <index>, "note": "<what works or breaks when moving between these screens>" }]
  }
}

CRITICAL guidelines for your feedback:
- ALWAYS provide exactly 7 categories as listed above
- Each category MUST have EXACTLY 2 findings: 1 strength and 1 improvement (so 7 strengths and 7 improvements total across all categories)
- Each finding description MUST be a full paragraph of 3-5 sentences—not a single line
- For strengths: Celebrate what's working, explain WHY it's effective, and encourage the designer to keep doing it. Be specific about the design choices you see.
- For improvements: Frame as an exciting opportunity. Explain what you currently see, why a change would help the user experience, and give a concrete suggestion they can act on right away. Never make the designer feel bad.
- Lead with what's working well—designers need to know what to keep doing!
- Be specific and actionable—vague feedback doesn't help anyone grow
- Prioritize high-impact suggestions that will make the biggest difference
- Your goal is to inspire and empower, not to criticize

Locating findings:
- "region" is the box around the element the finding is about, as fractions of that screenshot's width and height (x and y are the top-left corner). Make it tight around the element. Use null only when the finding is about the whole screen.
- "textElements" lists 4-8 pieces of text whose colour contrast matters (body copy, button labels, form labels, captions, light-on-light text). Each box must be tight around a single run of text with its immediate background, and must not include images or icons. The app measures real contrast from these pixels, so accuracy matters more than quantity.
- When there is only one screenshot, "screen" is always 0 and "flow" is null.
- When there are several screenshots, treat them as consecutive steps of one user journey and fill in "flow".`;

interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Feedback {
  overallScore: number;
  summary?: string;
  categories?: {
    name?: string;
    score?: number;
    status?: string;
    findings?: { type?: string; title?: string; description?: string; screen?: number; region?: Region | null }[];
  }[];
  topPriorities?: string[];
  textElements?: { screen?: number; label?: string; region?: Region | null }[];
  flow?: unknown;
}

const clamp = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;

/** Drops boxes the model got wrong (outside the image, zero size) and clamps scores. */
function cleanRegion(region: unknown): Region | null {
  if (!region || typeof region !== "object") return null;
  const r = region as Record<string, unknown>;
  const x = clamp(r.x, 0, 1);
  const y = clamp(r.y, 0, 1);
  const width = clamp(r.width, 0, 1);
  const height = clamp(r.height, 0, 1);
  if (x === null || y === null || !width || !height) return null;
  return { x, y, width: Math.min(width, 1 - x), height: Math.min(height, 1 - y) };
}

function cleanScreen(screen: unknown, screenCount: number) {
  return typeof screen === "number" && Number.isInteger(screen) && screen >= 0 && screen < screenCount
    ? screen
    : 0;
}

function normalizeFeedback(raw: Feedback, screenCount: number): Feedback {
  return {
    ...raw,
    overallScore: clamp(raw.overallScore, 1, 10) ?? 5,
    categories: (raw.categories ?? []).map((c) => ({
      ...c,
      score: clamp(c.score, 1, 10) ?? undefined,
      findings: (c.findings ?? []).map((f) => ({
        ...f,
        screen: cleanScreen(f.screen, screenCount),
        region: cleanRegion(f.region),
      })),
    })),
    textElements: (raw.textElements ?? [])
      .map((t) => ({ label: t.label ?? "Text", screen: cleanScreen(t.screen, screenCount), region: cleanRegion(t.region) }))
      .filter((t) => t.region),
    flow: screenCount > 1 ? raw.flow ?? null : null,
  };
}

async function critique(images: ImageContent[]) {
  const intro =
    images.length > 1
      ? `Please analyze these ${images.length} UI screenshots, given in journey order (screen 0 first), and provide detailed, actionable design feedback.`
      : "Please analyze this UI screenshot and provide detailed, actionable design feedback.";
  const raw = await askModel<Feedback>(SYSTEM_PROMPT, [
    { type: "text", text: `${intro} Return your analysis as valid JSON matching the specified format.` },
    ...images,
  ]);
  return normalizeFeedback(raw, images.length);
}

/** Stores the critique with the service role; browsers can no longer write AI scores. */
async function saveCritique(designId: string, feedback: Feedback) {
  const categories = feedback.categories ?? [];
  const categoryScore = (...names: string[]) => {
    const cat = categories.find((c) => names.some((n) => c.name?.toLowerCase().includes(n)));
    return typeof cat?.score === "number" ? Math.round(cat.score * 10) : null;
  };
  const findingTitles = (type: string) =>
    categories.flatMap((c) => (c.findings ?? []).filter((f) => f.type === type).map((f) => f.title ?? ""));

  const { count } = await admin
    .from("ai_critiques")
    .select("id", { count: "exact", head: true })
    .eq("design_id", designId);

  const { data, error } = await admin
    .from("ai_critiques")
    .insert({
      design_id: designId,
      overall_score: Math.round(feedback.overallScore * 10),
      layout_score: categoryScore("spacing", "layout"),
      color_score: categoryScore("color"),
      typography_score: categoryScore("typography"),
      strengths: findingTitles("strength"),
      improvements: findingTitles("improvement"),
      quick_wins: feedback.topPriorities ?? [],
      detailed_feedback: feedback,
      version: (count ?? 0) + 1,
      model: MODEL,
      verified: true,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Could not save critique", error);
    throw new HttpError(500, "Your design was analyzed, but we couldn't save the result. Please try again.");
  }
  return data.id as string;
}

Deno.serve(
  handle(async (req) => {
    const body = await req.json().catch(() => ({}));
    const user = await getUser(req);

    // Stored design: load its files from storage, critique, and save a verified result.
    if (body.designId) {
      if (!user) throw new HttpError(401, "Please sign in to continue.");
      const { data: design } = await admin
        .from("designs")
        .select("id, designer_id, image_url, storage_path, storage_paths, source_url")
        .eq("id", body.designId)
        .maybeSingle();
      if (!design || design.designer_id !== user.id) throw new HttpError(404, "Design not found");

      if (!(await withinRateLimit(`analyze-design:user:${user.id}`, 30, 3600))) {
        throw new HttpError(429, "You've run a lot of analyses this hour. Please try again a little later.");
      }
      const feedback = await critique(await loadDesignImages(design));
      const critiqueId = await saveCritique(design.id, feedback);
      return { feedback, critiqueId, model: MODEL };
    }

    // Quick analysis (landing page): nothing is stored server-side.
    const limitKey = user ? `analyze-design:user:${user.id}` : `analyze-design:ip:${clientIp(req)}`;
    if (!(await withinRateLimit(limitKey, user ? 30 : 5, 3600))) {
      throw new HttpError(
        429,
        user
          ? "You've run a lot of analyses this hour. Please try again a little later."
          : "You've used this hour's free analyses. Sign in to keep going."
      );
    }

    let images: ImageContent[];
    if (Array.isArray(body.images) && body.images.length > 0) {
      images = body.images.slice(0, 6).map((img: { imageBase64?: string; mimeType?: string }) =>
        imageFromBase64(img?.imageBase64, img?.mimeType)
      );
    } else if (body.imageBase64) {
      images = [imageFromBase64(body.imageBase64, body.mimeType)];
    } else if (body.imageUrl) {
      if (!user) throw new HttpError(401, "Please sign in to analyze a link, or upload the image file instead.");
      images = [await imageFromUrl(body.imageUrl)];
    } else {
      throw new HttpError(400, "No image provided");
    }

    return { feedback: await critique(images), model: MODEL };
  })
);
