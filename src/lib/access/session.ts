import { cookies } from "next/headers";
import { buildAccessContext, canImpersonate, type AccessContext } from "./capabilities";
import { permissionsForRole } from "./catalog";
import { isDevLoginEnabled } from "./env";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";
import {
  decodeSession,
  impersonatorCookieName,
  sessionCookieName,
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

// Full session resolution in priority order:
//   1) dev-login cookie (only when dev-login is enabled)
//   2) impersonation by a real canImpersonate user
//   3) the real Supabase auth user -> identity tables
export async function resolveSession(): Promise<ResolvedSession> {
  const devLogin = isDevLoginEnabled();
  const sessionRaw = await readCookie(sessionCookieName);
  const impersonatorRaw = await readCookie(impersonatorCookieName);

  // 1) Dev-login break-glass. A valid gameday_session cookie is the auth path in
  //    dev/staging. Impersonation-by-dev-login is signalled by the impersonator
  //    cookie being present alongside it.
  if (devLogin) {
    const payload = decodeSession(sessionRaw);
    if (payload) {
      const isImpersonating = Boolean(decodeSession(impersonatorRaw));
      return { kind: "active", context: await contextFromPayload(payload, isImpersonating) };
    }
  }

  // Real auth from here on. Always verify server-side via auth.getUser().
  const authUser = await getSupabaseAuthUser();
  if (!authUser) {
    return { kind: "guest" };
  }

  const identity = await resolveIdentityForAuthUser(authUser);

  // 2) Production impersonation: honoured only when the real (underlying) user
  //    resolves to a canImpersonate context. The impersonated target is carried
  //    in gameday_session and the real admin snapshot in the impersonator
  //    cookie (both written by /api/dev-login/impersonate).
  if (identity.kind === "active" && canImpersonate(identity.context)) {
    const impersonatorPayload = decodeSession(impersonatorRaw);
    const targetPayload = decodeSession(sessionRaw);
    if (impersonatorPayload && targetPayload) {
      return { kind: "active", context: await contextFromPayload(targetPayload, true) };
    }
  }

  // 3) The resolved real user (or no-access when they have no role/row).
  return identity;
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
  if (isDevLoginEnabled()) {
    const payload = decodeSession(await readCookie(sessionCookieName));
    if (payload) {
      return contextFromPayload(payload, false);
    }
  }
  const authUser = await getSupabaseAuthUser();
  if (!authUser) {
    return null;
  }
  const identity = await resolveIdentityForAuthUser(authUser);
  return identity.kind === "active" ? identity.context : null;
}

// The real (pre-impersonation) admin session, if impersonation is active. Reads
// the impersonator cookie snapshot written when impersonation began.
export async function getImpersonatorContext(): Promise<AccessContext | null> {
  const payload = decodeSession(await readCookie(impersonatorCookieName));
  if (!payload) {
    return null;
  }
  return contextFromPayload(payload, false);
}
