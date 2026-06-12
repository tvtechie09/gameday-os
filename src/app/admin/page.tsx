import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

async function loadCount(label: string, load: () => Promise<unknown[]>) {
  try {
    return (await load()).length;
  } catch (error) {
    console.error(`Failed to load ${label} count`, error);
    return 0;
  }
}

export default async function AdminDashboard() {
  const [venueCount, fieldCount, sessionCount, sponsorCount] = await Promise.all([
    loadCount("venues", getVenues),
    loadCount("fields", getFields),
    loadCount("sessions", getSessions),
    loadCount("sponsors", getSponsors),
  ]);

  const dashboardCards = [
    { label: "Total Venues", value: venueCount, note: "Venue profiles from Supabase.", href: "/admin/venues" },
    { label: "Total Fields", value: fieldCount, note: "Field pages from Supabase.", href: "/admin/fields" },
    { label: "Total Sessions", value: sessionCount, note: "Game day blocks from Supabase.", href: "/admin/sessions" },
    { label: "Total Sponsors", value: sponsorCount, note: "Sponsor profiles from Supabase.", href: "/admin/sponsors" },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Admin</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Operations dashboard</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Manage venues, fields, sessions, and sponsors from one mobile-friendly operations shell.
          </p>
        </div>
        <Link
          href="/admin/fields/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--accent-strong)]"
        >
          New field
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((item) => (
          <Link key={item.label} href={item.href} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--accent)] hover:shadow-sm">
            <p className="text-sm font-bold text-[var(--muted)]">{item.label}</p>
            <p className="mt-4 text-4xl font-black">{item.value}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] p-5">
          <h2 className="text-lg font-black">Setup checklist</h2>
        </div>
        <div className="grid gap-0 divide-y divide-[var(--line)]">
          {["Review venues", "Audit field QR pages", "Plan game day sessions", "Confirm sponsor placements"].map((item) => (
            <div key={item} className="flex items-center justify-between gap-4 p-5">
              <span className="text-sm font-bold">{item}</span>
              <span className="rounded-md border border-[var(--line)] px-2 py-1 text-xs font-bold text-[var(--muted)]">Open</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
