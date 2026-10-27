import { HttpError } from "./http.ts";
import type { ImageContent } from "./images.ts";

export const MODEL = "gemini-2.5-flash";

type UserContent = { type: "text"; text: string } | ImageContent;

// Robust JSON extraction from AI responses
export function extractJsonFromResponse(response: string): unknown {
  let cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(cleaned);
  }
}

/** Sends a system prompt plus text/images to Gemini (OpenAI-compatible endpoint) and returns the parsed JSON reply. */
export async function askModel<T>(systemPrompt: string, content: UserContent[]): Promise<T> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    console.error("AI service configuration error");
    throw new HttpError(503, "Service temporarily unavailable");
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GEMINI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new HttpError(429, "Too many requests. Please try again in a moment.");
    if (response.status === 402) throw new HttpError(402, "Service credits exhausted. Please try again later.");
    console.error("AI processing error:", response.status, await response.text().catch(() => ""));
    if (response.status === 400) {
      throw new HttpError(
        400,
        "We couldn't read that image. Please use a clear PNG or JPG screenshot of your design (or a direct image link)."
      );
    }
    throw new HttpError(500, "Unable to process request");
  }

  const aiResponse = await response.json();
  const text = aiResponse.choices?.[0]?.message?.content;
  if (!text) throw new HttpError(500, "Unable to generate feedback");
  try {
    return extractJsonFromResponse(text) as T;
  } catch {
    console.error("Response parsing error");
    throw new HttpError(500, "Unable to process feedback");
  }
}
