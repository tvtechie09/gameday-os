// Centralized capability helpers. Every role/permission decision in the app
// goes through these functions rather than scattering role-string checks across
// components. Helpers are pure and edge-safe so middleware and server components
// share identical logic.

import { permissionsForRole, roleLabels, type ExperienceRoleKey } from "./catalog";

export type AccessContext = {
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleLabel: string;
  scopeType: string;
  scopeId: string;
  venueId: string | null;
  venueName: string | null;
  permissions: Set<string>;
  isImpersonating: boolean;
};

export function buildAccessContext(input: {
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  scopeType: string;
  scopeId: string;
  venueId?: string | null;
  venueName?: string | null;
  permissions?: Iterable<string>;
  isImpersonating?: boolean;
}): AccessContext {
  const permissions = input.permissions ? new Set(input.permissions) : permissionsForRole(input.roleKey);
  return {
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
    roleKey: input.roleKey,
    roleLabel: roleLabels[input.roleKey as ExperienceRoleKey] ?? input.roleKey,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    venueId: input.venueId ?? null,
    venueName: input.venueName ?? null,
    permissions,
    isImpersonating: input.isImpersonating ?? false,
  };
}

// super_admin is the highest authorization tier: a strict superset of
// platform_admin. Every capability check short-circuits to true for it, so all
// canX helpers (and hasPermission) grant access regardless of the underlying
// permission set. This is additive — no other role is affected.
export function isSuperAdmin(ctx: AccessContext | null): boolean {
  return ctx?.roleKey === "super_admin";
}

export function hasPermission(ctx: AccessContext | null, key: string): boolean {
  return isSuperAdmin(ctx) || Boolean(ctx?.permissions.has(key));
}

function hasAny(ctx: AccessContext | null, keys: string[]): boolean {
  return keys.some((key) => hasPermission(ctx, key));
}

// platform_admin (unchanged) and super_admin (superset) both satisfy the
// platform-admin role gate used for platform-only navigation and route guards.
export function isPlatformAdmin(ctx: AccessContext | null): boolean {
  return ctx?.roleKey === "platform_admin" || isSuperAdmin(ctx);
}

// --- Admin workspace umbrella ------------------------------------------------
// Venue Staff and Tournament Director intentionally do NOT get the Admin
// workspace umbrella; their operational screens are reached through their own
// per-route capabilities instead.
export function canAccessAdminWorkspace(ctx: AccessContext | null): boolean {
  return isPlatformAdmin(ctx) || hasAny(ctx, ["venue.manage", "device.manage", "venue.device.control", "sponsor.manage", "integration.webhook.manage"]);
}

// --- Platform-only capabilities ---------------------------------------------
export function canManageBilling(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.billing.manage");
}

export function canManageUsers(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.users.manage");
}

export function canManagePermissions(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.permissions.manage");
}

export function canImpersonate(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.impersonate");
}

export function canViewDevTools(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.devtools");
}

export function canManagePlatform(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "platform.manage");
}

// --- Venue / device / integration capabilities ------------------------------
export function canManageVenueSettings(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "venue.manage");
}

export function canManageDevices(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["device.manage", "venue.device.control"]);
}

export function canManageIntegrations(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "integration.webhook.manage");
}

// Field administration page (create/configure fields) vs. the Today ops action.
export function canManageFields(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["venue.manage", "device.manage"]);
}

// --- Schedule / tournament capabilities -------------------------------------
export function canManageSchedule(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["tournament.manage", "tournament.schedule.manage", "venue.manage"]);
}

export function canManageTournaments(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["tournament.manage", "tournament.bracket.manage"]);
}

// --- Today's Operations quick actions ---------------------------------------
export function canStartGame(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "game.status.update");
}

export function canDelayGame(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["game.status.update", "tournament.game.delay"]);
}

export function canSendAnnouncement(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["venue.alert.send", "tournament.manage"]);
}

export function canOpenCloseField(ctx: AccessContext | null): boolean {
  return hasPermission(ctx, "venue.field.manage");
}

export function canViewOpsTasks(ctx: AccessContext | null): boolean {
  return hasAny(ctx, ["venue.field.manage", "venue.alert.send", "game.status.update", "tournament.manage", "device.manage"]);
}
