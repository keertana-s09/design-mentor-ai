// Blocks server-side fetches of internal addresses (SSRF). Kept free of
// Deno-only APIs so the same checks can be unit tested with vitest.

function parseIPv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

export function isPrivateAddress(address: string): boolean {
  const host = address.replace(/^\[|\]$/g, "").toLowerCase();

  const v4 = parseIPv4(host);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (host.includes(":")) {
    if (host === "::" || host === "::1") return true;
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    // fc00::/7 unique local, fe80::/10 link local, ff00::/8 multicast
    return /^f[cd]/.test(host) || /^fe[89ab]/.test(host) || host.startsWith("ff");
  }

  return false;
}

/** Rejects non-http(s) URLs and hostnames that obviously point inside the network. */
export function isAllowedImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    !host.includes(".")
  ) {
    return false;
  }
  return !isPrivateAddress(host);
}
