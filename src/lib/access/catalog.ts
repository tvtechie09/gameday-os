// Single source of truth for the role -> permission catalog used by the
// role-based experience redesign. These keys mirror the seeded identity
// catalog in supabase/migrations/202606230001_gameday_identity_v1.sql
// (23 roles / 38 permissions). This module is edge-safe: no server or
// Supabase imports, so it can be shared by middleware and server code.

export const roleKeys = [
  "platform_admin",
  "venue_director",
  "venue_staff",
  "venue_tech_manager",
  "tournament_director",
] as const;

export type ExperienceRoleKey = (typeof roleKeys)[number];

export const roleLabels: Record<ExperienceRoleKey, string> = {
  platform_admin: "Platform Admin",
  venue_director: "Venue GM",
  venue_staff: "Venue Staff",
  venue_tech_manager: "Venue Tech Manager",
  tournament_director: "Tournament Director",
};

// Permission keys granted per role. For the seeded roles these mirror the live
// role_permissions rows; venue_director gains game.status.update and
// tournament.game.delay so a Venue GM can run the Today's Operations quick
// actions, and venue_tech_manager is an additive device/field operations role
// (see supabase/role-based-experiences-seed.sql).
export const rolePermissionCatalog: Record<ExperienceRoleKey, string[]> = {
  platform_admin: [
    "venue.manage",
    "venue.staff.manage",
    "venue.field.manage",
    "venue.device.control",
    "venue.alert.send",
    "venue.emergency.override",
    "device.manage",
    "device.control",
    "tournament.manage",
    "tournament.schedule.manage",
    "tournament.bracket.manage",
    "tournament.game.delay",
    "tournament.score.approve",
    "league.manage",
    "league.schedule.manage",
    "league.team.manage",
    "game.score.update",
    "game.status.update",
    "game.stream.control",
    "game.music.control",
    "sponsor.manage",
    "media.manage",
    "media.publish",
    "identity.role.manage",
    "integration.api.read",
    "integration.api.write",
    "integration.webhook.manage",
    "audit.review",
    // Platform-only capabilities that have no dedicated seeded permission key.
    "platform.manage",
    "platform.billing.manage",
    "platform.users.manage",
    "platform.permissions.manage",
    "platform.impersonate",
    "platform.devtools",
  ],
  venue_director: [
    "venue.manage",
    "venue.staff.manage",
    "venue.field.manage",
    "venue.device.control",
    "venue.alert.send",
    "venue.emergency.override",
    "device.manage",
    "device.control",
    "sponsor.manage",
    "media.manage",
    "audit.review",
    "identity.role.manage",
    // Added so the Venue GM can start/delay games from Today's Operations.
    "game.status.update",
    "tournament.game.delay",
  ],
  venue_staff: [
    "venue.field.manage",
    "venue.alert.send",
    "device.control",
    "game.status.update",
  ],
  venue_tech_manager: [
    "venue.device.control",
    "device.manage",
    "device.control",
    "venue.field.manage",
    "game.status.update",
  ],
  tournament_director: [
    "tournament.manage",
    "tournament.schedule.manage",
    "tournament.bracket.manage",
    "tournament.game.delay",
    "tournament.score.approve",
    "identity.role.manage",
    "venue.alert.send",
  ],
};

export function permissionsForRole(roleKey: string): Set<string> {
  const known = rolePermissionCatalog[roleKey as ExperienceRoleKey];
  return new Set(known ?? []);
}

export function isExperienceRole(roleKey: string): roleKey is ExperienceRoleKey {
  return roleKey in rolePermissionCatalog;
}
