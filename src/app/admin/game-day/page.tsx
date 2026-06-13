import Link from "next/link";
import { getPublicFieldUrl } from "@/lib/public-url";
import { filterAlertsForFieldPage, getActiveAlerts } from "@/lib/services/alerts";
import { getFields, getFieldStatusClass, getFieldStatusLabel } from "@/lib/services/fields";
import { getResourceActivations } from "@/lib/services/resource-activations";
import { getSessions } from "@/lib/services/sessions";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenues } from "@/lib/services/venues";
import { getVolunteerRoles } from "@/lib/services/volunteer-roles";
import type { Alert, Field, ResourceActivation, Session, Tournament, Venue, VolunteerRole } from "@/lib/types";

export const dynamic = "force-dynamic";

type GameDayPageProps = {
  searchParams?: Promise<{
    sport?: string;
    tournament?: string;
    venue?: string;
  }>;
};

type FieldCard = {
  field: Field;
  venue: Venue | null;
  currentSession: Session | null;
  nextSession: Session | null;
  resourcesCount: number;
  alertsCount: number;
  activeVolunteersCount: number;
};

const sportFilters = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"] as const;

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load game day ${label}`, error);
    return [];
  }
}

function isSameDay(value: string, date: Date) {
  const sessionDate = new Date(value);
  return (
    sessionDate.getFullYear() === date.getFullYear()
    && sessionDate.getMonth() === date.getMonth()
    && sessionDate.getDate() === date.getDate()
  );
}

function isActiveSession(session: Session, now: Date) {
  if (session.status === "active" || session.gameStatus === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const timestamp = now.getTime();
  return new Date(session.startTime).getTime() <= timestamp && timestamp <= new Date(session.endTime).getTime();
}

function isUpcomingSession(session: Session, now: Date) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > now.getTime();
}

function isDelayedSession(session: Session) {
  return session.notes?.toLowerCase().includes("delay") ?? false;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatScore(session: Session | null) {
  if (!session) {
    return "No score";
  }

  return `${session.homeTeam} ${session.homeScore} - ${session.awayScore} ${session.awayTeam}`;
}

function SummaryCard({ label, note, value }: { label: string; note: string; value: number }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{note}</p>
    </article>
  );
}

function getFieldCardTone(card: FieldCard) {
  if (card.field.status === "closed") {
    return "border-red-300 bg-red-50";
  }

  if (card.field.status === "delayed") {
    return "border-amber-300 bg-amber-50";
  }

  if (card.resourcesCount === 0 || card.activeVolunteersCount === 0) {
    return "border-slate-300 bg-slate-50";
  }

  return "border-[var(--line)] bg-white";
}

function buildFieldCards({
  activeAlerts,
  fields,
  resourceActivations,
  sessions,
  venues,
  volunteerRoles,
}: {
  activeAlerts: Alert[];
  fields: Field[];
  resourceActivations: ResourceActivation[];
  sessions: Session[];
  venues: Venue[];
  volunteerRoles: VolunteerRole[];
}) {
  const now = new Date();
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

  return fields.map((field): FieldCard => {
    const fieldSessions = sessions
      .filter((session) => session.fieldId === field.id)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const currentSession = fieldSessions.find((session) => isActiveSession(session, now)) ?? null;
    const nextSession = fieldSessions.find((session) => isUpcomingSession(session, now)) ?? null;
    const activeSessionContext = currentSession ?? nextSession;
    const activeResources = resourceActivations.filter((activation) => (
      activation.status === "active"
      && activation.fieldId === field.id
      && (!activation.sessionId || activation.sessionId === activeSessionContext?.id)
    ));
    const activeVolunteers = volunteerRoles.filter((role) => (
      (role.status === "active" || role.status === "approved")
      && role.fieldId === field.id
      && (!role.sessionId || role.sessionId === activeSessionContext?.id)
    ));

    return {
      activeVolunteersCount: activeVolunteers.length,
      alertsCount: filterAlertsForFieldPage({
        alerts: activeAlerts,
        fieldId: field.id,
        publicOnly: false,
        tournamentId: activeSessionContext?.tournamentId,
        venueId: field.venueId,
      }).length,
      currentSession,
      field,
      nextSession,
      resourcesCount: activeResources.length,
      venue: venuesById.get(field.venueId) ?? null,
    };
  });
}

export default async function GameDayOperationsCenterPage({ searchParams }: GameDayPageProps) {
  const filters = await searchParams;
  const selectedVenueId = filters?.venue ?? "";
  const selectedTournamentId = filters?.tournament ?? "";
  const selectedSport = sportFilters.find((sport) => sport === filters?.sport) ?? "";
  const now = new Date();
  const [venues, fields, sessions, tournaments, activeAlerts, resourceActivations, volunteerRoles] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Tournament>("tournaments", getTournaments),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
    safeLoad<VolunteerRole>("volunteer roles", getVolunteerRoles),
  ]);

  const filteredFields = fields.filter((field) => !selectedVenueId || field.venueId === selectedVenueId);
  const filteredSessions = sessions.filter((session) => {
    if (selectedTournamentId && session.tournamentId !== selectedTournamentId) return false;
    if (selectedSport && session.sportType !== selectedSport) return false;
    return filteredFields.some((field) => field.id === session.fieldId);
  });
  const activeGames = filteredSessions.filter((session) => isActiveSession(session, now));
  const upcomingGames = filteredSessions.filter((session) => isUpcomingSession(session, now));
  const delayedGames = filteredSessions.filter((session) => isSameDay(session.startTime, now) && isDelayedSession(session));
  const fieldCards = buildFieldCards({
    activeAlerts,
    fields: filteredFields.filter((field) => {
      if (selectedSport && field.sportType !== selectedSport) return false;
      if (selectedTournamentId) {
        return filteredSessions.some((session) => session.fieldId === field.id);
      }
      return true;
    }),
    resourceActivations,
    sessions: filteredSessions,
    venues,
    volunteerRoles,
  });
  const activeResources = resourceActivations.filter((activation) => activation.status === "active");
  const activeVolunteers = volunteerRoles.filter((role) => role.status === "active" || role.status === "approved");

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Game day</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Operations center</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            One command view for live fields, game status, alerts, resources, and volunteer coverage.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/status-board" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Open Status Board
          </Link>
          <Link href="/admin/resources/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            Open Resource Dashboard
          </Link>
        </div>
      </div>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 md:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Venue</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={selectedVenueId} name="venue">
            <option value="">All venues</option>
            {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Tournament</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={selectedTournamentId} name="tournament">
            <option value="">All tournaments</option>
            {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sport Type</span>
          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={selectedSport} name="sport">
            <option value="">All sports</option>
            {sportFilters.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
          </select>
        </label>
        <div className="flex gap-2 md:self-end">
          <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white" type="submit">Apply</button>
          <Link href="/admin/game-day" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">Clear</Link>
        </div>
      </form>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Active Games" note="Live now" value={activeGames.length} />
        <SummaryCard label="Upcoming Games" note="Scheduled future games" value={upcomingGames.length} />
        <SummaryCard label="Delayed Games" note="Today's sessions with delay notes" value={delayedGames.length} />
        <SummaryCard label="Active Alerts" note="In active window" value={activeAlerts.length} />
        <SummaryCard label="Active Resources" note="Approved active resources" value={activeResources.length} />
        <SummaryCard label="Active Volunteers" note="Approved or active roles" value={activeVolunteers.length} />
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Live field grid</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Delayed, closed, and missing coverage fields are highlighted.</p>
          </div>
          <p className="text-sm font-black text-[var(--muted)]">{fieldCards.length} fields shown</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {fieldCards.map((card) => {
            const needsResources = card.resourcesCount === 0;
            const needsVolunteers = card.activeVolunteersCount === 0;
            const visibleSession = card.currentSession ?? card.nextSession;

            return (
              <article className={`rounded-lg border p-4 shadow-sm ${getFieldCardTone(card)}`} key={card.field.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{card.venue?.name ?? "Venue unavailable"}</p>
                    <h3 className="mt-1 truncate text-xl font-black">{card.field.name}</h3>
                    <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(card.field.status)}`}>
                      {getFieldStatusLabel(card.field.status)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={getPublicFieldUrl(card.field.id)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-xs font-black">
                      Open Field Page
                    </Link>
                    {visibleSession ? (
                      <Link href={`/admin/sessions/${visibleSession.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--black-soft)] px-3 text-xs font-black text-white">
                        Open Session Dashboard
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Current Session</p>
                  {card.currentSession ? (
                    <>
                      <p className="mt-1 text-base font-black">{card.currentSession.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatScore(card.currentSession)}</p>
                    </>
                  ) : card.nextSession ? (
                    <>
                      <p className="mt-1 text-base font-black">{card.nextSession.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Next at {formatTime(card.nextSession.startTime)}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">No active or upcoming session</p>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Resources</p>
                    <p className="mt-1 text-xl font-black">{card.resourcesCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Alerts</p>
                    <p className="mt-1 text-xl font-black">{card.alertsCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Volunteers</p>
                    <p className="mt-1 text-xl font-black">{card.activeVolunteersCount}</p>
                  </div>
                </div>

                {(card.field.status === "delayed" || card.field.status === "closed" || needsResources || needsVolunteers) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.field.status === "delayed" ? <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-900">Delayed field</span> : null}
                    {card.field.status === "closed" ? <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-red-900">Closed field</span> : null}
                    {needsResources ? <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-800">Missing resources</span> : null}
                    {needsVolunteers ? <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-800">Missing volunteers</span> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
