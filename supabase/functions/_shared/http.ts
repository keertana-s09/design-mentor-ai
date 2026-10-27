// Browser origins allowed to call the functions: local dev plus any deployed
// site listed in the ALLOWED_ORIGINS secret (comma-separated).
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    Vary: "Origin",
  };
}

/** Error whose message is safe to show to the user. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function jsonResponse(body: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wraps a handler with CORS preflight handling and uniform error responses. */
export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    try {
      return jsonResponse(await fn(req), corsHeaders);
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse({ error: error.message }, corsHeaders, error.status);
      }
      console.error("Request processing error", error);
      return jsonResponse({ error: "Unable to process request" }, corsHeaders, 500);
    }
  };
}
