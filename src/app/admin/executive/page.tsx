import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Database,
  HandHeart,
  Radio,
  Users,
} from "lucide-react";
import { getActiveAlerts, getAlertLabel, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getExternalSources } from "@/lib/services/external-sources";
import { getFields } from "@/lib/services/fields";
import { getResourceActivations } from "@/lib/services/resource-activations";
import { getResources } from "@/lib/services/resources";
import { getRecentSessionEvents, getSessionEventTypeLabel } from "@/lib/services/session-events";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAnalytics } from "@/lib/services/sponsor-analytics";
import { getSponsors } from "@/lib/services/sponsors";
import { getSyncJobs, getSyncQueueItems } from "@/lib/services/sync-engine";
import { getVenues } from "@/lib/services/venues";
import { getVolunteerRoles } from "@/lib/services/volunteer-roles";
import type {
  Alert,
  ExternalSource,
  Field,
  Resource,
  ResourceActivation,
  Session,
  SessionEvent,
  Sponsor,
  SponsorAnalyticsSummary,
  SyncJob,
  SyncQueueItem,
  Venue,
  VolunteerRole,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type ExecutiveActivity = {
  href?: string;
  label: string;
  timestamp: string;
  title: string;
  tone: "alert" | "event" | "resource" | "session";
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load executive dashboard ${label}`, error);
    return [];
  }
}

function isSameDay(value: string, date: Date) {
  const item = new Date(value);
  return item.getFullYear() === date.getFullYear()
    && item.getMonth() === date.getMonth()
    && item.getDate() === date.getDate();
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function SummaryCard({
  href,
  label,
  value,
  note,
  icon: Icon,
}: {
  href?: string;
  icon: typeof Activity;
  label: string;
  note: string;
  value: number | string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        {href ? (
          <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Open
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black leading-none tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-3 text-sm font-semibold leading-5 text-[var(--muted)]">{note}</p>
    </>
  );

  if (href) {
    return (
      <Link className="ui-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md" href={href}>
        {content}
      </Link>
    );
  }

  return <article className="ui-card p-5">{content}</article>;
}

function SectionHeader({ title, note, action }: { action?: React.ReactNode; note: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="ui-empty mt-4">{children}</div>;
}

function buildRecentActivity({
  alerts,
  activations,
  events,
  sessions,
}: {
  activations: ResourceActivation[];
  alerts: Alert[];
  events: SessionEvent[];
  sessions: Session[];
}): ExecutiveActivity[] {
  const sessionStarts = sessions
    .filter((session) => session.status === "active" || session.gameStatus === "active")
    .map((session) => ({
      href: `/admin/sessions/${session.id}`,
      label: "Session started",
      timestamp: session.startTime,
      title: session.title,
      tone: "session" as const,
    }));

  const alertItems = alerts.map((alert) => ({
    href: `/admin/alerts/${alert.id}/edit`,
    label: getAlertLabel(alert.alertType),
    timestamp: alert.createdAt,
    title: alert.title,
    tone: "alert" as const,
  }));

  const resourceItems = activations.slice(0, 10).map((activation) => ({
    href: "/admin/resources/activations",
    label: activation.status === "requested" ? "Resource request" : "Resource activation",
    timestamp: activation.createdAt,
    title: activation.displayName,
    tone: "resource" as const,
  }));

  const eventItems = events.map((event) => ({
    href: `/admin/sessions/${event.sessionId}`,
    label: getSessionEventTypeLabel(event.eventType),
    timestamp: event.createdAt,
    title: event.eventMessage,
    tone: "event" as const,
  }));

  return [...alertItems, ...sessionStarts, ...resourceItems, ...eventItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);
}

export default async function ExecutiveDashboardPage() {
  const now = new Date();
  const [
    venues,
    fields,
    sessions,
    sponsors,
    activeAlerts,
    resources,
    activations,
    volunteerRoles,
    externalSources,
    syncJobs,
    syncQueueItems,
    sessionEvents,
  ] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<Alert>("active alerts", getActiveAlerts),
    safeLoad<Resource>("resources", getResources),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
    safeLoad<VolunteerRole>("volunteer roles", getVolunteerRoles),
    safeLoad<ExternalSource>("external sources", getExternalSources),
    safeLoad<SyncJob>("sync jobs", getSyncJobs),
    safeLoad<SyncQueueItem>("sync queue", () => getSyncQueueItems("pending")),
    safeLoad<SessionEvent>("session events", () => getRecentSessionEvents(12)),
  ]);

  const sponsorAnalytics = await getSponsorAnalytics(sponsors.map((sponsor) => sponsor.id), "all").catch((error: unknown) => {
    console.error("Failed to load executive dashboard sponsor analytics", error);
    return [] as SponsorAnalyticsSummary[];
  });

  const activeGames = sessions.filter((session) => isActiveSession(session, now));
  const gamesToday = sessions.filter((session) => isSameDay(session.startTime, now));
  const activeResources = resources.filter((resource) => resource.status === "active");
  const activeActivations = activations.filter((activation) => activation.status === "active");
  const pendingActivations = activations.filter((activation) => activation.status === "requested");
  const activeVolunteers = volunteerRoles.filter((role) => role.status === "active");
  const openVolunteerRoles = volunteerRoles.filter((role) => role.status === "requested" || role.status === "approved");
  const totalSponsorImpressions = sponsorAnalytics.reduce((total, item) => total + item.impressions, 0);
  const totalSponsorClicks = sponsorAnalytics.reduce((total, item) => total + item.clicks, 0);
  const topSponsorRows = sponsorAnalytics
    .map((analytics) => ({
      ...analytics,
      sponsor: sponsors.find((sponsor) => sponsor.id === analytics.sponsorId) ?? null,
    }))
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, 5);
  const connectedSources = externalSources.filter((source) => source.sourceStatus === "connected");
  const pendingSyncJobs = syncJobs.filter((job) => job.status === "pending" || job.status === "running");
  const failedSyncJobs = syncJobs.filter((job) => job.status === "failed");
  const recentActivity = buildRecentActivity({
    activations,
    alerts: activeAlerts,
    events: sessionEvents,
    sessions,
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Executive</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Executive dashboard</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            A director-level snapshot of venue activity, sponsor engagement, resource coverage, volunteers, alerts, and external data health.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link className="ui-button ui-button-primary" href="/admin/game-day">
            Game Day
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/dashboard">
            Operations Dashboard
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/system-health">
            System Health
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/integrations/health">
            Integration Health
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard href="/admin/venues" icon={BarChart3} label="Venues" note="Configured venue profiles" value={venues.length} />
        <SummaryCard href="/admin/fields" icon={Activity} label="Fields" note="Operational field inventory" value={fields.length} />
        <SummaryCard href="/admin/game-day" icon={Radio} label="Active Games" note="Live or in-window sessions" value={activeGames.length} />
        <SummaryCard href="/admin/sessions" icon={CalendarDays} label="Games Today" note="Sessions scheduled today" value={gamesToday.length} />
        <SummaryCard href="/admin/sponsors" icon={HandHeart} label="Sponsor Impressions" note={`${totalSponsorClicks} total sponsor clicks`} value={totalSponsorImpressions} />
        <SummaryCard href="/admin/resources" icon={Database} label="Active Resources" note={`${activeActivations.length} live parent/operator activations`} value={activeResources.length} />
        <SummaryCard href="/admin/volunteers" icon={Users} label="Active Volunteers" note={`${openVolunteerRoles.length} open role requests`} value={activeVolunteers.length} />
        <SummaryCard href="/admin/alerts" icon={Bell} label="Active Alerts" note="Currently visible operational alerts" value={activeAlerts.length} />
      </section>

      <section className="mt-10">
        <SectionHeader note="Field health by venue for quick director review." title="Venue Health" />
        {venues.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {venues.map((venue) => {
              const venueFields = fields.filter((field) => field.venueId === venue.id);
              const activeFields = venueFields.filter((field) => field.status === "active");
              const delayedFields = venueFields.filter((field) => field.status === "delayed");
              const closedFields = venueFields.filter((field) => field.status === "closed");

              return (
                <article className="ui-card p-5" key={venue.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black">{venue.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{venue.address || "No address listed"}</p>
                    </div>
                    <Link className="ui-button ui-button-secondary min-h-10 px-3 py-2" href={`/admin/venues/${venue.id}/edit`}>
                      Edit
                    </Link>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MetricPill label="Total Fields" value={venueFields.length} />
                    <MetricPill label="Active" tone="green" value={activeFields.length} />
                    <MetricPill label="Delayed" tone="amber" value={delayedFields.length} />
                    <MetricPill label="Closed" tone="red" value={closedFields.length} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState>No venues are configured yet.</EmptyState>
        )}
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="ui-card p-5">
          <SectionHeader action={<Link className="ui-button ui-button-secondary" href="/admin/sponsors">Open Sponsors</Link>} note="Top sponsor visibility and engagement across public field pages." title="Sponsor Summary" />
          {topSponsorRows.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {topSponsorRows.map((row) => (
                <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={row.sponsorId}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black">{row.sponsor?.name ?? "Sponsor unavailable"}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{row.impressions} impressions · {row.clicks} clicks</p>
                    </div>
                    <span className="w-fit rounded-md bg-[var(--accent-soft)] px-3 py-2 text-sm font-black text-[var(--accent-strong)]">
                      {formatPercent(row.ctr)} CTR
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No sponsor analytics have been recorded yet.</EmptyState>
          )}
        </div>

        <div className="grid gap-6">
          <ExecutivePanel
            href="/admin/resources/dashboard"
            items={[
              { label: "Resources Active", value: activeResources.length },
              { label: "Pending Activations", value: pendingActivations.length },
            ]}
            note="Resource coverage and parent/operator requests."
            title="Resource Summary"
          />
          <ExecutivePanel
            href="/admin/volunteers"
            items={[
              { label: "Active Volunteers", value: activeVolunteers.length },
              { label: "Open Roles", value: openVolunteerRoles.length },
            ]}
            note="Approved operators and roles still needing attention."
            title="Volunteer Summary"
          />
          <ExecutivePanel
            href="/admin/integrations/health"
            items={[
              { label: "Connected Sources", value: connectedSources.length },
              { label: "Pending Sync Jobs", value: pendingSyncJobs.length + syncQueueItems.length },
              { label: "Failed Sync Jobs", value: failedSyncJobs.length },
            ]}
            note="External data source and sync queue health."
            title="Integration Summary"
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader action={<Link className="ui-button ui-button-secondary" href="/admin/notifications">Open Event Inbox</Link>} note="Timeline events, new alerts, session starts, and resource activations." title="Recent Activity" />
        {recentActivity.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {recentActivity.map((item) => {
              const toneClass = {
                alert: "bg-amber-100 text-amber-950",
                event: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
                resource: "bg-cyan-50 text-cyan-800",
                session: "bg-red-50 text-red-700",
              }[item.tone];
              const content = (
                <article className="ui-card p-4 transition hover:border-[var(--accent)] hover:shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${toneClass}`}>
                        {item.label}
                      </span>
                      <h3 className="mt-3 text-base font-black">{item.title}</h3>
                    </div>
                    <p className="text-sm font-bold text-[var(--muted)]">{formatDateTime(item.timestamp)}</p>
                  </div>
                </article>
              );

              return item.href ? (
                <Link href={item.href} key={`${item.label}-${item.timestamp}-${item.title}`}>
                  {content}
                </Link>
              ) : (
                <div key={`${item.label}-${item.timestamp}-${item.title}`}>{content}</div>
              );
            })}
          </div>
        ) : (
          <EmptyState>No recent operational activity yet.</EmptyState>
        )}
      </section>

      {sortAlertsForDisplay(activeAlerts).some((alert) => alert.alertPriority === "urgent" || alert.alertPriority === "high") ? (
        <section className="mt-10 rounded-lg border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-black text-amber-950">High-priority alerts are active</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Review active communications before the next game window.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function MetricPill({ label, value, tone = "neutral" }: { label: string; tone?: "amber" | "green" | "neutral" | "red"; value: number }) {
  const classes = {
    amber: "bg-amber-50 text-amber-900",
    green: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    neutral: "bg-[var(--background)] text-[var(--foreground)]",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg p-3 ${classes[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function ExecutivePanel({
  href,
  items,
  note,
  title,
}: {
  href: string;
  items: Array<{ label: string; value: number }>;
  note: string;
  title: string;
}) {
  return (
    <article className="ui-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{note}</p>
        </div>
        <Link className="ui-button ui-button-secondary min-h-10 px-3 py-2" href={href}>
          Open
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {items.map((item) => (
          <MetricPill key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </article>
  );
}
