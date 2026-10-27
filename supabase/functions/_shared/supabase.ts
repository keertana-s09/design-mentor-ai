import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.90.1";
import { HttpError } from "./http.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Service-role client. Bypasses RLS, so every caller must check ownership itself. */
export const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** The signed-in user behind the request, or null for anonymous callers. */
export async function getUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

export async function requireUser(req: Request): Promise<User> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}

export async function hasRole(userId: string, role: "designer" | "recruiter") {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}

/** Returns false once `key` has been used more than `max` times in the window. */
export async function withinRateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await admin.rpc("hit_rate_limit", {
    _key: key,
    _max: max,
    _window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Rate limit check failed", error);
    return false;
  }
  return data === true;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
