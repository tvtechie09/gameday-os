import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Search } from "lucide-react";
import Link from "next/link";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GameDay OS",
  description: "A venue-first operating system for sports fields.",
};

const navItems = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/fields/field-1", label: "QR preview" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 backdrop-blur">
            <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <Link href="/" className="flex items-center gap-3" aria-label="GameDay OS home">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--black-soft)] text-sm font-black text-white">
                  GD
                </span>
                <span>
                  <span className="block text-base font-extrabold leading-tight">GameDay OS</span>
                  <span className="block text-xs font-medium text-[var(--muted)]">Venue operations</span>
                </span>
              </Link>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative w-full sm:min-w-[24rem] sm:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                  <span className="sr-only">Search</span>
                  <input
                    className="min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--background)] pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:bg-white"
                    placeholder="Search venues, fields, sessions"
                    type="search"
                  />
                </label>
                <div className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--background)] p-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </header>
          <main>{children}</main>
          <ToastProvider />
        </div>
      </body>
    </html>
  );
}
