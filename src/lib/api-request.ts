export class ApiRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function parseJsonObject<T extends object>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const declaredBytes = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) throw new ApiRequestError(413, "Request payload is too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new ApiRequestError(413, "Request payload is too large.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new ApiRequestError(400, "Request body must be valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiRequestError(400, "Request body must be a JSON object.");
  return value as T;
}

export function readBoundedString(value: unknown, maxLength = 256) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new ApiRequestError(400, `Text values cannot exceed ${maxLength} characters.`);
  return normalized;
}

export function readEmail(value: unknown) {
  const email = readBoundedString(value, 320);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiRequestError(400, "Enter a valid email address.");
  return email;
}

export function readHttpUrl(value: unknown) {
  const raw = readBoundedString(value, 2048);
  if (!raw) return "";
  let url: URL;
  try { url = new URL(raw); } catch { throw new ApiRequestError(400, "Enter a valid resource URL."); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new ApiRequestError(400, "Resource URL must use HTTP or HTTPS.");
  return url.toString();
}
