import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompareArrows, ArrowRight, CheckCircle2, CircleDot, CircleX, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compareWithPreviousVersion } from "@/lib/functions";
import { getLatestComparison, type Comparison } from "@/lib/versions";
import { toast } from "sonner";

interface VersionComparisonProps {
  userId: string;
  designId: string;
  previous: { id: string; title: string };
}

const VERDICTS = {
  improved: { label: "Improved", className: "bg-accent/15 text-accent", Icon: TrendingUp },
  mixed: { label: "Mixed", className: "bg-yellow-400/15 text-yellow-400", Icon: Minus },
  regressed: { label: "Regressed", className: "bg-orange-400/15 text-orange-400", Icon: TrendingDown },
  unchanged: { label: "Unchanged", className: "bg-secondary text-muted-foreground", Icon: Minus },
} as const;

const STATUS_ICONS = {
  fixed: <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />,
  partly: <CircleDot className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />,
  "not yet": <CircleX className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />,
};

/** What changed since the version this design was built from, and whether earlier feedback was acted on. */
export const VersionComparison = ({ userId, designId, previous }: VersionComparisonProps) => {
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    getLatestComparison(userId, previous.id, designId)
      .then(setComparison)
      .catch((e) => console.error("Could not load comparison", e))
      .finally(() => setLoading(false));
  }, [userId, previous.id, designId]);

  const runComparison = async () => {
    setComparing(true);
    try {
      const { comparison } = await compareWithPreviousVersion(designId);
      setComparison(comparison);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't compare the two versions.");
    } finally {
      setComparing(false);
    }
  };

  const verdict = comparison?.verdict ? VERDICTS[comparison.verdict] : null;

  return (
    <div className="glass rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <GitCompareArrows className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Since the last version</h3>
            <button
              onClick={() => navigate(`/critique/${previous.id}`)}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Built on “{previous.title}”
            </button>
          </div>
        </div>
        <Button variant="glass" size="sm" onClick={runComparison} disabled={comparing || loading}>
          {comparing ? "Comparing…" : comparison ? "Compare again" : "Compare versions"}
        </Button>
      </div>

      {loading ? null : !comparison ? (
        <p className="text-sm text-muted-foreground">
          See what you fixed, what got worse, and which earlier feedback you've acted on.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {comparison.scoreBefore !== null && comparison.scoreAfter !== null && (
              <div className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
                <span className="text-muted-foreground">{comparison.scoreBefore}</span>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <span>{comparison.scoreAfter}</span>
                {comparison.scoreDelta !== null && comparison.scoreDelta !== 0 && (
                  <span className={`text-base ${comparison.scoreDelta > 0 ? "text-accent" : "text-orange-400"}`}>
                    {comparison.scoreDelta > 0 ? "+" : ""}
                    {comparison.scoreDelta}
                  </span>
                )}
              </div>
            )}
            {verdict && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${verdict.className}`}>
                <verdict.Icon className="w-3.5 h-3.5" />
                {verdict.label}
              </span>
            )}
          </div>

          {comparison.summary && <p className="text-foreground/90">{comparison.summary}</p>}

          {comparison.addressedFeedback && comparison.addressedFeedback.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Earlier feedback</h4>
              <ul className="space-y-2">
                {comparison.addressedFeedback.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    {STATUS_ICONS[item.status] ?? STATUS_ICONS["not yet"]}
                    <div>
                      <p className="text-foreground">{item.feedback}</p>
                      {item.evidence && <p className="text-muted-foreground">{item.evidence}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {comparison.improvements && comparison.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-accent mb-2">Got better</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {comparison.improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {comparison.regressions && comparison.regressions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-orange-400 mb-2">Got worse</h4>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {comparison.regressions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>

          {comparison.nextStep && (
            <div className="rounded-lg bg-primary/10 p-4 text-sm">
              <span className="font-medium text-foreground">Next iteration: </span>
              <span className="text-muted-foreground">{comparison.nextStep}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
