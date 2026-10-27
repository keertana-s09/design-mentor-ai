import { describe, expect, it } from "vitest";
import { averageScore, pickCritique, scoreToStars } from "./critiques";

const c = (score: number | null, verified: boolean, day: number) => ({
  overall_score: score,
  verified,
  created_at: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z`,
});

describe("pickCritique", () => {
  it("prefers the newest verified critique over a newer unverified one", () => {
    expect(pickCritique([c(90, false, 5), c(70, true, 3), c(60, true, 1)])?.overall_score).toBe(70);
  });

  it("falls back to the newest critique when none are verified", () => {
    expect(pickCritique([c(50, false, 1), c(65, false, 4)])?.overall_score).toBe(65);
  });

  it("handles no critiques", () => {
    expect(pickCritique([])).toBeUndefined();
    expect(pickCritique(null)).toBeUndefined();
  });
});

describe("averageScore", () => {
  it("ignores unverified scores once any verified ones exist", () => {
    expect(averageScore([c(100, false, 1), c(60, true, 2), c(80, true, 3)])).toEqual({ score: 70, verified: true });
  });

  it("uses unverified scores, flagged, when that's all there is", () => {
    expect(averageScore([c(60, false, 1), undefined, c(null, false, 2)])).toEqual({ score: 60, verified: false });
  });

  it("is null with nothing scored", () => {
    expect(averageScore([undefined])).toEqual({ score: null, verified: false });
  });
});

describe("scoreToStars", () => {
  it("maps the ends and middle of the scale", () => {
    expect(scoreToStars(0)).toBe(1);
    expect(scoreToStars(50)).toBe(3);
    expect(scoreToStars(100)).toBe(5);
    expect(scoreToStars(72)).toBe(3.9);
  });
});
