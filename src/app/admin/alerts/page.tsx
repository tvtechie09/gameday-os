import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { StatusChip, buttonStyles } from "@/components/ui/gameday-ui";
import { alertTypes, getAlertScopeLabel, getAlertTone, getAlerts, isAlertActive, isAlertExpired, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getScopedOrganizationIds, getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getTournaments } from "@/lib/services/tournaments";
import { alertLevelFor, alertLevelPresentation, alertTypeLabel } from "@/lib/ui/status-presentation";
import { clearAlertAction, clearAllActiveOperationsAlertsAction, expireAlertAction, hideAlertFromPublicAction } from "./actions";

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
  const [allAlerts, scoped, allTournaments, scopedOrgIds] = await Promise.all([getAlerts(), getScopedVenuesAndFields(), getTournaments(), getScopedOrganizationIds()]);
  const venues = scoped.venues;
  const fields = scoped.fields;
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const venueIds = new Set(venues.map((venue) => venue.id));
  const inOrgScope = (organizationId: string | null | undefined) => !scopedOrgIds || !organizationId || scopedOrgIds.has(organizationId);
  // Isolate: venue/field-scoped alerts gate on the venue; global/tournament
  // alerts (no owning venue) gate on the org. Platform/org admins (null scope)
  // see everything.
  const tournaments = allTournaments.filter((tournament) => inOrgScope(tournament.organizationId));
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const alerts = allAlerts.filter((alert) =>
    alert.alertScope === "venue" || alert.alertScope === "field" ? venueIds.has(alert.venueId) : inOrgScope(alert.organizationId),
  );
  const visibleAlerts = sortAlertsForDisplay(alerts.filter((alert) => {
    if (filters?.venue_id && alert.venueId !== filters.venue_id) return false;
    if (filters?.field_id && alert.fieldId !== filters.field_id) return false;
    if (filters?.tournament_id && alert.tournamentId !== filters.tournament_id) return false;
    if (filters?.alert_type && alert.alertType !== filters.alert_type) return false;
    if (filters?.active === "active" && !isAlertActive(alert)) return false;
    if (filters?.active === "expired" && !isAlertExpired(alert)) return false;
    return true;
  }));
  const hasFilters = Boolean(filters?.venue_id || filters?.field_id || filters?.tournament_id || filters?.alert_type || filters?.active);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Communications</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Venue alerts</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Publish parent-safe venue, tournament, and field updates. Family relevance and expiration are enforced automatically.
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-44">
          <Link href="/admin/alerts/new" className={buttonStyles("primary", "min-h-12")}>Publish update</Link>
          <details className="group rounded-lg border border-[var(--line)] bg-white"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-[var(--accent-strong)]">More tools <span aria-hidden="true">⌄</span></summary><div className="border-t border-[var(--line)] p-2"><Link href="/admin/alerts/storm" className={buttonStyles("quiet", "w-full")}>Storm watch</Link></div></details>
        </div>
      </div>

      <details className="mt-8 rounded-lg border border-[var(--line)] bg-white" open={hasFilters}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--accent-strong)]">Filter updates {hasFilters ? <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs">Filters active</span> : null}</summary>
      <form className="grid gap-3 border-t border-[var(--line)] p-4 sm:grid-cols-2 lg:grid-cols-5">
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
            {alertTypes.map((type) => <option key={type} value={type}>{alertTypeLabel(type)}</option>)}
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
      </details>

      <details className="mt-5 rounded-lg border border-[var(--line)] bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold text-[var(--accent-strong)]">Advanced cleanup <span aria-hidden="true">⌄</span></summary>
        <div className="flex flex-col gap-3 border-t border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Operations alert cleanup</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Close active delay, weather, emergency, and field closure alerts for one venue.</p>
          </div>
          <form action={clearAllActiveOperationsAlertsAction} className="flex flex-col gap-2 sm:flex-row">
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" name="venue_id" required>
              <option value="">Choose venue</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
            <button className="min-h-11 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">
              Clear all active operations alerts
            </button>
          </form>
        </div>
      </details>

      {visibleAlerts.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {visibleAlerts.map((alert) => {
            const level = alertLevelPresentation(alertLevelFor(alert.alertPriority, alert.alertType));
            return (
            <article key={alert.id} className={`rounded-lg border p-5 ${getAlertTone(alert.alertType)}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={level.tone}>{level.label}</StatusChip>
                    <span className={isAlertActive(alert) ? "rounded-md bg-green-100 px-2 py-1 text-xs font-black uppercase text-green-800" : "rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase"}>
                      {isAlertActive(alert) ? "Active now" : isAlertExpired(alert) ? "Expired" : alert.isActive ? "Scheduled" : "Inactive"}
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
                <details className="rounded-lg border border-current/30 bg-white/60 sm:min-w-44">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold">Manage update <span aria-hidden="true">⌄</span></summary>
                <div className="grid gap-2 border-t border-current/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] opacity-75">{alertTypeLabel(alert.alertType)} · {getAlertScopeLabel(alert.alertScope)} · {alert.alertVisibility === "public" ? "Families and public" : "Venue staff only"}</p>
                  <Link href={`/admin/alerts/${alert.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-current bg-white/80 px-4 text-sm font-bold">
                    Edit update
                  </Link>
                  <form action={clearAlertAction}>
                    <input name="alert_id" type="hidden" value={alert.id} />
                    <button className="min-h-10 w-full rounded-lg border border-current bg-white/80 px-4 text-sm font-bold" type="submit">
                      Clear alert
                    </button>
                  </form>
                  <form action={expireAlertAction}>
                    <input name="alert_id" type="hidden" value={alert.id} />
                    <button className="min-h-10 w-full rounded-lg border border-current bg-white/80 px-4 text-sm font-bold" type="submit">
                      Expire alert
                    </button>
                  </form>
                  {alert.alertVisibility === "public" ? (
                    <form action={hideAlertFromPublicAction}>
                      <input name="alert_id" type="hidden" value={alert.id} />
                      <button className="min-h-10 w-full rounded-lg border border-current bg-white/80 px-4 text-sm font-bold" type="submit">
                        Hide from public
                      </button>
                    </form>
                  ) : null}
                </div>
                </details>
              </div>
            </article>
          );})}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No updates yet" message="Publish an update for weather, parking, delays, or field changes." actionHref="/admin/alerts/new" actionLabel="Publish update" />
        </div>
      )}
    </section>
  );
}
