import type { IdentityPlatformRoleType } from "@/lib/types";

export type PermissionArea =
  | "Venue Command Center"
  | "Game Day Center"
  | "Status Board"
  | "Sessions"
  | "Fields"
  | "Scoreboards"
  | "Sponsors"
  | "Resources"
  | "Team"
  | "Family"
  | "Identity"
  | "Settings";

export type PermissionLevel = "manage" | "operate" | "assigned" | "view" | "none";

export type PermissionMatrixRow = {
  role: IdentityPlatformRoleType;
  label: string;
  summary: string;
  access: Record<PermissionArea, PermissionLevel>;
};

export const permissionAreas: PermissionArea[] = [
  "Venue Command Center",
  "Game Day Center",
  "Status Board",
  "Sessions",
  "Fields",
  "Scoreboards",
  "Sponsors",
  "Resources",
  "Team",
  "Family",
  "Identity",
  "Settings",
];

export const identityRoleLabels: Record<IdentityPlatformRoleType, string> = {
  coach: "Coach",
  league_director: "League Director",
  organization_admin: "Organization Admin",
  parent: "Parent",
  player: "Player",
  read_only: "Read Only",
  scorekeeper: "Scorekeeper",
  stream_operator: "Stream Operator",
  super_admin: "Super Admin",
  tournament_director: "Tournament Director",
  venue_director: "Venue Director",
  venue_staff: "Venue Staff",
};

function access(overrides: Partial<Record<PermissionArea, PermissionLevel>>): Record<PermissionArea, PermissionLevel> {
  return {
    Family: "none",
    Fields: "none",
    "Game Day Center": "none",
    Identity: "none",
    Resources: "none",
    Scoreboards: "none",
    Sessions: "none",
    Settings: "none",
    Sponsors: "none",
    "Status Board": "none",
    Team: "none",
    "Venue Command Center": "none",
    ...overrides,
  };
}

export const permissionsMatrix: PermissionMatrixRow[] = [
  {
    access: access({
      Family: "manage",
      Fields: "manage",
      "Game Day Center": "manage",
      Identity: "manage",
      Resources: "manage",
      Scoreboards: "manage",
      Sessions: "manage",
      Settings: "manage",
      Sponsors: "manage",
      "Status Board": "manage",
      Team: "manage",
      "Venue Command Center": "manage",
    }),
    label: "Super Admin",
    role: "super_admin",
    summary: "Platform operator with cross-organization support access.",
  },
  {
    access: access({
      Family: "view",
      Fields: "operate",
      "Game Day Center": "operate",
      Identity: "manage",
      Resources: "operate",
      Scoreboards: "operate",
      Sessions: "operate",
      Settings: "manage",
      Sponsors: "operate",
      "Status Board": "operate",
      Team: "operate",
      "Venue Command Center": "operate",
    }),
    label: "Organization Admin",
    role: "organization_admin",
    summary: "Manages an organization and its owned venues, teams, tournaments, and staff.",
  },
  {
    access: access({
      Fields: "manage",
      "Game Day Center": "operate",
      Resources: "manage",
      Scoreboards: "manage",
      Sessions: "operate",
      Sponsors: "view",
      "Status Board": "operate",
      "Venue Command Center": "manage",
    }),
    label: "Venue Director",
    role: "venue_director",
    summary: "Owns venue operations, infrastructure, public communications, and emergency controls.",
  },
  {
    access: access({
      Fields: "operate",
      "Game Day Center": "operate",
      Resources: "operate",
      Scoreboards: "operate",
      Sessions: "operate",
      "Status Board": "operate",
      "Venue Command Center": "operate",
    }),
    label: "Venue Staff",
    role: "venue_staff",
    summary: "Supports venue operations, field status, alerts, resources, and game-day tasks.",
  },
  {
    access: access({
      Fields: "view",
      "Game Day Center": "view",
      Sessions: "manage",
      Sponsors: "view",
      "Status Board": "view",
      Team: "view",
      "Venue Command Center": "view",
    }),
    label: "Tournament Director",
    role: "tournament_director",
    summary: "Controls tournament schedule, brackets, assignments, and game operations without owning venue infrastructure.",
  },
  {
    access: access({
      Sessions: "operate",
      Team: "manage",
    }),
    label: "League Director",
    role: "league_director",
    summary: "Manages league teams and schedules.",
  },
  {
    access: access({
      Family: "view",
      Sessions: "assigned",
      Team: "manage",
    }),
    label: "Coach",
    role: "coach",
    summary: "Manages assigned team context and game-level controls when assigned.",
  },
  {
    access: access({
      Family: "manage",
      Team: "view",
    }),
    label: "Parent",
    role: "parent",
    summary: "Views family/team info and manages child/family access where approved.",
  },
  {
    access: access({
      Family: "view",
      Team: "view",
    }),
    label: "Player",
    role: "player",
    summary: "Views own player/team context.",
  },
  {
    access: access({
      Sessions: "assigned",
      Scoreboards: "assigned",
    }),
    label: "Scorekeeper",
    role: "scorekeeper",
    summary: "Updates score/status for an assigned game only.",
  },
  {
    access: access({
      Sessions: "assigned",
    }),
    label: "Stream Operator",
    role: "stream_operator",
    summary: "Controls livestream for an assigned game only.",
  },
  {
    access: access({
      Fields: "view",
      "Game Day Center": "view",
      Sessions: "view",
      "Status Board": "view",
      "Venue Command Center": "view",
    }),
    label: "Read Only",
    role: "read_only",
    summary: "Can view approved admin context without making changes.",
  },
];
