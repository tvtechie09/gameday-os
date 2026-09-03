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
  canManagePlatform,
  canManageSchedule,
  canManageTournaments,
  canManageUsers,
  canManageVenueSettings,
  canSendAnnouncement,
  canOpenCloseField,
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

export type NavGroupKey = "operations" | "admin" | "platform";

export type ProductSurfaceStage = "core" | "supporting" | "internal";

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: string;
  group: NavGroupKey;
  stage: ProductSurfaceStage;
  cap: (ctx: AccessContext | null) => boolean;
};

export type NavGroup = {
  key: NavGroupKey;
  label: string;
  items: Array<Omit<NavItem, "cap" | "group">>;
};

export const navItems: NavItem[] = [
  // --- Daily Operations ---
  // UI/UX 1.1C establishes one obvious home for each operational question:
  // Home routes managers, Today is chronological, Fields is physical, and
  // Schedule is administrative. Retired control-center bookmarks redirect to
  // these destinations instead of returning to primary navigation.
  { key: "home", href: "/admin", label: "Home", icon: "Home", group: "operations", stage: "core", cap: (ctx) => canAccessAdminWorkspace(ctx) && !isOrgScoped(ctx) },
  { key: "org-home", href: "/org", label: "Organization Home", icon: "Home", group: "operations", stage: "core", cap: isOrgScoped },
  { key: "today", href: "/today", label: "Today", icon: "Activity", group: "operations", stage: "core", cap: (ctx) => canViewOpsTasks(ctx) && !isOrgScoped(ctx) },
  { key: "fields", href: "/admin/fields", label: "Fields", icon: "MapPin", group: "operations", stage: "core", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { key: "schedule", href: "/admin/sessions", label: "Schedule", icon: "CalendarDays", group: "operations", stage: "core", cap: (ctx) => canManageSchedule(ctx) && !isOrgScoped(ctx) },
  // Reservations (grants + claims already exist) and the derived coaches
  // roster -- the two org-shaped screens an org president actually needs day
  // to day. Billing (below) is reused as-is via the widened canViewBilling cap.
  { key: "org-reservations", href: "/org/reservations", label: "Reservations", icon: "CalendarDays", group: "operations", stage: "core", cap: isOrgScoped },
  { key: "org-coaches", href: "/org/coaches", label: "Coaches", icon: "Users", group: "operations", stage: "supporting", cap: isOrgScoped },
  // Venue-wide posture and the rest of the supporting tools remain reachable
  // under More without competing with the four canonical operating surfaces.
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
  // --- Supporting and management surfaces (the More destination on mobile) ---
  { key: "venue-status", href: "/admin/operations-center", label: "Venue Status", icon: "Gauge", group: "admin", stage: "supporting", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { key: "announcements", href: "/admin/alerts", label: "Announcements", icon: "Bell", group: "admin", stage: "supporting", cap: (ctx) => canSendAnnouncement(ctx) && !isOrgScoped(ctx) },
  { key: "work-orders", href: "/admin/fields/work-orders", label: "Work Orders", icon: "ClipboardCheck", group: "admin", stage: "supporting", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { key: "tournaments", href: "/admin/tournaments", label: "Tournament Operations", icon: "Trophy", group: "admin", stage: "supporting", cap: (ctx) => canManageTournaments(ctx) && !isOrgScoped(ctx) },
  { key: "scoreboards", href: "/admin/scoreboards", label: "Scoreboards", icon: "Gauge", group: "admin", stage: "supporting", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { key: "devices", href: "/admin/resources", label: "Venue Systems", icon: "Radio", group: "admin", stage: "supporting", cap: (ctx) => canManageDevices(ctx) && !isOrgScoped(ctx) },
  { key: "reports", href: "/admin/executive", label: "Reports", icon: "Activity", group: "admin", stage: "supporting", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { key: "pilot-launch", href: "/admin/pilot-launch", label: "Pilot Launch", icon: "ClipboardCheck", group: "admin", stage: "supporting", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { key: "venue-settings", href: "/admin/venues", label: "Venue Settings", icon: "MapPin", group: "admin", stage: "supporting", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { key: "organizations", href: "/admin/organizations", label: "Organizations", icon: "Users", group: "admin", stage: "supporting", cap: isPlatformAdmin },
  { key: "integrations", href: "/admin/integrations", label: "Schedule Imports", icon: "Database", group: "admin", stage: "supporting", cap: canManageIntegrations },
  { key: "users", href: "/admin/identity/people", label: "People & Access", icon: "Users", group: "admin", stage: "supporting", cap: canManageUsers },
  { key: "permissions", href: "/admin/roles", label: "Roles & Permissions", icon: "ShieldCheck", group: "admin", stage: "supporting", cap: canManagePermissions },
  // canViewBilling (not the stricter canManageBilling) so an org-scoped
  // president sees their own org's plan/invoices read-only, matching what
  // billing/page.tsx already implements and self-guards on.
  { key: "billing", href: "/admin/billing", label: "Billing", icon: "Gauge", group: "admin", stage: "supporting", cap: canViewBilling },
  { key: "marketplace", href: "/admin/marketplace", label: "Operational Workflows", icon: "Sparkles", group: "platform", stage: "internal", cap: canViewDevTools },
  { key: "demo-readiness", href: "/admin/demo", label: "Demo Readiness", icon: "ClipboardCheck", group: "platform", stage: "internal", cap: (ctx) => isPlatformAdmin(ctx) || canManagePlatform(ctx) },
  { key: "developer", href: "/admin/developer", label: "Developer & API", icon: "Database", group: "platform", stage: "internal", cap: canViewDevTools },
  { key: "impersonation", href: "/admin/impersonation", label: "Impersonation", icon: "ShieldCheck", group: "platform", stage: "internal", cap: canImpersonate },
  // Your own account (2FA). Every signed-in user gets this -- it only ever acts
  // on the caller's own Supabase user, so there's no capability to gate on.
  { key: "account", href: "/admin/account", label: "Your Account", icon: "ShieldCheck", group: "admin", stage: "supporting", cap: (ctx) => Boolean(ctx) },
  { key: "feedback", href: "/admin/feedback", label: "Send Feedback", icon: "Bell", group: "admin", stage: "supporting", cap: canAccessAdminWorkspace },
];

const groupLabels: Record<NavGroupKey, string> = {
  operations: "Run Today",
  admin: "More",
  platform: "Internal Tools",
};

export function buildNavigation(ctx: AccessContext | null): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const groupKey of ["operations", "admin", "platform"] as NavGroupKey[]) {
    const items = navItems
      .filter((item) => item.group === groupKey && item.cap(ctx))
      .map(({ key, href, label, icon, stage }) => ({ key, href, label, icon, stage }));
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
  if (canAccessAdminWorkspace(ctx)) {
    return "/admin";
  }
  return "/today";
}

// Ordered longest-prefix-first guard map for /admin/* routes. Middleware picks
// the most specific matching prefix; unlisted /admin paths fall back to the
// admin-workspace umbrella.
export const adminRouteGuards: Array<{ prefix: string; exact?: boolean; cap: (ctx: AccessContext | null) => boolean }> = [
  // Must match the nav cap exactly. Without this the route falls back to
  // canAccessAdminWorkspace, which venue_staff does not satisfy -- they would see
  // the nav link and get bounced.
  { prefix: "/admin/command-center", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/operations-center", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/impersonation", cap: canImpersonate },
  { prefix: "/admin/demo", cap: (ctx) => isPlatformAdmin(ctx) || canManagePlatform(ctx) },
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
  { prefix: "/admin/pilot-launch", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/executive", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/venues", cap: (ctx) => canManageVenueSettings(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/sessions", cap: (ctx) => canManageSchedule(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/tournaments", cap: (ctx) => canManageTournaments(ctx) && !isOrgScoped(ctx) },
  // Field Operations is a frontline surface; setup/configuration below it is
  // still restricted by canManageFields. Work orders are part of the same
  // operational attention workflow and remain venue-scoped in their loader.
  { prefix: "/admin/fields", exact: true, cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/fields/work-orders", cap: (ctx) => canViewCommandCenter(ctx) && !isOrgScoped(ctx) },
  { prefix: "/admin/fields/:fieldId/disruption", cap: (ctx) => canOpenCloseField(ctx) && !isOrgScoped(ctx) },
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
    .filter((guard) => {
      if (guard.exact) return pathname === guard.prefix;
      const guardSegments = guard.prefix.split("/").filter(Boolean);
      const pathSegments = pathname.split("/").filter(Boolean);
      if (guardSegments.length > pathSegments.length) return false;
      return guardSegments.every((segment, index) => segment.startsWith(":") || segment === pathSegments[index]);
    })
    .sort((a, b) => b.prefix.length - a.prefix.length || Number(Boolean(b.exact)) - Number(Boolean(a.exact)))[0];
  return match ? match.cap : canAccessAdminWorkspace;
}
