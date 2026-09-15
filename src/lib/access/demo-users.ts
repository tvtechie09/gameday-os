// Demo / dev-login fixtures. These map 1:1 to the rows created by
// supabase/role-based-experiences-seed.sql so the dev-login path selects real
// users that also exist in public.users + public.user_role_assignments.
//
// The UUIDs are deterministic and clearly synthetic so the seed can upsert them
// idempotently and the app can resolve the selected user without a round trip.

import type { ExperienceRoleKey } from "./catalog";

// Sidebar/scope label for the demo venue users. Keep this aligned to the
// canonical populated venue; venueInScope accepts the corresponding name slug
// in development while hosted role assignments resolve the venue UUID.
export const flagshipVenueDisplayName = "Wintrust Crossroads Sports Complex";
export const flagshipVenueScopeSlug = "wintrust-crossroads-sports-complex";
export const platformScopeSentinel = "00000000-0000-0000-0000-000000000000";

export type DemoUser = {
  id: string;
  key: string;
  email: string;
  displayName: string;
  roleKey: ExperienceRoleKey;
  scopeType: string;
  // Human-readable scope label used for the session cookie + banner. The seed
  // resolves the real venue UUID by name; capability checks derive from the
  // role catalog, so this label is for display/audit only.
  scopeId: string;
  venueName: string | null;
  blurb: string;
};

export const demoUsers: DemoUser[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    key: "platform.admin",
    email: "platform.admin@gamedayos.test",
    displayName: "Platform Admin",
    roleKey: "platform_admin",
    scopeType: "platform",
    scopeId: platformScopeSentinel,
    venueName: null,
    blurb: "Global platform access: Admin workspace, billing, users, permissions, integrations, and impersonation.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    key: "crossroads.gm",
    email: "crossroads.gm@gamedayos.test",
    displayName: "Crossroads GM",
    roleKey: "venue_director",
    scopeType: "venue",
    scopeId: flagshipVenueScopeSlug,
    venueName: flagshipVenueDisplayName,
    blurb: "Daily operations first. Venue-scoped settings, no billing or global platform admin.",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    key: "crossroads.staff",
    email: "crossroads.staff@gamedayos.test",
    displayName: "Crossroads Staff",
    roleKey: "venue_staff",
    scopeType: "venue",
    scopeId: flagshipVenueScopeSlug,
    venueName: flagshipVenueDisplayName,
    blurb: "Assigned operational items only: today's tasks, field status, announcements. No admin.",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    key: "crossroads.tech",
    email: "crossroads.tech@gamedayos.test",
    displayName: "Crossroads Tech Manager",
    roleKey: "venue_tech_manager",
    scopeType: "venue",
    scopeId: flagshipVenueScopeSlug,
    venueName: flagshipVenueDisplayName,
    blurb: "Devices, scoreboards, cameras, and field ops. No billing, users, permissions, or global settings.",
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    key: "tournament.director",
    email: "tournament.director@gamedayos.test",
    displayName: "Tournament Director",
    roleKey: "tournament_director",
    scopeType: "tournament",
    scopeId: "crossroads-summer-classic",
    venueName: flagshipVenueDisplayName,
    blurb: "Tournament schedule, brackets, games, and announcements. Not venue hardware admin, not billing.",
  },
];

export function findDemoUserByKey(key: string | undefined | null): DemoUser | null {
  if (!key) {
    return null;
  }
  return demoUsers.find((user) => user.key === key) ?? null;
}

export function findDemoUserById(id: string | undefined | null): DemoUser | null {
  if (!id) {
    return null;
  }
  return demoUsers.find((user) => user.id === id) ?? null;
}
