import type { CSSProperties } from "react";
import { publicErrorMessage } from "@/lib/public-error";
import Image from "next/image";
import { WeatherStatusCard } from "@/components/weather/weather-status-card";
import { getField, getFieldStatusClass, getFieldStatusLabel } from "@/lib/services/fields";
import { filterAlertsForFieldPage, getActiveAlerts, getAlertLabel, getAlerts, getAlertTone, isAlertActive, isAlertExpired } from "@/lib/services/alerts";
import { getActiveResourceActivationsForField } from "@/lib/services/resource-activations";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getTournaments } from "@/lib/services/tournaments";
import { getOrganization } from "@/lib/services/organizations";
import { getVenue } from "@/lib/services/venues";
import type { Alert, Field, Organization, ResourceActivation, Session, SponsorPlacement, Tournament, Venue } from "@/lib/types";
import { SponsorImpressionTracker, SponsorWebsiteLink } from "./sponsor-analytics";
import { FieldPageViewTracker } from "./field-page-view-tracker";
import { FollowButtons } from "./follow-buttons";
import { ResourceActivationForm } from "./resource-activation-form";

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

function formatAlertTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeUpdate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
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

function getPublicRecentUpdates(alerts: Alert[]) {
  const seenAllClear = new Set<string>();

  return alerts.filter((alert) => !alert.isActive || isAlertExpired(alert)).filter((alert) => {
    if (alert.title !== "All Clear") {
      return true;
    }

    const key = `${alert.venueId}-${alert.fieldId ?? "venue"}-${alert.title}`;
    if (seenAllClear.has(key)) {
      return false;
    }

    seenAllClear.add(key);
    return true;
  }).slice(0, 5);
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

function isBaseballSoftballSport(session: Session) {
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

function AlertStack({ alerts, showState = false, title }: { alerts: Alert[]; showState?: boolean; title: string }) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <h2 className="px-1 text-xl font-black">{title}</h2>
      {alerts.map((alert) => (
        <article className={`rounded-lg border-2 p-4 shadow-md sm:p-6 ${getAlertTone(alert.alertType)}`} key={alert.id}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em]">{getAlertLabel(alert.alertType)}</p>
            {showState ? (
              <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase">
                {isAlertActive(alert) ? "Active" : isAlertExpired(alert) ? "Expired" : "Cleared"}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-2xl font-black leading-tight">{alert.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-base font-semibold leading-7">{alert.message}</p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] opacity-75">
            Posted {formatAlertTime(alert.createdAt)} · {formatRelativeUpdate(alert.updatedAt)}
          </p>
        </article>
      ))}
    </section>
  );
}

