import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "designer" | "recruiter";

interface GoogleSignInButtonProps {
  role: AppRole;
}

export const GoogleSignInButton = ({ role }: GoogleSignInButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Remember the chosen role; the auth page assigns it when Google sends the user back.
    try {
      localStorage.setItem("pending_role", role);
    } catch {
      // Storage can be blocked (private mode); sign-in still proceeds, just without a remembered role.
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });

    if (error) {
      console.error("Google sign-in error:", error);
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-3 border-border hover:bg-secondary/80"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
};

export async function assignRoleIfNeeded(role: AppRole) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Returns the existing role if there is one; recruiters are queued for approval.
  await supabase.rpc("claim_role", { _role: role });

  // Create profile if needed
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      user_id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
      avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
}
