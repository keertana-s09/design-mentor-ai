import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  ChevronDown,
  Trophy,
  Target,
  RotateCcw
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DesignFeedback, Category } from "@/hooks/useDesignAnalysis";
import { AnnotatedFeedback } from "@/components/AnnotatedFeedback";
import { MeasuredChecks } from "@/components/MeasuredChecks";

interface FeedbackResultsProps {
  feedback: DesignFeedback;
  /** Local preview of the analyzed screenshot, used for pins and pixel measurements. */
  imageUrl?: string | null;
  onReset: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-accent";
  if (score >= 6) return "text-yellow-400";
  return "text-orange-400";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "excellent":
      return <Trophy className="w-5 h-5 text-accent" />;
    case "good":
      return <CheckCircle2 className="w-5 h-5 text-yellow-400" />;
    default:
      return <Target className="w-5 h-5 text-orange-400" />;
  }
};

const CategoryCard = ({ category, index }: { category: Category; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          {getStatusIcon(category.status)}
          <div className="text-left">
            <h3 className="font-display font-semibold text-foreground">
              {category.name}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {category.status.replace("-", " ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-display text-2xl font-bold ${getScoreColor(category.score)}`}>
            {category.score}/10
          </span>
          <ChevronDown 
            className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} 
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {category.findings.map((finding, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg ${
                    finding.type === "strength" 
                      ? "bg-accent/10 border border-accent/20" 
                      : "bg-primary/10 border border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {finding.type === "strength" ? (
                      <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-medium text-foreground mb-1">
                        {finding.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FeedbackResults = ({ feedback, imageUrl, onReset }: FeedbackResultsProps) => {
  const screens = imageUrl ? [imageUrl] : [];
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 mb-6">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground/80">
            Analysis Complete
          </span>
        </div>

        <div className={`font-display text-7xl font-bold mb-4 ${getScoreColor(feedback.overallScore)}`}>
          {feedback.overallScore}<span className="text-3xl text-muted-foreground">/10</span>
        </div>

        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          {feedback.summary}
        </p>
      </motion.div>

      {screens.length > 0 && (
        <div className="text-left space-y-8">
          <AnnotatedFeedback screens={screens} categories={feedback.categories} alt="Your design" />
          <MeasuredChecks screens={screens} textElements={feedback.textElements} />
        </div>
      )}

      {/* Top Priorities */}
      {feedback.topPriorities && feedback.topPriorities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-400/20">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className="font-display font-semibold text-foreground">
              Top Priorities
            </h3>
          </div>
          <ol className="space-y-3">
            {feedback.topPriorities.map((priority, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                  {i + 1}
                </span>
                <span className="text-foreground/90">{priority}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Category Breakdown */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-semibold text-foreground">
          Detailed Breakdown
        </h3>
        {feedback.categories.map((category, index) => (
          <CategoryCard key={category.name} category={category} index={index} />
        ))}
      </div>

      {/* Analyze Another */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center pt-4"
      >
        <Button variant="glass" size="lg" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Analyze Another Design
        </Button>
      </motion.div>
    </div>
  );
};
