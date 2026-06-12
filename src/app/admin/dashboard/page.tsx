import Link from "next/link";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenues } from "@/lib/services/venues";
import type { Field, Session, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

type FieldOperations = {
  field: Field;
  venue: Venue | null;
  currentSession: Session | null;
  nextSession: Session | null;
  hasNoUpcomingSessions: boolean;
};

function isSameDay(value: string, date: Date) {
  const sessionDate = new Date(value);
  return (
    sessionDate.getFullYear() === date.getFullYear()
    && sessionDate.getMonth() === date.getMonth()
    && sessionDate.getDate() === date.getDate()
  );
}

function isActiveSession(session: Session, now: Date) {
  if (session.gameStatus === "active" || session.status === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const startsAt = new Date(session.startTime).getTime();
  const endsAt = new Date(session.endTime).getTime();
  return startsAt <= now.getTime() && now.getTime() <= endsAt;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatScore(session: Session | null) {
  if (!session) {
    return "No score";
  }

  return `${session.homeTeam} ${session.homeScore} - ${session.awayScore} ${session.awayTeam}`;
}

function getSessionStatus(session: Session | null, now: Date) {
  if (!session) {
    return "No upcoming";
  }

  if (isActiveSession(session, now)) {
    return "Live";
  }

  if (session.status === "final") {
    return "Final";
  }

  return "Scheduled";
}

function getStatusClass(status: string, delayed = false) {
  if (delayed) {
    return "bg-amber-100 text-amber-900 ring-1 ring-amber-200";
  }

  if (status === "Live") {
    return "bg-red-600 text-white";
  }

  if (status === "Final") {
    return "bg-[var(--black-soft)] text-white";
  }

  if (status === "No upcoming") {
    return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }

  return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
}

function buildFieldOperations(fields: Field[], venues: Venue[], sessions: Session[], now: Date): FieldOperations[] {
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

  return fields.map((field) => {
    const fieldSessions = sessions
      .filter((session) => session.fieldId === field.id)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const currentSession =
      fieldSessions.find((session) => isActiveSession(session, now))
      ?? fieldSessions.find((session) => isSameDay(session.startTime, now) && session.status === "final")
      ?? null;
    const nextSession = fieldSessions.find((session) => isUpcomingSession(session, now)) ?? null;

    return {
      field,
      venue: venuesById.get(field.venueId) ?? null,
      currentSession,
      nextSession,
      hasNoUpcomingSessions: !nextSession,
    };
  });
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{note}</p>
    </article>
  );
}

export default async function VenueOperationsDashboard() {
  const now = new Date();
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let errorMessage: string | null = null;

  try {
    [venues, fields, sessions] = await Promise.all([getVenues(), getFields(), getSessions()]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load venue operations.";
  }

  const todaySessions = sessions
    .filter((session) => isSameDay(session.startTime, now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const activeGames = sessions.filter((session) => isActiveSession(session, now));
  const upcomingGames = sessions.filter((session) => isUpcomingSession(session, now));
  const upcomingToday = todaySessions.filter((session) => isUpcomingSession(session, now));
  const delayedGames = todaySessions.filter(isDelayedSession);
  const fieldOperations = buildFieldOperations(fields, venues, sessions, now);
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Venue operations</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Live operations dashboard</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Monitor field activity, live games, upcoming sessions, and QR-ready parent links across every venue.
          </p>
        </div>
        <Link href="/admin/sessions/bulk" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
          Bulk session tools
        </Link>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load dashboard</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total venues" note="Configured venues" value={venues.length} />
            <SummaryCard label="Total fields" note="QR-ready fields" value={fields.length} />
            <SummaryCard label="Games today" note="All sessions today" value={todaySessions.length} />
            <SummaryCard label="Active games" note="Live now" value={activeGames.length} />
            <SummaryCard label="Upcoming games" note="Future scheduled games" value={upcomingGames.length} />
          </section>

          {delayedGames.length > 0 ? (
            <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-lg font-black text-amber-950">Delayed games</h2>
              <div className="mt-3 grid gap-2">
                {delayedGames.map((session) => {
                  const field = fieldsById.get(session.fieldId);
                  return (
                    <p key={session.id} className="text-sm font-semibold text-amber-900">
                      {formatTime(session.startTime)} · {session.title} {field ? `on ${field.name}` : ""}
                    </p>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-xl font-black">Venue overview</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {venues.map((venue) => {
                const venueFields = fields.filter((field) => field.venueId === venue.id);
                const venueFieldIds = new Set(venueFields.map((field) => field.id));
                const venueActiveGames = activeGames.filter((session) => venueFieldIds.has(session.fieldId));
                const venueUpcomingToday = upcomingToday.filter((session) => venueFieldIds.has(session.fieldId));

                return (
                  <article key={venue.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                    <h3 className="text-lg font-black">{venue.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue.address || "No address listed"}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Fields</p>
                        <p className="mt-1 text-xl font-black">{venueFields.length}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">Active</p>
                        <p className="mt-1 text-xl font-black text-red-700">{venueActiveGames.length}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--accent-soft)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">Today</p>
                        <p className="mt-1 text-xl font-black text-[var(--accent-strong)]">{venueUpcomingToday.length}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Field status grid</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Live fields, next sessions, and quick operator links.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {fieldOperations.map((operation) => {
                const visibleSession = operation.currentSession ?? operation.nextSession;
                const status = getSessionStatus(visibleSession, now);
                const delayed = visibleSession ? isDelayedSession(visibleSession) : false;

                return (
                  <article
                    key={operation.field.id}
                    className={
                      operation.hasNoUpcomingSessions
                        ? "rounded-lg border border-slate-200 bg-slate-50 p-5"
                        : status === "Live"
                          ? "rounded-lg border-2 border-red-500 bg-red-50 p-5"
                          : "rounded-lg border border-[var(--line)] bg-white p-5"
                    }
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{operation.venue?.name ?? "Venue unavailable"}</p>
                        <h3 className="mt-1 text-xl font-black">{operation.field.name}</h3>
                      </div>
                      <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusClass(status, delayed)}`}>
                        {delayed ? "Delayed" : status}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Current session</p>
                      {operation.currentSession ? (
                        <>
                          <h4 className="mt-2 text-lg font-black">{operation.currentSession.title}</h4>
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatDateTime(operation.currentSession.startTime)}</p>
                          <p className="mt-3 text-lg font-black">{formatScore(operation.currentSession)}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm font-semibold text-[var(--muted)]">No active or final session on this field.</p>
                      )}
                    </div>

                    <div className="mt-3 rounded-lg bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Next session</p>
                      {operation.nextSession ? (
                        <>
                          <h4 className="mt-2 text-base font-black">{operation.nextSession.title}</h4>
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatDateTime(operation.nextSession.startTime)}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm font-bold text-slate-600">No upcoming sessions scheduled.</p>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {visibleSession ? (
                        <Link href={`/admin/sessions/${visibleSession.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                          Edit Session
                        </Link>
                      ) : null}
                      <Link href={`/fields/${operation.field.id}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                        Open Public Field Page
                      </Link>
                      <Link href={`/admin/fields/${operation.field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-3 text-sm font-bold text-white">
                        Open QR Page
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-xl font-black">Today&apos;s schedule</h2>
            <div className="mt-4 grid gap-3">
              {todaySessions.length > 0 ? (
                todaySessions.map((session) => {
                  const field = fieldsById.get(session.fieldId);
                  const venue = field ? venuesById.get(field.venueId) : null;
                  const status = getSessionStatus(session, now);
                  const delayed = isDelayedSession(session);

                  return (
                    <article key={session.id} className={status === "Live" ? "rounded-lg border-2 border-red-500 bg-red-50 p-4" : "rounded-lg border border-[var(--line)] bg-[var(--background)] p-4"}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black">{formatTime(session.startTime)}</p>
                            <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusClass(status, delayed)}`}>
                              {delayed ? "Delayed" : status}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-black">{session.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                            {venue?.name ?? "Venue unavailable"} · {field?.name ?? "Field unavailable"}
                          </p>
                          <p className="mt-2 text-base font-black">{formatScore(session)}</p>
                        </div>
                        <div className="grid gap-2 sm:min-w-44">
                          <Link href={`/admin/sessions/${session.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                            Edit Session
                          </Link>
                          {field ? (
                            <>
                              <Link href={getPublicFieldUrl(field.id)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold">
                                Public Field
                              </Link>
                              <Link href={`/admin/fields/${field.id}/qr`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-3 text-sm font-bold text-white">
                                QR Page
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg bg-[var(--background)] p-5 text-sm leading-6 text-[var(--muted)]">
                  No sessions scheduled for today.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
