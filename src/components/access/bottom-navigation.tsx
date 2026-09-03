"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Home, MapPin, Menu, Trophy, Users, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/gameday-ui";

export type MobileNavItem = {
  href: string;
  icon: string;
  key: string;
  label: string;
};

const icons: Record<string, LucideIcon> = { Bell, CalendarDays, Home, MapPin, Trophy, Users };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation({ items, onOpenMore }: Readonly<{ items: MobileNavItem[]; onOpenMore: () => void }>) {
  const pathname = usePathname();
  return (
    <nav aria-label="Mobile primary navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-2 pt-1.5 shadow-[0_-10px_30px_rgb(15_23_42_/_0.08)] backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid max-w-lg gap-1" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = icons[item.icon] ?? Home;
          const active = isActive(pathname, item.href);
          return (
            <Link aria-current={active ? "page" : undefined} className={cx("flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 text-[11px] font-extrabold leading-none transition-colors", active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)] hover:bg-[var(--background-strong)] hover:text-[var(--foreground)]")} href={item.href} key={item.key}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button aria-label="Open all navigation" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-1 text-[11px] font-extrabold leading-none text-[var(--muted)] transition-colors hover:bg-[var(--background-strong)] hover:text-[var(--foreground)]" onClick={onOpenMore} type="button">
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
