// Edge-safe SIGNED session cookie encode/decode shared by middleware and server
// code. Payloads are HMAC-SHA256 signed with SESSION_COOKIE_SECRET so a cookie
// cannot be forged without the server secret — an unsigned JSON cookie was
// trivially forgeable into a super_admin session whenever dev-login was enabled.
// Uses Web Crypto (crypto.subtle), available in both the edge (middleware) and
// Node server runtimes, so encode/decode are async.

export const sessionCookieName = "gameday_session";
export const impersonatorCookieName = "gameday_impersonator";
// Synthetic venue+role preview selected by a super_admin. This never carries a
// real user identity or capabilities — session resolution derives capabilities
// from the selected role alone, and only when the REAL base user can impersonate.
export const impersonationCookieName = "gameday_impersonation";

export type SessionPayload = {
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  scopeType: string;
  scopeId: string;
  venueId: string | null;
  venueName: string | null;
};

// The impersonation cookie holds ONLY the preview selection plus the real admin
// who started it (for audit + so exit can be authorized). No capabilities and no
// fake user identity are stored here.
export type ImpersonationPayload = {
  venueId: string | null;
  // Set when previewing an organization-scoped role (e.g. an org president) — the
  // preview is scoped to this org, not a venue.
  organizationId: string | null;
  roleKey: string;
  startedByUserId: string;
  startedAt: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Local-dev convenience secret. NEVER used when NODE_ENV=production — every
// deployed environment (including staging) must set SESSION_COOKIE_SECRET, or
// signed cookies fail closed (decode returns null, so no dev-login session
// validates and encode throws rather than mint a guessable cookie).
const DEV_FALLBACK_SECRET = "gameday-dev-insecure-cookie-secret-do-not-use-in-prod";

function resolveSecret(): string | null {
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }
  return null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  // Back the view with a concrete ArrayBuffer so it satisfies BufferSource.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await importKey(secret, "sign");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return bytesToBase64Url(new Uint8Array(signature));
}

// crypto.subtle.verify is constant-time internally, so no manual timing-safe
// compare is needed here.
async function verifyPayload(payloadB64: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await importKey(secret, "verify");
    return await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(payloadB64));
  } catch {
    return false;
  }
}

// `<base64url(json)>.<base64url(hmac)>`
async function encodeSigned(value: unknown): Promise<string> {
  const secret = resolveSecret();
  if (!secret) {
    throw new Error("SESSION_COOKIE_SECRET is not set; refusing to mint an unsigned session cookie.");
  }
  const payloadB64 = bytesToBase64Url(encoder.encode(JSON.stringify(value)));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

async function decodeSigned(cookie: string | undefined | null): Promise<unknown | null> {
  if (!cookie) {
    return null;
  }
  const secret = resolveSecret();
  if (!secret) {
    // Fail closed: with no secret we cannot trust any cookie.
    return null;
  }
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payloadB64 = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  if (!(await verifyPayload(payloadB64, signature, secret))) {
    return null;
  }
  try {
    return JSON.parse(decoder.decode(base64UrlToBytes(payloadB64)));
  } catch {
    return null;
  }
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  return encodeSigned(payload);
}

export async function decodeSession(value: string | undefined | null): Promise<SessionPayload | null> {
  const parsed = (await decodeSigned(value)) as Partial<SessionPayload> | null;
  if (!parsed || typeof parsed.userId !== "string" || typeof parsed.roleKey !== "string") {
    return null;
  }

  return {
    userId: parsed.userId,
    email: parsed.email ?? "",
    displayName: parsed.displayName ?? "",
    roleKey: parsed.roleKey,
    scopeType: parsed.scopeType ?? "platform",
    scopeId: parsed.scopeId ?? "platform",
    venueId: parsed.venueId ?? null,
    venueName: parsed.venueName ?? null,
  };
}

export async function encodeImpersonation(payload: ImpersonationPayload): Promise<string> {
  return encodeSigned(payload);
}

export async function decodeImpersonation(value: string | undefined | null): Promise<ImpersonationPayload | null> {
  const parsed = (await decodeSigned(value)) as Partial<ImpersonationPayload> | null;
  if (!parsed || typeof parsed.roleKey !== "string" || parsed.roleKey.length === 0) {
    return null;
  }

  return {
    venueId: typeof parsed.venueId === "string" && parsed.venueId.length > 0 ? parsed.venueId : null,
    organizationId: typeof parsed.organizationId === "string" && parsed.organizationId.length > 0 ? parsed.organizationId : null,
    roleKey: parsed.roleKey,
    startedByUserId: typeof parsed.startedByUserId === "string" ? parsed.startedByUserId : "",
    startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : "",
  };
}
