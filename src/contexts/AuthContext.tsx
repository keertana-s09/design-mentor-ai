import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "designer" | "recruiter";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** Signed up as a recruiter and waiting for an admin to approve the account. */
  recruiterPending: boolean;
  loading: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Re-reads the role after it was granted outside signUp (e.g. Google sign-in). */
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [recruiterPending, setRecruiterPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.role as AppRole);
      setRecruiterPending(false);
      return;
    }

    const { data: application } = await supabase
      .from("recruiter_applications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    setRecruiterPending(application?.status === "pending");
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer role fetch to avoid blocking
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else {
          setRole(null);
          setRecruiterPending(false);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, role: AppRole, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Designers get their role straight away; recruiters wait for approval.
        const { data: granted, error: roleError } = await supabase.rpc("claim_role", { _role: role });

        if (roleError) throw roleError;

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: data.user.id,
            email,
            full_name: fullName,
          });

        if (profileError) throw profileError;

        setRole(granted === "recruiter_pending" ? null : (granted as AppRole));
        setRecruiterPending(granted === "recruiter_pending");
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setRecruiterPending(false);
  };

  // fetchUserRole only touches state setters, so this stays stable across renders.
  const refreshRole = useCallback(async () => {
    const { data: { user: current } } = await supabase.auth.getUser();
    if (current) await fetchUserRole(current.id);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, recruiterPending, loading, signUp, signIn, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
