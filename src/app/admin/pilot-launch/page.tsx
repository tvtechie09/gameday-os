import Link from "next/link";
import {
  Activity,
  Bell,
  ClipboardCheck,
  ExternalLink,
  HandHeart,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  getPublicAppUrl,
  getPublicFieldScoreboardUrl,
  getPublicFieldUrl,
  getPublicScoreboardUrl,
  getPublicVenueDisplayUrl,
  getPublicVenueUrl,
  publicAppUrlPointsToLocalhost,
} from "@/lib/public-url";
import { getActiveAlerts } from "@/lib/services/alerts";
import { getFields, getFieldStatusLabel } from "@/lib/services/fields";
import { getActivationLabel, getResourceActivations } from "@/lib/services/resource-activations";
import { getResourceTypeLabel, getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAnalytics } from "@/lib/services/sponsor-analytics";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import { getVolunteerRoleLabel, getVolunteerRoles } from "@/lib/services/volunteer-roles";
import type {
  Alert,
  Field,
  Resource,
  ResourceActivation,
  Session,
  Sponsor,
  SponsorAnalyticsSummary,
  SponsorAssignment,
  Venue,
  VolunteerRole,
} from "@/lib/types";
import { CopyLinkButton } from "./copy-link-button";

export const dynamic = "force-dynamic";

type PilotLaunchPageProps = {
  searchParams?: Promise<{
    venueId?: string;
  }>;
};

