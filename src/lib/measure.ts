/*
 * Measured (not AI-judged) checks. The model only says *where* text is; the
 * colours and contrast ratios below come from the screenshot's pixels.
 */

export type RGB = [number, number, number];

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContrastResult {
  foreground: RGB;
  background: RGB;
  ratio: number;
  /** WCAG 2.x AA: 4.5:1 for normal text, 3:1 for large text. */
  level: "pass" | "large-only" | "fail";
}

/** Share of the region a colour must cover to count as text rather than anti-aliasing noise. */
const MIN_FOREGROUND_SHARE = 0.03;

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ([r, g, b]: RGB) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (a: RGB, b: RGB) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export const contrastLevel = (ratio: number): ContrastResult["level"] =>
  ratio >= 4.5 ? "pass" : ratio >= 3 ? "large-only" : "fail";

export const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Groups a region's pixels into coarse colour buckets (16 levels per channel)
 * and returns each bucket's average colour and share of the region, largest first.
 */
export function dominantColors(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  region: Region
): { color: RGB; share: number }[] {
  const x0 = Math.max(0, Math.floor(region.x * imageWidth));
  const y0 = Math.max(0, Math.floor(region.y * imageHeight));
  const x1 = Math.min(imageWidth, Math.ceil((region.x + region.width) * imageWidth));
  const y1 = Math.min(imageHeight, Math.ceil((region.y + region.height) * imageHeight));

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * imageWidth + x) * 4;
      if (data[i + 3] < 128) continue; // ignore transparent pixels
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      bucket.n++;
      buckets.set(key, bucket);
      total++;
    }
  }
  if (total === 0) return [];

  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((b) => ({ color: [b.r / b.n, b.g / b.n, b.b / b.n] as RGB, share: b.n / total }));
}

/**
 * Measures text contrast inside a box around a single run of text: the most
 * common colour is the background, and the text is the sizeable colour that
 * contrasts with it most. Returns null when no second colour stands out.
 */
export function measureTextContrast(
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  region: Region
): ContrastResult | null {
  const colors = dominantColors(data, imageWidth, imageHeight, region);
  if (colors.length < 2) return null;

  const background = colors[0].color;
  let foreground: RGB | null = null;
  let best = 1;
  for (const { color, share } of colors.slice(1)) {
    if (share < MIN_FOREGROUND_SHARE) break;
    const ratio = contrastRatio(color, background);
    if (ratio > best) {
      best = ratio;
      foreground = color;
    }
  }
  if (!foreground) return null;

  const ratio = Math.round(best * 100) / 100;
  return { foreground, background, ratio, level: contrastLevel(ratio) };
}

export interface TextElement {
  label: string;
  screen: number;
  region: Region;
}

export interface MeasuredText extends TextElement {
  result: ContrastResult | null;
}

/** Decodes an image in the browser so its pixels can be measured. */
export async function loadImageData(src: string): Promise<ImageData> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();

  // Measuring a downscaled copy keeps big screenshots fast; boxes are fractional so they still line up.
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function measureTextElements(
  screenUrls: string[],
  elements: TextElement[]
): Promise<MeasuredText[]> {
  const cache = new Map<number, Promise<ImageData>>();
  return Promise.all(
    elements.map(async (el) => {
      const url = screenUrls[el.screen];
      if (!url) return { ...el, result: null };
      if (!cache.has(el.screen)) cache.set(el.screen, loadImageData(url));
      try {
        const img = await cache.get(el.screen)!;
        return { ...el, result: measureTextContrast(img.data, img.width, img.height, el.region) };
      } catch {
        return { ...el, result: null };
      }
    })
  );
}
