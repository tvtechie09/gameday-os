import type { CSSProperties } from "react";
import { publicErrorMessage } from "@/lib/public-error";
import Image from "next/image";
import Link from "next/link";
import { getPublicFieldUrl } from "@/lib/public-url";
import { WeatherStatusCard } from "@/components/weather/weather-status-card";
import { WeatherOperationsStatusCard } from "@/components/weather/weather-operations-status-card";
import { filterAlertsForFieldPage, getActiveAlerts, getAlerts, getAlertTone, isAlertActive, isAlertExpired } from "@/lib/services/alerts";
import { getFieldStatusClass, getFields } from "@/lib/services/fields";
import { getResourceTypeLabel, getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getOrganization } from "@/lib/services/organizations";
import { getVenue } from "@/lib/services/venues";
import type { Alert, Field, Organization, Resource, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";
import { RECOMMENDED_PROHIBITED_CATEGORIES, type SponsorCategoryKey } from "@/lib/services/sponsor-category-core";
import { getProhibitedCategories } from "@/lib/services/sponsor-policy";
import { filterProhibitedPlacements } from "@/lib/services/sponsor-policy-core";
import { alertLevelFor, alertLevelPresentation, fieldStatusPresentation } from "@/lib/ui/status-presentation";

type PublicVenuePageProps = {
  params: Promise<{
    venueId: string;
  }>;
};

type FieldSummary = {
  currentOrNextSession: Session | null;
  field: Field;
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
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

function isToday(value: string, now: Date) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isActiveSession(session: Session, now: Date) {
  if (session.status === "active" || session.gameStatus === "active") {
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

function getCurrentOrNextSession(sessions: Session[], now: Date) {
  return sessions.find((session) => isActiveSession(session, now))
    ?? sessions.find((session) => isUpcomingSession(session, now))
    ?? null;
}

function groupTodaySchedule(fields: Field[], sessions: Session[], now: Date) {
  const todaySessions = sessions
    .filter((session) => isToday(session.startTime, now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return fields.map((field) => ({
    field,
    timeGroups: todaySessions
      .filter((session) => session.fieldId === field.id)
      .reduce<Array<{ sessions: Session[]; time: string }>>((groups, session) => {
        const time = formatTime(session.startTime);
        const existing = groups.find((group) => group.time === time);
        if (existing) {
          existing.sessions.push(session);
          return groups;
        }
        return [...groups, { sessions: [session], time }];
      }, []),
  }));
}

function getVenueSponsorCards({
  assignments,
  fields,
  sessions,
  sponsors,
  venueId,
}: {
  assignments: SponsorAssignment[];
  fields: Field[];
  sessions: Session[];
  sponsors: Sponsor[];
  venueId: string;
}) {
  const fieldIds = new Set(fields.map((field) => field.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const relevantAssignments = assignments.filter((assignment) => (
    assignment.venueId === venueId
    || Boolean(assignment.fieldId && fieldIds.has(assignment.fieldId))
    || Boolean(assignment.sessionId && sessionIds.has(assignment.sessionId))
  ));
  const sponsorsById = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));

  return relevantAssignments.flatMap((assignment) => {
    const sponsor = sponsorsById.get(assignment.sponsorId);
    return sponsor ? [{ assignment, sponsor }] : [];
  });
}

function getPublicRecentUpdates(alerts: Alert[]) {
  const seenAllClear = new Set<string>();

  return alerts.filter((alert) => !alert.isActive || isAlertExpired(alert)).filter((alert) => {
    if (alert.title !== "All Clear") {
      return true;
    }

    const key = `${alert.venueId}-${alert.title}`;
    if (seenAllClear.has(key)) {
      return false;
    }

    seenAllClear.add(key);
    return true;
  }).slice(0, 5);
}

function AlertStack({ alerts, showState = false, title }: { alerts: Alert[]; showState?: boolean; title: string }) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <h2 className="px-1 text-xl font-black">{title}</h2>
      {alerts.map((alert) => (
        <article className={`rounded-lg border-2 p-5 shadow-md sm:p-6 ${getAlertTone(alert.alertType)}`} key={alert.id}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em]">{alertLevelPresentation(alertLevelFor(alert.alertPriority, alert.alertType)).label}</p>
            {showState ? (
              <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black uppercase">
                {isAlertActive(alert) ? "Active" : isAlertExpired(alert) ? "Expired" : "Cleared"}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{alert.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-base font-semibold leading-7">{alert.message}</p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] opacity-75">
            Posted {formatAlertTime(alert.createdAt)} · {formatRelativeUpdate(alert.updatedAt)}
          </p>
        </article>
      ))}
    </section>
  );
}

function FieldCard({ summary }: { summary: FieldSummary }) {
  const session = summary.currentOrNextSession;

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-black">{summary.field.name}</h3>
          <span className={`mt-2 inline-flex w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(summary.field.status)}`}>
            {fieldStatusPresentation(summary.field.status).label}
          </span>
        </div>
        <Link className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-black text-white" href={`/fields/${summary.field.id}`}>
          Open Field
        </Link>
      </div>
      {session ? (
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            {isActiveSession(session, new Date()) ? "Current session" : "Next session"}
          </p>
          <h4 className="mt-2 text-base font-black">{session.title}</h4>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {session.homeTeam} vs. {session.awayTeam}
          </p>
          <p className="mt-2 text-sm font-bold text-[var(--foreground)]">{formatDateTime(session.startTime)}</p>
        </div>
      ) : (
        <p className="ui-empty mt-5">No current or upcoming session for this field.</p>
      )}
    </article>
  );
}

export default async function PublicVenuePage({ params }: PublicVenuePageProps) {
  const { venueId } = await params;
  let venue: Venue | null = null;
  let organization: Organization | null = null;
  let fields: Field[] = [];
  let sessions: Session[] = [];
  let alerts: Alert[] = [];
  let allAlerts: Alert[] = [];
  let sponsors: Sponsor[] = [];
  let sponsorAssignments: SponsorAssignment[] = [];
  let resources: Resource[] = [];
  let errorMessage: string | null = null;
  // Starts at the recommended default so a failed load fails toward protection
  // rather than toward publishing whatever is on file.
  let prohibitedCategories: readonly SponsorCategoryKey[] = RECOMMENDED_PROHIBITED_CATEGORIES;

  try {
    venue = await getVenue(venueId);
    if (venue) {
      const [organizationResult, allFields, allSessions, activeAlerts, allAlertResults, allSponsors, allSponsorAssignments, allResources, advertisingPolicy] = await Promise.all([
        venue.organizationId ? getOrganization(venue.organizationId) : Promise.resolve(null),
        getFields(),
        getSessions(),
        getActiveAlerts(),
        getAlerts(),
        getSponsors(),
        getSponsorAssignments(),
        getResources(),
        getProhibitedCategories(venue.organizationId),
      ]);
      organization = organizationResult;
      prohibitedCategories = advertisingPolicy.categories;
      fields = allFields.filter((field) => field.venueId === venueId);
      const fieldIds = new Set(fields.map((field) => field.id));
      sessions = allSessions.filter((session) => fieldIds.has(session.fieldId));
      alerts = fields.length > 0
        ? activeAlerts.filter((alert) => fields.some((field) => filterAlertsForFieldPage({
          alerts: [alert],
          fieldId: field.id,
          publicOnly: true,
          venueId,
        }).length > 0))
        : activeAlerts.filter((alert) => alert.venueId === venueId && alert.alertVisibility === "public");
      allAlerts = allAlertResults.filter((alert) => alert.venueId === venueId && alert.alertVisibility === "public");
      sponsors = allSponsors;
      sponsorAssignments = allSponsorAssignments;
      resources = allResources.filter((resource) => resource.venueId === venueId && resource.status === "active");
    }
  } catch (error) {
    errorMessage = publicErrorMessage(error, "Unable to load venue page.");
  }

  const now = new Date();
  const primaryColor = venue?.primaryColor ?? organization?.primaryColor ?? "#166534";
  const secondaryColor = venue?.secondaryColor ?? organization?.secondaryColor ?? "#111827";
  const logoUrl = venue?.logoUrl ?? organization?.logoUrl;
  const bannerUrl = venue?.bannerUrl ?? organization?.bannerUrl;
  const brandedHeaderStyle: CSSProperties = bannerUrl
    ? {
      backgroundImage: `linear-gradient(120deg, ${secondaryColor}e6, ${primaryColor}cc), url(${bannerUrl})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    }
    : {
      background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
    };
  const fieldSummaries = fields.map((field) => ({
    currentOrNextSession: getCurrentOrNextSession(
      sessions.filter((session) => session.fieldId === field.id),
      now,
    ),
    field,
  }));
  const scheduleGroups = groupTodaySchedule(fields, sessions, now);
  const todaySessionCount = scheduleGroups.reduce((total, group) => total + group.timeGroups.reduce((count, timeGroup) => count + timeGroup.sessions.length, 0), 0);
  // Render-time enforcement of the venue's advertising policy on a public page.
  const sponsorCards = filterProhibitedPlacements(
    getVenueSponsorCards({ assignments: sponsorAssignments, fields, sessions, sponsors, venueId }),
    prohibitedCategories,
  ).visible;
  const resourceTypes = [...new Map(resources.map((resource) => [resource.resourceType, resource])).values()];
  const weatherAlerts = alerts.filter((alert) => alert.alertType === "weather" || alert.alertType === "delay");
  const otherAlerts = alerts.filter((alert) => alert.alertType !== "weather" && alert.alertType !== "delay");
  const recentUpdates = getPublicRecentUpdates(allAlerts);

  return (
    <section className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-0 sm:px-6 sm:py-8">
        <div className="overflow-hidden bg-[var(--panel)] shadow-sm sm:rounded-lg sm:border sm:border-[var(--line)]">
          <header className="p-5 text-white sm:p-8" style={brandedHeaderStyle}>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image alt="" className="h-16 w-16 rounded-lg border border-white/25 bg-white object-contain p-1.5" height={64} src={logoUrl} unoptimized width={64} />
              ) : null}
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{organization?.name ?? "GameDay OS"}</p>
                <h1 className="truncate text-3xl font-black sm:text-5xl">{venue?.name ?? "Venue unavailable"}</h1>
              </div>
            </div>
            {organization?.description ? <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/80">{organization.description}</p> : null}
            {venue?.address ? <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-white/85">{venue.address}</p> : null}
          </header>

          <main className="grid gap-5 p-4 sm:p-6">
            {errorMessage ? (
              <section className="rounded-lg border border-red-200 bg-red-50 p-5">
                <h2 className="text-lg font-black text-red-950">Unable to load venue page</h2>
                <p className="mt-2 text-sm leading-6 text-red-800">{errorMessage}</p>
              </section>
            ) : null}

            {!errorMessage && !venue ? (
              <section className="ui-card p-6">
                <h2 className="text-2xl font-black">Venue not found</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  This public venue page is not available. Check the link or ask the venue for an updated URL.
                </p>
              </section>
            ) : null}

            <AlertStack alerts={weatherAlerts} showState title="Venue status and weather" />

            {venue ? <WeatherOperationsStatusCard venueId={venue.id} /> : null}

            {venue ? <WeatherStatusCard venueId={venue.id} /> : null}

            <AlertStack alerts={otherAlerts} showState title="Venue announcements" />

            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Today</p>
                  <h2 className="mt-1 text-2xl font-black">Today at this venue</h2>
                </div>
                <p className="text-sm font-bold text-[var(--muted)]">{todaySessionCount} sessions today</p>
              </div>
              <div className="mt-5 grid gap-4">
                {todaySessionCount > 0 ? scheduleGroups.filter((group) => group.timeGroups.length > 0).map((group) => (
                  <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={group.field.id}>
                    <h3 className="text-xl font-black">{group.field.name}</h3>
                    <div className="mt-3 grid gap-3">
                      {group.timeGroups.map((timeGroup) => (
                        <div className="rounded-lg bg-white p-3" key={`${group.field.id}-${timeGroup.time}`}>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{timeGroup.time}</p>
                          <div className="mt-3 grid gap-2">
                            {timeGroup.sessions.map((session) => (
                              <div className="rounded-lg border border-[var(--line)] bg-white p-4" key={session.id}>
                                <p className="text-base font-black">{session.title}</p>
                                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{session.homeTeam} vs. {session.awayTeam}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                )) : (
                  <p className="ui-empty">No sessions today. Import or create a session.</p>
                )}
              </div>
            </section>

            <AlertStack alerts={recentUpdates} showState title="Recent updates" />

            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black">Fields</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {fieldSummaries.length > 0 ? fieldSummaries.map((summary) => (
                  <FieldCard key={summary.field.id} summary={summary} />
                )) : (
                  <p className="ui-empty lg:col-span-2">No fields yet. Add your first field.</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black">Venue Map</h2>
              {venue?.mapImageUrl ? (
                <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--background)]">
                  <div className="relative min-w-[520px] sm:min-w-0">
                    <Image alt={`${venue.name} venue map`} className="h-auto w-full object-contain" height={720} src={venue.mapImageUrl} unoptimized width={960} />
                    {fields.filter((field) => field.mapX !== null && field.mapY !== null).map((field) => (
                      <div
                        className="absolute -translate-x-1/2 -translate-y-full"
                        key={field.id}
                        style={{
                          left: `${field.mapX}%`,
                          top: `${field.mapY}%`,
                        }}
                      >
                        <div className="grid justify-items-center">
                          <span className="mb-1 max-w-28 rounded-md bg-[var(--black-soft)] px-2 py-1 text-center text-xs font-black text-white shadow">
                            {field.mapLabel ?? field.name}
                          </span>
                          <span className="h-5 w-5 rounded-full border-4 border-white bg-red-600 shadow" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="ui-empty mt-5">A venue map has not been added yet.</p>
              )}
              {venue?.mapNotes ? <p className="mt-4 whitespace-pre-wrap rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">{venue.mapNotes}</p> : null}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black">Sponsors</h2>
                <div className="mt-5 grid gap-3">
                  {sponsorCards.length > 0 ? sponsorCards.map(({ assignment, sponsor }) => (
                    <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={assignment.id}>
                      <p className="w-fit rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">{assignment.placementLabel}</p>
                      <div className="mt-4 flex items-center gap-3">
                        {sponsor.logoUrl ? <Image alt="" className="h-14 w-14 rounded-lg border border-[var(--line)] bg-white object-contain p-2" height={56} src={sponsor.logoUrl} unoptimized width={56} /> : null}
                        <div>
                          <h3 className="text-base font-black">{sponsor.name}</h3>
                          {sponsor.websiteUrl ? <a className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-white px-3 text-sm font-bold text-[var(--accent-strong)]" href={sponsor.websiteUrl} rel="noreferrer" target="_blank">Visit Website</a> : null}
                        </div>
                      </div>
                    </article>
                  )) : (
                    <p className="ui-empty">No venue sponsors are assigned yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="text-2xl font-black">Available Resources</h2>
                <div className="mt-5 grid gap-3">
                  {resourceTypes.length > 0 ? resourceTypes.map((resource) => (
                    <article className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={resource.id}>
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-white">✓</span>
                      <div>
                        <h3 className="text-base font-black">{getResourceTypeLabel(resource.resourceType)}</h3>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                          {resources.filter((item) => item.resourceType === resource.resourceType).length} active
                        </p>
                      </div>
                    </article>
                  )) : (
                    <p className="ui-empty">No active venue resources configured.</p>
                  )}
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>
    </section>
  );
}
