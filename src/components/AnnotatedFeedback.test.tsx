import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AnnotatedFeedback } from "./AnnotatedFeedback";
import type { Category } from "@/hooks/useDesignAnalysis";

const categories: Category[] = [
  {
    name: "Typography",
    score: 8,
    status: "good",
    findings: [
      { type: "strength", title: "Clear headline", description: "Big and bold.", screen: 0, region: { x: 0.1, y: 0.1, width: 0.5, height: 0.1 } },
      { type: "improvement", title: "Tiny captions", description: "Captions are 10px.", screen: 1, region: { x: 0.2, y: 0.8, width: 0.3, height: 0.05 } },
    ],
  },
  {
    name: "Overall Impression",
    score: 7,
    status: "good",
    findings: [{ type: "strength", title: "Polished overall", description: "Whole screen.", screen: 0, region: null }],
  },
];

describe("AnnotatedFeedback", () => {
  it("numbers only findings that point at a spot, and places boxes by percentage", () => {
    render(<AnnotatedFeedback screens={["a.png", "b.png"]} categories={categories} alt="Design" />);
    const marker = screen.getByLabelText("Finding 1: Clear headline");
    expect(marker.style.left).toBe("10%");
    expect(marker.style.width).toBe("50%");
    // Finding 2 is on screen 2, and the whole-screen finding gets no pin.
    expect(screen.queryByLabelText(/Finding 2/)).toBeNull();
    expect(screen.queryByText("Polished overall")).toBeNull();
  });

  it("switches to the right screen when a finding on another screen is picked", () => {
    render(<AnnotatedFeedback screens={["a.png", "b.png"]} categories={categories} alt="Design" />);
    fireEvent.click(screen.getByRole("button", { name: /Tiny captions/ }));
    expect(screen.getByAltText("Design, screen 2")).toBeTruthy();
    expect(screen.getByLabelText("Finding 2: Tiny captions")).toBeTruthy();
    expect(screen.getByText("Captions are 10px.")).toBeTruthy();
  });

  it("explains that older critiques have no pins", () => {
    const legacy: Category[] = [{ name: "Typography", score: 6, status: "good", findings: [{ type: "strength", title: "Ok", description: "" }] }];
    render(<AnnotatedFeedback screens={["a.png"]} categories={legacy} alt="Design" />);
    expect(screen.getByText(/made before feedback was pinned/)).toBeTruthy();
  });
});
