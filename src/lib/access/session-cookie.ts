// Edge-safe session cookie encode/decode shared by middleware and server code.
// The dev-login session is stored as a URL-encoded JSON payload (no Node-only
// APIs) so it can be read in both the edge middleware and Node server runtime.

export const sessionCookieName = "gameday_session";
export const impersonatorCookieName = "gameday_impersonator";

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

export function encodeSession(payload: SessionPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeSession(value: string | undefined | null): SessionPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SessionPayload>;
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
  } catch {
    return null;
  }
}
