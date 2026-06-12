import type { CSSProperties } from "react";
import Image from "next/image";
import { getField, getFieldStatusClass, getFieldStatusLabel } from "@/lib/services/fields";
import { getPublicFieldUrl } from "@/lib/public-url";
import { filterAlertsForFieldPage, getActiveAlerts, getAlertLabel, getAlertTone } from "@/lib/services/alerts";
import { getActivationLabel, getActiveResourceActivationsForField } from "@/lib/services/resource-activations";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getResourcesForFieldPage, getResourceTypeLabel } from "@/lib/services/resources";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getTournaments } from "@/lib/services/tournaments";
import { getVenue } from "@/lib/services/venues";
import type { Alert, Field, Resource, ResourceActivation, Session, SponsorPlacement, Tournament, Venue } from "@/lib/types";
import { SponsorImpressionTracker, SponsorWebsiteLink } from "./sponsor-analytics";
import { ResourceActivationForm } from "./resource-activation-form";
import { VolunteerRoleForm } from "./volunteer-role-form";
import { FieldPageViewTracker } from "./field-page-view-tracker";

type FieldPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

type SessionBadgeLabel = "LIVE NOW" | "NEXT GAME" | "FINAL";

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTimeOnly(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
  }).format(new Date(value));
}

function getActiveOrNextSession(sessions: Session[]) {
  return (
    getActiveSession(sessions)
    ?? getNextUpcomingSession(sessions)
    ?? sessions.find((session) => session.status === "final")
    ?? sessions.find((session) => session.status === "scheduled")
    ?? null
  );
}

function isSessionActive(session: Session) {
  const now = Date.now();
  if (session.status === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  const startsAt = new Date(session.startTime).getTime();
  const endsAt = new Date(session.endTime).getTime();
  return startsAt <= now && now <= endsAt;
}

function getActiveSession(sessions: Session[]) {
  return sessions.find(isSessionActive) ?? null;
}

function isSessionUpcoming(session: Session) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > Date.now();
}

function getSessionBadge(session: Session): SessionBadgeLabel | null {
  if (isSessionActive(session)) {
    return "LIVE NOW";
  }

  if (isSessionUpcoming(session)) {
    return "NEXT GAME";
  }

  if (session.status === "final") {
    return "FINAL";
  }

  return null;
}

function getNextUpcomingSession(sessions: Session[]) {
  return sessions
    .filter(isSessionUpcoming)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
}

function getUpcomingSessions(sessions: Session[]) {
  return sessions.filter((session) => session.status === "scheduled").slice(0, 5);
}

