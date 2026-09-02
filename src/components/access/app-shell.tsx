"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Database,
  Gauge,
  Home,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavGroup } from "@/lib/access/navigation";
import { AppHeader } from "./app-header";
import { BottomNavigation, type MobileNavItem } from "./bottom-navigation";
import { Sheet } from "@/components/ui/overlays";

const iconMap: Record<string, LucideIcon> = {
  Activity,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Database,
  Gauge,
  Home,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
};

const mobileSlots = [
  { keys: ["home", "org-home"], label: "Home", icon: "Home" },
  { keys: ["today"], label: "Today", icon: "Activity" },
  { keys: ["fields", "org-coaches"], label: "Fields", icon: "MapPin" },
  { keys: ["schedule", "org-reservations"], label: "Schedule", icon: "CalendarDays" },
] as const;

export function buildMobileNavigation(navGroups: NavGroup[]): MobileNavItem[] {
  const available = navGroups.flatMap((group) => group.items);
  const selected: MobileNavItem[] = [];
  for (const slot of mobileSlots) {
    const item = slot.keys.map((key) => available.find((candidate) => candidate.key === key)).find(Boolean);
    if (item && !selected.some((existing) => existing.href === item.href)) {
      selected.push({ href: item.href, icon: slot.icon, key: item.key, label: slot.label });
    }
  }
  return selected.slice(0, 4);
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (href === "/today") {
    return pathname === "/today";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type AppShellProps = {
  navGroups: NavGroup[];
  roleLabel: string;
  venueName: string | null;
  email: string;
  children: React.ReactNode;
};

export function AppShell({ navGroups, roleLabel, venueName, email, children }: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const mobileItems = buildMobileNavigation(navGroups);

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-[1440px] min-w-0 bg-[var(--background)] lg:grid-cols-[280px_1fr]">
      <aside className="hidden min-w-0 bg-[var(--black-soft)] text-white lg:block lg:min-h-dvh lg:border-r lg:border-white/10">
        <div className="min-w-0 px-5 py-6 lg:sticky lg:top-0">
          <Link className="mb-7 flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2" href="/">
            <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-white text-sm font-black text-[var(--black-soft)]">GD</span>
            <span><span className="block text-base font-black">GameDay</span><span className="block text-xs font-semibold text-white/55">Venue operations</span></span>
          </Link>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Signed in as</p>
          <h2 className="mt-1 text-lg font-black leading-tight">{roleLabel}</h2>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/55">{email}</p>
          {venueName ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-[11px] font-black text-white/80">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {venueName}
            </p>
          ) : null}

          <nav className="mt-6 grid gap-5" aria-label="Primary navigation">
            {navGroups.map((group) => (
              <section key={group.key}>
                <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{group.label}</p>
                <div className="mt-2 grid gap-1">
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon] ?? Home;
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition ${
                          active
                            ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-200" : ""}`} aria-hidden="true" />
                        <span className="min-w-0 leading-5">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <form action="/logout" method="post" className="mt-8">
            <button
              type="submit"
              className="min-h-10 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <AppHeader onOpenMenu={() => setMoreOpen(true)} roleLabel={roleLabel} venueName={venueName} />
        <div className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      </div>

      <BottomNavigation items={mobileItems} onOpenMore={() => setMoreOpen(true)} />
      <Sheet description={`${roleLabel}${venueName ? ` at ${venueName}` : ""}`} onClose={() => setMoreOpen(false)} open={moreOpen} title="Navigation">
        <div className="grid gap-6">
          {navGroups.map((group) => (
            <section key={group.key}>
              <p className="ui-eyebrow px-2">{group.label}</p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon] ?? Home;
                  const active = isActive(pathname, item.href);
                  return <Link aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-extrabold ${active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "hover:bg-[var(--background-strong)]"}`} href={item.href} key={item.key} onClick={() => setMoreOpen(false)}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{item.label}</Link>;
                })}
              </div>
            </section>
          ))}
          <form action="/logout" method="post">
            <button className="min-h-12 w-full rounded-[var(--radius-md)] bg-[var(--black-soft)] px-4 text-sm font-extrabold text-white" type="submit">Sign out</button>
          </form>
        </div>
      </Sheet>
    </div>
  );
}
