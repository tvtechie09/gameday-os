import Link from "next/link";
import { publicErrorMessage } from "@/lib/public-error";
import { EmptyState } from "@/components/empty-state";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";
import { getTournaments } from "@/lib/services/tournaments";
import type { Field, Session, Tournament, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function groupSessions(venues: Venue[], fields: Field[], sessions: Session[]) {
  return venues
    .map((venue) => {
      const venueFields = fields.filter((field) => field.venueId === venue.id);
      const fieldGroups = venueFields
        .map((field) => ({
          field,
          sessions: sessions.filter((session) => session.fieldId === field.id),
        }))
        .filter((group) => group.sessions.length > 0);

      return { venue, fieldGroups };
    })
    .filter((group) => group.fieldGroups.length > 0);
}

export default async function SessionsPage() {
  let venues: Venue[] = [];
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let tournaments: Tournament[] = [];
  let errorMessage: string | null = null;

  try {
    const [scoped, allSessions, allTournaments] = await Promise.all([getScopedVenuesAndFields(), getSessions(), getTournaments()]);
    venues = scoped.venues;
    fields = scoped.fields;
    sessions = allSessions;
    tournaments = allTournaments;
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load sessions.");
  }

  const groupedSessions = groupSessions(venues, fields, sessions);
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Sessions</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Schedule &amp; Games</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            All scheduled and live games, grouped by venue and field.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/sessions/officials" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Umpires &amp; officials
          </Link>
          <Link href="/admin/sessions/generate" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Generate league schedule
          </Link>
          <Link href="/admin/sessions/import" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Import CSV
          </Link>
          <Link href="/admin/sessions/bulk" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Bulk tools
          </Link>
          <Link href="/admin/sessions/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            New session
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-black text-red-950">Unable to load sessions</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
        </div>
      ) : sessions.length > 0 ? (
        <div className="mt-8 grid gap-5">
          {groupedSessions.map((venueGroup) => (
            <section key={venueGroup.venue.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
              <div className="border-b border-[var(--line)] pb-4">
                <h2 className="text-xl font-black">{venueGroup.venue.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venueGroup.venue.address}</p>
              </div>

              <div className="mt-5 grid gap-4">
                {venueGroup.fieldGroups.map((fieldGroup) => (
                  <div key={fieldGroup.field.id} className="rounded-lg bg-[var(--background)] p-4">
                    <h3 className="text-lg font-black">{fieldGroup.field.name}</h3>
                    <div className="mt-3 grid gap-3">
                      {fieldGroup.sessions.map((session) => (
                        <article key={session.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h4 className="font-black">{session.title}</h4>
                              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                                {session.homeTeam} vs. {session.awayTeam}
                              </p>
                              <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                                {session.sportType}
                              </p>
                              {session.tournamentId ? (
                                <p className="mt-2 text-sm font-bold text-[var(--accent-strong)]">
                                  {tournamentsById.get(session.tournamentId)?.name ?? "Tournament unavailable"}
                                </p>
                              ) : null}
                              <p className="mt-2 text-lg font-black">
                                {session.homeTeam} {session.homeScore} · {session.awayTeam} {session.awayScore}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                                {formatInning(session)} · Count {session.balls}-{session.strikes} · Outs {session.outs}
                              </p>
                              <p className="mt-1 text-sm text-[var(--muted)]">{formatSessionTime(session.startTime)}</p>
                              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                                Updated {formatUpdatedAt(session.updatedAt)}
                              </p>
                            </div>
                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <span className="w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                                {session.gameStatus}
                              </span>
                              <Link
                                href={`/admin/sessions/${session.id}/edit`}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold"
                              >
                                Edit
                              </Link>
                              <Link
                                href={`/admin/sessions/${session.id}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 py-2 text-sm font-bold text-white"
                              >
                                Open live dashboard
                              </Link>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No sessions today"
            message="No sessions today. Import or create a session."
            actionHref="/admin/sessions/new"
            actionLabel="Create session"
          />
        </div>
      )}
    </section>
  );
}
