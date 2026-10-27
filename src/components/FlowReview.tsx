import { ArrowRight, Route, CircleDashed } from "lucide-react";
import type { FlowFeedback } from "@/hooks/useDesignAnalysis";

interface FlowReviewProps {
  flow: FlowFeedback;
  screens: string[];
}

const scoreColor = (score: number) =>
  score >= 8 ? "text-accent" : score >= 6 ? "text-yellow-400" : "text-orange-400";

/** How the screens work together as one journey, not one by one. */
export const FlowReview = ({ flow, screens }: FlowReviewProps) => (
  <div className="glass rounded-xl p-6 space-y-5">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Route className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">User flow</h3>
          <p className="text-sm text-muted-foreground">{screens.length} screens reviewed as one journey</p>
        </div>
      </div>
      <span className={`font-display text-2xl font-bold ${scoreColor(flow.score)}`}>{flow.score}/10</span>
    </div>

    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {screens.map((src, i) => (
        <div key={i} className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <img src={src} alt={`Screen ${i + 1}`} className="h-24 w-auto rounded-md border border-border object-cover" />
            <span className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/80 text-foreground">
              {i + 1}
            </span>
          </div>
          {i < screens.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      ))}
    </div>

    <p className="text-foreground/90">{flow.summary}</p>

    {flow.consistency && (
      <div>
        <h4 className="text-sm font-medium text-foreground mb-1">Consistency across screens</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{flow.consistency}</p>
      </div>
    )}

    {flow.transitions && flow.transitions.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Step by step</h4>
        <ul className="space-y-2">
          {flow.transitions.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 font-mono text-xs text-primary bg-primary/10 rounded px-1.5 py-0.5 h-fit">
                {t.from + 1} → {t.to + 1}
              </span>
              <span className="text-muted-foreground">{t.note}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {flow.missingSteps && flow.missingSteps.length > 0 && (
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Possibly missing</h4>
        <ul className="space-y-1.5">
          {flow.missingSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <CircleDashed className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-400" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
