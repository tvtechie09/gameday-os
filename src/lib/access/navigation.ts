// Single navigation config, filtered by capability. Non-permitted items are
// removed from the payload entirely (never rendered disabled). Also exposes the
// per-route guard map used by middleware for direct-URL protection so nav
// visibility and route protection share one source of truth.

import {
  canAccessAdminWorkspace,
  canManageDevices,
  canManageFields,
  canManageIntegrations,
  canManagePermissions,
  canManageSchedule,
  canManageTournaments,
  canManageUsers,
  canManageVenueSettings,
  canSendAnnouncement,
  canViewCommandCenter,
  canViewDevTools,
  canViewBilling,
  canViewOpsTasks,
  canImpersonate,
  hasPermission,
  isOrgScoped,
  isPlatformAdmin,
  type AccessContext,
} from "./capabilities.ts";

export type NavGroupKey = "operations" | "admin";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: string;
  group: NavGroupKey;
  cap: (ctx: AccessContext | null) => boolean;
};

export type NavGroup = {
  key: NavGroupKey;
  label: string;
  items: Array<Omit<NavItem, "cap" | "group">>;
};

export const navItems: NavItem[] = [
  // --- Daily Operations ---
  // One "Today's Operations" slot that resolves by role. Venue operators get the
  // Command Center; everyone else with ops tasks (coaches, scorekeepers,
  // tournament staff, emergency coordinators) keeps the lighter /today. The caps
  // are mutually exclusive, so exactly one of these ever renders -- a venue never
  // sees two screens competing for the same job.
  // canViewCommandCenter is permission-based and (by design, see its comment)
  // also resolves true for organization_admin -- but an org-scoped ctx's
  // venueId is always null (Phase B), so Command Center has nothing to render
  // for it. Same dead-end Phase B flagged for /today; excluded the same way.
  { key: "command-center", href: "/admin/command-center", label: "Today's Operations", icon: "Home", group: "operations", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { key: "org-home", href: "/org", label: "Organization Home", icon: "Home", group: "operations", cap: isOrgScoped },
  { key: "today", href: "/today", label: "Today's Operations", icon: "Home", group: "operations", cap: (ctx) => canViewOpsTasks(ctx) && !canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  // Reservations (grants + claims already exist) and the derived coaches
  // roster -- the two org-shaped screens an org president actually needs day
  // to day. Billing (below) is reused as-is via the widened canViewBilling cap.
  { key: "org-reservations", href: "/org/reservations", label: "Reservations", icon: "CalendarDays", group: "operations", cap: isOrgScoped },
  { key: "org-coaches", href: "/org/coaches", label: "Coaches", icon: "Users", group: "operations", cap: isOrgScoped },
  // Venue-wide posture: normal play / weather delay / schedule delay / closed /
  // emergency / maintenance, plus bulk field resets and venue announcements.
  // These are decisions the Command Center deliberately does NOT make -- it shows
  // you the day; this changes the day for the whole venue. It was orphaned, so
  // eight real server actions were unreachable by clicking.
  // All of these venue-admin screens are permission-based (canManage*), not
  // scope-based -- organization_admin's permission set includes venue.manage
  // regardless of whether the org actually owns a venue, so without the
  // isOrgScoped exclusion they leak into a using-org president's nav as dead
  // ends (confirmed live: Illinois Celtics, who owns nothing, saw Venue Mode &
  // Status / Schedule & Games / Fields / Reports / Venue Settings). Excluded
  // consistently across the whole venue-admin set, not just the ones observed
  // to leak with today's specific permission grants -- the same gap exists for
  // any other org-scoped role that happens to carry these permissions.
  //
  // Trade-off worth knowing: this also hides these from an OWNING org's
  // president (e.g. Manhattan Junior High, which does own a venue) -- nav caps
  // are synchronous and can't do the "does this org actually own a venue" DB
  // check that venueInScope now does. If an owning org's admin needs to run
  // their own venue day-to-day, today's answer is a venue-scoped role
  // assignment for that venue, not their org-scoped one.
  { key: "venue-mode", href: "/admin/operations-center", label: "Venue Mode & Status", icon: "Gauge", group: "operations", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { key: "schedule", href: "/admin/sessions", label: "Schedule & Games", icon: "CalendarDays", group: "operations", cap: (ctx) => canManageSchedule(ctx) && !isOrgScoped(ctx) },
  { key: "tournaments", href: "/admin/tournaments", label: "Tournaments & Brackets", icon: "Trophy", group: "operations", cap: (ctx) => canManageTournaments(ctx) && !isOrgScoped(ctx) },
  { key: "fields", href: "/admin/fields", label: "Fields", icon: "MapPin", group: "operations", cap: (ctx) => canManageFields(ctx) && !isOrgScoped(ctx) },
  { key: "scoreboards", href: "/admin/scoreboards", label: "Scoreboards", icon: "Gauge", group: "operations", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { key: "devices", href: "/admin/resources", label: "Devices & Cameras", icon: "Radio", group: "operations", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { key: "announcements", href: "/admin/alerts", label: "Announcements", icon: "Bell", group: "operations", cap: (ctx) => canSendAnnouncement(ctx) && !isOrgScoped(ctx) },
  { key: "reports", href: "/admin/executive", label: "Reports", icon: "Activity", group: "operations", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },

  // --- Admin workspace (grouped separately) ---
  { key: "venue-settings", href: "/admin/venues", label: "Venue Settings", icon: "MapPin", group: "admin", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { key: "organizations", href: "/admin/organizations", label: "Organizations", icon: "Users", group: "admin", cap: isPlatformAdmin },
  { key: "integrations", href: "/admin/integrations", label: "Integrations", icon: "Database", group: "admin", cap: canManageIntegrations },
  { key: "users", href: "/admin/identity/people", label: "Users", icon: "Users", group: "admin", cap: canManageUsers },
  { key: "permissions", href: "/admin/roles", label: "Permissions & Roles", icon: "ShieldCheck", group: "admin", cap: canManagePermissions },
  // canViewBilling (not the stricter canManageBilling) so an org-scoped
  // president sees their own org's plan/invoices read-only, matching what
  // billing/page.tsx already implements and self-guards on.
  { key: "billing", href: "/admin/billing", label: "Billing", icon: "Gauge", group: "admin", cap: canViewBilling },
  { key: "marketplace", href: "/admin/marketplace", label: "Automation Marketplace", icon: "Sparkles", group: "admin", cap: canViewDevTools },
  { key: "developer", href: "/admin/developer", label: "Developer & API", icon: "Database", group: "admin", cap: canViewDevTools },
  { key: "impersonation", href: "/admin/impersonation", label: "Impersonation", icon: "ShieldCheck", group: "admin", cap: canImpersonate },
  // Your own account (2FA). Every signed-in user gets this -- it only ever acts
  // on the caller's own Supabase user, so there's no capability to gate on.
  { key: "account", href: "/admin/account", label: "Your Account", icon: "ShieldCheck", group: "admin", cap: (ctx) => Boolean(ctx) },
  { key: "feedback", href: "/admin/feedback", label: "Send Feedback", icon: "Bell", group: "admin", cap: canAccessAdminWorkspace },
];

const groupLabels: Record<NavGroupKey, string> = {
  operations: "Daily Operations",
  admin: "Admin",
};

export function buildNavigation(ctx: AccessContext | null): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const groupKey of ["operations", "admin"] as NavGroupKey[]) {
    const items = navItems
      .filter((item) => item.group === groupKey && item.cap(ctx))
      .map(({ key, href, label, icon }) => ({ key, href, label, icon }));
    if (items.length > 0) {
      groups.push({ key: groupKey, label: groupLabels[groupKey], items });
    }
  }
  return groups;
}

export function getRoleHome(ctx: AccessContext | null): string {
  if (!ctx) {
    return "/dev-login";
  }
  if (isPlatformAdmin(ctx)) {
    return "/admin";
  }
  // Before canViewCommandCenter: an org-scoped ctx can satisfy that permission
  // check (organization_admin) but has no venueId to render it for -- see the
  // nav item above. The org console is the correct home for it.
  if (isOrgScoped(ctx)) {
    return "/org";
  }
  if (canViewCommandCenter(ctx)) {
    return "/admin/command-center";
  }
  return "/today";
}

// Ordered longest-prefix-first guard map for /admin/* routes. Middleware picks
// the most specific matching prefix; unlisted /admin paths fall back to the
// admin-workspace umbrella.
export const adminRouteGuards: Array<{ prefix: string; cap: (ctx: AccessContext | null) => boolean }> = [
  // Must match the nav cap exactly. Without this the route falls back to
  // canAccessAdminWorkspace, which venue_staff does not satisfy -- they would see
  // the nav link and get bounced.
  { prefix: "/admin/command-center", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/operations-center", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/impersonation", cap: canImpersonate },
  { prefix: "/admin/developer", cap: canViewDevTools },
  { prefix: "/admin/marketplace", cap: canViewDevTools },
  { prefix: "/admin/billing", cap: canViewBilling },
  { prefix: "/admin/roles", cap: canManagePermissions },
  { prefix: "/admin/identity", cap: canManageUsers },
  { prefix: "/admin/integrations", cap: canManageIntegrations },
  { prefix: "/admin/organizations", cap: isPlatformAdmin },
  { prefix: "/admin/sync", cap: isPlatformAdmin },
  { prefix: "/admin/schema-audit", cap: isPlatformAdmin },
  { prefix: "/admin/system-health", cap: isPlatformAdmin },
  { prefix: "/admin/venues", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/sessions", cap: (ctx) => canManageSchedule(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/tournaments", cap: (ctx) => canManageTournaments(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/fields", cap: (ctx) => canManageFields(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/scoreboards", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/audio", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/resources", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/weather", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/alerts", cap: (ctx) => canSendAnnouncement(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/notifications", cap: (ctx) => canSendAnnouncement(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/sponsors", cap: (ctx) => hasPermission(ctx, "sponsor.manage") },
  { prefix: "/admin/account", cap: (ctx) => Boolean(ctx) },
  { prefix: "/admin/feedback", cap: canAccessAdminWorkspace },
];

export function guardForAdminPath(pathname: string): (ctx: AccessContext | null) => boolean {
  const match = adminRouteGuards
    .filter((guard) => pathname === guard.prefix || pathname.startsWith(`${guard.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.cap : canAccessAdminWorkspace;
}
