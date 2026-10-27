import { useState } from "react";
import { CheckCircle2, Lightbulb, MapPin } from "lucide-react";
import type { Category, Finding } from "@/hooks/useDesignAnalysis";

interface PinnedFinding extends Finding {
  number: number;
  category: string;
}

interface AnnotatedFeedbackProps {
  screens: string[];
  categories: Category[];
  alt: string;
}

/** Collects findings that point at a spot on a screen and numbers them for the markers. */
export const pinnedFindings = (categories: Category[]): PinnedFinding[] =>
  categories
    .flatMap((c) => (c.findings ?? []).map((f) => ({ ...f, category: c.name })))
    .filter((f) => f.region)
    .map((f, i) => ({ ...f, number: i + 1 }));

/**
 * Shows the screenshot(s) with numbered markers on the exact spots the
 * feedback is about. Clicking a marker or a list item highlights both.
 */
export const AnnotatedFeedback = ({ screens, categories, alt }: AnnotatedFeedbackProps) => {
  const pins = pinnedFindings(categories);
  const [screen, setScreen] = useState(0);
  const [active, setActive] = useState<number | null>(pins[0]?.number ?? null);

  const onScreen = pins.filter((p) => (p.screen ?? 0) === screen);
  const activePin = pins.find((p) => p.number === active) ?? null;

  const select = (pin: PinnedFinding) => {
    setScreen(pin.screen ?? 0);
    setActive(pin.number);
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {screens.length > 1 && (
        <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => setScreen(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                screen === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Screen {i + 1}
              <span className="ml-1.5 opacity-70">({pins.filter((p) => (p.screen ?? 0) === i).length})</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-secondary flex justify-center">
        {/* The wrapper hugs the image so percentage boxes line up with its pixels. */}
        <div className="relative inline-block max-w-full">
          <img src={screens[screen]} alt={`${alt}, screen ${screen + 1}`} className="block max-w-full h-auto max-h-[600px]" />
          {onScreen.map((pin) => {
            const r = pin.region!;
            const isActive = pin.number === active;
            const boxClass =
              pin.type === "strength"
                ? isActive
                  ? "border-accent bg-accent/15 z-20"
                  : "border-accent/50 hover:border-accent z-10"
                : isActive
                  ? "border-primary bg-primary/15 z-20"
                  : "border-primary/50 hover:border-primary z-10";
            return (
              <button
                key={pin.number}
                onClick={() => setActive(pin.number)}
                aria-label={`Finding ${pin.number}: ${pin.title}`}
                className={`absolute rounded-md border-2 transition-all ${boxClass}`}
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: `${r.width * 100}%`,
                  height: `${r.height * 100}%`,
                }}
              >
                <span
                  className={`absolute -top-3 -left-3 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-md ${
                    pin.type === "strength" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {pin.number}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activePin && (
        <div
          className={`m-4 p-4 rounded-lg border ${
            activePin.type === "strength" ? "bg-accent/10 border-accent/20" : "bg-primary/10 border-primary/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {activePin.type === "strength" ? (
              <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            ) : (
              <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                #{activePin.number} · {activePin.category}
              </p>
              <h4 className="font-medium text-foreground mb-1">{activePin.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{activePin.description}</p>
            </div>
          </div>
        </div>
      )}

      {pins.length > 0 ? (
        <ol className="px-4 pb-4 grid gap-1 sm:grid-cols-2">
          {pins.map((pin) => (
            <li key={pin.number}>
              <button
                onClick={() => select(pin)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  pin.number === active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    pin.type === "strength" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                  }`}
                >
                  {pin.number}
                </span>
                <span className="truncate">{pin.title}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex items-center gap-2 px-4 pb-4 pt-3 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          This critique was made before feedback was pinned to the design. Re-analyze to see it on the image.
        </p>
      )}
    </div>
  );
};
