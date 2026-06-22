import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import type { CSSProperties } from "react";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getCurrentOrganizationScope } from "@/lib/organization-scope";
import { getActiveAlerts, getAlertLabel, getAlertTone, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getFieldPageViewDashboardCounts } from "@/lib/services/field-page-views";
import { fieldStatuses, getFields, getFieldStatusClass, getFieldStatusLabel, readFieldStatus, updateFieldStatus } from "@/lib/services/fields";
import { getFollowDashboardCounts } from "@/lib/services/follows";
import { getResourceActivations, getActivationLabel } from "@/lib/services/resource-activations";
import { getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsors } from "@/lib/services/sponsors";
import { getSyncDashboardStats, getSyncJobs } from "@/lib/services/sync-engine";
import { getOrganization } from "@/lib/services/organizations";
import { getVenues } from "@/lib/services/venues";
import { getVolunteerRoleLabel, getVolunteerRoles } from "@/lib/services/volunteer-roles";
import { getWeatherProfiles, getWeatherStatusClass, getWeatherStatusLabel } from "@/lib/services/weather-profiles";
import type { Alert, Field, Resource, ResourceActivation, Session, Sponsor, Venue, VolunteerRole, WeatherProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

type FieldOperations = {
  field: Field;
  venue: Venue | null;
  currentSession: Session | null;
  nextSession: Session | null;
  hasNoUpcomingSessions: boolean;
};

type DashboardPageProps = {
  searchParams?: Promise<{
    sport?: string;
  }>;
};

const sportFilters = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"] as const;

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

function SummaryCard({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <article className="ui-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black leading-none tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-3 min-h-10 text-sm font-semibold leading-5 text-[var(--muted)]">{note}</p>
    </article>
  );
}

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load dashboard ${label}`, error);
    return [];
  }
}

export default async function VenueOperationsDashboard({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedSport = sportFilters.find((sport) => sport === resolvedSearchParams?.sport) ?? "all";
  const selectedOrganizationId = await getCurrentOrganizationScope();
  const selectedOrganization = selectedOrganizationId ? await getOrganization(selectedOrganizationId).catch((error: unknown) => {
    console.error("Failed to load dashboard organization branding", error);
    return null;
  }) : null;

  async function updateDashboardFieldStatusAction(formData: FormData) {
    "use server";

    const fieldId = String(formData.get("field_id") ?? "").trim();
    const status = readFieldStatus(String(formData.get("status") ?? "open"));

    if (!fieldId) {
      return;
    }

    try {
      await updateFieldStatus(fieldId, status);
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/fields");
      revalidatePath(`/fields/${fieldId}`);
    } catch (error) {
      console.error("Failed to update dashboard field status", error);
    }
  }

  const now = new Date();
  const [venues, fields, sessions, sponsors, activeAlerts, resources, activations, volunteerRoles] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<Resource>("resources", getResources),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
    safeLoad<VolunteerRole>("volunteer roles", getVolunteerRoles),
  ]);
  const weatherProfiles = await safeLoad<WeatherProfile>("weather profiles", getWeatherProfiles);
  const fieldPageViews = await getFieldPageViewDashboardCounts().catch((error: unknown) => {
    console.error("Failed to load dashboard field page view counts", error);
    return { today: 0, last7Days: 0 };
  });
  const follows = await getFollowDashboardCounts().catch((error: unknown) => {
    console.error("Failed to load dashboard follow counts", error);
    return { today: 0, last7Days: 0 };
  });
  const syncStats = await getSyncDashboardStats().catch((error: unknown) => {
    console.error("Failed to load dashboard sync stats", error);
    return { failedJobs: 0, lastSync: null, pendingReviewItems: 0 };
  });
  const syncJobs = await getSyncJobs().catch((error: unknown) => {
    console.error("Failed to load dashboard sync jobs", error);
    return [];
  });

  const todaySessions = sessions
    .filter((session) => isSameDay(session.startTime, now))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const visibleTodaySessions = selectedSport === "all" ? todaySessions : todaySessions.filter((session) => session.sportType === selectedSport);
  const activeGames = sessions.filter((session) => isActiveSession(session, now));
  const upcomingGames = sessions.filter((session) => isUpcomingSession(session, now));
  const upcomingToday = todaySessions.filter((session) => isUpcomingSession(session, now));
  const delayedGames = todaySessions.filter(isDelayedSession);
  const fieldOperations = buildFieldOperations(fields, venues, sessions, now);
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const activeResources = resources.filter((resource) => resource.status === "active");
  const venueWideResources = resources.filter((resource) => !resource.fieldId);
  const pendingActivations = activations.filter((activation) => activation.status === "requested");
  const pendingVolunteerRoles = volunteerRoles.filter((role) => role.status === "requested");
  const urgentAlerts = sortAlertsForDisplay(activeAlerts.filter((alert) => alert.alertPriority === "urgent"));
  const sportsEngineSyncJobs = syncJobs.filter((job) => job.sourceType === "sportsengine");
  const weatherProfilesByVenueId = new Map(weatherProfiles.map((profile) => [profile.venueId, profile]));
  const organizationBrandStyle: CSSProperties = {
    background: selectedOrganization
      ? `linear-gradient(135deg, ${selectedOrganization.secondaryColor ?? "#111827"}, ${selectedOrganization.primaryColor ?? "#166534"})`
      : "linear-gradient(135deg, #111827, #166534)",
  };

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
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link href="/admin/game-day" className="ui-button ui-button-primary">
            Game Day
          </Link>
          <Link href="/admin/status-board" className="ui-button ui-button-primary">
            Status Board
          </Link>
          <Link href="/admin/resources/dashboard" className="ui-button ui-button-secondary">
            Resource Dashboard
          </Link>
          <Link href="/admin/weather" className="ui-button ui-button-secondary">
            Weather
          </Link>
          <Link href="/admin/alerts/new?weather_delay=true" className="ui-button ui-button-secondary">
            Weather Delay Alert
          </Link>
          <Link href="/admin/integrations" className="ui-button ui-button-secondary">
            Integrations
          </Link>
          <Link href="/admin/integrations/health" className="ui-button ui-button-secondary">
            Integration Health
          </Link>
          <Link href="/admin/sync" className="ui-button ui-button-secondary">
            Sync Engine
          </Link>
          <Link href="/admin/sessions/bulk" className="ui-button ui-button-secondary">
            Bulk session tools
          </Link>
        </div>
      </div>

      {selectedOrganization ? (
        <section className="mt-8 rounded-lg p-5 text-white shadow-sm" style={organizationBrandStyle}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {selectedOrganization.logoUrl ? (
                <Image alt="" className="h-14 w-14 rounded-lg border border-white/25 bg-white object-contain p-1.5" height={56} src={selectedOrganization.logoUrl} unoptimized width={56} />
              ) : null}
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Organization</p>
                <h2 className="text-2xl font-black">{selectedOrganization.name}</h2>
                {selectedOrganization.description ? <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-white/75">{selectedOrganization.description}</p> : null}
              </div>
            </div>
            <Link href={`/admin/organizations/${selectedOrganization.id}/edit`} className="ui-button bg-white text-[var(--black-soft)] hover:bg-white/90">
              Edit Branding
            </Link>
          </div>
        </section>
      ) : null}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total venues" note="Configured venues" value={venues.length} />
            <SummaryCard label="Total fields" note="QR-ready fields" value={fields.length} />
            <SummaryCard label="Total sessions" note="All sessions from Supabase" value={sessions.length} />
            <SummaryCard label="Total sponsors" note="Sponsor profiles from Supabase" value={sponsors.length} />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Games today" note="All sessions today" value={todaySessions.length} />
            <SummaryCard label="Active games" note="Live now" value={activeGames.length} />
            <SummaryCard label="Upcoming games" note="Future scheduled games" value={upcomingGames.length} />
            <SummaryCard label="Resources" note="Active inventory" value={activeResources.length} />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total resources" note="Venue and field assignments" value={resources.length} />
            <SummaryCard label="Active resources" note="Visible on public field pages" value={activeResources.length} />
            <SummaryCard label="Pending requests" note="Parent resource attachment requests" value={pendingActivations.length} />
            <SummaryCard label="Venue-wide resources" note="Available across venue fields" value={venueWideResources.length} />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Field page views today" note="Anonymous public field visits" value={fieldPageViews.today} />
            <SummaryCard label="Field page views last 7 days" note="Anonymous public field visits" value={fieldPageViews.last7Days} />
            <SummaryCard label="Total follows today" note="Anonymous field and game follows" value={follows.today} />
            <SummaryCard label="Total follows last 7 days" note="Anonymous field and game follows" value={follows.last7Days} />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Active alerts" note="Currently in alert window" value={activeAlerts.length} />
            <SummaryCard label="Urgent alerts" note="Active urgent communications" value={urgentAlerts.length} />
            <SummaryCard label="Last sync" note="Most recent sync job" value={syncStats.lastSync ? formatDateTime(syncStats.lastSync) : "Never"} />
            <SummaryCard label="Pending review" note="Sync queue items waiting" value={syncStats.pendingReviewItems} />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Failed sync jobs" note="External imports needing attention" value={syncStats.failedJobs} />
            <SummaryCard label="SportsEngine sync jobs" note="CSV, feed, and public URL imports" value={sportsEngineSyncJobs.length} />
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Weather awareness</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Manual placeholder status for venue weather checks. No paid weather API, lightning detection, or automatic cancellations are connected yet.
                </p>
              </div>
              <Link href="/admin/alerts/new?weather_delay=true" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-950">
                Create Weather Delay Alert
              </Link>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {weatherProfiles.length > 0 ? weatherProfiles.slice(0, 6).map((profile) => {
                const venue = venuesById.get(profile.venueId);

                return (
                  <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={profile.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black">{venue?.name ?? "Venue unavailable"}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{profile.locationName}</p>
                      </div>
                      <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getWeatherStatusClass(profile.status)}`}>
                        {getWeatherStatusLabel(profile.status)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Condition</p>
                        <p className="mt-1 text-sm font-black">Manual check</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Temp</p>
                        <p className="mt-1 text-sm font-black">Pending</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Rain / Lightning</p>
                        <p className="mt-1 text-sm font-black">Not automated</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Last checked</p>
                        <p className="mt-1 text-sm font-black">Manual</p>
                      </div>
                    </div>
                  </article>
                );
              }) : (
                <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No weather profiles configured yet.</p>
              )}
            </div>
          </section>

          {urgentAlerts.length > 0 ? (
            <section className="mt-8 rounded-lg border border-red-300 bg-red-50 p-5">
              <h2 className="text-xl font-black text-red-950">Active urgent alerts</h2>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {urgentAlerts.map((alert) => (
                  <article className="rounded-lg bg-white p-4" key={alert.id}>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">{getAlertLabel(alert.alertType)}</p>
                    <h3 className="mt-1 text-lg font-black text-red-950">{alert.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-red-900">{alert.message}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Pending resource activations</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Volunteer and parent requests waiting for approval.</p>
              </div>
              <Link href="/admin/resources/activations" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                Review requests
              </Link>
            </div>
            {pendingActivations.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {pendingActivations.slice(0, 4).map((activation) => (
                  <article className="rounded-lg bg-[var(--background)] p-4" key={activation.id}>
                    <h3 className="text-base font-black">{getActivationLabel(activation.activationType)}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {activation.displayName} · {venuesById.get(activation.venueId)?.name ?? "Venue unavailable"} · {fieldsById.get(activation.fieldId)?.name ?? "Field unavailable"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No pending activation requests.</p>
            )}
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Pending volunteer requests</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Game operation roles waiting for approval.</p>
              </div>
              <Link href="/admin/volunteers" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                Review volunteers
              </Link>
            </div>
            {pendingVolunteerRoles.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {pendingVolunteerRoles.slice(0, 4).map((role) => (
                  <article className="rounded-lg bg-[var(--background)] p-4" key={role.id}>
                    <h3 className="text-base font-black">{getVolunteerRoleLabel(role.roleType)}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {role.displayName} · {venuesById.get(role.venueId)?.name ?? "Venue unavailable"} · {fieldsById.get(role.fieldId)?.name ?? "Field unavailable"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No pending volunteer requests.</p>
            )}
          </section>

          <section className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Active alerts</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Current communications visible on public field pages.</p>
              </div>
              <Link href="/admin/alerts/new" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-bold">
                New alert
              </Link>
            </div>
            {activeAlerts.length > 0 ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {activeAlerts.map((alert) => (
                  <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
                    <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)}</p>
                    <h3 className="mt-1 text-lg font-black">{alert.title}</h3>
                    <p className="mt-2 text-sm leading-6">{alert.message}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] opacity-75">
                      {venuesById.get(alert.venueId)?.name ?? "Venue unavailable"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-5 text-sm leading-6 text-[var(--muted)]">
                No active alerts.
              </p>
            )}
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
                const venueResources = resources.filter((resource) => resource.venueId === venue.id);
                const venueActiveResources = venueResources.filter((resource) => resource.status === "active");
                const venueWeatherProfile = weatherProfilesByVenueId.get(venue.id);

                return (
                  <article key={venue.id} className="rounded-lg border border-[var(--line)] bg-white p-5">
                    <h3 className="text-lg font-black">{venue.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue.address || "No address listed"}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      <div className="rounded-lg bg-[var(--background)] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Resources</p>
                        <p className="mt-1 text-xl font-black">{venueActiveResources.length}/{venueResources.length}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--background)] p-3 sm:col-span-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Weather</p>
                        {venueWeatherProfile ? (
                          <p className="mt-1 text-sm font-black">
                            {venueWeatherProfile.locationName} · {getWeatherStatusLabel(venueWeatherProfile.status)}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm font-black">No weather profile configured</p>
                        )}
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
                        <span className={`mt-2 inline-flex w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(operation.field.status)}`}>
                          Field {getFieldStatusLabel(operation.field.status)}
                        </span>
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
                          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                            {operation.currentSession.sportType}
                          </p>
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
                          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                            {operation.nextSession.sportType}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{formatDateTime(operation.nextSession.startTime)}</p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm font-bold text-slate-600">No upcoming sessions scheduled.</p>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <form action={updateDashboardFieldStatusAction} className="grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 sm:col-span-3 sm:grid-cols-[1fr_auto]">
                        <input name="field_id" type="hidden" value={operation.field.id} />
                        <label className="grid gap-1">
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Quick field status</span>
                          <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={operation.field.status} name="status">
                            {fieldStatuses.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {getFieldStatusLabel(statusOption)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white sm:self-end" type="submit">
                          Update
                        </button>
                      </form>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black">Today&apos;s schedule</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Filter by sport without changing the operations totals above.</p>
              </div>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                <Link className={selectedSport === "all" ? "whitespace-nowrap rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" : "whitespace-nowrap rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"} href="/admin/dashboard">
                  All
                </Link>
                {sportFilters.map((sport) => (
                  <Link
                    className={selectedSport === sport ? "whitespace-nowrap rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white" : "whitespace-nowrap rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"}
                    href={`/admin/dashboard?sport=${sport}`}
                    key={sport}
                  >
                    {sport}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {visibleTodaySessions.length > 0 ? (
                visibleTodaySessions.map((session) => {
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
                          <p className="mt-2 w-fit rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                            {session.sportType}
                          </p>
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
                  No sessions today. Import or create a session.
                </p>
              )}
            </div>
          </section>
    </section>
  );
}
