import { useEffect, useState } from "react";

const STORAGE_KEY = "blind_review";

const readSetting = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
};

/**
 * Recruiter preference to hide names, photos and contact details while
 * reviewing, so work is judged before identity. Remembered per browser.
 */
export const useBlindReview = () => {
  const [blind, setBlind] = useState(readSetting);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, blind ? "on" : "off");
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  }, [blind]);

  return [blind, setBlind] as const;
};

/** Stable anonymous label for a designer, e.g. "Candidate 7F3A". */
export const candidateLabel = (userId: string) => `Candidate ${userId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
