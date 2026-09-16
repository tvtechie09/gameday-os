import { isIP } from "node:net";

export function validatePublicHttpsUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
    throw new Error("Only credential-free HTTPS calendar URLs are allowed.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")
    || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".home")) {
    throw new Error("Local network calendar URLs are not allowed.");
  }
  if (isIP(hostname) && !isPublicInternetAddress(hostname)) {
    throw new Error("Private or reserved network addresses are not allowed.");
  }
  return url;
}

export function isPublicInternetAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return false;
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("2001:db8:")) return false;
    const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
    return first >= 0x2000 && first <= 0x3fff;
  }
  return false;
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
