import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getExternalSources, getExternalSourceStatusLabel, getExternalSourceTypeLabel } from "@/lib/services/external-sources";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { ExternalSourceStatus } from "@/lib/types";
import { CalendarImportAdapter } from "./calendar-import-adapter";

export const dynamic = "force-dynamic";

function formatLastSync(value: string | null) {
  if (!value) return "Never synced";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: ExternalSourceStatus) {
  if (status === "connected") {
    return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  }
  if (status === "error") {
    return "bg-red-50 text-red-800";
  }
  if (status === "paused") {
    return "bg-amber-50 text-amber-900";
  }
  if (status === "not_configured") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default async function IntegrationsPage() {
  const [sources, venues, fields, sessions] = await Promise.all([getExternalSources(), getVenues(), getFields(), getSessions()]);
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Integrations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">External data sources</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Store public URLs, feed URLs, and notes for SportsEngine, HomeTeamsOnline, TeamSnap, GameChanger, CSV, iCal, and other sources.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/integrations/health" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Health dashboard
          </Link>
          <Link href="/admin/integrations/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New source
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["SportsEngine", "Export your schedule from SportsEngine or paste a public calendar feed URL."],
          ["HomeTeamsOnline", "Export your schedule from HomeTeamsOnline or paste a public calendar feed URL if available."],
          ["TeamSnap", "Prepare source records before API access."],
          ["CSV / iCal", "Track files and feed URLs used for imports."],
        ].map(([title, note]) => (
          <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={title}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Source option</p>
            <h2 className="mt-2 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
          </article>
        ))}
      </section>

      <CalendarImportAdapter fields={fields} sessions={sessions} sources={sources} venues={venues} />

      {sources.length > 0 ? (
        <section className="mt-8 grid gap-4">
          {sources.map((source) => (
            <article className="rounded-lg border border-[var(--line)] bg-white p-5" key={source.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em]">
                      {getExternalSourceTypeLabel(source.sourceType)}
                    </span>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(source.sourceStatus)}`}>
                      {getExternalSourceStatusLabel(source.sourceStatus)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black">{source.sourceName}</h2>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venuesById.get(source.venueId)?.name ?? "Venue unavailable"}</p>
                  {source.sourceUrl ? (
                    <p className="mt-3 break-all text-sm font-bold text-[var(--accent-strong)]">{source.sourceUrl}</p>
                  ) : null}
                  {source.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{source.notes}</p> : null}
                </div>
                <div className="rounded-lg bg-[var(--background)] p-4 lg:min-w-48">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Last Sync</p>
                  <p className="mt-2 text-sm font-black">{formatLastSync(source.lastSyncAt)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="mt-8">
          <EmptyState
            actionHref="/admin/integrations/new"
            actionLabel="Create source"
            message="Create an external source record for a venue before wiring up future imports or API connections."
            title="No external sources yet"
          />
        </div>
      )}
    </section>
  );
}
