import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getPublicFieldUrl } from "@/lib/public-url";
import { filterAlertsForFieldPage, getActiveAlerts, getAlertLabel, getAlertTone } from "@/lib/services/alerts";
import { fieldStatuses, getField, getFieldStatusClass, getFieldStatusLabel, readFieldStatus, updateFieldStatus } from "@/lib/services/fields";
import { getResourceActivations, getActivationLabel } from "@/lib/services/resource-activations";
import { getResourcesForFieldPage, getResourceTypeLabel } from "@/lib/services/resources";
import { getSessionEvents, getSessionEventTypeLabel } from "@/lib/services/session-events";
import { getSessionsByFieldId } from "@/lib/services/sessions";
import { getSponsorPlacementsForFieldPage } from "@/lib/services/sponsors";
import { getVenue } from "@/lib/services/venues";
import { getVolunteerRoleLabel, getVolunteerRoles } from "@/lib/services/volunteer-roles";
import type { Alert, ResourceActivation, Session, SessionEvent, SponsorPlacement, VolunteerRole } from "@/lib/types";
import { ActivationStatusButton } from "../../../resources/activations/status-button";
import { VolunteerStatusButton } from "../../../volunteers/status-button";

type FieldControlPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

export const dynamic = "force-dynamic";

function isActiveSession(session: Session) {
  const now = Date.now();
  if (session.status === "active" || session.gameStatus === "active") {
    return true;
  }

  if (!session.endTime) {
    return false;
  }

  return new Date(session.startTime).getTime() <= now && now <= new Date(session.endTime).getTime();
}

function isUpcomingSession(session: Session) {
  return session.status === "scheduled" && new Date(session.startTime).getTime() > Date.now();
}