function CommunityLinks({ links }: { links: ResourceActivation[] }) {
  const visibleLinks = links.filter((link) => link.resourceUrl);

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Community</p>
      <h2 className="mt-1 text-xl font-black">Community Links</h2>
      <div className="mt-4 grid gap-3">
        {visibleLinks.map((link) => (
          <a className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-black text-[var(--foreground)]" href={link.resourceUrl ?? "#"} key={link.id} rel="noreferrer" target="_blank">
            {link.displayName}
            {link.notes ? <span className="mt-1 block text-sm font-semibold leading-6 text-[var(--muted)]">{link.notes}</span> : null}
          </a>
        ))}
      </div>
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
    <section className={`rounded-lg border-2 p-5 shadow-sm sm:p-6 ${getFieldStatusClass(field.status)}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">{getFieldStatusLabel(field.status)}</p>
      <h2 className="mt-1 text-2xl font-black sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-base font-semibold leading-7">{copy.message}</p>
    </section>
  );
}

function SessionCard({ session }: { session: Session }) {
  const baseballSoftballSport = isBaseballSoftballSport(session);

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-black">{session.title}</h3>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
            {session.sportType}
          </p>
          <p className="mt-3 w-fit rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-base font-black">
            {session.homeTeam} {session.homeScore} · {session.awayTeam} {session.awayScore}
          </p>
          {baseballSoftballSport ? (
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
          ? "inline-flex min-h-8 w-fit items-center rounded-md bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
          : label === "NEXT GAME"
            ? "inline-flex min-h-8 w-fit items-center rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
            : "inline-flex min-h-8 w-fit items-center rounded-md bg-[var(--black-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white"
      }
    >
      {label}
    </span>
  );
}

function CompactSessionRow({ session, badge }: { session: Session; badge?: SessionBadgeLabel | null }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-black leading-tight sm:truncate">{session.title}</p>
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
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">{session.status}</p>
        </div>
      </div>
    </article>
  );
}

export default async function PublicFieldPage({ params }: FieldPageProps) {
  const { fieldId } = await params;
  let field: Field | null = null;
  let venue: Venue | null = null;
  let organization: Organization | null = null;
  let sessions: Session[] = [];
  let tournaments: Tournament[] = [];
  let activeAlerts: Alert[] = [];
  let allAlerts: Alert[] = [];
  let communityLinks: ResourceActivation[] = [];
  let sponsorPlacements: SponsorPlacement[] = [];
  let errorMessage: string | null = null;

  try {
    field = await getField(fieldId);
    if (field) {
      const [venueResult, sessionResults, tournamentResults, alertResults, allAlertResults] = await Promise.all([
        getVenue(field.venueId),
        getSessionsByFieldId(fieldId),
        getTournaments(),
        getActiveAlerts(),
        getAlerts(),
      ]);
      venue = venueResult;
      organization = venueResult?.organizationId ? await getOrganization(venueResult.organizationId) : null;
      sessions = sessionResults;
      tournaments = tournamentResults;
      activeAlerts = alertResults;
      allAlerts = allAlertResults;
      const activeOrNextSession = getActiveOrNextSession(sessionResults);
      [sponsorPlacements, communityLinks] = await Promise.all([
        getSponsorPlacementsForFieldPage({
          venueId: field.venueId,
          fieldId,
          sessionId: activeOrNextSession?.id,
        }),
        getActiveResourceActivationsForField({ fieldId, sessionId: activeOrNextSession?.id }),
      ]);
    }
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load field page.");
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
  const weatherAlerts = publicAlerts.filter((alert) => alert.alertType === "weather" || alert.alertType === "delay");
  const otherAlerts = publicAlerts.filter((alert) => alert.alertType !== "weather" && alert.alertType !== "delay");
  const recentUpdates = field
    ? getPublicRecentUpdates(filterAlertsForFieldPage({
      alerts: allAlerts,
      venueId: field.venueId,
      fieldId,
      tournamentId: currentSession?.tournamentId,
    }))
    : [];
  const trackedSponsorIds = [...new Set(sponsorPlacements.map((placement) => placement.sponsorId))];
  const topSessionLabel = currentSessionBadge === "FINAL" ? "Final score" : "Current / Next Game";
  const primaryColor = venue?.primaryColor ?? organization?.primaryColor ?? "#166534";
  const secondaryColor = venue?.secondaryColor ?? organization?.secondaryColor ?? "#111827";
  const logoUrl = venue?.logoUrl ?? organization?.logoUrl;
  const bannerUrl = venue?.bannerUrl ?? organization?.bannerUrl;
  const brandName = organization?.name ?? "GameDay OS";
  const brandedHeaderStyle: CSSProperties = bannerUrl
    ? {
      backgroundImage: `linear-gradient(120deg, ${secondaryColor}e6, ${primaryColor}cc), url(${bannerUrl})`,
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
  const currentSessionIsBaseballSoftball = currentSession ? isBaseballSoftballSport(currentSession) : false;

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-0 sm:px-6 sm:py-8">
        <div className="overflow-hidden bg-[var(--panel)] shadow-sm sm:rounded-lg sm:border sm:border-[var(--line)]">
          <header className="p-4 text-white sm:p-7" style={brandedHeaderStyle}>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image alt="" className="h-14 w-14 rounded-lg border border-white/25 bg-white object-contain p-1.5" height={56} src={logoUrl} unoptimized width={56} />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{venue?.name ?? brandName}</p>
                <h1 className="text-3xl font-black leading-tight sm:text-4xl">{field?.name ?? "Field unavailable"}</h1>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white">
                {field?.sportType ?? "Field"}
              </span>
              {field ? (
                <span className={`rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                  {getFieldStatusLabel(field.status)}
                </span>
              ) : null}
            </div>
          </header>

          <main className="grid gap-4 p-3 sm:gap-5 sm:p-5">
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

            {field ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current Status</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">{field.name}</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue?.name ?? "Venue unavailable"}</p>
                  </div>
                  <span className={`w-fit rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>
                    {getFieldStatusLabel(field.status)}
                  </span>
                </div>
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <FollowButtons fieldId={fieldId} sessionId={currentSession?.id} />
                </div>
              </section>
            ) : null}

            {field ? <FieldStatusBanner field={field} /> : null}

            <AlertStack alerts={weatherAlerts} showState title="Active Alerts" />

            {venue ? <WeatherStatusCard compact venueId={venue.id} /> : null}

            <AlertStack alerts={otherAlerts} showState title="Venue Announcements" />

            <section
              className={currentSessionBadge === "LIVE NOW" ? "rounded-lg border-2 bg-red-50 p-4 shadow-lg sm:p-6" : "rounded-lg border-2 bg-white p-4 shadow-md sm:p-6"}
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
                  <h2 className="text-3xl font-black leading-tight">{currentSession.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                      {currentSession.sportType}
                    </span>
                    <p className="text-sm font-semibold text-[var(--muted)]">{formatSessionTime(currentSession.startTime)}</p>
                  </div>
                  {currentTournament ? <TournamentBadge tournament={currentTournament} /> : null}
                  <div className="mt-5 rounded-lg border border-[var(--line)] bg-white p-3 shadow-sm sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
                      <div className="min-w-0 rounded-lg bg-[var(--background)] p-3 sm:bg-transparent sm:p-0">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Home</p>
                        <p className="mt-1 text-2xl font-black leading-tight sm:truncate">{currentSession.homeTeam}</p>
                      </div>
                      <p className="rounded-xl bg-[var(--black-soft)] px-4 py-5 text-center text-7xl font-black leading-none text-white shadow-sm sm:min-w-36 sm:px-5" style={currentSessionBadge === "LIVE NOW" ? undefined : accentButtonStyle}>
                        {currentSession.homeScore}-{currentSession.awayScore}
                      </p>
                      <div className="min-w-0 rounded-lg bg-[var(--background)] p-3 sm:bg-transparent sm:p-0 sm:text-right">
                        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Away</p>
                        <p className="mt-1 text-2xl font-black leading-tight sm:truncate">{currentSession.awayTeam}</p>
                      </div>
                    </div>
                    {currentSessionIsBaseballSoftball ? (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Inning</p>
                          <p className="mt-1 text-sm font-black">{formatInning(currentSession)}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Count</p>
                          <p className="mt-1 text-sm font-black">
                            {currentSession.balls}-{currentSession.strikes}
                          </p>
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Outs</p>
                          <p className="mt-1 text-sm font-black">{currentSession.outs}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Home score</p>
                          <p className="mt-1 text-sm font-black">{currentSession.homeScore}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Away score</p>
                          <p className="mt-1 text-sm font-black">{currentSession.awayScore}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Period</p>
                          <p className="mt-1 text-sm font-black">{formatPeriod(currentSession)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-4 inline-flex min-h-9 items-center rounded-md bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                    {currentSession.gameStatus}
                  </span>
                  {gameLinks.length > 0 || currentSession.notes ? (
                    <div className="mt-5 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                      {gameLinks.length > 0 ? (
                        <div>
                          <h3 className="text-base font-black">Watch or follow</h3>
                          <div className="mt-3 grid gap-3">
                            {gameLinks.map((link) => (
                              <a
                                key={link.label}
                                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-center text-sm font-black text-white hover:bg-black"
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

            {shouldShowNextUpcoming && nextUpcomingSession ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5">
                <h2 className="text-lg font-black">Next Game</h2>
                <div className="mt-4">
                  <CompactSessionRow badge={getSessionBadge(nextUpcomingSession)} session={nextUpcomingSession} />
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-xl font-black">Today&apos;s Schedule</h2>
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
                    No sessions today. Import or create a session.
                  </p>
                )}
              </div>
            </section>

            {sponsorPlacements.length > 0 ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
                <SponsorImpressionTracker fieldId={fieldId} sessionId={currentSession?.id} sponsorIds={trackedSponsorIds} />
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Presented locally</p>
                <h2 className="mt-1 text-2xl font-black">Field Sponsors</h2>
                <div className="mt-5 grid gap-4">
                  {sponsorPlacements.map((placement) => (
                    <article key={placement.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm sm:p-5">
                      <p
                        className="inline-flex rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white"
                        style={accentButtonStyle}
                      >
                        {placement.placementLabel}
                      </p>
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        {placement.sponsor.logoUrl ? (
                          <Image
                            alt=""
                            className="h-24 w-full rounded-lg border border-[var(--line)] bg-white object-contain p-3 shadow-sm sm:h-28 sm:w-36"
                            height={96}
                            src={placement.sponsor.logoUrl}
                            unoptimized
                            width={128}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <h3 className="text-xl font-black leading-tight sm:text-2xl">{placement.sponsor.name}</h3>
                          {placement.sponsor.description ? (
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{placement.sponsor.description}</p>
                          ) : null}
                          {placement.sponsor.websiteUrl ? (
                            <SponsorWebsiteLink
                              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-lg px-4 text-sm font-black text-white"
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

            <AlertStack alerts={recentUpdates} showState title="Recent updates" />

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

            {field && venue ? (
              <details className="rounded-lg border border-[var(--line)] bg-white p-5">
                <summary className="cursor-pointer text-lg font-black marker:text-[var(--accent-strong)]">More ways to connect</summary>
                <div className="mt-5 grid gap-4">
                  <CommunityLinks links={communityLinks} />
                  <ResourceActivationForm fieldId={fieldId} sessionId={currentSession?.id} venueId={venue.id} />
                  <FollowButtons fieldId={fieldId} sessionId={currentSession?.id} />
                </div>
              </details>
            ) : null}

          </main>
        </div>
      </div>
    </section>
  );
}
