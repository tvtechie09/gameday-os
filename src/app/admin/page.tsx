import Link from "next/link";
import { CalendarDays, HandHeart, MapPin, QrCode, type LucideIcon } from "lucide-react";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

type DashboardCard = {
  href: string;
  icon: LucideIcon;
  label: string;
  note: string;
  value: number;
};

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

  const dashboardCards: DashboardCard[] = [
    { href: "/admin/venues", icon: MapPin, label: "Total Venues", note: "Venue profiles from Supabase.", value: venueCount },
    { href: "/admin/fields", icon: QrCode, label: "Total Fields", note: "Field pages from Supabase.", value: fieldCount },
    { href: "/admin/sessions", icon: CalendarDays, label: "Total Sessions", note: "Game day blocks from Supabase.", value: sessionCount },
    { href: "/admin/sponsors", icon: HandHeart, label: "Total Sponsors", note: "Sponsor profiles from Supabase.", value: sponsorCount },
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/pilot-prep" className="ui-button ui-button-secondary">
            Pilot Prep
          </Link>
          <Link href="/admin/fields/new" className="ui-button ui-button-primary">
            New field
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardCards.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.label} href={item.href} className="group ui-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)] transition group-hover:bg-[var(--accent)] group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Open</span>
              </div>
              <p className="mt-5 text-sm font-bold text-[var(--muted)]">{item.label}</p>
              <p className="mt-2 text-4xl font-black">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.note}</p>
            </Link>
          );
        })}
      </div>

      <div className="ui-card mt-8 bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] p-5">
          <h2 className="text-lg font-black">Setup checklist</h2>
        </div>
        <div className="grid gap-0 divide-y divide-[var(--line)]">
          {[
            { href: "/admin/venues", label: "Review venues" },
            { href: "/admin/pilot-prep", label: "Run pilot prep checks" },
            { href: "/admin/fields", label: "Audit field QR pages" },
            { href: "/admin/sessions", label: "Plan game day sessions" },
            { href: "/admin/sponsors", label: "Confirm sponsor placements" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center justify-between gap-4 p-5 transition hover:bg-[var(--background)]">
              <span className="text-sm font-bold">{item.label}</span>
              <span className="rounded-md border border-[var(--line)] px-2 py-1 text-xs font-bold text-[var(--muted)]">Open</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
