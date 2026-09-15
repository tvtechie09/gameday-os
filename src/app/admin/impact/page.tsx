import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { getRoleHome } from "@/lib/access/navigation";
import { canAccessAdminWorkspace } from "@/lib/access/capabilities";
import { getVenueImpact } from "@/lib/services/venue-impact";

export const dynamic = "force-dynamic";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className={`text-2xl font-black leading-none ${tone ?? "text-[var(--foreground)]"}`}>{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      {sub ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

export default async function ImpactPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminWorkspace(ctx)) redirect(getRoleHome(ctx));

  const { days } = await searchParams;
  const rangeDays = [30, 90, 365].includes(Number(days)) ? Number(days) : 30;
  const { venueName, report: r, management: m, headlines } = await getVenueImpact(ctx, rangeDays);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Impact</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">{venueName ?? "Your venue"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            What GameDay OS actually did here in the last {rangeDays} days. Every number below is counted from real
            records — nothing is modelled or estimated.
          </p>
        </div>
        <div className="flex gap-2">
          {[30, 90, 365].map((d) => (
            <Link
              key={d}
              href={`/admin/impact?days=${d}`}
              className={`inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-black ${d === rangeDays ? "bg-[var(--black-soft)] text-white" : "border border-[var(--line)] bg-white text-[var(--foreground)]"}`}
            >
              {d === 365 ? "1 yr" : `${d}d`}
            </Link>
          ))}
        </div>
      </header>

      {headlines.length > 0 ? (
        <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-800">The story so far</p>
          <ul className="mt-2 grid gap-1.5">
            {headlines.map((h) => (
              <li key={h} className="text-sm font-bold leading-6 text-emerald-900">· {h}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-5 text-sm font-semibold text-[var(--muted)]">
          Nothing recorded yet in this window. Once games run, alerts go out, and sponsors are fulfilled, the proof shows up here.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Schedule performance</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Games completed" value={String(m.games.completed)} sub={`${m.games.scheduled} scheduled`} />
          <Stat label="Delayed starts" value={m.games.delayMeasured ? String(m.games.delayed) : "—"} sub={`${m.games.delayMeasured} measured`} tone={m.games.delayed > 0 ? "text-amber-700" : "text-emerald-600"} />
          <Stat label="Average start delay" value={m.games.delayMeasured ? `${m.games.averageDelayMin} min` : "—"} sub={m.games.delayUnmeasured ? `${m.games.delayUnmeasured} unmeasured` : undefined} />
          <Stat label="Cancelled / postponed" value={`${m.games.cancelled} / ${m.games.postponed}`} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Active fields" value={String(m.utilization.activeFields)} />
          <Stat label="Scheduled field-hours" value={(m.utilization.scheduledMinutes / 60).toFixed(1)} />
          <Stat label="Schedule utilization" value={m.utilization.activeScheduleWindowMinutes ? pct(m.utilization.scheduleUtilizationRate) : "—"} sub="within active event-day span" />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Incident response</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Incidents" value={String(m.incidents.count)} sub={`${m.incidents.unresolved} unresolved`} />
          <Stat label="Mean time to assignment" value={m.incidents.assignedMeasured ? `${m.incidents.meanAssignmentMin} min` : "—"} sub={`${m.incidents.assignedMeasured} measured`} />
          <Stat label="Mean acknowledgement" value={m.incidents.acknowledgedMeasured ? `${m.incidents.meanAcknowledgementMin} min` : "—"} sub={`${m.incidents.acknowledgedMeasured} measured`} />
          <Stat label="Mean resolution" value={m.incidents.resolvedMeasured ? `${m.incidents.meanResolutionMin} min` : "—"} sub={`${m.incidents.resolvedMeasured} measured`} />
        </div>
        {m.incidents.recurringUnresolved.length ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-900">Recurring issues still open</p>
            <ul className="mt-2 grid gap-1.5">
              {m.incidents.recurringUnresolved.map((issue) => (
                <li key={issue.key} className="text-sm font-bold text-amber-950">
                  {issue.label} · {issue.occurrences} occurrences · {issue.unresolved} unresolved
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Device reliability</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Online now" value={m.devices.configured ? `${m.devices.onlineNow}/${m.devices.configured}` : "—"} sub={m.devices.configured ? pct(m.devices.currentOnlineRate) : "no configured devices"} tone={m.devices.currentOnlineRate >= 0.95 ? "text-emerald-600" : m.devices.configured ? "text-amber-700" : undefined} />
          <Stat label="Degraded now" value={String(m.devices.degradedNow)} />
          <Stat label="Offline / unknown" value={`${m.devices.offlineNow} / ${m.devices.unknownNow}`} />
          <Stat label="Measured uptime" value={m.devices.uptimeObservedMinutes ? pct(m.devices.uptimeRate) : "—"} sub={m.devices.uptimeObservedMinutes ? `${pct(m.devices.uptimeCoverageRate)} history coverage` : "history accumulating"} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Keeping people safe &amp; informed</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Alerts posted" value={String(r.alertsPosted)} />
          <Stat label="Families reached" value={r.familiesNotified.toLocaleString()} sub="delivered, not estimated" tone={r.familiesNotified > 0 ? "text-emerald-600" : undefined} />
          <Stat label="Weather holds" value={String(r.weatherHolds)} />
          <Stat label="Field issues closed" value={r.workOrdersOpened ? `${r.workOrdersClosed}/${r.workOrdersOpened}` : "—"} sub={r.workOrdersOpened ? pct(r.workOrderCloseRate) + " closed" : undefined} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted)]">Money we can prove</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Sponsor placements delivered" value={String(r.sponsorPlacementsDelivered)} tone="text-emerald-600" />
          <Stat label="Contracted" value={r.sponsorContracted ? String(r.sponsorContracted) : "—"} />
          <Stat label="Delivery rate" value={r.sponsorContracted ? pct(r.sponsorDeliveryRate) : "—"} tone={r.sponsorDeliveryRate >= 0.95 ? "text-emerald-600" : r.sponsorContracted ? "text-amber-700" : undefined} />
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Backed by the game record: each placement was fulfilled when a covered game went live or final.{" "}
          <Link href="/admin/sponsors/campaigns" className="font-black text-[var(--accent-strong)]">Per-sponsor proof →</Link>
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat label="Public venue & field views" value={m.audience.publicPageViews.toLocaleString()} sub="recorded views" />
          <Stat label="Sponsor impressions" value={m.audience.sponsorImpressions.toLocaleString()} sub="recorded, not estimated" />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">How to read this report</p>
        <ul className="mt-2 grid gap-1.5">
          {m.notes.map((note) => <li key={note} className="text-xs font-semibold leading-5 text-[var(--muted)]">· {note}</li>)}
        </ul>
      </section>

      <section className="mt-8 border-t border-[var(--line)] pt-5">
        <p className="text-sm font-black text-[var(--foreground)]">{r.automatedActions.toLocaleString()} actions recorded automatically instead of by hand.</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          Engine events + sponsor placements + family notifications. We deliberately don&apos;t convert this into
          &ldquo;hours saved&rdquo; — we&apos;d be inventing your labour rate. Multiply it by what your own time is worth.
        </p>
      </section>
    </div>
  );
}
