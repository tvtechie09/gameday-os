import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Database,
  HandHeart,
  MapPin,
  QrCode,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getPublicFieldUrl } from "@/lib/public-url";
import { getAlerts, isAlertActive, isAlertExpired, sortAlertsForDisplay } from "@/lib/services/alerts";
import { getExternalSources } from "@/lib/services/external-sources";
import { getFields } from "@/lib/services/fields";
import { getResourceActivations } from "@/lib/services/resource-activations";
import { getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAnalytics } from "@/lib/services/sponsor-analytics";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
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
  Sponsor,
  SponsorAssignment,
  SyncJob,
  SyncQueueItem,
  Venue,
  VolunteerRole,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type HealthStatus = "Healthy" | "Warning" | "Error" | "Optional";

type HealthItem = {
  actionHref?: string;
  actionLabel?: string;
  detail: string;
  label: string;
  status: HealthStatus;
};

type HealthCategory = {
  icon: typeof ShieldCheck;
  items: HealthItem[];
  title: string;
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load system health ${label}`, error);
    return [];
  }
}

function healthy(label: string, detail: string, actionHref?: string, actionLabel = "Open"): HealthItem {
  return { actionHref, actionLabel, detail, label, status: "Healthy" };
}

function warning(label: string, detail: string, actionHref?: string, actionLabel = "Fix"): HealthItem {
  return { actionHref, actionLabel, detail, label, status: "Warning" };
}

function errorItem(label: string, detail: string, actionHref?: string, actionLabel = "Fix"): HealthItem {
  return { actionHref, actionLabel, detail, label, status: "Error" };
}

function optional(label: string, detail: string, actionHref?: string, actionLabel = "Review"): HealthItem {
  return { actionHref, actionLabel, detail, label, status: "Optional" };
}

function statusFor(condition: boolean, label: string, good: string, bad: string, actionHref?: string, actionLabel?: string) {
  return condition ? healthy(label, good, actionHref, actionLabel) : errorItem(label, bad, actionHref, actionLabel);
}

function optionalStatus(condition: boolean, label: string, good: string, bad: string, actionHref?: string, actionLabel?: string) {
  return condition ? healthy(label, good, actionHref, actionLabel) : optional(label, bad, actionHref, actionLabel);
}

function isUpcomingSession(session: Session, now: Date) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > now.getTime();
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

function hasValidUrl(value: string | null) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasDemoSignal(value: string | null | undefined) {
  return /\b(demo|sample|test)\b/i.test(value ?? "");
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function calculateHealthScore(categories: HealthCategory[]) {
  const scoredItems = categories.flatMap((category) => category.items).filter((item) => item.status !== "Optional");
  if (scoredItems.length === 0) return 0;

  const points = scoredItems.reduce((total, item) => {
    if (item.status === "Healthy") return total + 1;
    if (item.status === "Warning") return total + 0.5;
    return total;
  }, 0);

  return Math.round((points / scoredItems.length) * 100);
}

function getOverallLabel(score: number, errors: number) {
  if (errors > 0 || score < 70) return "Critical Issues";
  if (score < 90) return "Needs Attention";
  return "Healthy";
}

function getPilotReadinessLabel(score: number, errors: number, warnings: number) {
  if (errors > 0 || score < 70) return "Not Ready";
  if (warnings > 0 || score < 90) return "Needs Attention";
  return "Ready for Pilot";
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const className = {
    Error: "bg-red-100 text-red-800 ring-1 ring-red-200",
    Healthy: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    Optional: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    Warning: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
  }[status];

  return <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${className}`}>{status}</span>;
}

