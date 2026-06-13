import Link from "next/link";
import { getPublicFieldUrl, getPublicVenueUrl } from "@/lib/public-url";
import { getAlerts } from "@/lib/services/alerts";
import { getFields, getFieldStatusLabel } from "@/lib/services/fields";
import { getResourceActivations } from "@/lib/services/resource-activations";
import { getResources } from "@/lib/services/resources";
import { getSessions } from "@/lib/services/sessions";
import { getSponsorAssignments, getSponsors } from "@/lib/services/sponsors";
import { getVenues } from "@/lib/services/venues";
import type { Alert, Field, Resource, ResourceActivation, Session, Sponsor, SponsorAssignment, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

type PilotPrepPageProps = {
  searchParams?: Promise<{
    venueId?: string;
  }>;
};

type CheckStatus = "Ready" | "Needs attention" | "Optional";

type CheckItem = {
  label: string;
  status: CheckStatus;
  detail: string;
  required?: boolean;
};

type CheckSection = {
  title: string;
  checks: CheckItem[];
};

async function safeLoad<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load pilot prep ${label}`, error);
    return [];
  }
}

function isUpcomingSession(session: Session, now: Date) {
  return new Date(session.startTime).getTime() > now.getTime();
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

function ready(readyState: boolean, required = true): CheckItem["status"] {
  if (readyState) return "Ready";
  return required ? "Needs attention" : "Optional";
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const className = status === "Ready"
    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
    : status === "Needs attention"
      ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200"
      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";

  return <span className={`rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${className}`}>{status}</span>;
}

function buildCheck(label: string, condition: boolean, readyDetail: string, attentionDetail: string, required = true): CheckItem {
  return {
    detail: condition ? readyDetail : attentionDetail,
    label,
    required,
    status: ready(condition, required),
  };
}

function CheckSectionCard({ section }: { section: CheckSection }) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] p-5">
        <h2 className="text-lg font-black">{section.title}</h2>
      </div>
      <div className="grid divide-y divide-[var(--line)]">
        {section.checks.map((check) => (
          <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center" key={check.label}>
            <div>
              <p className="text-sm font-black">{check.label}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{check.detail}</p>
            </div>
            <StatusBadge status={check.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-3 text-sm font-bold ${primary ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white text-[var(--foreground)]"}`}
      href={href}
    >
      {label}
    </Link>
  );
}

