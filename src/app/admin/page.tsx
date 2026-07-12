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
    loadCount("games", getSessions),
    loadCount("sponsors", getSponsors),
  ]);

  const primaryAction = venueCount === 0
    ? { href: "/admin/venues/new", label: "Create Venue" }
    : fieldCount === 0
      ? { href: "/admin/fields/new", label: "Add First Field" }
      : sessionCount === 0
        ? { href: "/admin/sessions/new", label: "Add First Game" }
        : { href: "/admin/operations-center", label: "Open Venue Command" };

  const attentionItems = [
    venueCount === 0 ? { href: "/admin/venues/new", label: "Create a venue before anything else can be organized." } : null,
    venueCount > 0 && fieldCount === 0 ? { href: "/admin/fields/new", label: "Add at least one field so games and QR pages have a home." } : null,
    fieldCount > 0 && sessionCount === 0 ? { href: "/admin/sessions/new", label: "Add or import today's games." } : null,
    sponsorCount === 0 ? { href: "/admin/sponsors/new", label: "Sponsors are optional. Add one when you are ready." } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-[var(--black-soft)] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">GameDay OS</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">What needs attention today?</h1>
        <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/75">
          Start with the next useful action. Setup, reports, and advanced tools stay available when you need them.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryAction.href} className="ui-button ui-button-primary min-h-12 bg-white text-[var(--foreground)] hover:bg-white/90">
            {primaryAction.label}
          </Link>
          <Link href="/admin/game-day" className="ui-button min-h-12 border border-white/20 bg-white/10 text-white hover:bg-white/15">
            View Game Day
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Needs attention</p>
            <h2 className="mt-1 text-2xl font-black">Next steps</h2>
          </div>
          <Link href="/admin/operations-center" className="text-sm font-black text-[var(--accent-strong)] hover:underline">
            Open Venue Command
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {attentionItems.length > 0 ? attentionItems.map((item) => (
            <Link className="flex min-h-14 items-center justify-between gap-4 rounded-lg bg-[var(--background)] px-4 py-3 text-sm font-bold transition hover:bg-[var(--accent-soft)]" href={item.href} key={item.label}>
              <span>{item.label}</span>
              <span className="text-[var(--accent-strong)]">Open</span>
            </Link>
          )) : (
            <p className="rounded-lg bg-emerald-50 p-4 text-sm font-black text-emerald-900">No setup blockers. Open Venue Command to run the day.</p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Metric href="/admin/venues" label="Venues" value={venueCount} />
        <Metric href="/admin/fields" label="Fields" value={fieldCount} />
        <Metric href="/admin/sessions" label="Games" value={sessionCount} />
        <Metric href="/admin/sponsors" label="Sponsors" value={sponsorCount} />
      </section>
    </section>
  );
}

function Metric({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:border-[var(--accent)]" href={href}>
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
    </Link>
  );
}
