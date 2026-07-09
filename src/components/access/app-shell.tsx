"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
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

const iconMap: Record<string, LucideIcon> = {
  Activity,
  Bell,
  CalendarDays,
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

function isActive(pathname: string, href: string) {
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

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-0 overflow-hidden lg:grid-cols-[280px_1fr]">
      <aside className="min-w-0 border-b border-[var(--line)] bg-[var(--black-soft)] text-white lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
        <div className="min-w-0 px-4 py-5 sm:px-6 lg:sticky lg:top-[73px]">
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

      <div className="min-w-0">{children}</div>
    </div>
  );
}
