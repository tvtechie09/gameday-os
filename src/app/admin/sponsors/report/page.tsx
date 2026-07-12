import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { getSponsorAnalytics } from "@/lib/services/sponsor-analytics";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import type { SponsorAnalyticsRange } from "@/lib/types";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<SponsorAnalyticsRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time"
};

function readRange(value: string | undefined): SponsorAnalyticsRange {
  return value === "today" || value === "7d" || value === "all" ? value : "30d";
}

export default async function SponsorFulfillmentReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = readRange(rangeParam);
  let errorMessage: string | null = null;
  let rows: Array<{ id: string; name: string; websiteUrl: string | null; impressions: number; clicks: number; ctr: number; placements: number; placementLabels: string }> = [];

  try {
    const [sponsors, assignments] = await Promise.all([getSponsors(), getSponsorAssignments()]);
    const analytics = await getSponsorAnalytics(sponsors.map((sponsor) => sponsor.id), range);
    const analyticsById = new Map(analytics.map((item) => [item.sponsorId, item]));
    rows = sponsors
      .map((sponsor) => {
        const stats = analyticsById.get(sponsor.id);
        const sponsorAssignments = assignments.filter((assignment) => assignment.sponsorId === sponsor.id);
        return {
          id: sponsor.id,
          name: sponsor.name,
          websiteUrl: sponsor.websiteUrl,
          impressions: stats?.impressions ?? 0,
          clicks: stats?.clicks ?? 0,
          ctr: stats?.ctr ?? 0,
          placements: sponsorAssignments.length,
          placementLabels: Array.from(new Set(sponsorAssignments.map((assignment) => assignment.placementLabel))).join(", ")
        };
      })
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load the sponsor report.");
  }

  const totals = rows.reduce((acc, row) => ({ impressions: acc.impressions + row.impressions, clicks: acc.clicks + row.clicks }), { impressions: 0, clicks: 0 });
  const generatedAt = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const csv = ["Sponsor,Impressions,Clicks,CTR,Active Placements,Placement Types",
    ...rows.map((row) => [JSON.stringify(row.name), row.impressions, row.clicks, (row.ctr * 100).toFixed(2) + "%", row.placements, JSON.stringify(row.placementLabels)].join(","))].join("\n");

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 print:px-0 print:py-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sponsors</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Sponsor Fulfillment Report</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Proof of performance to send with invoices and renewals: impressions, clicks, and active placements per sponsor.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-white p-1">
            {(Object.keys(RANGE_LABELS) as SponsorAnalyticsRange[]).map((option) => (
              <Link key={option} href={"/admin/sponsors/report?range=" + option} className={"rounded-md px-3 py-2 text-sm font-bold " + (option === range ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)]")}>
                {RANGE_LABELS[option]}
              </Link>
            ))}
          </div>
          <ReportActions csv={csv} fileName={"sponsor-fulfillment-" + range + ".csv"} />
        </div>
      </div>

      <div className="mt-6 hidden print:block">
        <h1 className="text-2xl font-black">Sponsor Fulfillment Report</h1>
        <p className="text-sm text-[var(--muted)]">{RANGE_LABELS[range]} · Generated {generatedAt} · GameDay OS</p>
      </div>

      {errorMessage ? (
        <p className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{errorMessage}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--line)] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total impressions</p><p className="mt-1 text-2xl font-black">{totals.impressions.toLocaleString()}</p></div>
            <div className="rounded-lg border border-[var(--line)] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total clicks</p><p className="mt-1 text-2xl font-black">{totals.clicks.toLocaleString()}</p></div>
            <div className="rounded-lg border border-[var(--line)] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Sponsors</p><p className="mt-1 text-2xl font-black">{rows.length}</p></div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--line)] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-4 py-3">Sponsor</th><th className="px-4 py-3">Impressions</th><th className="px-4 py-3">Clicks</th><th className="px-4 py-3">CTR</th><th className="px-4 py-3">Active placements</th><th className="px-4 py-3">Placement types</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--line)]/60">
                    <td className="px-4 py-3 font-black">{row.name}</td>
                    <td className="px-4 py-3 font-bold">{row.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">{row.clicks.toLocaleString()}</td>
                    <td className="px-4 py-3">{(row.ctr * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3">{row.placements}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.placementLabels || "—"}</td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>No sponsors configured yet. Add sponsors and placements, and QR field pages start counting impressions automatically.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Impressions count sponsor renders on public field pages and displays; clicks count sponsor link taps. {RANGE_LABELS[range]} · Generated {generatedAt}.</p>
        </>
      )}
    </section>
  );
}
