import type { IdentityPlatformRoleType } from "@/lib/types";

export type PermissionArea =
  | "Organization"
  | "Venue"
  | "Tournament"
  | "League"
  | "Team"
  | "Family"
  | "Game"
  | "Stream"
  | "Read";

export type PermissionLevel = "manage" | "operate" | "assigned" | "view" | "none";

export type PermissionMatrixRow = {
  role: IdentityPlatformRoleType;
  label: string;
  summary: string;
  access: Record<PermissionArea, PermissionLevel>;
};

export const permissionAreas: PermissionArea[] = ["Organization", "Venue", "Tournament", "League", "Team", "Family", "Game", "Stream", "Read"];

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
    Game: "none",
    League: "none",
    Organization: "none",
    Read: "view",
    Stream: "none",
    Team: "none",
    Tournament: "none",
    Venue: "none",
    ...overrides,
  };
}

export const permissionsMatrix: PermissionMatrixRow[] = [
  {
    access: access({ Family: "manage", Game: "manage", League: "manage", Organization: "manage", Stream: "manage", Team: "manage", Tournament: "manage", Venue: "manage" }),
    label: "Super Admin",
    role: "super_admin",
    summary: "Platform operator with cross-organization support access.",
  },
  {
    access: access({ Family: "view", Game: "operate", League: "operate", Organization: "manage", Stream: "operate", Team: "operate", Tournament: "operate", Venue: "operate" }),
    label: "Organization Admin",
    role: "organization_admin",
    summary: "Manages an organization and its owned venues, teams, tournaments, and staff.",
  },
  {
    access: access({ Game: "operate", Stream: "operate", Tournament: "view", Venue: "manage" }),
    label: "Venue Director",
    role: "venue_director",
    summary: "Owns venue operations, infrastructure, public communications, and emergency controls.",
  },
  {
    access: access({ Game: "operate", Stream: "operate", Venue: "operate" }),
    label: "Venue Staff",
    role: "venue_staff",
    summary: "Supports venue operations, field status, alerts, resources, and game-day tasks.",
  },
  {
    access: access({ Game: "operate", Team: "view", Tournament: "manage", Venue: "view" }),
    label: "Tournament Director",
    role: "tournament_director",
    summary: "Controls tournament schedule, brackets, assignments, and game operations without owning venue infrastructure.",
  },
  {
    access: access({ Game: "operate", League: "manage", Team: "operate", Tournament: "view" }),
    label: "League Director",
    role: "league_director",
    summary: "Manages league teams and schedules.",
  },
  {
    access: access({ Family: "view", Game: "assigned", Team: "manage" }),
    label: "Coach",
    role: "coach",
    summary: "Manages assigned team context and game-level controls when assigned.",
  },
  {
    access: access({ Family: "manage", Team: "view" }),
    label: "Parent",
    role: "parent",
    summary: "Views family/team info and manages child/family access where approved.",
  },
  {
    access: access({ Family: "view", Team: "view" }),
    label: "Player",
    role: "player",
    summary: "Views own player/team context.",
  },
  {
    access: access({ Game: "assigned" }),
    label: "Scorekeeper",
    role: "scorekeeper",
    summary: "Updates score/status for an assigned game only.",
  },
  {
    access: access({ Game: "assigned", Stream: "assigned" }),
    label: "Stream Operator",
    role: "stream_operator",
    summary: "Controls livestream for an assigned game only.",
  },
  {
    access: access({ Read: "view" }),
    label: "Read Only",
    role: "read_only",
    summary: "Can view approved admin context without making changes.",
  },
];
