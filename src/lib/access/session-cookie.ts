// Edge-safe session cookie encode/decode shared by middleware and server code.
// The dev-login session is stored as a URL-encoded JSON payload (no Node-only
// APIs) so it can be read in both the edge middleware and Node server runtime.

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
  roleKey: string;
  startedByUserId: string;
  startedAt: string;
};

export function encodeImpersonation(payload: ImpersonationPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeImpersonation(value: string | undefined | null): ImpersonationPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ImpersonationPayload>;
    if (!parsed || typeof parsed.roleKey !== "string" || parsed.roleKey.length === 0) {
      return null;
    }

    return {
      venueId: typeof parsed.venueId === "string" && parsed.venueId.length > 0 ? parsed.venueId : null,
      roleKey: parsed.roleKey,
      startedByUserId: typeof parsed.startedByUserId === "string" ? parsed.startedByUserId : "",
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : "",
    };
  } catch {
    return null;
  }
}

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