export default async function PilotPrepPage({ searchParams }: PilotPrepPageProps) {
  const resolvedSearchParams = await searchParams;
  const [venues, fields, sessions, sponsors, sponsorAssignments, alerts, resources, activations] = await Promise.all([
    safeLoad<Venue>("venues", getVenues),
    safeLoad<Field>("fields", getFields),
    safeLoad<Session>("sessions", getSessions),
    safeLoad<Sponsor>("sponsors", getSponsors),
    safeLoad<SponsorAssignment>("sponsor assignments", getSponsorAssignments),
    safeLoad<Alert>("alerts", getAlerts),
    safeLoad<Resource>("resources", getResources),
    safeLoad<ResourceActivation>("resource activations", getResourceActivations),
  ]);

  const selectedVenue = venues.find((venue) => venue.id === resolvedSearchParams?.venueId) ?? venues[0] ?? null;
  const now = new Date();

  const venueFields = selectedVenue ? fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const venueFieldIds = new Set(venueFields.map((field) => field.id));
  const venueSessions = sessions.filter((session) => venueFieldIds.has(session.fieldId));
  const upcomingSessions = venueSessions.filter((session) => isUpcomingSession(session, now));
  const activeOrUpcomingSessions = venueSessions.filter((session) => isActiveSession(session, now) || isUpcomingSession(session, now));
  const selectedSessionIds = new Set(venueSessions.map((session) => session.id));
  const sponsorAssignmentReady = selectedVenue
    ? sponsorAssignments.some((assignment) => (
      assignment.venueId === selectedVenue.id
      || Boolean(assignment.fieldId && venueFieldIds.has(assignment.fieldId))
      || Boolean(assignment.sessionId && selectedSessionIds.has(assignment.sessionId))
    ))
    : false;
  const venueAlerts = selectedVenue ? alerts.filter((alert) => alert.venueId === selectedVenue.id) : [];
  const venueResources = selectedVenue ? resources.filter((resource) => resource.venueId === selectedVenue.id) : [];
  const venueActivations = selectedVenue ? activations.filter((activation) => activation.venueId === selectedVenue.id) : [];
  const firstField = venueFields[0] ?? null;

  const sections: CheckSection[] = selectedVenue ? [
    {
      title: "Venue Setup",
      checks: [
        buildCheck("Venue exists", Boolean(selectedVenue), selectedVenue.name, "Create a venue before field testing."),
        buildCheck(
          "Venue branding added",
          Boolean(selectedVenue.logoUrl || selectedVenue.bannerUrl || selectedVenue.primaryColor || selectedVenue.secondaryColor),
          "Branding details are configured.",
          "Add a logo, banner, or brand colors before sharing QR links.",
        ),
        buildCheck("Venue map added optional", Boolean(selectedVenue.mapImageUrl), "Map image is configured.", "Map image is optional for pilot testing.", false),
      ],
    },
    {
      title: "Fields",
      checks: [
        buildCheck("At least one field exists", venueFields.length > 0, `${venueFields.length} field${venueFields.length === 1 ? "" : "s"} configured.`, "Add at least one field."),
        buildCheck("Each field has QR code", venueFields.length > 0, "Every field can generate a QR page.", "Add a field to generate QR codes."),
        buildCheck("Each field has public field page", venueFields.length > 0, "Every field has a public QR landing page.", "Add a field to create public field pages."),
        buildCheck("Each field has status set", venueFields.length > 0 && venueFields.every((field) => Boolean(field.status)), "Every field has a status.", "Set field status for every field."),
      ],
    },
    {
      title: "Sessions",
      checks: [
        buildCheck("At least one upcoming session exists", upcomingSessions.length > 0, `${upcomingSessions.length} upcoming session${upcomingSessions.length === 1 ? "" : "s"} found.`, "Add at least one upcoming session."),
        buildCheck("Sessions have start times", venueSessions.length > 0 && venueSessions.every((session) => !Number.isNaN(new Date(session.startTime).getTime())), "Every session has a valid start time.", "Add sessions with valid start times."),
        buildCheck("Sessions are assigned to fields", venueSessions.length > 0 && venueSessions.every((session) => venueFieldIds.has(session.fieldId)), "Every venue session is assigned to a field.", "Assign sessions to venue fields."),
      ],
    },
    {
      title: "Sponsors",
      checks: [
        buildCheck("Optional sponsor exists", sponsors.length > 0, `${sponsors.length} sponsor${sponsors.length === 1 ? "" : "s"} available.`, "Sponsors are optional for pilot testing.", false),
        buildCheck("Sponsor assigned to venue, field, or session", sponsorAssignmentReady, "A sponsor placement is assigned for this venue experience.", "Sponsor assignments are optional for pilot testing.", false),
      ],
    },
    {
      title: "Alerts",
      checks: [
        buildCheck("Optional test alert exists", venueAlerts.length > 0, `${venueAlerts.length} alert${venueAlerts.length === 1 ? "" : "s"} configured for this venue.`, "Test alerts are optional for pilot testing.", false),
      ],
    },
    {
      title: "Resources",
      checks: [
        buildCheck("Optional resources configured", venueResources.length > 0, `${venueResources.length} resource${venueResources.length === 1 ? "" : "s"} configured.`, "Resources are optional for pilot testing.", false),
        buildCheck("Optional resource activation tested", venueActivations.length > 0, `${venueActivations.length} activation request${venueActivations.length === 1 ? "" : "s"} found.`, "Activation testing is optional for pilot testing.", false),
      ],
    },
    {
      title: "Public Experience",
      checks: [
        buildCheck("Public field page opens", venueFields.length > 0, "A public field page link is available.", "Add a field to create a public field page."),
        buildCheck("QR URL exists", venueFields.length > 0, "A QR URL is available for each field.", "Add a field to create QR URLs."),
        buildCheck("Field page has current/next game", activeOrUpcomingSessions.length > 0, "A current or upcoming game can appear on the field page.", "Add an active or upcoming session."),
      ],
    },
  ] : [];

  const requiredChecks = sections.flatMap((section) => section.checks).filter((check) => check.required !== false);
  const isPilotReady = requiredChecks.length > 0 && requiredChecks.every((check) => check.status === "Ready");
  const needsAttentionCount = requiredChecks.filter((check) => check.status === "Needs attention").length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Pilot prep</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">QR field testing readiness</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Confirm a venue has the required field, session, QR, and public page pieces before real-world testing.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 lg:min-w-56">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Pilot status</p>
          <p className={`mt-2 text-2xl font-black ${isPilotReady ? "text-[var(--accent-strong)]" : "text-amber-900"}`}>
            {isPilotReady ? "Pilot Ready" : "Needs attention"}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{isPilotReady ? "All required items pass." : `${needsAttentionCount} required item${needsAttentionCount === 1 ? "" : "s"} left.`}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <QuickLink href="/admin/system-health" label="Open System Health" primary />
        <QuickLink href="/admin/executive" label="Executive Dashboard" />
      </div>

      <form className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5" method="get">
        <label className="grid gap-2">
          <span className="text-sm font-bold">Select venue</span>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-base" defaultValue={selectedVenue?.id ?? ""} name="venueId">
              {venues.length === 0 ? <option value="">No venues available</option> : null}
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
            <button className="min-h-11 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white" type="submit">
              Review venue
            </button>
          </div>
        </label>
      </form>

      {!selectedVenue ? (
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-black">No venues yet</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Create a venue before running pilot readiness checks.</p>
          <div className="mt-5">
            <QuickLink href="/admin/venues/new" label="Create venue" primary />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_2fr]">
            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Selected Venue</p>
              <h2 className="mt-2 text-2xl font-black">{selectedVenue.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{selectedVenue.address || "No address added."}</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs font-bold text-[var(--muted)]">Fields</p>
                  <p className="mt-1 text-2xl font-black">{venueFields.length}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs font-bold text-[var(--muted)]">Upcoming</p>
                  <p className="mt-1 text-2xl font-black">{upcomingSessions.length}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] p-3">
                  <p className="text-xs font-bold text-[var(--muted)]">Issues</p>
                  <p className="mt-1 text-2xl font-black">{needsAttentionCount}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5">
              <h2 className="text-lg font-black">Quick links</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <QuickLink href={`/admin/venues/${selectedVenue.id}/edit`} label="Edit venue" />
                <QuickLink href="/admin/fields/new" label="Add field" />
                <QuickLink href="/admin/sessions/new" label="Add session" />
                <QuickLink href={firstField ? `/admin/fields/${firstField.id}/qr` : "/admin/fields"} label="Generate QR" />
                <QuickLink href={firstField ? `/fields/${firstField.id}` : "/admin/fields"} label="View public field page" />
                <QuickLink href={`/venues/${selectedVenue.id}`} label="View public venue page" />
                <QuickLink href="/admin/sponsors/new" label="Add sponsor" />
                <QuickLink href="/admin/alerts/new" label="Add alert" />
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {sections.map((section) => <CheckSectionCard key={section.title} section={section} />)}
          </div>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">Venue public link</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use this page for venue-wide sharing before or during a pilot.</p>
            <p className="mt-4 break-all rounded-lg bg-[var(--background)] p-4 text-sm font-bold text-[var(--accent-strong)]">{getPublicVenueUrl(selectedVenue.id)}</p>
            <div className="mt-4">
              <QuickLink href={`/venues/${selectedVenue.id}`} label="Open public venue page" />
            </div>
          </section>

          <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-5">
            <h2 className="text-lg font-black">Field QR links</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {venueFields.length > 0 ? venueFields.map((field) => (
                <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={field.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-black">{field.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{getFieldStatusLabel(field.status)}</p>
                    </div>
                    <StatusBadge status={field.status ? "Ready" : "Needs attention"} />
                  </div>
                  <p className="mt-3 break-all text-sm font-bold text-[var(--accent-strong)]">{getPublicFieldUrl(field.id)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <QuickLink href={`/admin/fields/${field.id}/qr`} label="QR page" />
                    <QuickLink href={`/fields/${field.id}`} label="Public page" />
                  </div>
                </article>
              )) : (
                <p className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">No fields are configured for this venue yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