function HealthCategoryCard({ category }: { category: HealthCategory }) {
  const Icon = category.icon;

  return (
    <section className="ui-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--line)] p-5">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-black">{category.title}</h2>
      </div>
      <div className="grid divide-y divide-[var(--line)]">
        {category.items.map((item) => (
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center" key={item.label}>
            <div>
              <p className="text-sm font-black">{item.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
            </div>
            <StatusBadge status={item.status} />
            {item.actionHref ? (
              <Link className="ui-button ui-button-secondary min-h-10 px-3 py-2" href={item.actionHref}>
                {item.actionLabel ?? "Open"}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreCard({ score, label }: { label: string; score: number }) {
  const className = label === "Healthy"
    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
    : label === "Needs Attention"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-red-300 bg-red-50 text-red-950";

  return (
    <section className={`rounded-lg border-2 p-6 ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">Overall Health</p>
      <p className="mt-3 text-6xl font-black leading-none tabular-nums">{score}%</p>
      <p className="mt-3 text-2xl font-black">{label}</p>
    </section>
  );
}

export default async function SystemHealthPage() {
  const now = new Date();
  const [
    venues,
    fields,
    sessions,
    sponsors,
    sponsorAssignments,
    alerts,
    resources,
    resourceActivations,
    volunteerRoles,
    externalSources,
    syncJobs,
    pendingSyncQueue,
  ] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<SponsorAssignment>("sponsor assignments", getSponsorAssignments),
    safeLoad<Alert>("alerts", getAlerts),
    safeLoad<Resource>("resources", getResources),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
    safeLoad<VolunteerRole>("volunteer roles", getVolunteerRoles),
    safeLoad<ExternalSource>("external sources", getExternalSources),
    safeLoad<SyncJob>("sync jobs", getSyncJobs),
    safeLoad<SyncQueueItem>("pending sync queue", () => getSyncQueueItems("pending")),
  ]);

  const sponsorAnalyticsAvailable = await getSponsorAnalytics(sponsors.map((sponsor) => sponsor.id), "today")
    .then(() => true)
    .catch((error: unknown) => {
      console.error("Failed to check sponsor analytics tables", error);
      return false;
    });

  const fieldIds = new Set(fields.map((field) => field.id));
  const venueIds = new Set(venues.map((venue) => venue.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const activeOrUpcomingSessions = sessions.filter((session) => isActiveSession(session, now) || isUpcomingSession(session, now));
  const upcomingSessions = sessions.filter((session) => isUpcomingSession(session, now));
  const orphanedSessions = sessions.filter((session) => !fieldIds.has(session.fieldId));
  const invalidStartTimeSessions = sessions.filter((session) => Number.isNaN(new Date(session.startTime).getTime()));
  const sessionsWithoutSport = sessions.filter((session) => !session.sportType);
  const invalidSponsorAssignments = sponsorAssignments.filter((assignment) => (
    (assignment.venueId && !venueIds.has(assignment.venueId))
    || (assignment.fieldId && !fieldIds.has(assignment.fieldId))
    || (assignment.sessionId && !sessionIds.has(assignment.sessionId))
  ));
  const invalidSponsorUrls = sponsors.filter((sponsor) => !hasValidUrl(sponsor.websiteUrl) || !hasValidUrl(sponsor.logoUrl));
  const resourcesWithAssignment = resources.filter((resource) => venueIds.has(resource.venueId) || Boolean(resource.fieldId && fieldIds.has(resource.fieldId)));
  const resourcesWithoutStatus = resources.filter((resource) => !resource.status);
  const pendingResourceActivations = resourceActivations.filter((activation) => activation.status === "requested");
  const pendingVolunteerRequests = volunteerRoles.filter((role) => role.status === "requested");
  const approvedVolunteerIssues = volunteerRoles.filter((role) => (role.status === "approved" || role.status === "active") && (!role.sessionId || !sessionIds.has(role.sessionId)));
  const failedSyncJobs = syncJobs.filter((job) => job.status === "failed");
  const pendingSyncJobs = syncJobs.filter((job) => job.status === "pending" || job.status === "running");
  const lastSync = syncJobs.find((job) => job.completedAt)?.completedAt ?? syncJobs[0]?.createdAt ?? null;
  const expiredActiveAlerts = alerts.filter((alert) => alert.isActive && isAlertExpired(alert, now));
  const activeAlerts = alerts.filter((alert) => isAlertActive(alert, now));
  const urgentAlerts = sortAlertsForDisplay(activeAlerts.filter((alert) => alert.alertPriority === "urgent"));
  const likelyDemoRecords = [
    ...venues.filter((venue) => hasDemoSignal(venue.name) || hasDemoSignal(venue.description)),
    ...fields.filter((field) => hasDemoSignal(field.name)),
    ...sessions.filter((session) => hasDemoSignal(session.title) || hasDemoSignal(session.homeTeam) || hasDemoSignal(session.awayTeam)),
    ...sponsors.filter((sponsor) => hasDemoSignal(sponsor.name)),
  ];
  const hasPublicUrls = fields.length > 0 && fields.every((field) => Boolean(getPublicFieldUrl(field.id)));

  const categories: HealthCategory[] = [
    {
      icon: MapPin,
      title: "Venue Health",
      items: [
        statusFor(venues.length > 0, "Venue exists", `${venues.length} venue${venues.length === 1 ? "" : "s"} configured.`, "Create at least one venue.", "/admin/venues/new", "Add Venue"),
        statusFor(fields.length > 0 && venues.some((venue) => fields.some((field) => field.venueId === venue.id)), "Venue has fields", "At least one venue has fields assigned.", "Add fields to a venue.", "/admin/fields/new", "Add Field"),
        optionalStatus(venues.some((venue) => venue.logoUrl || venue.bannerUrl || venue.primaryColor || venue.secondaryColor), "Venue branding configured optional", "At least one venue has branding configured.", "Branding is optional, but recommended before QR testing.", "/admin/venues", "Review"),
        optionalStatus(venues.some((venue) => venue.mapImageUrl), "Venue map configured optional", "At least one venue map is configured.", "Venue maps are optional, but helpful for parents.", "/admin/venues", "Review"),
      ],
    },
    {
      icon: QrCode,
      title: "Field Health",
      items: [
        statusFor(fields.length > 0 && fields.every((field) => venueIds.has(field.venueId)), "Fields assigned to venue", "Every field is linked to an existing venue.", "Some fields are not linked to a valid venue.", "/admin/fields", "Review"),
        statusFor(fields.length > 0, "Fields have public pages", "Public field routes are available for configured fields.", "Add fields before sharing public pages.", "/admin/fields/new", "Add Field"),
        statusFor(fields.length > 0, "Fields have QR pages", "QR print pages are available for configured fields.", "Add fields before generating QR pages.", "/admin/fields", "Review QR"),
        statusFor(fields.length > 0 && fields.every((field) => Boolean(field.status)), "Fields have field_status", "Every field has a status value.", "Set status for every field.", "/admin/status-board", "Open Status Board"),
      ],
    },
    {
      icon: ClipboardCheck,
      title: "Session Health",
      items: [
        statusFor(upcomingSessions.length > 0, "Upcoming sessions exist", `${upcomingSessions.length} upcoming session${upcomingSessions.length === 1 ? "" : "s"} found.`, "Add upcoming sessions before a pilot.", "/admin/sessions/new", "Add Session"),
        statusFor(sessions.length > 0 && sessions.every((session) => fieldIds.has(session.fieldId)), "Sessions linked to fields", "Every session is linked to an existing field.", "Some sessions are not linked to a valid field.", "/admin/sessions", "Review"),
        statusFor(sessions.length > 0 && invalidStartTimeSessions.length === 0, "Sessions have valid start_time", "Every session has a valid start time.", `${invalidStartTimeSessions.length} session${invalidStartTimeSessions.length === 1 ? "" : "s"} need valid start times.`, "/admin/sessions", "Review"),
        statusFor(sessions.length > 0 && sessionsWithoutSport.length === 0, "Sessions have sport_type", "Every session has a sport type.", "Set a sport type on every session.", "/admin/sessions", "Review"),
        statusFor(orphanedSessions.length === 0, "No orphaned sessions", "No orphaned sessions found.", `${orphanedSessions.length} orphaned session${orphanedSessions.length === 1 ? "" : "s"} found.`, "/admin/sessions", "Review"),
      ],
    },
    {
      icon: ShieldCheck,
      title: "Public Experience Health",
      items: [
        statusFor(fields.length > 0, "Public field pages available", "Configured fields can be opened publicly.", "Add fields to enable public field pages.", "/admin/fields", "Review"),
        statusFor(hasPublicUrls, "QR URLs available", "Public QR URLs can be generated for every field.", "Add fields to generate public QR URLs.", "/admin/fields", "Review"),
        activeOrUpcomingSessions.length > 0
          ? healthy("Active/next session visible when applicable", `${activeOrUpcomingSessions.length} active or upcoming session${activeOrUpcomingSessions.length === 1 ? "" : "s"} can appear on public field pages.`, "/admin/sessions")
          : warning("Active/next session visible when applicable", "No active or upcoming sessions are available for public field pages.", "/admin/sessions/new", "Add Session"),
        activeAlerts.length > 0 ? healthy("Alerts render if active", `${activeAlerts.length} active alert${activeAlerts.length === 1 ? "" : "s"} available to render.`, "/admin/alerts") : optional("Alerts render if active", "No active alerts right now. This is okay unless you are testing communications.", "/admin/alerts/new", "Add Alert"),
        sponsorAssignments.length > 0 ? healthy("Sponsors render if assigned", `${sponsorAssignments.length} sponsor assignment${sponsorAssignments.length === 1 ? "" : "s"} found.`, "/admin/sponsors") : optional("Sponsors render if assigned", "No sponsor assignments yet. Sponsors are optional.", "/admin/sponsors", "Review"),
      ],
    },
    {
      icon: HandHeart,
      title: "Sponsor Health",
      items: [
        optionalStatus(sponsors.length > 0, "Sponsors exist optional", `${sponsors.length} sponsor${sponsors.length === 1 ? "" : "s"} configured.`, "Sponsors are optional for pilot readiness.", "/admin/sponsors/new", "Add Sponsor"),
        statusFor(invalidSponsorAssignments.length === 0, "Sponsor assignments valid", "Sponsor assignments point to valid venues, fields, or sessions.", `${invalidSponsorAssignments.length} sponsor assignment${invalidSponsorAssignments.length === 1 ? "" : "s"} need review.`, "/admin/sponsors", "Review"),
        invalidSponsorUrls.length === 0 ? optional("Sponsor URLs valid optional", "Configured sponsor URLs look valid.", "/admin/sponsors") : warning("Sponsor URLs valid optional", `${invalidSponsorUrls.length} sponsor URL${invalidSponsorUrls.length === 1 ? "" : "s"} may be invalid.`, "/admin/sponsors", "Review"),
        sponsorAnalyticsAvailable ? healthy("Sponsor analytics tables available", "Sponsor impression and click tracking is available.", "/admin/sponsors") : warning("Sponsor analytics tables available", "Sponsor analytics could not be read. Check migrations and RLS policies.", "/admin/sponsors", "Review"),
      ],
    },
    {
      icon: Radio,
      title: "Resource Health",
      items: [
        optionalStatus(resources.length > 0, "Resources exist optional", `${resources.length} resource${resources.length === 1 ? "" : "s"} configured.`, "Resources are optional for pilot readiness.", "/admin/resources/new", "Add Resource"),
        resources.length === 0 || resourcesWithAssignment.length === resources.length ? healthy("Resources assigned to venue or field", "All configured resources have venue or field assignment.", "/admin/resources") : warning("Resources assigned to venue or field", "Some resources need venue or field assignment.", "/admin/resources", "Review"),
        resourcesWithoutStatus.length === 0 ? healthy("Resources have status", "All configured resources have a status.", "/admin/resources") : warning("Resources have status", "Some resources are missing status values.", "/admin/resources", "Review"),
        pendingResourceActivations.length > 0 ? healthy("Pending resource activations visible", `${pendingResourceActivations.length} pending activation request${pendingResourceActivations.length === 1 ? "" : "s"} visible.`, "/admin/resources/activations") : optional("Pending resource activations visible", "No pending resource activations right now.", "/admin/resources/activations", "Review"),
      ],
    },
    {
      icon: Users,
      title: "Volunteer Health",
      items: [
        pendingVolunteerRequests.length > 0 ? healthy("Pending volunteer requests visible", `${pendingVolunteerRequests.length} pending volunteer request${pendingVolunteerRequests.length === 1 ? "" : "s"} visible.`, "/admin/volunteers") : optional("Pending volunteer requests visible", "No pending volunteer requests right now.", "/admin/volunteers", "Review"),
        approvedVolunteerIssues.length === 0 ? healthy("Approved volunteers linked to sessions", "Approved or active volunteers are linked to sessions when needed.", "/admin/volunteers") : warning("Approved volunteers linked to sessions", `${approvedVolunteerIssues.length} approved/active volunteer role${approvedVolunteerIssues.length === 1 ? "" : "s"} need session links.`, "/admin/volunteers", "Review"),
      ],
    },
    {
      icon: Database,
      title: "Integration Health",
      items: [
        optionalStatus(externalSources.length > 0, "External sources exist optional", `${externalSources.length} external source${externalSources.length === 1 ? "" : "s"} configured.`, "External sources are optional.", "/admin/integrations/new", "Add Source"),
        failedSyncJobs.length === 0 ? healthy("Failed sync jobs flagged", "No failed sync jobs found.", "/admin/integrations/health") : warning("Failed sync jobs flagged", `${failedSyncJobs.length} failed sync job${failedSyncJobs.length === 1 ? "" : "s"} need review.`, "/admin/integrations/health", "Review"),
        pendingSyncJobs.length + pendingSyncQueue.length === 0 ? healthy("Pending sync jobs flagged", "No pending sync work waiting.", "/admin/sync") : warning("Pending sync jobs flagged", `${pendingSyncJobs.length + pendingSyncQueue.length} pending sync item${pendingSyncJobs.length + pendingSyncQueue.length === 1 ? "" : "s"} need review.`, "/admin/sync/review", "Review"),
        optional("Last sync shown when available", `Last sync: ${formatDateTime(lastSync)}.`, "/admin/integrations/health", "Open Health"),
      ],
    },
    {
      icon: Bell,
      title: "Alert Health",
      items: [
        expiredActiveAlerts.length === 0 ? healthy("Expired alerts should not remain active", "No expired active alerts found.", "/admin/alerts") : warning("Expired alerts should not remain active", `${expiredActiveAlerts.length} expired alert${expiredActiveAlerts.length === 1 ? "" : "s"} are still marked active.`, "/admin/alerts", "Review"),
        urgentAlerts.length > 0 ? warning("Active urgent alerts highlighted", `${urgentAlerts.length} urgent alert${urgentAlerts.length === 1 ? "" : "s"} active now.`, "/admin/alerts", "Review") : healthy("Active urgent alerts highlighted", "No urgent alerts active right now.", "/admin/alerts"),
      ],
    },
    {
      icon: AlertTriangle,
      title: "Demo Data Health",
      items: [
        likelyDemoRecords.length > 0 ? warning("Show if demo data exists", `${likelyDemoRecords.length} likely demo/sample/test record${likelyDemoRecords.length === 1 ? "" : "s"} found.`, "/admin/demo", "Review Demo") : healthy("Show if demo data exists", "No obvious demo/sample/test records found.", "/admin/demo", "Review Demo"),
      ],
    },
  ];

  const allItems = categories.flatMap((category) => category.items);
  const errors = allItems.filter((item) => item.status === "Error").length;
  const warnings = allItems.filter((item) => item.status === "Warning").length;
  const optionalCount = allItems.filter((item) => item.status === "Optional").length;
  const score = calculateHealthScore(categories);
  const overallLabel = getOverallLabel(score, errors);
  const pilotReadiness = getPilotReadinessLabel(score, errors, warnings);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">System health</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">System Health Center</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Identify configuration problems before a venue pilot or tournament. No data is changed from this page.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link className="ui-button ui-button-primary" href="/admin/pilot-prep">
            Pilot Prep
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/executive">
            Executive Dashboard
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/demo">
            Demo Review
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[360px_1fr]">
        <ScoreCard label={overallLabel} score={score} />
        <section className="ui-card p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">Pilot Readiness Summary</p>
          <h2 className="mt-2 text-3xl font-black">{pilotReadiness}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {errors > 0
              ? `${errors} error${errors === 1 ? "" : "s"} must be resolved before a reliable pilot.`
              : warnings > 0
                ? `${warnings} warning${warnings === 1 ? "" : "s"} should be reviewed before field testing.`
                : "Required checks are healthy. Optional enhancements can still improve the parent experience."}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-red-50 p-4 text-red-800">
              <p className="text-xs font-black uppercase tracking-[0.12em]">Errors</p>
              <p className="mt-1 text-3xl font-black">{errors}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-black uppercase tracking-[0.12em]">Warnings</p>
              <p className="mt-1 text-3xl font-black">{warnings}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4 text-slate-700">
              <p className="text-xs font-black uppercase tracking-[0.12em]">Optional</p>
              <p className="mt-1 text-3xl font-black">{optionalCount}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        {categories.map((category) => (
          <HealthCategoryCard category={category} key={category.title} />
        ))}
      </section>

      <section className="mt-8 rounded-lg border-2 border-[var(--accent)] bg-[var(--accent-soft)] p-5 text-[var(--accent-strong)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-black">System Health uses existing schema only</h2>
            <p className="mt-2 text-sm font-semibold leading-6">
              These checks are calculated from venues, fields, sessions, sponsors, alerts, resources, volunteers, external sources, sync jobs, and analytics tables already present in GameDay OS.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
