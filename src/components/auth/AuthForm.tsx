import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Mail, Lock, UserCircle, CheckCircle, AlertCircle, Loader2, ArrowLeft, User, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

type AuthMode = "signin" | "signup";
type AppRole = "designer" | "recruiter";
type FormStatus = "idle" | "loading" | "success" | "error";

interface AuthFormProps {
  role: AppRole;
  onBack: () => void;
}

export const AuthForm = ({ role, onBack }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const resetStatus = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 600);
      } else {
        if (!fullName.trim()) {
          setStatus("error");
          setErrorMessage("Please enter your full name.");
          return;
        }
        if (password.length < 6) {
          setStatus("error");
          setErrorMessage("Password must be at least 6 characters.");
          return;
        }
        const { error } = await signUp(email, password, role, fullName);
        if (error) throw error;
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 600);
      }
    } catch (error) {
      setStatus("error");
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      if (msg.includes("Invalid login credentials")) {
        setErrorMessage("Incorrect email or password.");
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        setErrorMessage("This email is already registered. Try signing in.");
      } else if (msg.includes("rate limit") || msg.includes("too many")) {
        setErrorMessage("Too many attempts. Please wait and try again.");
      } else {
        setErrorMessage(msg);
      }
    }
  };

  const roleLabel = role === "designer" ? "Designer" : "Recruiter";
  const RoleIcon = role === "designer" ? User : Briefcase;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <RoleIcon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {roleLabel} {mode === "signin" ? "Sign In" : "Sign Up"}
          </span>
        </div>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {mode === "signin" ? `Welcome back, ${roleLabel}` : `Create ${roleLabel} Account`}
        </h1>
        <p className="text-muted-foreground mt-1">
          {mode === "signin"
            ? "Sign in to access your dashboard"
            : `Join as a ${roleLabel.toLowerCase()} to get started`}
        </p>
      </div>

      {/* Google Sign In */}
      <GoogleSignInButton role={role} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
        </div>
      </div>

      {/* Status Banners */}
      <AnimatePresence mode="wait">
        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3"
          >
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className="text-sm text-green-400">
              {mode === "signin" ? "Signed in! Redirecting..." : "Account created! Redirecting..."}
            </span>
          </motion.div>
        )}
        {status === "error" && errorMessage && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <span className="text-sm text-destructive">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); resetStatus(); }}
                placeholder="John Doe"
                required
                className="pl-10 bg-secondary/50 border-border"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); resetStatus(); }}
              placeholder="you@example.com"
              required
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); resetStatus(); }}
              placeholder="••••••••"
              required
              minLength={6}
              className="pl-10 bg-secondary/50 border-border"
            />
          </div>
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
          )}
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === "signin" ? "Signing in..." : "Creating account..."}
            </span>
          ) : status === "success" ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {mode === "signin" ? "Signed in!" : "Account created!"}
            </span>
          ) : (
            mode === "signin" ? "Sign In" : "Create Account"
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); resetStatus(); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};
