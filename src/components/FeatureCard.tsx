import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group relative"
    >
      {/* Hover glow effect */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-primary opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />
      
      <div className="relative glass rounded-2xl p-6 h-full transition-all duration-300 group-hover:bg-[hsl(222_47%_12%_/_0.8)]">
        <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        
        <h3 className="font-display font-semibold text-lg text-foreground mb-2">
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
