import { cookies } from "next/headers";
import { buildAccessContext, type AccessContext } from "./capabilities";
import { permissionsForRole } from "./catalog";
import {
  decodeSession,
  impersonatorCookieName,
  sessionCookieName,
  type SessionPayload,
} from "./session-cookie";

// The app has no real auth yet, so dev-login is the only way in. Default it
// ON (including production) unless explicitly disabled. Set
// NEXT_PUBLIC_ENABLE_DEV_LOGIN=false to lock it down once real auth exists.
export function isDevLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== "false";
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

export async function getSessionContext(): Promise<AccessContext | null> {
  const raw = await readCookie(sessionCookieName);
  const payload = decodeSession(raw);
  if (!payload) {
    return null;
  }
  const impersonator = decodeSession(await readCookie(impersonatorCookieName));
  return contextFromPayload(payload, Boolean(impersonator));
}

// The real (pre-impersonation) admin session, if impersonation is active.
export async function getImpersonatorContext(): Promise<AccessContext | null> {
  const payload = decodeSession(await readCookie(impersonatorCookieName));
  if (!payload) {
    return null;
  }
  return contextFromPayload(payload, false);
}
