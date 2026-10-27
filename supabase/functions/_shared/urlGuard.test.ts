import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, isPrivateAddress } from "./urlGuard";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks %s", (addr) => expect(isPrivateAddress(addr)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "151.101.1.69", "2606:4700::1111"])("allows %s", (addr) =>
    expect(isPrivateAddress(addr)).toBe(false)
  );
});

describe("isAllowedImageUrl", () => {
  it("allows public image links", () => {
    expect(isAllowedImageUrl("https://mir-s3-cdn-cf.behance.net/project/design.png")).toBe(true);
  });

  it.each([
    "http://localhost:54321/storage",
    "http://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://internal-service/",
    "http://db.internal/",
    "file:///etc/passwd",
    "ftp://example.com/a.png",
    "https://user:pass@example.com/a.png",
    "not a url",
  ])("blocks %s", (url) => expect(isAllowedImageUrl(url)).toBe(false));
});
