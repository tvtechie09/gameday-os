"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Database,
  Gauge,
  HandHeart,
  Home,
  Inbox,
  LayoutDashboard,
  MapPin,
  Menu,
  Plus,
  QrCode,
  Radio,
  Search,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Organization } from "@/lib/types";

type AdminNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type AdminNavGroup = {
  items: AdminNavItem[];
  label: string;
};

const adminNavGroups: AdminNavGroup[] = [
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin", icon: Home, label: "Overview" },
      { href: "/admin/executive", icon: ShieldCheck, label: "Executive Dashboard" },
      { href: "/admin/dashboard", icon: LayoutDashboard, label: "Operations Dashboard" },
      { href: "/admin/game-day", icon: Activity, label: "Game Day" },
      { href: "/admin/status-board", icon: Gauge, label: "Status Board" },
      { href: "/admin/system-health", icon: ShieldCheck, label: "System Health Center" },
      { href: "/admin/organizations", icon: Users, label: "Organization Dashboard" },
      { href: "/admin/roles", icon: ShieldCheck, label: "Roles & Permissions" },
      { href: "/admin/pilot-prep", icon: ClipboardCheck, label: "Pilot Prep" },
    ],
  },
  {
    label: "VENUES",
    items: [
      { href: "/admin/venues", icon: MapPin, label: "Venues" },
      { href: "/admin/fields", icon: QrCode, label: "Fields" },
    ],
  },
  {
    label: "GAMES",
    items: [
      { href: "/admin/sessions", icon: CalendarDays, label: "Sessions" },
      { href: "/admin/tournaments", icon: Trophy, label: "Tournaments" },
    ],
  },
  {
    label: "ENGAGEMENT",
    items: [
      { href: "/admin/sponsors", icon: HandHeart, label: "Sponsors" },
      { href: "/admin/alerts", icon: Bell, label: "Alerts" },
      { href: "/admin/notifications", icon: Inbox, label: "Notifications" },
      { href: "/admin/volunteers", icon: Users, label: "Volunteers" },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { href: "/admin/resources", icon: Wrench, label: "Resources" },
      { href: "/admin/resources/dashboard", icon: Radio, label: "Resource Dashboard" },
      { href: "/admin/scoreboards", icon: Gauge, label: "Scoreboards" },
    ],
  },
  {
    label: "INTEGRATIONS",
    items: [
      { href: "/admin/integrations", icon: Database, label: "Integrations" },
      { href: "/admin/integrations/health", icon: ShieldCheck, label: "Integration Health Dashboard" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/admin/sync", icon: Shuffle, label: "Sync Engine" },
      { href: "/admin/schema-audit", icon: Database, label: "Schema Audit" },
      { href: "/admin/import", icon: Sparkles, label: "CSV Import" },
      { href: "/admin/sessions/bulk", icon: Menu, label: "Bulk Sessions" },
    ],
  },
];

const quickActions = [
  { href: "/admin/venues/new", label: "Venue" },
  { href: "/admin/fields/new", label: "Field" },
  { href: "/admin/sessions/new", label: "Session" },
  { href: "/admin/alerts/new", label: "Alert" },
];

const pinnedNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Operations Dashboard" },
  { href: "/admin/status-board", icon: Gauge, label: "Status Board" },
  { href: "/admin/fields", icon: QrCode, label: "Fields" },
  { href: "/admin/sync", icon: Shuffle, label: "Sync Engine" },
];

const breadcrumbLabels: Record<string, string> = {
  admin: "Admin",
  alerts: "Alerts",
  bulk: "Bulk Tools",
  control: "Control Center",
  dashboard: "Dashboard",
  executive: "Executive",
  edit: "Edit",
  fields: "Fields",
  "game-day": "Game Day",
  health: "Health",
  import: "Import",
  integrations: "Integrations",
  new: "New",
  notifications: "Notifications",
  organizations: "Organizations",
  "pilot-prep": "Pilot Prep",
  qr: "QR",
  resources: "Resources",
  roles: "Roles",
  scoreboards: "Scoreboards",
  "schema-audit": "Schema Audit",
  sessions: "Sessions",
  sponsors: "Sponsors",
  "status-board": "Status Board",
  "system-health": "System Health",
  sync: "Sync",
  tournaments: "Tournaments",
  venues: "Venues",
  volunteers: "Volunteers",
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function labelFromSegment(segment: string) {
  if (breadcrumbLabels[segment]) return breadcrumbLabels[segment];
  if (/^[a-f0-9-]{20,}$/i.test(segment)) return "Detail";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: labelFromSegment(segment),
  }));
}

