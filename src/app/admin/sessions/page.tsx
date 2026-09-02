import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageSchedule, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getSessionContext } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessions } from "@/lib/services/sessions";
import { getTournaments } from "@/lib/services/tournaments";
import { sessionMatchesQuery } from "@/lib/ui/session-search";
import { fieldStatusPresentation, gameStatusPresentation } from "@/lib/ui/status-presentation";
import type { Field, Session, Tournament, Venue } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  GameDayCard,
  PageShell,
  PageTitle,
  SearchField,
  buttonStyles,
} from "@/components/ui/gameday-ui";

export const dynamic = "force-dynamic";

type SessionsPageProps = { searchParams?: Promise<{ q?: string }> };

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value));
}

function formatSessionClock(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function groupSessions(venues: Venue[], fields: Field[], sessions: Session[]) {
  return venues.map((venue) => {
    const venueFields = fields.filter((field) => field.venueId === venue.id);
    const fieldGroups = venueFields.map((field) => ({ field, sessions: sessions.filter((session) => session.fieldId === field.id) })).filter((group) => group.sessions.length > 0);
    return { venue, fieldGroups };
  }).filter((group) => group.fieldGroups.length > 0);
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const ctx = await getSessionContext();
  if (!ctx || !canManageSchedule(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  const { q = "" } = (await searchParams) ?? {};
  const query = q.trim();
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
    errorMessage = publicErrorMessage(error, "Unable to load the schedule.");
  }

  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const visibleSessions = query ? sessions.filter((session) => {
    const field = fieldsById.get(session.fieldId);
    const venue = field ? venuesById.get(field.venueId) : null;
    return sessionMatchesQuery({
      title: session.title,
      homeTeam: session.homeTeam,
      awayTeam: session.awayTeam,
      fieldName: field?.name ?? "",
      venueName: venue?.name ?? "",
      tournamentName: session.tournamentId ? tournamentsById.get(session.tournamentId)?.name : null,
      startLabel: formatSessionTime(session.startTime),
      sportType: session.sportType,
    }, query);
  }) : sessions;
  const groupedSessions = groupSessions(venues, fields, visibleSessions);

  return (
    <PageShell size="wide">
      <PageTitle
        actions={<Link className={buttonStyles("primary")} href="/admin/sessions/new">New game</Link>}
        description="Find a game quickly, then open the live controls or reveal its administrative details."
        eyebrow="Schedule"
        title="Games and events"
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <form action="/admin/sessions" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" method="get" role="search">
          <SearchField defaultValue={query} id="schedule-search" label="Search games" name="q" placeholder="Team, event, field, venue, tournament, or time" />
          <button className={buttonStyles("secondary")} type="submit">Search</button>
        </form>
        <details className="ui-surface relative z-10">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-extrabold text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]">Schedule tools</summary>
          <div className="grid gap-2 border-t border-[var(--line)] p-3 sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-lg sm:border sm:bg-white sm:shadow-xl">
            <Link className={buttonStyles("secondary", "justify-start")} href="/admin/sessions/officials">Officials</Link>
            <Link className={buttonStyles("secondary", "justify-start")} href="/admin/sessions/import">Import schedule</Link>
            <Link className={buttonStyles("secondary", "justify-start")} href="/admin/sessions/generate">Generate league schedule</Link>
            <Link className={buttonStyles("secondary", "justify-start")} href="/admin/sessions/bulk">Bulk tools</Link>
          </div>
        </details>
      </div>

      {query ? <p className="mt-4 text-sm font-bold text-[var(--muted)]">{visibleSessions.length} result{visibleSessions.length === 1 ? "" : "s"} for “{query}” · <Link className="text-[var(--accent-strong)] underline" href="/admin/sessions">Clear search</Link></p> : null}

      {errorMessage ? (
        <div className="mt-8"><ErrorState message={errorMessage} title="Unable to load games" /></div>
      ) : visibleSessions.length > 0 ? (
        <div className="mt-8 grid gap-8">
          {groupedSessions.map((venueGroup) => (
            <section key={venueGroup.venue.id}>
              <h2 className="text-xl font-black">{venueGroup.venue.name}</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venueGroup.venue.address}</p>
              <div className="mt-4 grid gap-6">
                {venueGroup.fieldGroups.map((fieldGroup) => (
                  <section key={fieldGroup.field.id}>
                    <h3 className="text-sm font-black uppercase tracking-[0.1em] text-[var(--muted)]">{fieldGroup.field.name}</h3>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {fieldGroup.sessions.map((session) => {
                        const status = gameStatusPresentation(session.status, session.lifecycleStatus);
                        const tournamentName = session.tournamentId ? tournamentsById.get(session.tournamentId)?.name : null;
                        return (
                          <GameDayCard
                            key={session.id}
                            date={formatSessionDate(session.startTime)}
                            details={<div className="grid gap-2"><p className="capitalize text-[var(--muted)]">{session.sportType}{tournamentName ? ` · ${tournamentName}` : ""}</p>{session.status !== "scheduled" ? <p className="font-bold">{session.homeTeam} <span className="tabular-nums">{session.homeScore}</span> · {session.awayTeam} <span className="tabular-nums">{session.awayScore}</span></p> : null}<p className="text-[var(--muted)]">{formatInning(session)} · Count {session.balls}-{session.strikes} · {session.outs} outs</p><p className="text-xs font-semibold text-[var(--muted)]">Updated {formatUpdatedAt(session.updatedAt)}</p></div>}
                            eventName={session.title || `${session.homeTeam} vs ${session.awayTeam}`}
                            fieldStatus={fieldGroup.field.status === "open" ? undefined : fieldStatusPresentation(fieldGroup.field.status).label.replace("FIELD ", "")}
                            location={fieldGroup.field.name}
                            opponent={`${session.homeTeam} vs ${session.awayTeam}`}
                            primaryAction={<Link className={buttonStyles("primary")} href={`/admin/sessions/${session.id}`}>Open game</Link>}
                            secondaryActions={<Link className={buttonStyles("secondary")} href={`/admin/sessions/${session.id}/edit`}>Edit game</Link>}
                            startTime={formatSessionClock(session.startTime)}
                            status={status.label}
                            statusTone={status.tone}
                            venue={venueGroup.venue.name}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : query ? (
        <EmptyState actionHref="/admin/sessions" actionLabel="Clear search" className="mt-8" message="Try a team name, field, venue, tournament, or start time." title="No games match that search" />
      ) : (
        <EmptyState actionHref="/admin/sessions/new" actionLabel="Create game" className="mt-8" message="Add the first game or import an existing schedule." title="No games yet" />
      )}
    </PageShell>
  );
}
