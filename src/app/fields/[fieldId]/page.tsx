import type { CSSProperties } from "react";
import { getField } from "@/lib/services/fields";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getVenue } from "@/lib/services/venues";
import type { Field, Session, SponsorPlacement, Venue } from "@/lib/types";
import { SponsorImpressionTracker, SponsorWebsiteLink } from "./sponsor-analytics";

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

function SessionCard({ session }: { session: Session }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{session.title}</h3>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-2 text-base font-black">
            {session.homeTeam} {session.homeScore} · {session.awayTeam} {session.awayScore}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {formatInning(session)} · Count {session.balls}-{session.strikes} · Outs {session.outs}
          </p>
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
  let sponsorPlacements: SponsorPlacement[] = [];
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    if (field) {
      const [venueResult, sessionResults] = await Promise.all([
        getVenue(field.venueId),
        getSessionsByFieldId(fieldId),
      ]);
      venue = venueResult;
      sessions = sessionResults;
      sponsorPlacements = await getSponsorPlacementsForFieldPage({
        venueId: field.venueId,
        fieldId,
        sessionId: getActiveOrNextSession(sessionResults)?.id,
      });
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

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-0 sm:px-6 sm:py-8">
        <div className="overflow-hidden bg-[var(--panel)] shadow-sm sm:rounded-lg sm:border sm:border-[var(--line)]">
          <header className="p-5 text-white sm:p-7" style={brandedHeaderStyle}>
            <div className="flex items-center gap-3">
              {venue?.logoUrl ? (
                <img alt="" className="h-14 w-14 rounded-lg border border-white/25 bg-white object-contain p-1.5" src={venue.logoUrl} />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Welcome to</p>
                <h1 className="truncate text-2xl font-black sm:text-4xl">{venue?.name ?? "GameDay OS"}</h1>
              </div>
            </div>
            <p className="mt-5 text-lg font-black">{field?.name ?? "Field unavailable"}</p>
          </header>

          <main className="grid gap-4 p-4 sm:p-5">
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
                  <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{formatSessionTime(currentSession.startTime)}</p>
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
                          <img
                            alt=""
                            className="h-24 w-full rounded-lg border border-[var(--line)] bg-white object-contain p-3 sm:h-24 sm:w-32"
                            src={placement.sponsor.logoUrl}
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
                  <p className="mt-1 text-lg font-black">{field?.status ?? "Not found"}</p>
                </div>
              </div>
            </section>

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
