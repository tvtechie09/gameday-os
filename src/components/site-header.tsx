"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/fields", label: "Fields & QR" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--line)] bg-[var(--background)] p-1 lg:flex-row lg:overflow-x-auto">
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] ${focusRing} ${
              active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Signed-in app routes render the capability-filtered sidebar (AppFrame);
  // showing this public header there duplicates navigation. Keep it for
  // public, QR, and auth pages only.
  if (pathname.startsWith("/admin") || pathname === "/today" || pathname.startsWith("/today/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className={`flex items-center gap-3 rounded-lg ${focusRing}`} aria-label="GameDay OS home" onClick={() => setOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--black-soft)] text-sm font-black text-white">
            GD
          </span>
          <span>
            <span className="block text-base font-extrabold leading-tight">GameDay OS</span>
            <span className="block text-xs font-medium text-[var(--muted)]">Venue operations</span>
          </span>
        </Link>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <NavLinks />
        </div>
        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--background)] text-[var(--foreground)] lg:hidden ${focusRing}`}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>
      {open ? (
        <div id="site-menu" className="border-t border-[var(--line)] px-4 pb-4 pt-3 lg:hidden">
          <div className="flex flex-col gap-3">
              <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