function getTodaysSchedule(sessions: Session[]) {
  const today = new Date();
  return sessions
    .filter((session) => {
      const sessionDate = new Date(session.startTime);
      return (
        sessionDate.getFullYear() === today.getFullYear()
        && sessionDate.getMonth() === today.getMonth()
        && sessionDate.getDate() === today.getDate()
      );
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function groupSessionsByTime(sessions: Session[]) {
  return sessions.reduce<Array<{ time: string; sessions: Session[] }>>((groups, session) => {
    const time = formatTimeOnly(session.startTime);
    const existingGroup = groups.find((group) => group.time === time);

    if (existingGroup) {
      existingGroup.sessions.push(session);
      return groups;
    }

    return [...groups, { time, sessions: [session] }];
  }, []);
}

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function isDiamondSport(session: Session) {
  return session.sportType === "baseball" || session.sportType === "softball";
}

function formatPeriod(session: Session) {
  if (session.inning > 0) {
    return `Period ${session.inning}`;
  }

  return "Period not set";
}

function getGameLinks(session: Session) {
  const links: { label: string; url: string }[] = [];
  const candidates = [
    { label: session.primaryLinkLabel, url: session.primaryLinkUrl },
    { label: session.secondaryLinkLabel, url: session.secondaryLinkUrl },
  ];

  for (const link of candidates) {
    if (link.label && link.url) {
      links.push({ label: link.label, url: link.url });
    }
  }

  return links;
}

function TournamentBadge({ tournament }: { tournament: Tournament }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3">
      {tournament.logoUrl ? (
        <Image alt="" className="h-12 w-12 rounded-lg border border-[var(--line)] object-contain p-1.5" height={48} src={tournament.logoUrl} unoptimized width={48} />
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Tournament</p>
        <p className="truncate text-base font-black">{tournament.name}</p>
      </div>
    </div>
  );
}

function AlertStack({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      {alerts.map((alert) => (
        <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
          <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)}</p>
          <h2 className="mt-1 text-xl font-black">{alert.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{alert.message}</p>
        </article>
      ))}
    </section>
  );
}

function FieldStatusBanner({ field }: { field: Field }) {
  if (field.status === "open" || field.status === "active") {
    return null;
  }

  const copy = {
    delayed: {
      title: "Field delayed",
      message: "This field is currently delayed. Check the active alerts and today's schedule before heading over.",
    },
    closed: {
      title: "Field closed",
      message: "This field is currently closed. Please wait for venue updates before using this field.",
    },
    maintenance: {
      title: "Field under maintenance",
      message: "This field is temporarily under maintenance and may not be available for play.",
    },
  }[field.status];

  return (
    <section className={`rounded-lg border p-5 ${getFieldStatusClass(field.status)}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">{getFieldStatusLabel(field.status)}</p>
      <h2 className="mt-1 text-2xl font-black">{copy.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6">{copy.message}</p>
    </section>
  );
}

function SessionCard({ session }: { session: Session }) {
  const diamondSport = isDiamondSport(session);

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{session.title}</h3>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            {session.sportType}
          </p>
          <p className="mt-2 text-base font-black">
            {session.homeTeam} {session.homeScore} · {session.awayTeam} {session.awayScore}
          </p>
          {diamondSport ? (
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              {formatInning(session)} · Count {session.balls}-{session.strikes} · Outs {session.outs}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              {formatPeriod(session)} · {session.gameStatus}
            </p>
          )}
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatSessionTime(session.startTime)}</p>
        </div>
        <span className="w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
          {session.status}
        </span>
      </div>
    </article>
  );
}

function SessionBadge({ label }: { label: SessionBadgeLabel }) {
  return (
    <span
      className={
        label === "LIVE NOW"
          ? "inline-flex w-fit rounded-md bg-red-600 px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
          : label === "NEXT GAME"
            ? "inline-flex w-fit rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
            : "inline-flex w-fit rounded-md bg-[var(--black-soft)] px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
      }
    >
      {label}
    </span>
  );
}

function CompactSessionRow({ session, badge }: { session: Session; badge?: SessionBadgeLabel | null }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black">{session.title}</p>
            {badge ? <SessionBadge label={badge} /> : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            {session.sportType}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm font-black">{formatTimeOnly(session.startTime)}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">{session.gameStatus}</p>
        </div>
      </div>
    </article>
  );
}

export default async function PublicFieldPage({ params }: FieldPageProps) {
  const { fieldId } = await params;
  const publicFieldUrl = getPublicFieldUrl(fieldId);
  let field: Field | null = null;
  let venue: Venue | null = null;
  let sessions: Session[] = [];
  let tournaments: Tournament[] = [];
  let activeAlerts: Alert[] = [];
  let resources: Resource[] = [];
  let activeActivations: ResourceActivation[] = [];
  let sponsorPlacements: SponsorPlacement[] = [];
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    if (field) {
      const [venueResult, sessionResults, tournamentResults, alertResults] = await Promise.all([
        getVenue(field.venueId),
        getSessionsByFieldId(fieldId),
        getTournaments(),
        getActiveAlerts(),
      ]);
      venue = venueResult;
      sessions = sessionResults;
      tournaments = tournamentResults;
      activeAlerts = alertResults;
      const activeOrNextSession = getActiveOrNextSession(sessionResults);
      [sponsorPlacements, resources, activeActivations] = await Promise.all([
        getSponsorPlacementsForFieldPage({
          venueId: field.venueId,
          fieldId,
          sessionId: activeOrNextSession?.id,
        }),
        getResourcesForFieldPage({
          venueId: field.venueId,
          fieldId,
        }),
        getActiveResourceActivationsForField({
          fieldId,
          sessionId: activeOrNextSession?.id,
        }),
      ]);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load field page.";
  }

  const activeSession = getActiveSession(sessions);
  const nextUpcomingSession = getNextUpcomingSession(sessions);
  const currentSession = activeSession ?? nextUpcomingSession ?? getActiveOrNextSession(sessions);
  const currentSessionBadge = currentSession ? getSessionBadge(currentSession) : null;
  const shouldShowNextUpcoming = Boolean(nextUpcomingSession && nextUpcomingSession.id !== currentSession?.id);
  const upcomingSessions = getUpcomingSessions(sessions);
  const todaysSchedule = getTodaysSchedule(sessions);
  const todayScheduleGroups = groupSessionsByTime(todaysSchedule);
  const gameLinks = currentSession ? getGameLinks(currentSession) : [];
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const currentTournament = currentSession?.tournamentId ? tournamentsById.get(currentSession.tournamentId) ?? null : null;
  const publicAlerts = field
    ? filterAlertsForFieldPage({
      alerts: activeAlerts,
      venueId: field.venueId,
      fieldId,
      tournamentId: currentSession?.tournamentId,
    })
    : [];
  const trackedSponsorIds = [...new Set(sponsorPlacements.map((placement) => placement.sponsorId))];
  const topSessionLabel =
    currentSessionBadge === "LIVE NOW"
      ? "Live field status"
      : currentSessionBadge === "NEXT GAME"
        ? "Next game"
        : currentSessionBadge === "FINAL"
          ? "Final session"
          : "Session";
  const primaryColor = venue?.primaryColor ?? "#166534";
  const secondaryColor = venue?.secondaryColor ?? "#111827";
  const brandedHeaderStyle: CSSProperties = venue?.bannerUrl
    ? {
      backgroundImage: `linear-gradient(120deg, ${secondaryColor}e6, ${primaryColor}cc), url(${venue.bannerUrl})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    }
    : {
      background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
    };
  const accentStyle: CSSProperties = {
    borderColor: primaryColor,
  };
  const accentButtonStyle: CSSProperties = {
    backgroundColor: primaryColor,
  };
  const fieldMarker = field && field.mapX !== null && field.mapY !== null
    ? { label: field.mapLabel ?? field.name, x: field.mapX, y: field.mapY }
    : null;
  const currentSessionIsDiamondSport = currentSession ? isDiamondSport(currentSession) : false;

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-0 sm:px-6 sm:py-8">
        <div className="overflow-hidden bg-[var(--panel)] shadow-sm sm:rounded-lg sm:border sm:border-[var(--line)]">
          <header className="p-5 text-white sm:p-7" style={brandedHeaderStyle}>
            <div className="flex items-center gap-3">
              {venue?.logoUrl ? (
                <Image alt="" className="h-14 w-14 rounded-lg border border-white/25 bg-white object-contain p-1.5" height={56} src={venue.logoUrl} unoptimized width={56} />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Welcome to</p>
                <h1 className="truncate text-2xl font-black sm:text-4xl">{venue?.name ?? "GameDay OS"}</h1>
              </div>
            </div>
            <p className="mt-5 text-lg font-black">{field?.name ?? "Field unavailable"}</p>
          </header>

          <main className="grid gap-4 p-4 sm:p-5">
            {field && venue ? <FieldPageViewTracker fieldId={fieldId} sessionId={currentSession?.id} venueId={venue.id} /> : null}

            {errorMessage ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-black text-red-950">Unable to load field page</h2>
                <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
              </section>
            ) : null}

            {!errorMessage && !field ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <h2 className="text-xl font-black">Field not found</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  This public field page is not available yet. Check the link or ask the venue for an updated QR code.
                </p>
              </section>
            ) : null}

            <AlertStack alerts={publicAlerts} />

            {field ? <FieldStatusBanner field={field} /> : null}

            <section
              className={currentSessionBadge === "LIVE NOW" ? "rounded-lg border-2 bg-red-50 p-5 shadow-sm" : "rounded-lg border-2 bg-white p-5 shadow-sm"}
              style={currentSessionBadge === "LIVE NOW" ? undefined : accentStyle}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className={currentSessionBadge === "LIVE NOW" ? "text-xs font-bold uppercase tracking-[0.16em] text-red-700" : "text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]"}>
                  {topSessionLabel}
                </p>
                {currentSessionBadge ? <SessionBadge label={currentSessionBadge} /> : null}
              </div>
              {currentSession ? (
                <div className="mt-4">
                  <h2 className="text-3xl font-black leading-tight sm:text-4xl">{currentSession.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {currentSession.sportType}
                    </span>
                    <p className="text-sm font-semibold text-[var(--muted)]">{formatSessionTime(currentSession.startTime)}</p>
                  </div>
                  {currentTournament ? <TournamentBadge tournament={currentTournament} /> : null}
                  <div className="mt-5 rounded-lg bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Home</p>
                        <p className="mt-1 truncate text-lg font-black sm:text-xl">{currentSession.homeTeam}</p>
                      </div>
                      <p className="rounded-lg bg-[var(--black-soft)] px-4 py-3 text-center text-4xl font-black leading-none text-white sm:text-5xl" style={currentSessionBadge === "LIVE NOW" ? undefined : accentButtonStyle}>
                        {currentSession.homeScore}-{currentSession.awayScore}
                      </p>
                      <div className="min-w-0 text-right">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Away</p>
                        <p className="mt-1 truncate text-lg font-black sm:text-xl">{currentSession.awayTeam}</p>
                      </div>
                    </div>
                    {currentSessionIsDiamondSport ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Inning</p>
                          <p className="mt-1 text-sm font-black">{formatInning(currentSession)}</p>
                        </div>
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Count</p>
                          <p className="mt-1 text-sm font-black">
                            {currentSession.balls}-{currentSession.strikes}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Outs</p>
                          <p className="mt-1 text-sm font-black">{currentSession.outs}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Home score</p>
                          <p className="mt-1 text-sm font-black">{currentSession.homeScore}</p>
                        </div>
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Away score</p>
                          <p className="mt-1 text-sm font-black">{currentSession.awayScore}</p>
                        </div>
                        <div className="rounded-lg bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Period</p>
                          <p className="mt-1 text-sm font-black">{formatPeriod(currentSession)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-4 inline-flex rounded-md bg-white px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    {currentSession.gameStatus}
                  </span>
                  {gameLinks.length > 0 || currentSession.notes ? (
                    <div className="mt-5 rounded-lg bg-white p-4">
                      {gameLinks.length > 0 ? (
                        <div>
                          <h3 className="text-base font-black">Game Links</h3>
                          <div className="mt-3 grid gap-3">
                            {gameLinks.map((link) => (
                              <a
                                key={link.label}
                                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 py-3 text-center text-sm font-black text-white"
                                href={link.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {currentSession.notes ? (
                        <div className={gameLinks.length > 0 ? "mt-5 border-t border-[var(--line)] pt-5" : ""}>
                          <h3 className="text-base font-black">Game Notes</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{currentSession.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-lg bg-white p-4">
                  <h2 className="text-xl font-black">No session scheduled</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    There is no active or upcoming session listed for this field yet.
                  </p>
                </div>
              )}
            </section>

            {sponsorPlacements.length > 0 ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <SponsorImpressionTracker fieldId={fieldId} sessionId={currentSession?.id} sponsorIds={trackedSponsorIds} />
                <h2 className="text-xl font-black">Field Sponsors</h2>
                <div className="mt-4 grid gap-4">
                  {sponsorPlacements.map((placement) => (
                    <article key={placement.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
                      <p
                        className="inline-flex rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
                        style={accentButtonStyle}
                      >
                        {placement.placementLabel}
                      </p>
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        {placement.sponsor.logoUrl ? (
                          <Image
                            alt=""
                            className="h-24 w-full rounded-lg border border-[var(--line)] bg-white object-contain p-3 sm:h-24 sm:w-32"
                            height={96}
                            src={placement.sponsor.logoUrl}
                            unoptimized
                            width={128}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="text-2xl font-black">{placement.sponsor.name}</h3>
                          {placement.sponsor.description ? (
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{placement.sponsor.description}</p>
                          ) : null}
                          {placement.sponsor.websiteUrl ? (
                            <SponsorWebsiteLink
                              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-bold text-white"
                              fieldId={fieldId}
                              href={placement.sponsor.websiteUrl}
                              sessionId={currentSession?.id}
                              style={accentButtonStyle}
                              sponsorId={placement.sponsorId}
                            />
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {shouldShowNextUpcoming && nextUpcomingSession ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <h2 className="text-lg font-black">Next Upcoming Session</h2>
                <div className="mt-4">
                  <CompactSessionRow badge={getSessionBadge(nextUpcomingSession)} session={nextUpcomingSession} />
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Find This Field</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {field?.mapLabel ?? field?.name ?? "Field location"}
              </p>
              {venue?.mapImageUrl ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--background)]">
                  <div className="relative">
                    <Image
                      alt={`${venue.name} field map`}
                      className="h-auto w-full object-contain"
                      height={720}
                      src={venue.mapImageUrl}
                      unoptimized
                      width={960}
                    />
                    {fieldMarker ? (
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full"
                        style={{
                          left: `${fieldMarker.x}%`,
                          top: `${fieldMarker.y}%`,
                        }}
                      >
                        <div className="grid justify-items-center">
                          <span className="mb-1 max-w-28 rounded-md bg-[var(--black-soft)] px-2 py-1 text-center text-xs font-black text-white shadow">
                            {fieldMarker.label}
                          </span>
                          <span className="h-5 w-5 rounded-full border-4 border-white bg-red-600 shadow" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                  A venue map has not been added yet.
                </p>
              )}
              {venue?.mapNotes ? (
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                  {venue.mapNotes}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-lg font-black">Today&apos;s Schedule</h2>
              <div className="mt-4 grid gap-3">
                {todayScheduleGroups.length > 0 ? (
                  todayScheduleGroups.map((group) => (
                    <div key={group.time} className="rounded-lg bg-[var(--background)] p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">{group.time}</p>
                      <div className="mt-3 grid gap-3">
                        {group.sessions.map((session) => <CompactSessionRow badge={getSessionBadge(session)} key={session.id} session={session} />)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                    No sessions scheduled today.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Upcoming sessions</h2>
              <div className="mt-4 grid gap-3">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => <SessionCard key={session.id} session={session} />)
                ) : (
                  <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                    No upcoming sessions scheduled.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Field Info</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--background)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Field</p>
                  <p className="mt-1 text-lg font-black">{field?.name ?? "Field unavailable"}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Sport</p>
                  <p className="mt-1 text-lg font-black">{field?.sportType ?? "Sport type unavailable"}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Venue</p>
                  <p className="mt-1 text-lg font-black">{venue?.name ?? "GameDay OS"}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Field status</p>
                  {field ? (
                    <p className={`mt-2 w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                      {getFieldStatusLabel(field.status)}
                    </p>
                  ) : (
                    <p className="mt-1 text-lg font-black">Not found</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Available Resources</h2>
              {resources.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {resources.map((resource) => (
                    <article key={resource.id} className="flex items-start gap-3 rounded-lg bg-[var(--background)] p-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-white">✓</span>
                      <div>
                        <h3 className="text-base font-black">{getResourceTypeLabel(resource.resourceType)}</h3>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{resource.resourceName}</p>
                        {resource.notes ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{resource.notes}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
                  No venue resources configured.
                </p>
              )}
            </section>

            {activeActivations.length > 0 ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">LIVE RESOURCES</p>
                <div className="mt-4 grid gap-3">
                  {activeActivations.map((activation) => (
                    <article key={activation.id} className="rounded-lg bg-[var(--background)] p-4">
                      <p className="text-base font-black">✓ {getActivationLabel(activation.activationType)}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{activation.displayName}</p>
                      {activation.resourceUrl ? (
                        <a className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" href={activation.resourceUrl} rel="noreferrer" target="_blank">
                          Open Link
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {field && venue ? (
              <VolunteerRoleForm fieldId={fieldId} sessionId={currentSession?.id} venueId={venue.id} />
            ) : null}

            {field && venue ? (
              <ResourceActivationForm fieldId={fieldId} sessionId={currentSession?.id} venueId={venue.id} />
            ) : null}

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Share Field Link</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Use this public URL for QR code sharing.
              </p>
              <div className="mt-4 overflow-x-auto rounded-lg bg-[var(--background)] p-4">
                <code className="whitespace-nowrap text-sm font-bold text-[var(--foreground)]">{publicFieldUrl}</code>
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  );
}
