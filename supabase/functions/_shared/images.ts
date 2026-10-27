import { HttpError } from "./http.ts";
import { admin } from "./supabase.ts";
import { isAllowedImageUrl, isPrivateAddress } from "./urlGuard.ts";

export const MAX_SIZE_MB = 10;
export const MAX_SCREENS = 6;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const MAX_REDIRECTS = 3;

/** An image ready to send to the model, as a data: URL. */
export type ImageContent = { type: "image_url"; image_url: { url: string } };

function toImageContent(mime: string, base64: string): ImageContent {
  return { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function checkSize(byteLength: number) {
  if (byteLength / (1024 * 1024) > MAX_SIZE_MB) {
    throw new HttpError(400, `Image too large. Maximum size is ${MAX_SIZE_MB}MB`);
  }
}

function checkMime(mime: string) {
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new HttpError(400, "Invalid image type. Supported formats: PNG, JPEG, WebP, GIF");
  }
}

/** Validates a base64 upload from the browser. */
export function imageFromBase64(imageBase64: unknown, mimeType: unknown): ImageContent {
  if (typeof imageBase64 !== "string" || !/^[A-Za-z0-9+/=]+$/.test(imageBase64)) {
    throw new HttpError(400, "Invalid image data format");
  }
  checkSize(imageBase64.length * 0.75);
  const mime = (typeof mimeType === "string" ? mimeType : "image/png").toLowerCase();
  checkMime(mime);
  return toImageContent(mime, imageBase64);
}

async function assertPublicHost(hostname: string) {
  // Catches public names that resolve to internal addresses.
  try {
    const records = [
      ...(await Deno.resolveDns(hostname, "A").catch(() => [] as string[])),
      ...(await Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[])),
    ];
    if (records.some(isPrivateAddress)) throw new HttpError(400, "Invalid image URL");
  } catch (error) {
    if (error instanceof HttpError) throw error;
  }
}

/** Downloads a public image URL, re-checking every redirect hop against internal addresses. */
export async function imageFromUrl(imageUrl: unknown): Promise<ImageContent> {
  let url = typeof imageUrl === "string" ? imageUrl : "";
  let res: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedImageUrl(url)) throw new HttpError(400, "Invalid image URL");
    const parsed = new URL(url);
    await assertPublicHost(parsed.hostname);

    // Many image hosts (Behance/Dribbble CDNs) reject unknown user agents with 403.
    res = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${parsed.origin}/`,
      },
    }).catch(() => null);

    if (!res) {
      throw new HttpError(400, "We couldn't open that link. Please check it or upload the image file instead.");
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).toString();
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    throw new HttpError(
      400,
      status === 403 || status === 401
        ? "That site blocked us from downloading the image. Save the design as a PNG or JPG and upload the file instead."
        : status === 404
          ? "That link doesn't exist anymore. Double-check it, or upload the image file instead."
          : "That link couldn't be loaded. Please use a direct image link or upload the file."
    );
  }

  const mime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new HttpError(
      400,
      "That link is a web page, not an image. Open the project, right-click the design image, copy its image address, and paste that — or upload a screenshot instead."
    );
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  checkSize(bytes.byteLength);
  return toImageContent(mime, bytesToBase64(bytes));
}

export interface DesignImageSource {
  designer_id: string;
  image_url: string;
  storage_path: string | null;
  storage_paths: unknown;
  source_url: string | null;
}

export function designStoragePaths(design: DesignImageSource): string[] {
  const list = Array.isArray(design.storage_paths)
    ? design.storage_paths.filter((p): p is string => typeof p === "string")
    : [];
  if (list.length === 0 && design.storage_path) list.push(design.storage_path);
  return list.slice(0, MAX_SCREENS);
}

/**
 * Loads a stored design's screens straight from storage, so the model judges
 * exactly the files that were uploaded rather than whatever a URL serves today.
 */
export async function loadDesignImages(design: DesignImageSource): Promise<ImageContent[]> {
  const paths = designStoragePaths(design);
  if (paths.length === 0) {
    return [await imageFromUrl(design.source_url || design.image_url)];
  }

  return await Promise.all(
    paths.map(async (path) => {
      // Paths come from the designs row, which the designer wrote; only accept files in their own folder.
      if (!path.startsWith(`${design.designer_id}/`)) {
        throw new HttpError(400, "This design references files that don't belong to its owner.");
      }
      const { data, error } = await admin.storage.from("designs").download(path);
      if (error || !data) throw new HttpError(400, "We couldn't load this design's image from storage.");
      const bytes = new Uint8Array(await data.arrayBuffer());
      checkSize(bytes.byteLength);
      const ext = path.split(".").pop()?.toLowerCase();
      const mime = (data.type || `image/${ext === "jpg" ? "jpeg" : ext}`).toLowerCase();
      checkMime(mime);
      return toImageContent(mime, bytesToBase64(bytes));
    })
  );
}
