import { buildAccessContext, type AccessContext } from "./capabilities.ts";
import { isExperienceRole, permissionsForRole } from "./catalog.ts";
import type { SessionPayload } from "./session-cookie.ts";

export type CanonicalActorAssignment = {
  roleId: string;
  roleKey: string;
  scopeType: string;
  scopeId: string;
  permissionKeys: string[];
  assignmentStatus?: string;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type CanonicalActorSnapshot = {
  authUserId: string;
  userId: string;
  email: string;
  displayName: string;
  userStatus: string;
  assignments: CanonicalActorAssignment[];
  existingVenueIds: Set<string>;
};

const rolePriority = [
  "super_admin",
  "platform_admin",
  "venue_director",
  "tournament_director",
  "venue_tech_manager",
  "venue_staff",
];

function primaryRole(keys: string[]): string {
  return rolePriority.find((key) => keys.includes(key)) ?? keys[0] ?? "";
}

// Pure, fail-closed conversion used by both the Supabase adapter and tests.
// Live role_permissions must contain at least one capability; the application
// catalog then supplies the app-only aliases used by the existing guard layer.
export function actorFromHostedSnapshot(snapshot: CanonicalActorSnapshot): AccessContext | null {
  const now = Date.now();
  const activeAssignments = snapshot.assignments.filter((assignment) => {
    const starts = !assignment.startsAt || new Date(assignment.startsAt).getTime() <= now;
    const ends = !assignment.endsAt || new Date(assignment.endsAt).getTime() > now;
    return (assignment.assignmentStatus ?? "approved") === "approved" && starts && ends;
  });
  if (snapshot.userStatus !== "active" || activeAssignments.length === 0) return null;

  for (const assignment of activeAssignments) {
    if (!isExperienceRole(assignment.roleKey) || assignment.permissionKeys.length === 0) return null;
    if (assignment.scopeType === "venue" && !snapshot.existingVenueIds.has(assignment.scopeId)) return null;
    if (!assignment.scopeId) return null;
  }

  const roleKey = primaryRole(activeAssignments.map((assignment) => assignment.roleKey));
  const primaryAssignments = activeAssignments.filter((assignment) => assignment.roleKey === roleKey);
  const primary = primaryAssignments[0];
  if (!primary) return null;

  const permissions = new Set<string>();
  for (const assignment of primaryAssignments) {
    for (const permission of assignment.permissionKeys) permissions.add(permission);
  }
  // Platform-only guard aliases are intentionally application capabilities and
  // have no dedicated database rows. Preserve them only for the two platform
  // roles; venue roles receive exactly their live role_permissions mapping.
  if (roleKey === "platform_admin" || roleKey === "super_admin") {
    for (const permission of permissionsForRole(roleKey)) permissions.add(permission);
  }
  if (permissions.size === 0) return null;

  const authorizedVenueIds = primaryAssignments
    .filter((assignment) => assignment.scopeType === "venue")
    .map((assignment) => assignment.scopeId);

  return buildAccessContext({
    userId: snapshot.userId,
    authUserId: snapshot.authUserId,
    email: snapshot.email,
    displayName: snapshot.displayName,
    roleKey,
    scopeType: primary.scopeType,
    scopeId: primary.scopeId,
    venueId: primary.scopeType === "venue" ? primary.scopeId : null,
    authorizedVenueIds,
    permissions,
    isActive: true,
  });
}

export function actorFromDevSession(payload: SessionPayload): AccessContext | null {
  if (!isExperienceRole(payload.roleKey) || !payload.scopeId) return null;
  if (["venue_director", "venue_staff", "venue_tech_manager"].includes(payload.roleKey)) {
    if (payload.scopeType !== "venue" || !payload.venueId) return null;
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
    authorizedVenueIds: payload.venueId ? [payload.venueId] : [],
    permissions: permissionsForRole(payload.roleKey),
    isActive: true,
  });
}
