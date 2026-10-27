import { describe, expect, it } from "vitest";
import { contrastRatio, measureTextContrast, toHex, type RGB } from "./measure";

/** Builds an RGBA buffer: background everywhere, `fg` on the given pixel columns. */
function makeImage(width: number, height: number, bg: RGB, fg: RGB, fgColumns: (x: number) => boolean) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fgColumns(x) ? fg : bg;
      data.set([r, g, b, 255], (y * width + x) * 4);
    }
  }
  return data;
}

const whole = { x: 0, y: 0, width: 1, height: 1 };

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 1);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
    // #767676 on white is the classic "just passes AA" grey.
    expect(contrastRatio([0x76, 0x76, 0x76], [255, 255, 255])).toBeCloseTo(4.54, 1);
  });
});

describe("measureTextContrast", () => {
  it("finds dark text on a light background", () => {
    const data = makeImage(40, 10, [255, 255, 255], [20, 20, 20], (x) => x % 4 === 0);
    const result = measureTextContrast(data, 40, 10, whole);
    expect(result).not.toBeNull();
    expect(toHex(result!.background)).toBe("#ffffff");
    expect(toHex(result!.foreground)).toBe("#141414");
    expect(result!.level).toBe("pass");
  });

  it("flags light grey text that fails AA", () => {
    const data = makeImage(40, 10, [255, 255, 255], [190, 190, 190], (x) => x % 4 === 0);
    const result = measureTextContrast(data, 40, 10, whole);
    expect(result!.ratio).toBeLessThan(3);
    expect(result!.level).toBe("fail");
  });

  it("ignores stray pixels and picks the solid text colour", () => {
    const width = 100;
    const data = makeImage(width, 10, [255, 255, 255], [100, 100, 100], (x) => x % 5 === 0);
    // One column of black specks: 1% of the area, under the noise threshold,
    // even though black would contrast more than the real text colour.
    for (let y = 0; y < 10; y++) data.set([0, 0, 0, 255], (y * width + 1) * 4);
    const result = measureTextContrast(data, width, 10, whole);
    expect(toHex(result!.foreground)).toBe("#646464");
  });

  it("returns null for a flat colour with no text", () => {
    const data = makeImage(10, 10, [30, 60, 90], [30, 60, 90], () => false);
    expect(measureTextContrast(data, 10, 10, whole)).toBeNull();
  });

  it("only reads pixels inside the region", () => {
    // Left half has black text, right half is plain white.
    const data = makeImage(20, 10, [255, 255, 255], [0, 0, 0], (x) => x < 10 && x % 2 === 0);
    expect(measureTextContrast(data, 20, 10, { x: 0.5, y: 0, width: 0.5, height: 1 })).toBeNull();
    expect(measureTextContrast(data, 20, 10, { x: 0, y: 0, width: 0.5, height: 1 })).not.toBeNull();
  });
});
