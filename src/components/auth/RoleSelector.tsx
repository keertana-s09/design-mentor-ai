import { motion } from "framer-motion";
import { User, Briefcase } from "lucide-react";

type AppRole = "designer" | "recruiter";

interface RoleSelectorProps {
  onSelectRole: (role: AppRole) => void;
}

export const RoleSelector = ({ onSelectRole }: RoleSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl font-bold text-foreground">
          How will you use DesignCritique?
        </h1>
        <p className="text-muted-foreground">
          Choose your role to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole("designer")}
          className="p-6 rounded-xl border-2 border-border hover:border-primary/60 bg-card transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-1">
            I'm a Designer
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload your designs, get AI-powered critiques, and build your portfolio
          </p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole("recruiter")}
          className="p-6 rounded-xl border-2 border-border hover:border-primary/60 bg-card transition-all text-left group"
        >
          <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-1">
            I'm a Recruiter
          </h3>
          <p className="text-sm text-muted-foreground">
            Browse designer portfolios, evaluate talent, and find the perfect hire
          </p>
        </motion.button>
      </div>
    </div>
  );
};
