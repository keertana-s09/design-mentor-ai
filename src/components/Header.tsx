import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-gradient-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg text-foreground">
              DesignCritique
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:inline-flex"
                  onClick={() => navigate("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button variant="hero" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:inline-flex"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};
