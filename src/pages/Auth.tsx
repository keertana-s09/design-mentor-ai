import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { AuthForm } from "@/components/auth/AuthForm";
import { assignRoleIfNeeded } from "@/components/auth/GoogleSignInButton";

type AppRole = "designer" | "recruiter";

const Auth = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const { user, loading, refreshRole } = useAuth();
  const navigate = useNavigate();

  // Handle post-Google-OAuth redirect: assign pending role
  useEffect(() => {
    if (!user || loading) return;

    const pendingRole = localStorage.getItem("pending_role") as AppRole | null;
    if (pendingRole) {
      localStorage.removeItem("pending_role");
      assignRoleIfNeeded(pendingRole)
        .then(refreshRole)
        .then(() => {
          navigate("/dashboard");
        });
    } else {
      navigate("/dashboard");
    }
  }, [user, loading, navigate, refreshRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user is already logged in, the useEffect above will redirect
  if (user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="fixed inset-0 bg-gradient-hero pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-1.5 rounded-lg bg-gradient-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              DesignCritique
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RoleSelector onSelectRole={setSelectedRole} />
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <AuthForm role={selectedRole} onBack={() => setSelectedRole(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
