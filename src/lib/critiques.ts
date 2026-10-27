interface CritiqueLike {
  overall_score: number | null;
  verified?: boolean | null;
  created_at?: string | null;
}

/** The critique to show for a design: the newest verified one, else the newest of any kind. */
export function pickCritique<T extends CritiqueLike>(critiques: T[] | null | undefined): T | undefined {
  if (!critiques?.length) return undefined;
  const newestFirst = [...critiques].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return newestFirst.find((c) => c.verified) ?? newestFirst[0];
}

/**
 * Average score across a designer's designs (one critique per design). Uses
 * verified critiques only when there are any, so editable legacy scores can't
 * inflate the number.
 */
export function averageScore(perDesign: (CritiqueLike | undefined)[]): { score: number | null; verified: boolean } {
  const scored = perDesign.filter((c): c is CritiqueLike => !!c && c.overall_score !== null);
  const verified = scored.filter((c) => c.verified);
  const pool = verified.length > 0 ? verified : scored;
  if (pool.length === 0) return { score: null, verified: false };
  const sum = pool.reduce((total, c) => total + c.overall_score!, 0);
  return { score: Math.round(sum / pool.length), verified: verified.length > 0 };
}

/** Maps a 0-100 AI score onto the recruiter's 1-5 star scale. */
export const scoreToStars = (score: number) => Math.round((1 + (Math.min(100, Math.max(0, score)) / 100) * 4) * 10) / 10;
