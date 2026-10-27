import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import { measureTextElements, toHex, type MeasuredText, type TextElement } from "@/lib/measure";

interface MeasuredChecksProps {
  screens: string[];
  textElements?: TextElement[];
}

const LEVELS = {
  pass: { label: "Passes AA", className: "bg-accent/15 text-accent" },
  "large-only": { label: "Large text only", className: "bg-yellow-400/15 text-yellow-400" },
  fail: { label: "Fails AA", className: "bg-orange-400/15 text-orange-400" },
} as const;

/**
 * Contrast ratios computed from the screenshot's pixels. The AI only points
 * at the text; the numbers here are measured, so they can be checked.
 */
export const MeasuredChecks = ({ screens, textElements }: MeasuredChecksProps) => {
  const [results, setResults] = useState<MeasuredText[] | null>(null);
  // Parents rebuild these arrays on every render; only re-measure when the content changes.
  const screensKey = screens.join("|");
  const elementsKey = JSON.stringify(textElements ?? []);

  useEffect(() => {
    if (!textElements?.length || screens.length === 0) return;
    let cancelled = false;
    setResults(null);
    measureTextElements(screens, textElements).then((r) => !cancelled && setResults(r));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screensKey, elementsKey]);

  if (!textElements?.length) return null;

  const measured = results?.filter((r) => r.result) ?? [];
  const failing = measured.filter((r) => r.result!.level === "fail").length;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary">
            <Ruler className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Measured contrast</h3>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground whitespace-nowrap">
          Measured from pixels
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The AI finds the text; the ratios are calculated from the screenshot's actual colours using the WCAG
        formula. AA needs 4.5:1 for normal text and 3:1 for large text.
        {measured.length > 0 && (failing > 0 ? ` ${failing} of ${measured.length} fail.` : " All measured text passes.")}
      </p>

      {results === null ? (
        <p className="text-sm text-muted-foreground animate-pulse">Measuring…</p>
      ) : measured.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          We couldn't read the pixels for this image, so nothing was measured.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {measured.map((m, i) => {
            const r = m.result!;
            const level = LEVELS[r.level];
            return (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span
                  className="flex-shrink-0 w-10 h-7 rounded-md border border-border flex items-center justify-center text-sm font-semibold"
                  style={{ background: toHex(r.background), color: toHex(r.foreground) }}
                  aria-hidden
                >
                  Aa
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{m.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {toHex(r.foreground)} on {toHex(r.background)}
                    {screens.length > 1 && ` · screen ${m.screen + 1}`}
                  </p>
                </div>
                <span className="font-display font-semibold text-foreground tabular-nums">{r.ratio.toFixed(2)}:1</span>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${level.className}`}>{level.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
