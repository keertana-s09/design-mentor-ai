import { Sparkles } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12 mt-24">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-primary">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">
              DesignCritique
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2025 DesignCritique. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
