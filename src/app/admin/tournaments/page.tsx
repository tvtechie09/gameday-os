import Image from "next/image";
import { publicErrorMessage } from "@/lib/public-error";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { getActiveAlerts, getAlertLabel, getAlertTone } from "@/lib/services/alerts";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";
import type { Alert, Field, Session, Tournament, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function isUpcoming(session: Session) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > Date.now();
}

function getTournamentMetrics(tournament: Tournament, sessions: Session[], fields: Field[], venues: Venue[]) {
  const tournamentSessions = sessions.filter((session) => session.tournamentId === tournament.id);
  const fieldIds = new Set(tournamentSessions.map((session) => session.fieldId));
  const tournamentFields = fields.filter((field) => fieldIds.has(field.id));
  const venueIds = new Set(tournamentFields.map((field) => field.venueId));

  return {
    totalSessions: tournamentSessions.length,
    activeSessions: tournamentSessions.filter((session) => session.status === "active").length,
    upcomingSessions: tournamentSessions.filter(isUpcoming).length,
    participatingVenues: venues.filter((venue) => venueIds.has(venue.id)).length,
    participatingFields: tournamentFields.length,
  };
}

export default async function TournamentsPage() {
  let tournaments: Tournament[] = [];
  let sessions: Session[] = [];
  let fields: Field[] = [];
  let venues: Venue[] = [];
  let activeAlerts: Alert[] = [];
  let errorMessage: string | null = null;

  try {
    [tournaments, sessions, fields, venues, activeAlerts] = await Promise.all([getTournaments(), getSessions(), getFields(), getVenues(), getActiveAlerts()]);
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load tournaments.");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Tournaments</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Tournament management</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Group sessions into tournament operations views and branded public field context.
          </p>
        </div>
        <Link href="/admin/tournaments/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
          New tournament
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load tournaments</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : tournaments.length > 0 ? (
        <div className="mt-8 grid gap-5">
          {tournaments.map((tournament) => {
            const metrics = getTournamentMetrics(tournament, sessions, fields, venues);
            const tournamentAlerts = activeAlerts.filter((alert) => alert.tournamentId === tournament.id);
            return (
              <article key={tournament.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {tournament.logoUrl ? (
                      <Image alt="" className="h-16 w-16 rounded-lg border border-[var(--line)] object-contain p-2" height={64} src={tournament.logoUrl} unoptimized width={64} />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xl font-black text-[var(--accent-strong)]">
                        {tournament.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-xl font-black">{tournament.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </p>
                      {tournament.description ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{tournament.description}</p> : null}
                    </div>
                  </div>
                  <Link href={`/admin/tournaments/${tournament.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                    Edit
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  {[
                    ["Sessions", metrics.totalSessions],
                    ["Active", metrics.activeSessions],
                    ["Upcoming", metrics.upcomingSessions],
                    ["Venues", metrics.participatingVenues],
                    ["Fields", metrics.participatingFields],
                  ].map(([label, value]) => (
                    <div className="rounded-lg bg-[var(--background)] p-3" key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
                {tournamentAlerts.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    <h3 className="text-base font-black">Active tournament alerts</h3>
                    {tournamentAlerts.map((alert) => (
                      <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
                        <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)}</p>
                        <h4 className="mt-1 text-lg font-black">{alert.title}</h4>
                        <p className="mt-2 text-sm leading-6">{alert.message}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No tournaments yet" message="Create a tournament before assigning sessions to it." actionHref="/admin/tournaments/new" actionLabel="Create tournament" />
        </div>
      )}
    </section>
  );
}
