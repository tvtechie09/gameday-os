import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { alertTypes, getAlertLabel, getAlertPriorityLabel, getAlertScopeLabel, getAlertTone, getAlerts, isAlertActive, isAlertExpired, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getFields } from "@/lib/services/fields";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";

export const dynamic = "force-dynamic";

type AlertsPageProps = {
  searchParams?: Promise<{
    active?: string;
    alert_type?: string;
    field_id?: string;
    tournament_id?: string;
    venue_id?: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const filters = await searchParams;
  const [alerts, venues, fields, tournaments] = await Promise.all([getAlerts(), getVenues(), getFields(), getTournaments()]);
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const visibleAlerts = sortAlertsForDisplay(alerts.filter((alert) => {
    if (filters?.venue_id && alert.venueId !== filters.venue_id) return false;
    if (filters?.field_id && alert.fieldId !== filters.field_id) return false;
    if (filters?.tournament_id && alert.tournamentId !== filters.tournament_id) return false;
    if (filters?.alert_type && alert.alertType !== filters.alert_type) return false;
    if (filters?.active === "active" && !isAlertActive(alert)) return false;
    if (filters?.active === "expired" && !isAlertExpired(alert)) return false;
    return true;
  }));

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

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Venue</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={filters?.venue_id ?? ""} name="venue_id">
            <option value="">All venues</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Field</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={filters?.field_id ?? ""} name="field_id">
            <option value="">All fields</option>
            {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Tournament</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={filters?.tournament_id ?? ""} name="tournament_id">
            <option value="">All tournaments</option>
            {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Type</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={filters?.alert_type ?? ""} name="alert_type">
            <option value="">All types</option>
            {alertTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">State</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={filters?.active ?? ""} name="active">
            <option value="">All states</option>
            <option value="active">Active now</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white" type="submit">Apply filters</button>
          <Link href="/admin/alerts" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">Clear</Link>
        </div>
      </form>

      {visibleAlerts.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {visibleAlerts.map((alert) => (
            <article key={alert.id} className={`rounded-lg border p-5 ${getAlertTone(alert.alertType)}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)}</p>
                    <span className={isAlertActive(alert) ? "rounded-md bg-green-100 px-2 py-1 text-xs font-black uppercase text-green-800" : "rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase"}>
                      {isAlertActive(alert) ? "Active now" : isAlertExpired(alert) ? "Expired" : alert.isActive ? "Scheduled" : "Inactive"}
                    </span>
                    <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase">{getAlertPriorityLabel(alert.alertPriority)}</span>
                    <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase">{alert.alertVisibility.replace("_", " ")}</span>
                    <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase">
                      {getAlertScopeLabel(alert.alertScope)}
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