function getCurrentSession(sessions: Session[]) {
  return (
    sessions.find(isActiveSession)
    ?? sessions.filter(isUpcomingSession).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
    ?? null
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function isDiamondSport(session: Session) {
  return session.sportType === "baseball" || session.sportType === "softball";
}

function Scoreboard({ session }: { session: Session | null }) {
  if (!session) {
    return (
      <section className="rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Live scoreboard</h2>
        <p className="mt-3 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No current session for this field.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Live scoreboard</p>
      <h2 className="mt-2 text-xl font-black">{session.title}</h2>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">Home</p>
          <p className="mt-1 truncate text-lg font-black">{session.homeTeam}</p>
        </div>
        <p className="rounded-lg bg-white px-4 py-3 text-center text-4xl font-black leading-none text-[var(--foreground)]">
          {session.homeScore}-{session.awayScore}
        </p>
        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">Away</p>
          <p className="mt-1 truncate text-lg font-black">{session.awayTeam}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{isDiamondSport(session) ? "Inning" : "Period"}</p>
          <p className="mt-1 text-sm font-black">{isDiamondSport(session) ? formatInning(session) : session.inning}</p>
        </div>
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Count</p>
          <p className="mt-1 text-sm font-black">{session.balls}-{session.strikes}</p>
        </div>
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Status</p>
          <p className="mt-1 text-sm font-black capitalize">{session.gameStatus}</p>
        </div>
      </div>
    </section>
  );
}

export default async function FieldControlCenterPage({ params }: FieldControlPageProps) {
  const { fieldId } = await params;

  async function updateControlFieldStatusAction(formData: FormData) {
    "use server";

    const status = readFieldStatus(String(formData.get("status") ?? "open"));

    try {
      await updateFieldStatus(fieldId, status);
      revalidatePath(`/admin/fields/${fieldId}/control`);
      revalidatePath("/admin/game-day");
      revalidatePath("/admin/status-board");
      revalidatePath("/admin/fields");
      revalidatePath(`/fields/${fieldId}`);
    } catch (error) {
      console.error("Failed to update field control status", error);
    }
  }

  const field = await getField(fieldId);

  if (!field) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/fields" className="text-sm font-bold text-[var(--accent-strong)]">Back to fields</Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Field not found</h1>
        </div>
      </section>
    );
  }

  const [venue, sessions, activeAlerts, resources, activations, volunteerRoles] = await Promise.all([
    getVenue(field.venueId),
    getSessionsByFieldId(fieldId),
    getActiveAlerts(),
    getResourcesForFieldPage({ fieldId, venueId: field.venueId }),
    getResourceActivations(),
    getVolunteerRoles(),
  ]);
  const currentSession = getCurrentSession(sessions);
  const [sponsorPlacements, timelineEvents] = await Promise.all([
    getSponsorPlacementsForFieldPage({
      fieldId,
      sessionId: currentSession?.id,
      venueId: field.venueId,
    }),
    currentSession ? getSessionEvents(currentSession.id) : Promise.resolve<SessionEvent[]>([]),
  ]);
  const fieldAlerts = filterAlertsForFieldPage({
    alerts: activeAlerts,
    fieldId,
    publicOnly: false,
    tournamentId: currentSession?.tournamentId,
    venueId: field.venueId,
  });
  const activeActivations = activations.filter((activation) => (
    activation.fieldId === fieldId
    && activation.status === "active"
    && (!activation.sessionId || activation.sessionId === currentSession?.id)
  ));
  const pendingActivations = activations.filter((activation) => activation.fieldId === fieldId && activation.status === "requested");
  const fieldVolunteerRoles = volunteerRoles.filter((role) => role.fieldId === fieldId && (!role.sessionId || role.sessionId === currentSession?.id));
  const activeVolunteerRoles = fieldVolunteerRoles.filter((role) => role.status === "active" || role.status === "approved");
  const pendingVolunteerRoles = fieldVolunteerRoles.filter((role) => role.status === "requested");

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/fields" className="text-sm font-bold text-[var(--accent-strong)]">Back to fields</Link>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Field Control Center</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{field.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            {venue?.name ?? "Venue unavailable"} · {field.sportType}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={getPublicFieldUrl(field.id)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Open Field Page
          </Link>
          {currentSession ? (
            <Link href={`/admin/sessions/${currentSession.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
              Update Score
            </Link>
          ) : null}
          <Link href="/admin/alerts/new" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Create Alert
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Scoreboard session={currentSession} />
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Field details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[var(--background)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Status</p>
              <p className={`mt-2 w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getFieldStatusClass(field.status)}`}>{getFieldStatusLabel(field.status)}</p>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Map label</p>
              <p className="mt-1 text-sm font-black">{field.mapLabel ?? field.name}</p>
            </div>
          </div>
          <form action={updateControlFieldStatusAction} className="mt-4 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--background)] p-3 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Change field status</span>
              <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={field.status} name="status">
                {fieldStatuses.map((status) => <option key={status} value={status}>{getFieldStatusLabel(status)}</option>)}
              </select>
            </label>
            <button className="min-h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-white sm:self-end" type="submit">Update</button>
          </form>
        </section>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Active alerts</h2>
          <div className="mt-4 grid gap-3">
            {fieldAlerts.length > 0 ? fieldAlerts.map((alert: Alert) => (
              <article className={`rounded-lg border p-4 ${getAlertTone(alert.alertType)}`} key={alert.id}>
                <p className="text-xs font-black uppercase tracking-[0.14em]">{getAlertLabel(alert.alertType)} · {alert.alertPriority}</p>
                <h3 className="mt-1 text-base font-black">{alert.title}</h3>
                <p className="mt-2 text-sm leading-6">{alert.message}</p>
              </article>
            )) : <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active alerts for this field.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Active resources</h2>
          <div className="mt-4 grid gap-3">
            {resources.map((resource) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={resource.id}>
                <p className="text-sm font-black">{getResourceTypeLabel(resource.resourceType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{resource.resourceName}</p>
              </article>
            ))}
            {activeActivations.map((activation: ResourceActivation) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={activation.id}>
                <p className="text-sm font-black">✓ {getActivationLabel(activation.activationType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{activation.displayName}</p>
              </article>
            ))}
            {resources.length === 0 && activeActivations.length === 0 ? <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active resources.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Volunteer assignments</h2>
          <div className="mt-4 grid gap-3">
            {activeVolunteerRoles.length > 0 ? activeVolunteerRoles.map((role: VolunteerRole) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={role.id}>
                <p className="text-sm font-black">{getVolunteerRoleLabel(role.roleType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{role.displayName} · {role.status}</p>
              </article>
            )) : <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active volunteer assignments.</p>}
          </div>
        </section>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Approval queue</h2>
          <div className="mt-4 grid gap-3">
            {pendingActivations.map((activation) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={activation.id}>
                <p className="text-sm font-black">{getActivationLabel(activation.activationType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{activation.displayName}</p>
                <div className="mt-3">
                  <ActivationStatusButton id={activation.id} label="Approve resource" status="active" />
                </div>
              </article>
            ))}
            {pendingVolunteerRoles.map((role) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={role.id}>
                <p className="text-sm font-black">{getVolunteerRoleLabel(role.roleType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{role.displayName}</p>
                <div className="mt-3">
                  <VolunteerStatusButton id={role.id} label="Approve volunteer" status="approved" />
                </div>
              </article>
            ))}
            {pendingActivations.length === 0 && pendingVolunteerRoles.length === 0 ? (
              <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No pending field requests.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5">
          <h2 className="text-xl font-black">Active sponsors</h2>
          <div className="mt-4 grid gap-3">
            {sponsorPlacements.length > 0 ? sponsorPlacements.map((placement: SponsorPlacement) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={placement.id}>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{placement.placementLabel}</p>
                <h3 className="mt-1 text-base font-black">{placement.sponsor.name}</h3>
                {placement.sponsor.websiteUrl ? <p className="mt-1 break-all text-sm font-semibold text-[var(--muted)]">{placement.sponsor.websiteUrl}</p> : null}
              </article>
            )) : <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active sponsor placements.</p>}
          </div>
        </section>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5">
        <h2 className="text-xl font-black">Recent timeline events</h2>
        <div className="mt-4 grid gap-3">
          {timelineEvents.length > 0 ? timelineEvents.slice(0, 8).map((event) => (
            <article className="rounded-lg bg-[var(--background)] p-4" key={event.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">{getSessionEventTypeLabel(event.eventType)}</p>
                  <p className="mt-1 text-sm font-black">{event.eventMessage}</p>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{formatDateTime(event.createdAt)}</p>
              </div>
            </article>
          )) : <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No timeline events for the current session.</p>}
        </div>
      </section>
    </section>
  );
}