function formatGroupLabel(label: string) {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

export function AdminShell({
  children,
  organizations = [],
  selectedOrganizationId = "all",
}: Readonly<{
  children: React.ReactNode;
  organizations?: Organization[];
  selectedOrganizationId?: string;
}>) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-0 overflow-hidden lg:grid-cols-[360px_1fr]">
      <aside className="min-w-0 overflow-hidden border-b border-[var(--line)] bg-[var(--black-soft)] text-white lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
        <div className="min-w-0 px-4 py-5 sm:px-6 lg:sticky lg:top-[73px] lg:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Admin</p>
              <h2 className="mt-2 text-xl font-black">Operations</h2>
            </div>
              <details className="relative lg:hidden">
                <summary className="grid h-12 w-12 cursor-pointer place-items-center rounded-lg bg-white/10 text-white marker:hidden">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Open navigation</span>
                </summary>
              <div className="absolute right-0 top-12 z-30 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-white/10 bg-[var(--black-soft)] p-3 shadow-xl">
                <AdminNav pathname={pathname} compact />
              </div>
            </details>
          </div>

          <div className="mt-5">
            <OrganizationSwitcher organizations={organizations} selectedOrganizationId={selectedOrganizationId} />
          </div>

          <div className="mt-5 lg:hidden">
            <MobileNav pathname={pathname} />
          </div>

          <div className="mt-6 hidden lg:block">
            <PinnedNav pathname={pathname} />
          </div>

          <div className="mt-6 hidden lg:block">
            <AdminNav pathname={pathname} />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-[73px] z-10 border-b border-[var(--line)] bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm font-bold text-[var(--muted)]" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <span className="flex items-center gap-1 whitespace-nowrap" key={crumb.href}>
                  {index > 0 ? <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" /> : null}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-[var(--foreground)]">{crumb.label}</span>
                  ) : (
                    <Link className="transition hover:text-[var(--accent-strong)]" href={crumb.href}>
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <label className="relative min-w-0 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                <span className="sr-only">Search</span>
                <input
                  className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:bg-white"
                  placeholder="Search GameDay OS"
                  type="search"
                />
              </label>
              <details className="relative">
                <summary className="ui-button ui-button-primary min-h-11 cursor-pointer px-4 py-0 marker:hidden">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Quick Actions
                </summary>
                <div className="absolute right-0 top-12 z-20 grid w-48 gap-1 rounded-lg border border-[var(--line)] bg-white p-2 shadow-xl">
                  {quickActions.map((action) => (
                    <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition hover:bg-[var(--background)]" href={action.href} key={action.href}>
                      <Plus className="h-4 w-4 text-[var(--accent-strong)]" aria-hidden="true" />
                      <span>{action.label}</span>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function OrganizationSwitcher({
  organizations,
  selectedOrganizationId,
}: {
  organizations: Organization[];
  selectedOrganizationId: string;
}) {
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);

  return (
    <form action="/admin/organization" className="rounded-lg border border-white/10 bg-white/[0.04] p-3" method="post">
      <label className="grid gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Organization</span>
        <select
          className="min-h-12 w-full rounded-lg border border-white/10 bg-[var(--black-soft)] px-3 text-sm font-bold text-white outline-none"
          defaultValue={selectedOrganizationId}
          name="organization_id"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="all">All Organizations</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs font-semibold leading-5 text-white/55">
        {selectedOrganization ? (
          <span className="flex items-center gap-2">
            {selectedOrganization.logoUrl ? (
              <Image alt="" className="h-6 w-6 rounded bg-white object-contain p-0.5" height={24} src={selectedOrganization.logoUrl} unoptimized width={24} />
            ) : null}
            <span>Viewing {selectedOrganization.name}</span>
          </span>
        ) : "Super Admin view across every organization"}
      </p>
    </form>
  );
}

function AdminNav({ compact = false, pathname }: { compact?: boolean; pathname: string }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(adminNavGroups.map((group) => [group.label, true])));

  function toggleGroup(label: string) {
    setOpenGroups((current) => ({
      ...current,
      [label]: !(current[label] ?? true),
    }));
  }

  return (
    <nav className={`grid gap-3 ${compact ? "" : "lg:gap-4"}`} aria-label="Admin navigation">
      {adminNavGroups.map((group) => {
        const hasActiveItem = group.items.some((item) => isActivePath(pathname, item.href));
        const isOpen = openGroups[group.label] ?? true;
        const navItems = (
          <div className="mt-2 grid gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                    active ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <span className={`h-6 w-1 rounded-full ${active ? "bg-emerald-300" : "bg-transparent"}`} />
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-200" : ""}`} aria-hidden="true" />
                  <span className="min-w-0 leading-5">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );

        if (compact) {
          return (
            <section className="rounded-lg border border-white/10 bg-white/[0.03] p-2" key={group.label}>
              <button
                aria-expanded={isOpen}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.18em] text-white/60 transition hover:text-white/80"
                onClick={() => toggleGroup(group.label)}
                type="button"
              >
                <span>{group.label}</span>
                <ChevronRight className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" />
              </button>
              {isOpen ? navItems : hasActiveItem ? <p className="px-2 py-2 text-xs font-bold text-emerald-100">Active page in this section</p> : null}
            </section>
          );
        }

        return (
          <section className="rounded-lg border border-transparent" key={group.label}>
            <button
              aria-expanded={isOpen}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.18em] transition ${
                hasActiveItem ? "text-emerald-100" : "text-white/45 hover:bg-white/5 hover:text-white/70"
              }`}
              onClick={() => toggleGroup(group.label)}
              type="button"
            >
              <span>{formatGroupLabel(group.label)}</span>
              <ChevronRight className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" />
            </button>
            {isOpen ? navItems : null}
          </section>
        );
      })}
    </nav>
  );
}

function PinnedNav({ pathname }: { pathname: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3" aria-label="Pinned admin links">
      <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Pinned</p>
      <div className="mt-2 grid gap-1">
        {pinnedNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                active ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-200" : ""}`} aria-hidden="true" />
              <span className="min-w-0 leading-5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Mobile admin navigation">
      {pinnedNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold ${
              active ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25" : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