type LaunchLink = {
  href: string;
  label: string;
  note: string;
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load pilot launch ${label}`, error);
    return [];
  }
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function calculateScore(checks: boolean[]) {
  if (checks.length === 0) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function toneForScore(score: number) {
  if (score >= 85) return "text-[var(--accent-strong)]";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

function SummaryCard({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: typeof Activity;
  label: string;
  note: string;
  value: number | string;
}) {
  return (
    <article className="ui-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-black leading-none tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-3 text-sm font-semibold leading-5 text-[var(--muted)]">{note}</p>
    </article>
  );
}

function SectionHeader({ action, note, title }: { action?: ReactNode; note: string; title: string }) {
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

function ActionLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link className={`ui-button ${primary ? "ui-button-primary" : "ui-button-secondary"} min-h-12`} href={href}>
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function LinkRow({ link }: { link: LaunchLink }) {
  return (
    <article className="grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-black">{link.label}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{link.note}</p>
        <p className="mt-2 break-all rounded-lg bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--accent-strong)]">{link.href}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton value={link.href} />
        <Link className="ui-button ui-button-secondary min-h-11 px-3 py-2 text-xs" href={link.href}>
          Open
        </Link>
      </div>
    </article>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="ui-empty">{children}</div>;
}

export default async function PilotLaunchPage({ searchParams }: PilotLaunchPageProps) {
  const resolvedSearchParams = await searchParams;
  const [venues, fields, sessions, alerts, resources, activations, volunteerRoles, sponsors, sponsorAssignments] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Alert>("alerts", getActiveAlerts),
    safeLoad<Resource>("resources", getResources),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
    safeLoad<VolunteerRole>("volunteer roles", getVolunteerRoles),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<SponsorAssignment>("sponsor assignments", getSponsorAssignments),
  ]);

  const selectedVenue = venues.find((venue) => venue.id === resolvedSearchParams?.venueId) ?? venues[0] ?? null;
  const now = new Date();
  const venueFields = selectedVenue ? fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const venueFieldIds = new Set(venueFields.map((field) => field.id));
  const venueSessions = sessions.filter((session) => venueFieldIds.has(session.fieldId));
  const activeSessions = venueSessions.filter((session) => isActiveSession(session, now));
  const upcomingSessions = venueSessions.filter((session) => isUpcomingSession(session, now));
  const nextSessionsByField = new Map<string, Session>();
  for (const session of upcomingSessions) {
    if (!nextSessionsByField.has(session.fieldId)) {
      nextSessionsByField.set(session.fieldId, session);
    }
  }

  const selectedSessionIds = new Set(venueSessions.map((session) => session.id));
  const venueAlerts = selectedVenue ? alerts.filter((alert) => alert.venueId === selectedVenue.id) : [];
  const activeResources = resources.filter((resource) => resource.venueId === selectedVenue?.id && resource.status === "active");
  const venueActivations = activations.filter((activation) => activation.venueId === selectedVenue?.id);
  const activeActivations = venueActivations.filter((activation) => activation.status === "active");
  const pendingActivations = venueActivations.filter((activation) => activation.status === "requested");
  const venueVolunteers = volunteerRoles.filter((role) => role.venueId === selectedVenue?.id);
  const activeVolunteers = venueVolunteers.filter((role) => role.status === "active" || role.status === "approved");
  const openVolunteerRoles = venueVolunteers.filter((role) => role.status === "requested");
  const relevantSponsorAssignments = sponsorAssignments.filter((assignment) => (
    assignment.venueId === selectedVenue?.id
    || Boolean(assignment.fieldId && venueFieldIds.has(assignment.fieldId))
    || Boolean(assignment.sessionId && selectedSessionIds.has(assignment.sessionId))
  ));
  const activeSponsorIds = [...new Set(relevantSponsorAssignments.map((assignment) => assignment.sponsorId))];
  const activeSponsors = sponsors.filter((sponsor) => activeSponsorIds.includes(sponsor.id));
  let sponsorAnalytics: SponsorAnalyticsSummary[] = [];

  try {
    sponsorAnalytics = await getSponsorAnalytics(activeSponsorIds, "all");
  } catch (error) {
    console.error("Failed to load pilot launch sponsor analytics", error);
  }

  const sponsorImpressions = sponsorAnalytics.reduce((total, item) => total + item.impressions, 0);
  const delayedOrClosedFields = venueFields.filter((field) => field.status === "delayed" || field.status === "closed" || field.status === "maintenance");
  const fieldsWithStatus = venueFields.filter((field) => Boolean(field.status));
  const sessionsWithStartTimes = venueSessions.filter((session) => Boolean(session.startTime));
  const activeResourceLabels = [
    ...activeResources.slice(0, 3).map((resource) => `${getResourceTypeLabel(resource.resourceType)}: ${resource.resourceName}`),
    ...activeActivations.slice(0, 3).map((activation) => getActivationLabel(activation.activationType)),
  ];
  const readinessScore = selectedVenue
    ? calculateScore([
      true,
      venueFields.length > 0,
      fieldsWithStatus.length === venueFields.length && venueFields.length > 0,
      upcomingSessions.length + activeSessions.length > 0,
      sessionsWithStartTimes.length === venueSessions.length && venueSessions.length > 0,
    ])
    : 0;
  const healthScore = selectedVenue
    ? calculateScore([
      venueFields.length > 0,
      delayedOrClosedFields.length === 0,
      venueAlerts.filter((alert) => alert.alertPriority === "urgent").length === 0,
      activeSessions.length > 0 || upcomingSessions.length > 0,
      pendingActivations.length === 0,
      openVolunteerRoles.length === 0,
    ])
    : 0;

  const publicVenueUrl = selectedVenue ? getPublicVenueUrl(selectedVenue.id) : "";
  const venueDisplayUrl = selectedVenue ? getPublicVenueDisplayUrl(selectedVenue.id) : "";
  const appUrl = getPublicAppUrl();
  const publicUrlIsLocalhost = publicAppUrlPointsToLocalhost();
  const venueQrPrintUrl = selectedVenue ? `${appUrl}/admin/venues/${selectedVenue.id}/qr` : "";
  const fieldLinks: LaunchLink[] = venueFields.map((field) => ({
    href: getPublicFieldUrl(field.id),
    label: field.name,
    note: `${getFieldStatusLabel(field.status)} field page`,
  }));
  const fieldQrLinks: LaunchLink[] = venueFields.map((field) => ({
    href: `${appUrl}/admin/fields/${field.id}/qr`,
    label: `${field.name} QR Page`,
    note: "Printable field QR sign",
  }));
  const scoreboardLinks: LaunchLink[] = [
    ...venueFields.map((field) => ({
      href: getPublicFieldScoreboardUrl(field.id),
      label: `${field.name} Scoreboard`,
      note: "Field scoreboard display",
    })),
    ...activeSessions.slice(0, 4).map((session) => ({
      href: getPublicScoreboardUrl(session.id),
      label: `${session.title} Scoreboard`,
      note: "Live session scoreboard display",
    })),
  ];

  return (
    <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="ui-card-strong overflow-hidden">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Pilot Launch</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pilot day command center</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
                One screen for venue readiness, QR links, public pages, resources, volunteers, sponsors, and operational shortcuts.
              </p>
            </div>
            <form className="grid min-w-0 gap-2 sm:min-w-80" method="get">
              <label className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]" htmlFor="venueId">
                Venue
              </label>
              <div className="flex gap-2">
                <select
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold outline-none focus:border-[var(--accent)]"
                  defaultValue={selectedVenue?.id ?? ""}
                  id="venueId"
                  name="venueId"
                >
                  {venues.length === 0 ? <option value="">No venues found</option> : null}
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
                <button className="ui-button ui-button-primary min-h-12" type="submit">
                  Load
                </button>
              </div>
            </form>
          </div>
        </section>

        {!selectedVenue ? (
          <EmptyState>No venues are configured yet. Create a venue before opening the pilot launch dashboard.</EmptyState>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard icon={ClipboardCheck} label="Readiness Score" note="Pilot setup checklist coverage" value={`${readinessScore}%`} />
              <SummaryCard icon={ShieldCheck} label="Health Score" note="Current operational stability" value={`${healthScore}%`} />
              <SummaryCard icon={Bell} label="Active Alerts" note="Alerts currently visible to operations" value={venueAlerts.length} />
              <SummaryCard icon={Activity} label="Active Sessions" note="Live or in-window sessions" value={activeSessions.length} />
            </section>

            <section className="ui-card p-5">
              <SectionHeader note={`Launch shortcuts for ${selectedVenue.name}.`} title="Quick Actions" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <ActionLink href={publicVenueUrl} label="Open Venue Page" primary />
                <ActionLink href="#field-pages" label="Open Field Pages" />
                <ActionLink href="/admin/game-day" label="Open Game Day Center" />
                <ActionLink href="/admin/status-board" label="Open Status Board" />
                <ActionLink href="/admin/operations-center" label="Open Venue Operations" />
                <ActionLink href="/admin/pilot-script" label="Open Pilot Test Script" />
                <ActionLink href="/admin/system-health" label="Open System Health" />
                <ActionLink href="/admin/schema-audit" label="Open Schema Audit" />
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <article className="ui-card p-5">
                <SectionHeader note="Scores combine required setup and current operational conditions." title="Launch Summary" />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Readiness</p>
                    <p className={`mt-2 text-4xl font-black tabular-nums ${toneForScore(readinessScore)}`}>{readinessScore}%</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Fields, QR pages, sessions, field status, and sponsor setup are checked for pilot use.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Health</p>
                    <p className={`mt-2 text-4xl font-black tabular-nums ${toneForScore(healthScore)}`}>{healthScore}%</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Field status, urgent alerts, pending resources, and open volunteer requests are checked live.
                    </p>
                  </div>
                </div>
              </article>

              <article className="ui-card p-5">
                <SectionHeader note="Field-level operational state at a glance." title="Field Snapshot" />
                <div className="mt-5 grid gap-3">
                  {venueFields.length === 0 ? (
                    <EmptyState>No fields yet. Add your first field.</EmptyState>
                  ) : venueFields.map((field) => {
                    const currentSession = activeSessions.find((session) => session.fieldId === field.id);
                    const nextSession = nextSessionsByField.get(field.id);

                    return (
                      <div className="grid gap-3 rounded-lg border border-[var(--line)] p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={field.id}>
                        <div>
                          <p className="font-black">{field.name}</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                            {currentSession ? `Live: ${currentSession.title}` : nextSession ? `Next: ${nextSession.title} at ${formatTime(nextSession.startTime)}` : "No active or upcoming session"}
                          </p>
                        </div>
                        <span className="rounded-md bg-[var(--accent-soft)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-strong)]">
                          {getFieldStatusLabel(field.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="ui-card p-5">
              <SectionHeader note="Copy or open public and printable QR links before parents arrive." title="QR Section" />
              {publicUrlIsLocalhost ? (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
                  Warning: public QR links currently point to localhost. Set NEXT_PUBLIC_APP_URL before printing QR codes for field testing.
                </div>
              ) : null}
              <div className="mt-5 grid gap-3">
                <LinkRow link={{ href: venueQrPrintUrl, label: `${selectedVenue.name} Venue QR Print Page`, note: "Printable public venue QR sign" }} />
                <LinkRow link={{ href: publicVenueUrl, label: `${selectedVenue.name} Public Venue QR Destination`, note: "Public venue landing page" }} />
                <LinkRow link={{ href: venueDisplayUrl, label: `${selectedVenue.name} Display Board Link`, note: "Public venue display board" }} />
                {fieldQrLinks.length === 0 ? <EmptyState>No field QR pages are available until fields are created.</EmptyState> : fieldQrLinks.map((link) => <LinkRow key={link.href} link={link} />)}
              </div>
            </section>

            <section className="ui-card p-5">
              <SectionHeader note="Phone-sized previews for quick QR landing checks before you print or share." title="Mobile Previews" />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MobilePreview href={`/venues/${selectedVenue.id}`} title={`${selectedVenue.name} venue page`} />
                {venueFields.slice(0, 5).map((field) => (
                  <MobilePreview href={`/fields/${field.id}`} key={field.id} title={`${field.name} field page`} />
                ))}
              </div>
            </section>

            <section className="ui-card p-5" id="field-pages">
              <SectionHeader note="Venue, field, scoreboard, and display URLs for testing QR scans and screens." title="Public Links" />
              <div className="mt-5 grid gap-3">
                <LinkRow link={{ href: publicVenueUrl, label: "Venue Page", note: "Public venue landing page" }} />
                <LinkRow link={{ href: venueDisplayUrl, label: "Venue Display Page", note: "TV, lobby, website, or OBS display" }} />
                {fieldLinks.map((link) => <LinkRow key={link.href} link={link} />)}
                {scoreboardLinks.map((link) => <LinkRow key={link.href} link={link} />)}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <article className="ui-card p-5">
                <SectionHeader note="Resources parents and operators can rely on today." title="Resource Summary" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryMini icon={<Radio className="h-4 w-4" aria-hidden="true" />} label="Active Resources" value={activeResources.length + activeActivations.length} />
                  <SummaryMini icon={<Activity className="h-4 w-4" aria-hidden="true" />} label="Pending Activations" value={pendingActivations.length} />
                </div>
                <div className="mt-5 grid gap-2">
                  {activeResourceLabels.length === 0 ? (
                    <EmptyState>No active resources yet.</EmptyState>
                  ) : activeResourceLabels.map((label) => (
                    <p className="rounded-lg bg-[var(--background)] px-3 py-2 text-sm font-bold" key={label}>{label}</p>
                  ))}
                </div>
              </article>

              <article className="ui-card p-5">
                <SectionHeader note="People helping operate the venue and games." title="Volunteer Summary" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryMini icon={<Users className="h-4 w-4" aria-hidden="true" />} label="Active Volunteers" value={activeVolunteers.length} />
                  <SummaryMini icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />} label="Open Roles" value={openVolunteerRoles.length} />
                </div>
                <div className="mt-5 grid gap-2">
                  {activeVolunteers.length === 0 ? (
                    <EmptyState>No approved or active volunteers yet.</EmptyState>
                  ) : activeVolunteers.slice(0, 4).map((role) => (
                    <p className="rounded-lg bg-[var(--background)] px-3 py-2 text-sm font-bold" key={role.id}>
                      {getVolunteerRoleLabel(role.roleType)}: {role.displayName}
                    </p>
                  ))}
                </div>
              </article>

              <article className="ui-card p-5">
                <SectionHeader note="Sponsor readiness and visibility." title="Sponsor Summary" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <SummaryMini icon={<HandHeart className="h-4 w-4" aria-hidden="true" />} label="Active Sponsors" value={activeSponsors.length} />
                  <SummaryMini icon={<Trophy className="h-4 w-4" aria-hidden="true" />} label="Impressions" value={sponsorImpressions} />
                </div>
                <div className="mt-5 grid gap-2">
                  {activeSponsors.length === 0 ? (
                    <EmptyState>No sponsors are assigned to this venue, its fields, or its sessions.</EmptyState>
                  ) : activeSponsors.slice(0, 4).map((sponsor) => (
                    <p className="rounded-lg bg-[var(--background)] px-3 py-2 text-sm font-bold" key={sponsor.id}>{sponsor.name}</p>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryMini({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-3">
      <div className="flex items-center gap-2 text-[var(--accent-strong)]">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function MobilePreview({ href, title }: { href: string; title: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-4">
      <div className="mx-auto h-[420px] max-w-[240px] overflow-hidden rounded-[1.75rem] border-4 border-white/15 bg-white shadow-sm">
        <iframe className="h-full w-full border-0" src={href} title={`${title} mobile preview`} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-center text-sm font-black text-white">{title}</p>
        <Link className="ui-button min-h-11 bg-white px-3 py-2 text-sm font-black text-[var(--black-soft)]" href={href}>
          Open preview
        </Link>
      </div>
    </article>
  );
}
