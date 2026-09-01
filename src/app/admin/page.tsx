import Link from "next/link";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import { Card, PageShell, SectionHeader, buttonStyles } from "@/components/ui/gameday-ui";

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
    <PageShell>
      <div className="rounded-2xl bg-[var(--black-soft)] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">GameDay OS</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">What needs attention today?</h1>
        <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/75">
          Start with the next useful action. Setup, reports, and advanced tools stay available when you need them.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={primaryAction.href} className={buttonStyles("secondary", "bg-white ring-0 hover:bg-white/90")}>
            {primaryAction.label}
          </Link>
          <Link href="/admin/command-center" className={buttonStyles("quiet", "border border-white/20 bg-white/10 text-white hover:bg-white/15")}>
            View Game Day
          </Link>
        </div>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeader action={
          <Link href="/admin/operations-center" className="flex min-h-12 items-center text-sm font-black text-[var(--accent-strong)] hover:underline">
            Open Venue Command
          </Link>
        } description="Start with the next useful action." title="Next steps" />
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
      </Card>

      <details className="ui-surface mt-6 overflow-hidden">
        <summary className="flex min-h-14 cursor-pointer items-center px-5 text-sm font-black text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]">Platform inventory</summary>
        <div className="grid gap-3 border-t border-[var(--line)] p-5 sm:grid-cols-4">
          <Metric href="/admin/venues" label="Venues" value={venueCount} />
          <Metric href="/admin/fields" label="Fields" value={fieldCount} />
          <Metric href="/admin/sessions" label="Games" value={sessionCount} />
          <Metric href="/admin/sponsors" label="Sponsors" value={sponsorCount} />
        </div>
      </details>
    </PageShell>
  );
}

function Metric({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link className="ui-surface min-h-24 p-4 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]" href={href}>
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
    </Link>
  );
}
