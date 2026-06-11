import Link from "next/link";

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/fields", label: "Fields" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/sponsors", label: "Sponsors" },
];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-0 overflow-hidden lg:grid-cols-[240px_1fr]">
      <aside className="min-w-0 overflow-hidden border-b border-[var(--line)] bg-[var(--black-soft)] text-white lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
        <div className="min-w-0 px-4 py-5 sm:px-6 lg:sticky lg:top-[73px] lg:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Admin</p>
            <h2 className="mt-2 text-xl font-black">Operations</h2>
          </div>
          <nav className="mt-5 flex min-w-0 gap-2 overflow-x-auto lg:grid">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/admin/sessions/new"
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white"
          >
            New session
          </Link>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
