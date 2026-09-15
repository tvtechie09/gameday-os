import { cookies } from "next/headers";
import { buildAccessContext, canImpersonate, type AccessContext } from "./capabilities";
import { actorFromDevSession } from "./actor";
import { resolveHostedActor } from "./hosted-actor";
import { permissionsForRole } from "./catalog";
import { isDevLoginEnabled } from "./env";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";
import {
  decodeImpersonation,
  decodeSession,
  impersonationCookieName,
  sessionCookieName,
  type ImpersonationPayload,
  type SessionPayload,
} from "./session-cookie";

// Re-exported for back-compat: callers historically import isDevLoginEnabled
// from this module. The implementation lives in the edge-safe env helper so the
// middleware can use it without pulling in server-only imports.
export { isDevLoginEnabled };

// Resolution of a signed-in identity:
//  - guest:     unauthenticated (no dev-login cookie, no Supabase session)
//  - no-access: authenticated via Supabase but no public.users row / no roles
//  - active:    a usable capability context (dev-login, impersonation, or real)
export type ResolvedSession =
  | { kind: "guest" }
  | { kind: "no-access"; email: string }
  | { kind: "active"; context: AccessContext };

async function readCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}

// Derive a role's permission set directly from a role KEY (no user needed).
// This is the capability source for a synthetic impersonation session: the
// selected role's live role_permissions rows, falling back to the seeded catalog
// when the DB is unavailable. Returns null only on error/unknown role so callers
// can fall back to the catalog.
async function livePermissionsForRoleKey(roleKey: string): Promise<Set<string> | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("key", roleKey)
      .maybeSingle();

    if (roleError || !role) {
      return null;
    }

    const { data: rolePermissions, error: rolePermissionError } = await supabase
      .from("role_permissions")
      .select("permission_id, permissions:permission_id(key)")
      .eq("role_id", role.id);

    if (rolePermissionError || !rolePermissions) {
      return null;
    }

    const keys = new Set<string>();
    for (const row of rolePermissions as Array<{ permissions?: { key?: string } | { key?: string }[] | null }>) {
      const permission = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions;
      if (permission?.key) {
        keys.add(permission.key);
      }
    }
    return keys;
  } catch {
    return null;
  }
}

// Look up display metadata for the synthetic session (venue name + role name).
// Best-effort: falls back to null/role key so the banner still renders offline.
async function lookupVenueName(venueId: string): Promise<string | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from("venues").select("name").eq("id", venueId).maybeSingle();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

async function lookupOrganizationName(organizationId: string): Promise<string | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

async function lookupRoleName(roleKey: string): Promise<string | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase.from("roles").select("name").eq("key", roleKey).maybeSingle();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

// Build the EFFECTIVE (impersonated) capability context from the preview
// selection. Capabilities come from the SELECTED role only — never from the real
// admin. The real admin identity is preserved (userId/email) for audit; scope is
// the selected venue (or platform for venue-agnostic roles).
async function contextFromImpersonation(
  base: AccessContext,
  selection: ImpersonationPayload,
): Promise<AccessContext> {
  const permissions = (await livePermissionsForRoleKey(selection.roleKey)) ?? permissionsForRole(selection.roleKey);
  const hasVenue = Boolean(selection.venueId);
  const hasOrg = Boolean(selection.organizationId);
  const [venueName, orgName, roleName] = await Promise.all([
    hasVenue ? lookupVenueName(selection.venueId as string) : Promise.resolve(null),
    hasOrg ? lookupOrganizationName(selection.organizationId as string) : Promise.resolve(null),
    lookupRoleName(selection.roleKey),
  ]);

  // Scope precedence: an org-scoped preview (a president) is neither venue nor
  // platform — it is that specific organization.
  const scopeType = hasOrg ? "organization" : hasVenue ? "venue" : "platform";
  const scopeId = hasOrg ? (selection.organizationId as string) : hasVenue ? (selection.venueId as string) : "platform";

  const context = buildAccessContext({
    userId: base.userId,
    email: base.email,
    displayName: roleName ?? selection.roleKey,
    roleKey: selection.roleKey,
    scopeType,
    scopeId,
    venueId: hasVenue ? selection.venueId : null,
    venueName: hasOrg ? orgName : venueName,
    permissions,
    isImpersonating: true,
  });

  // Prefer the live DB role name for the banner/sidebar label when available.
  if (roleName) {
    context.roleLabel = roleName;
  }
  return context;
}

async function contextFromPayload(payload: SessionPayload, isImpersonating: boolean): Promise<AccessContext | null> {
  const context = actorFromDevSession(payload);
  return context ? { ...context, isImpersonating } : null;
}

// Resolve the REAL underlying identity, IGNORING any impersonation selection.
// This is the base session:
//   - dev/staging: the dev-login gameday_session cookie (break-glass)
//   - production: the verified Supabase auth user -> identity tables
// It is the single authority for whether impersonation is permitted, so the
// impersonated (effective) session can never authorize its own continuation.
export async function resolveBaseSession(): Promise<ResolvedSession> {
  if (isDevLoginEnabled()) {
    const payload = await decodeSession(await readCookie(sessionCookieName));
    if (payload) {
      const context = await contextFromPayload(payload, false);
      return context ? { kind: "active", context } : { kind: "no-access", email: payload.email };
    }
  }

  const authUser = await getSupabaseAuthUser();
  if (!authUser) {
    return { kind: "guest" };
  }

  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const context = await resolveHostedActor(authUser, getSupabaseAdminClient());
    return context ? { kind: "active", context } : { kind: "no-access", email: authUser.email };
  } catch {
    return { kind: "no-access", email: authUser.email };
  }
}

// Full session resolution:
//   1) resolve the REAL base session (ignoring the impersonation cookie)
//   2) if the base user can impersonate AND an impersonation selection exists,
//      return a synthetic venue+role context whose capabilities come from the
//      SELECTED role only.
//   3) otherwise return the base session unchanged.
// The impersonation cookie is trusted ONLY when the real base user is a
// super_admin / canImpersonate — a low-permission preview can never keep itself
// alive or escalate.
export async function resolveSession(): Promise<ResolvedSession> {
  const base = await resolveBaseSession();
  if (base.kind !== "active") {
    return base;
  }

  if (!canImpersonate(base.context)) {
    return base;
  }

  const selection = await decodeImpersonation(await readCookie(impersonationCookieName));
  if (!selection) {
    return base;
  }

  return { kind: "active", context: await contextFromImpersonation(base.context, selection) };
}

// Back-compat accessor used by pages: returns the active capability context or
// null. Callers that need to distinguish "guest" vs "no-access" should use
// resolveSession() directly.
export async function getSessionContext(): Promise<AccessContext | null> {
  const resolved = await resolveSession();
  return resolved.kind === "active" ? resolved.context : null;
}

// The real underlying user's capability context, ignoring any active
// impersonation target. Used to authorize starting/continuing impersonation:
//   - dev/staging: the dev-login gameday_session cookie
//   - production: the verified Supabase auth user -> identity tables
// This is what enforces "impersonation requires a REAL authenticated
// canImpersonate user" in production.
export async function getActingContext(): Promise<AccessContext | null> {
  const base = await resolveBaseSession();
  return base.kind === "active" ? base.context : null;
}

// The real (pre-impersonation) admin session, used by the persistent banner to
// show who is actually signed in. This is just the base session, which by
// construction ignores the impersonation selection.
export async function getImpersonatorContext(): Promise<AccessContext | null> {
  return getActingContext();
}
