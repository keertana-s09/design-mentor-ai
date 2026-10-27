import { format } from "date-fns";
import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HistoryEntry {
  id: string;
  overall_score: number | null;
  layout_score: number | null;
  color_score: number | null;
  typography_score: number | null;
  created_at: string;
}

interface AnalysisHistoryProps {
  history: HistoryEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-yellow-400";
  return "text-orange-400";
};

const ScoreTrend = ({ current, previous }: { current: number | null; previous: number | null }) => {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (diff > 0) return <span className="flex items-center gap-1 text-xs text-accent"><TrendingUp className="w-3 h-3" />+{diff}</span>;
  if (diff < 0) return <span className="flex items-center gap-1 text-xs text-orange-400"><TrendingDown className="w-3 h-3" />{diff}</span>;
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" />0</span>;
};

export const AnalysisHistory = ({ history, selectedId, onSelect }: AnalysisHistoryProps) => {
  if (history.length <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <History className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Analysis History</h3>
          <p className="text-sm text-muted-foreground">{history.length} analyses — track your progress</p>
        </div>
      </div>

      <div className="space-y-2">
        {history.map((entry, index) => {
          const isSelected = entry.id === selectedId;
          const previousEntry = index < history.length - 1 ? history[index + 1] : null;

          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                isSelected
                  ? "bg-primary/15 border border-primary/30"
                  : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`font-display text-xl font-bold ${getScoreColor(entry.overall_score)}`}>
                      {entry.overall_score ?? "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {index === 0 ? "Latest Analysis" : `Analysis #${history.length - index}`}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/20 text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {previousEntry && (
                    <ScoreTrend current={entry.overall_score} previous={previousEntry.overall_score} />
                  )}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span>L: {entry.layout_score ?? "—"}</span>
                    <span>C: {entry.color_score ?? "—"}</span>
                    <span>T: {entry.typography_score ?? "—"}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
