import { describe, expect, it } from "vitest";
import { buildVersionChains, chainGrowth, type VersionNode } from "./versions";

const node = (id: string, parent: string | null, day: number, score: number | null = null): VersionNode => ({
  id,
  parent_design_id: parent,
  created_at: `2026-10-${String(day).padStart(2, "0")}T00:00:00Z`,
  title: id,
  score,
});

describe("buildVersionChains", () => {
  it("links versions oldest first", () => {
    const chains = buildVersionChains([node("v3", "v2", 3), node("v1", null, 1), node("v2", "v1", 2)]);
    expect(chains.map((c) => c.map((d) => d.id))).toEqual([["v1", "v2", "v3"]]);
  });

  it("keeps unrelated designs as separate chains", () => {
    const chains = buildVersionChains([node("a", null, 1), node("b", null, 2), node("a2", "a", 3)]);
    expect(chains.map((c) => c.map((d) => d.id))).toEqual([["a", "a2"], ["b"]]);
  });

  it("treats a design with a missing parent as a new chain", () => {
    expect(buildVersionChains([node("x", "deleted", 1)]).map((c) => c[0].id)).toEqual(["x"]);
  });

  it("follows the newest branch and keeps the older one as its own chain", () => {
    const chains = buildVersionChains([node("a", null, 1), node("b", "a", 2), node("c", "a", 3)]);
    expect(chains.map((c) => c.map((d) => d.id))).toEqual([["a", "c"], ["b"]]);
  });
});

describe("chainGrowth", () => {
  it("measures first to latest scored version", () => {
    expect(chainGrowth([node("a", null, 1, 60), node("b", "a", 2), node("c", "b", 3, 78)])).toBe(18);
  });

  it("is null with fewer than two scores", () => {
    expect(chainGrowth([node("a", null, 1, 60), node("b", "a", 2)])).toBeNull();
  });
});
