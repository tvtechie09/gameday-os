import Link from "next/link";
import { getSponsors } from "@/lib/services/sponsors";
import { getScopedOrganizationIds, getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSponsorCampaigns, getRevenueOpportunities } from "@/lib/services/sponsor-campaigns";
import { CampaignForm } from "./campaign-form";

export const dynamic = "force-dynamic";

function todayInChicago(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function dateRange(startsOn: string, endsOn: string): string {
  const fmt = (d: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "America/Chicago" }).format(new Date(d + "T12:00:00Z"));
  return startsOn === endsOn ? fmt(startsOn) : `${fmt(startsOn)} – ${fmt(endsOn)}`;
}

export default async function SponsorCampaignsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [allSponsors, scoped, allCampaigns, opportunities, scopedOrgIds] = await Promise.all([
    getSponsors().catch(() => []),
    getScopedVenuesAndFields().catch(() => ({ venues: [], fields: [] })),
    getSponsorCampaigns().catch(() => []),
    getRevenueOpportunities().catch(() => []),
    getScopedOrganizationIds().catch(() => null),
  ]);
  const venues = scoped.venues;
  // Isolate sponsors + campaigns to the caller's orgs (null scope = all).
  const sponsors = scopedOrgIds ? allSponsors.filter((s) => !s.organizationId || scopedOrgIds.has(s.organizationId)) : allSponsors;
  const campaigns = scopedOrgIds ? allCampaigns.filter((c) => !c.organizationId || scopedOrgIds.has(c.organizationId)) : allCampaigns;
  const sponsorName = new Map(sponsors.map((s) => [s.id, s.name]));
  const oppTone: Record<string, string> = {
    high: "border-red-300 bg-red-50 text-red-900",
    medium: "border-amber-300 bg-amber-50 text-amber-950",
    low: "border-[var(--line)] bg-white text-[var(--foreground)]",
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Revenue Engine</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Sponsor Campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Sell packages with contracted inventory, then prove delivery automatically. Each game a campaign covers fulfills its
            sponsor assets as it goes live and final — the game record is the receipt.
          </p>
        </div>
        <Link href="/admin/sponsors" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
          Sponsors
        </Link>
      </header>

      {error ? (
        <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {error === "missing" ? "Sponsor, name, and dates are required." : error}
        </p>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Revenue opportunities</h2>
        {opportunities.length === 0 ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Inventory looks well sold — no obvious gaps right now.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {opportunities.map((o) => (
              <Link key={o.key} href={o.href} className={`rounded-xl border p-4 shadow-sm transition hover:brightness-[0.98] ${oppTone[o.severity]}`}>
                <p className="text-3xl font-black leading-none">{o.count}</p>
                <p className="mt-2 text-sm font-black leading-snug">{o.title}</p>
                <p className="mt-1 text-xs font-semibold opacity-80">{o.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">New campaign</h2>
          {sponsors.length === 0 ? (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">
              Add a sponsor first, then come back to sell them a package.{" "}
              <Link href="/admin/sponsors/new" className="font-black text-[var(--accent-strong)]">New sponsor →</Link>
            </p>
          ) : (
            <div className="mt-3">
              <CampaignForm sponsors={sponsors} venues={venues} today={todayInChicago()} />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Campaigns</h2>
          <div className="mt-3 grid gap-3">
            {campaigns.length === 0 ? (
              <p className="rounded-xl border border-[var(--line)] bg-white p-5 text-sm font-semibold text-[var(--muted)]">No campaigns yet.</p>
            ) : (
              campaigns.map((c) => {
                const contractedTotal = Object.values(c.contracted).reduce((a, b) => a + (b ?? 0), 0);
                return (
                  <Link key={c.id} href={`/admin/sponsors/campaigns/${c.id}`} className="block rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:border-[var(--accent)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black text-[var(--foreground)]">{c.name}</p>
                      <span className="shrink-0 rounded-md bg-[var(--background)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">{c.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                      {sponsorName.get(c.sponsorId) ?? "Sponsor"}
                      {c.packageName ? ` · ${c.packageName}` : ""} · {dateRange(c.startsOn, c.endsOn)} · {contractedTotal} contracted placements
                    </p>
                    <p className="mt-2 text-xs font-black text-[var(--accent-strong)]">View proof of performance →</p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
