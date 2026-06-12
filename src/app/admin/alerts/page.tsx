import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getAlertLabel, getAlertTone, getAlerts, isAlertActive } from "@/lib/services/alerts";
import { getFields } from "@/lib/services/fields";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AlertsPage() {
  const [alerts, venues, fields, tournaments] = await Promise.all([getAlerts(), getVenues(), getFields(), getTournaments()]);
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Communications</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue alerts</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Manage active and scheduled messages for venue, tournament, and field pages.
          </p>
        </div>
        <Link href="/admin/alerts/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New alert
        </Link>
      </div>

      {alerts.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {alerts.map((alert) => (
            <article key={alert.id} className={`rounded-lg border p-5 ${getAlertTone(alert.alertType)}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)}</p>
                    <span className={isAlertActive(alert) ? "rounded-md bg-green-100 px-2 py-1 text-xs font-black uppercase text-green-800" : "rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase"}>
                      {isAlertActive(alert) ? "Active now" : alert.isActive ? "Scheduled" : "Inactive"}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black">{alert.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{alert.message}</p>
                  <p className="mt-3 text-sm font-semibold">
                    {venuesById.get(alert.venueId)?.name ?? "Venue unavailable"}
                    {alert.tournamentId ? ` · ${tournamentsById.get(alert.tournamentId)?.name ?? "Tournament unavailable"}` : ""}
                    {alert.fieldId ? ` · ${fieldsById.get(alert.fieldId)?.name ?? "Field unavailable"}` : ""}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] opacity-75">
                    {formatDateTime(alert.startTime)} - {formatDateTime(alert.endTime)}
                  </p>
                </div>
                <Link href={`/admin/alerts/${alert.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-current bg-white/80 px-4 text-sm font-bold">
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No alerts yet" message="Create an alert to communicate weather, parking, delay, or field updates." actionHref="/admin/alerts/new" actionLabel="Create alert" />
        </div>
      )}
    </section>
  );
}
