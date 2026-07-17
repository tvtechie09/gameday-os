// Single navigation config, filtered by capability. Non-permitted items are
// removed from the payload entirely (never rendered disabled). Also exposes the
// per-route guard map used by middleware for direct-URL protection so nav
// visibility and route protection share one source of truth.

import {
  canAccessAdminWorkspace,
  canManageBilling,
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
  canViewOpsTasks,
  canImpersonate,
  hasPermission,
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
  { key: "command-center", href: "/admin/command-center", label: "Today's Operations", icon: "Home", group: "operations", cap: canViewCommandCenter },
  { key: "today", href: "/today", label: "Today's Operations", icon: "Home", group: "operations", cap: (ctx) => canViewOpsTasks(ctx) && !canViewCommandCenter(ctx) },
  { key: "schedule", href: "/admin/sessions", label: "Schedule & Games", icon: "CalendarDays", group: "operations", cap: canManageSchedule },
  { key: "tournaments", href: "/admin/tournaments", label: "Tournaments & Brackets", icon: "Trophy", group: "operations", cap: canManageTournaments },
  { key: "fields", href: "/admin/fields", label: "Fields", icon: "MapPin", group: "operations", cap: canManageFields },
  { key: "scoreboards", href: "/admin/scoreboards", label: "Scoreboards", icon: "Gauge", group: "operations", cap: canManageDevices },
  { key: "devices", href: "/admin/resources", label: "Devices & Cameras", icon: "Radio", group: "operations", cap: canManageDevices },
  { key: "announcements", href: "/admin/alerts", label: "Announcements", icon: "Bell", group: "operations", cap: canSendAnnouncement },
  { key: "reports", href: "/admin/executive", label: "Reports", icon: "Activity", group: "operations", cap: canManageVenueSettings },

  // --- Admin workspace (grouped separately) ---
  { key: "venue-settings", href: "/admin/venues", label: "Venue Settings", icon: "MapPin", group: "admin", cap: canManageVenueSettings },
  { key: "organizations", href: "/admin/organizations", label: "Organizations", icon: "Users", group: "admin", cap: isPlatformAdmin },
  { key: "integrations", href: "/admin/integrations", label: "Integrations", icon: "Database", group: "admin", cap: canManageIntegrations },
  { key: "users", href: "/admin/identity/people", label: "Users", icon: "Users", group: "admin", cap: canManageUsers },
  { key: "permissions", href: "/admin/roles", label: "Permissions & Roles", icon: "ShieldCheck", group: "admin", cap: canManagePermissions },
  { key: "billing", href: "/admin/billing", label: "Billing", icon: "Gauge", group: "admin", cap: canManageBilling },
  { key: "marketplace", href: "/admin/marketplace", label: "Automation Marketplace", icon: "Sparkles", group: "admin", cap: canViewDevTools },
  { key: "developer", href: "/admin/developer", label: "Developer & API", icon: "Database", group: "admin", cap: canViewDevTools },
  { key: "impersonation", href: "/admin/impersonation", label: "Impersonation", icon: "ShieldCheck", group: "admin", cap: canImpersonate },
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
  { prefix: "/admin/command-center", cap: canViewCommandCenter },
  { prefix: "/admin/impersonation", cap: canImpersonate },
  { prefix: "/admin/developer", cap: canViewDevTools },
  { prefix: "/admin/marketplace", cap: canViewDevTools },
  { prefix: "/admin/billing", cap: canManageBilling },
  { prefix: "/admin/roles", cap: canManagePermissions },
  { prefix: "/admin/identity", cap: canManageUsers },
  { prefix: "/admin/integrations", cap: canManageIntegrations },
  { prefix: "/admin/organizations", cap: isPlatformAdmin },
  { prefix: "/admin/sync", cap: isPlatformAdmin },
  { prefix: "/admin/schema-audit", cap: isPlatformAdmin },
  { prefix: "/admin/system-health", cap: isPlatformAdmin },
  { prefix: "/admin/venues", cap: canManageVenueSettings },
  { prefix: "/admin/sessions", cap: canManageSchedule },
  { prefix: "/admin/tournaments", cap: canManageTournaments },
  { prefix: "/admin/fields", cap: canManageFields },
  { prefix: "/admin/scoreboards", cap: canManageDevices },
  { prefix: "/admin/audio", cap: canManageDevices },
  { prefix: "/admin/resources", cap: canManageDevices },
  { prefix: "/admin/weather", cap: canManageDevices },
  { prefix: "/admin/alerts", cap: canSendAnnouncement },
  { prefix: "/admin/notifications", cap: canSendAnnouncement },
  { prefix: "/admin/sponsors", cap: (ctx) => hasPermission(ctx, "sponsor.manage") },
  { prefix: "/admin/feedback", cap: canAccessAdminWorkspace },
];

export function guardForAdminPath(pathname: string): (ctx: AccessContext | null) => boolean {
  const match = adminRouteGuards
    .filter((guard) => pathname === guard.prefix || pathname.startsWith(`${guard.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.cap : canAccessAdminWorkspace;
}
