import { cookies } from "next/headers";
import { buildAccessContext, canImpersonate, type AccessContext } from "./capabilities";
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

// Highest-authorization-first ordering used to pick a user's primary role when
// they hold multiple active assignments.
const rolePriority = [
  "super_admin",
  "platform_admin",
  "venue_director",
  "tournament_director",
  "venue_tech_manager",
  "venue_staff",
];

function pickPrimaryRoleKey(roleKeys: string[]): string {
  for (const key of rolePriority) {
    if (roleKeys.includes(key)) {
      return key;
    }
  }
  return roleKeys[0] ?? "";
}

async function readCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}

// Attempt to enrich the role-derived permission set with the user's live
// user_role_assignments -> role_permissions rows. This makes permission checks
// genuine when Supabase is configured; it falls back to the seeded role catalog
// (which mirrors the live role_permissions) when the DB is unavailable, so the
// app still builds and runs without credentials.
async function livePermissionsForUser(userId: string): Promise<Set<string> | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();

    const { data: assignments, error: assignmentError } = await supabase
      .from("user_role_assignments")
      .select("role_id,assignment_status,starts_at,ends_at")
      .eq("user_id", userId);

    if (assignmentError || !assignments || assignments.length === 0) {
      return null;
    }

    const now = Date.now();
    const activeRoleIds = [
      ...new Set(
        assignments
          .filter((row) => {
            const startsOk = !row.starts_at || new Date(row.starts_at).getTime() <= now;
            const endsOk = !row.ends_at || new Date(row.ends_at).getTime() > now;
            return row.assignment_status === "approved" && startsOk && endsOk;
          })
          .map((row) => row.role_id),
      ),
    ];

    if (activeRoleIds.length === 0) {
      return null;
    }

    const { data: rolePermissions, error: rolePermissionError } = await supabase
      .from("role_permissions")
      .select("permission_id, permissions:permission_id(key)")
      .in("role_id", activeRoleIds);

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
    return keys.size > 0 ? keys : null;
  } catch {
    return null;
  }
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

async function contextFromPayload(payload: SessionPayload, isImpersonating: boolean): Promise<AccessContext> {
  // Start from the seeded role catalog (single source of truth) and merge any
  // live assignment-derived permissions on top when the DB is reachable.
  const permissions = permissionsForRole(payload.roleKey);
  const live = await livePermissionsForUser(payload.userId);
  if (live) {
    for (const key of live) {
      permissions.add(key);
    }
  }

  return buildAccessContext({
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    roleKey: payload.roleKey,
    scopeType: payload.scopeType,
    scopeId: payload.scopeId,
    venueId: payload.venueId,
    venueName: payload.venueName,
    permissions,
    isImpersonating,
  });
}

// Bridge a verified Supabase auth user into the existing identity tables and
// build a capability context. Never auto-creates users and never maps unknown
// emails to a default role.
async function resolveIdentityForAuthUser(authUser: {
  id: string;
  email: string;
}): Promise<ResolvedSession> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseAdminClient();

    // 1) Find public.users by auth_user_id, then fall back to email (link on
    //    first login so subsequent lookups hit the fast path).
    let userRow:
      | { id: string; email: string | null; display_name: string | null; auth_user_id: string | null }
      | null = null;

    const byAuthId = await supabase
      .from("users")
      .select("id,email,display_name,auth_user_id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (byAuthId.data) {
      userRow = byAuthId.data;
    } else if (authUser.email) {
      const byEmail = await supabase
        .from("users")
        .select("id,email,display_name,auth_user_id")
        .ilike("email", authUser.email)
        .maybeSingle();
      if (byEmail.data) {
        userRow = byEmail.data;
        if (!userRow.auth_user_id) {
          await supabase.from("users").update({ auth_user_id: authUser.id }).eq("id", userRow.id);
        }
      }
    }

    // No public.users row at all -> no access (do NOT auto-create).
    if (!userRow) {
      return { kind: "no-access", email: authUser.email };
    }

    // 2) Load active, approved role assignments (+ role key + scope).
    const { data: assignments } = await supabase
      .from("user_role_assignments")
      .select("role_id,scope_type,scope_id,assignment_status,starts_at,ends_at,roles:role_id(key)")
      .eq("user_id", userRow.id);

    const now = Date.now();
    const active = (assignments ?? []).filter((row) => {
      const startsOk = !row.starts_at || new Date(row.starts_at).getTime() <= now;
      const endsOk = !row.ends_at || new Date(row.ends_at).getTime() > now;
      return row.assignment_status === "approved" && startsOk && endsOk;
    });

    const roleKeyFor = (row: (typeof active)[number]): string | null => {
      const roleRel = row.roles as { key?: string } | { key?: string }[] | null | undefined;
      const rel = Array.isArray(roleRel) ? roleRel[0] : roleRel;
      return rel?.key ?? null;
    };

    const activeRoleKeys = active.map(roleKeyFor).filter((k): k is string => Boolean(k));

    // Authenticated but no roles assigned -> clean no-access screen.
    if (activeRoleKeys.length === 0) {
      return { kind: "no-access", email: authUser.email };
    }

    const primaryRoleKey = pickPrimaryRoleKey(activeRoleKeys);
    const primaryAssignment = active.find((row) => roleKeyFor(row) === primaryRoleKey) ?? active[0];

    // 3) Resolve capabilities: catalog permissions for every active role, plus
    //    any live role_permissions rows, merged into a single set.
    const permissions = new Set<string>();
    for (const key of activeRoleKeys) {
      for (const perm of permissionsForRole(key)) {
        permissions.add(perm);
      }
    }
    const live = await livePermissionsForUser(userRow.id);
    if (live) {
      for (const key of live) {
        permissions.add(key);
      }
    }

    const context = buildAccessContext({
      userId: userRow.id,
      email: userRow.email ?? authUser.email,
      displayName: userRow.display_name ?? userRow.email ?? authUser.email,
      roleKey: primaryRoleKey,
      scopeType: primaryAssignment.scope_type,
      scopeId: primaryAssignment.scope_id,
      permissions,
      isImpersonating: false,
    });

    return { kind: "active", context };
  } catch {
    // DB unreachable / misconfigured: treat as no-access rather than granting
    // anything. (The dev-login path is resolved before this and is unaffected.)
    return { kind: "no-access", email: authUser.email };
  }
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
      return { kind: "active", context: await contextFromPayload(payload, false) };
    }
  }

  const authUser = await getSupabaseAuthUser();
  if (!authUser) {
    return { kind: "guest" };
  }

  return resolveIdentityForAuthUser(authUser);
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
