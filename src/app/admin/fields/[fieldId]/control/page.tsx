import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CopyLinkButton } from "@/components/copy-link-button";
import { getPublicFieldScoreboardUrl, getPublicFieldUrl, getPublicScoreboardUrl } from "@/lib/public-url";
import { getAudioModeLabel, getAudioProfileForField, getAudioStatusClass, getAudioStatusLabel } from "@/lib/services/audio-profiles";
import { filterAlertsForFieldPage, getActiveAlerts, getAlertLabel, getAlertTone } from "@/lib/services/alerts";
import { fieldStatuses, getField, getFieldStatusClass, getFieldStatusLabel, readFieldStatus, updateFieldStatus } from "@/lib/services/fields";
import { getSessionContext } from "@/lib/access/session";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getResourceActivations, getActivationLabel } from "@/lib/services/resource-activations";
import { getResourcesForFieldPage, getResourceTypeLabel } from "@/lib/services/resources";
import { getScoreboardIntegrationModeLabel, getScoreboardProfileForField, getScoreboardStatusClass, getScoreboardStatusLabel } from "@/lib/services/scoreboards";
import { getSessionEvents, getSessionEventTypeLabel } from "@/lib/services/session-events";
import { getSession, getSessionsByFieldId, updateSessionGameState } from "@/lib/services/sessions";
import { getSponsorPlacementsWithPolicy } from "@/lib/services/sponsors";
import { getVenue } from "@/lib/services/venues";
import { getVolunteerRoleLabel, getVolunteerRoles } from "@/lib/services/volunteer-roles";
import type { Alert, ResourceActivation, Session, SessionEvent, SponsorPlacement, VolunteerRole } from "@/lib/types";
import { ActivationStatusButton } from "../../../resources/activations/status-button";
import { VolunteerStatusButton } from "../../../volunteers/status-button";
import { sponsorCategoryLabel } from "@/lib/services/sponsor-category-core";

type FieldControlPageProps = {
  params: Promise<{
    fieldId: string;
  }>;
  searchParams?: Promise<{
    scoreStatus?: string;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInning(session: Session) {
  return `${session.inningHalf === "top" ? "Top" : "Bottom"} ${session.inning}`;
}

function isBaseballSoftballSport(session: Session) {
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
    <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Live scoreboard</p>
      <h2 className="mt-2 text-xl font-black">{session.title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="min-w-0 rounded-lg bg-white/10 p-3 sm:bg-transparent sm:p-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">Home</p>
          <p className="mt-1 text-xl font-black leading-tight sm:truncate">{session.homeTeam}</p>
        </div>
        <p className="rounded-xl bg-white px-4 py-5 text-center text-6xl font-black leading-none text-[var(--foreground)] sm:min-w-36">
          {session.homeScore}-{session.awayScore}
        </p>
        <div className="min-w-0 rounded-lg bg-white/10 p-3 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-white/55">Away</p>
          <p className="mt-1 text-xl font-black leading-tight sm:truncate">{session.awayTeam}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{isBaseballSoftballSport(session) ? "Inning" : "Period"}</p>
          <p className="mt-1 text-sm font-black">{isBaseballSoftballSport(session) ? formatInning(session) : session.inning}</p>
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

export default async function FieldControlCenterPage({ params, searchParams }: FieldControlPageProps) {
  const { fieldId } = await params;
  const resolvedSearchParams = await searchParams;

  async function updateControlFieldStatusAction(formData: FormData) {
    "use server";

    const status = readFieldStatus(String(formData.get("status") ?? "open"));

    // Without an actor, updateFieldStatus throws PermissionDeniedError and the
    // catch below swallows it -- the control panel looked like it worked and
    // never changed anything. See /admin/fields for the same fix.
    const ctx = await getSessionContext();

    try {
      await updateFieldStatus(fieldId, status, ctx?.userId);
      revalidatePath(`/admin/fields/${fieldId}/control`);
      revalidatePath("/admin/fields");
      revalidatePath("/today");
      revalidatePath("/admin/fields");
      revalidatePath(`/fields/${fieldId}`);
    } catch (error) {
      console.error("Failed to update field control status", error);
    }
  }

  async function startControlledSessionAction(formData: FormData) {
    "use server";

    const sessionId = String(formData.get("session_id") ?? "").trim();
    const session = sessionId ? await getSession(sessionId) : null;

    if (!session || session.fieldId !== fieldId) return;
    const ctx = await getSessionContext();

    let didStart = false;

    try {
      await updateSessionGameState(session.id, {
        away_score: session.awayScore,
        balls: session.balls,
        game_status: "active",
        home_score: session.homeScore,
        inning: session.inning,
        inning_half: session.inningHalf,
        notes: session.notes,
        outs: session.outs,
        primary_link_label: session.primaryLinkLabel,
        primary_link_url: session.primaryLinkUrl,
        secondary_link_label: session.secondaryLinkLabel,
        secondary_link_url: session.secondaryLinkUrl,
        strikes: session.strikes,
      }, ctx?.userId);
      revalidatePath(`/admin/fields/${fieldId}/control`);
      revalidatePath(`/admin/sessions/${session.id}`);
      revalidatePath(`/scoreboard/${session.id}`);
      revalidatePath(`/scoreboard/field/${fieldId}`);
      revalidatePath(`/fields/${fieldId}`);
      didStart = true;
    } catch (error) {
      console.error("Failed to start controlled session", error);
    }

    if (didStart) {
      redirect(`/admin/fields/${fieldId}/control?scoreStatus=started`);
    }
  }

  const field = await getField(fieldId);
  // Object-level authorization: only control a field whose venue is in scope, so
  // a venue-scoped admin can't view (or act on) another venue's field by URL.
  const { venues: scopedVenues } = await getScopedVenuesAndFields();

  if (!field || !scopedVenues.some((venue) => venue.id === field.venueId)) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin/fields" className="text-sm font-bold text-[var(--accent-strong)]">Back to fields</Link>
        <div className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6">
          <h1 className="text-2xl font-black">Field not found</h1>
        </div>
      </section>
    );
  }

  const [venue, sessions, activeAlerts, resources, activations, volunteerRoles, scoreboardProfile, audioProfile] = await Promise.all([
    getVenue(field.venueId),
    getSessionsByFieldId(fieldId),
    getActiveAlerts(),
    getResourcesForFieldPage({ fieldId, venueId: field.venueId }),
    getResourceActivations(),
    getVolunteerRoles(),
    getScoreboardProfileForField(fieldId),
    getAudioProfileForField({ fieldId }),
  ]);
  const activeSession = sessions.find(isActiveSession) ?? null;
  const nextSession = sessions.filter(isUpcomingSession).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null;
  const currentSession = activeSession ?? nextSession;
  const isControllingNextSession = Boolean(!activeSession && nextSession && currentSession?.id === nextSession.id);
  const [sponsorPolicyResult, timelineEvents] = await Promise.all([
    getSponsorPlacementsWithPolicy({
      fieldId,
      sessionId: currentSession?.id,
      venueId: field.venueId,
    }),
    currentSession ? getSessionEvents(currentSession.id) : Promise.resolve<SessionEvent[]>([]),
  ]);
  // Suppressed placements are shown here rather than silently dropped — a GM who
  // sold a sponsorship needs to know why it isn't appearing.
  const sponsorPlacements = sponsorPolicyResult.visible;
  const suppressedPlacements = sponsorPolicyResult.suppressed;
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
          <Link href={getPublicFieldUrl(field.id)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Open Field Page
          </Link>
          <Link href={getPublicFieldScoreboardUrl(field.id)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Open Scoreboard
          </Link>
          <Link href={`/admin/scoreboards/display?venue=${field.venueId}&field=${field.id}`} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Display Controls
          </Link>
          {currentSession ? (
            <Link href={`/admin/sessions/${currentSession.id}`} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
              Open Score Control
            </Link>
          ) : null}
          <Link href="/admin/alerts/new" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold">
            Create Alert
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {resolvedSearchParams?.scoreStatus === "started" ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-black text-green-900 lg:col-span-2">
            Session is active. Score control and the public scoreboard are ready.
          </div>
        ) : null}
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
          <form action={updateControlFieldStatusAction} className="mt-4 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Change field status</span>
              <select className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-bold" defaultValue={field.status} name="status">
                {fieldStatuses.map((status) => <option key={status} value={status}>{getFieldStatusLabel(status)}</option>)}
              </select>
            </label>
            <button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-white sm:self-end" type="submit">Update</button>
          </form>
        </section>
      </section>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Current Control Target</p>
        {currentSession ? (
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">{currentSession.title}</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {isControllingNextSession ? "Next session ready to start" : "Live session being controlled"} · {formatDateTime(currentSession.startTime)}
              </p>
              <p className="mt-2 text-sm font-black">{currentSession.homeTeam} vs. {currentSession.awayTeam}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
              {isControllingNextSession ? (
                <form action={startControlledSessionAction}>
                  <input name="session_id" type="hidden" value={currentSession.id} />
                  <button className="min-h-12 w-full rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">
                    Set as active / start game
                  </button>
                </form>
              ) : null}
              <Link href={`/admin/sessions/${currentSession.id}#score-entry`} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white">
                Open Score Control
              </Link>
              <Link href={getPublicScoreboardUrl(currentSession.id)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black">
                Open Public Scoreboard
              </Link>
              <CopyLinkButton label="Copy Scoreboard Link" value={getPublicScoreboardUrl(currentSession.id)} />
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            No active or upcoming session exists for this field.
          </p>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Scoreboard integration</p>
            <h2 className="mt-1 text-xl font-black">Field scoreboard profile</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              GameDay OS is the manual source of truth until a future physical scoreboard bridge is configured.
            </p>
          </div>
          <Link href={scoreboardProfile ? `/admin/scoreboards/${scoreboardProfile.id}/edit` : "/admin/scoreboards/new"} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            {scoreboardProfile ? "Edit Scoreboard Profile" : "Create Scoreboard Profile"}
          </Link>
        </div>
        {scoreboardProfile ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Integration mode</p>
              <p className="mt-1 text-sm font-black">{getScoreboardIntegrationModeLabel(scoreboardProfile.integrationMode)}</p>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sync status</p>
              <p className={`mt-2 w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getScoreboardStatusClass(scoreboardProfile.scoreboardStatus)}`}>
                {getScoreboardStatusLabel(scoreboardProfile.scoreboardStatus)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Controller</p>
              <p className="mt-1 text-sm font-black">{scoreboardProfile.controllerLocation ?? "Not documented"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            No physical scoreboard profile is configured for this field.
          </p>
        )}
        {currentSession ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={`/admin/sessions/${currentSession.id}#score-entry`} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
              Open Score Control
            </Link>
            <Link href={getPublicFieldScoreboardUrl(field.id)} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)]">
              Open Public Scoreboard
            </Link>
            <CopyLinkButton label="Copy Scoreboard Link" value={getPublicScoreboardUrl(currentSession.id)} />
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            Create or select a session to use the GameDay OS manual scoreboard.
          </p>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Audio framework</p>
            <h2 className="mt-1 text-xl font-black">Field audio profile</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Audio profiles document speaker/PA readiness only. GameDay OS does not play, stream, or manage music files.
            </p>
          </div>
          <Link href={audioProfile ? `/admin/audio/${audioProfile.id}/edit` : "/admin/audio/new"} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white">
            {audioProfile ? "Edit Audio Profile" : "Create Audio Profile"}
          </Link>
        </div>
        {audioProfile ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Audio mode</p>
              <p className="mt-1 text-sm font-black">{getAudioModeLabel(audioProfile.audioMode)}</p>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Audio status</p>
              <p className={`mt-2 w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${getAudioStatusClass(audioProfile.status)}`}>
                {getAudioStatusLabel(audioProfile.status)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--background)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Provider</p>
              <p className="mt-1 text-sm font-black">{audioProfile.provider ?? "Not assigned"}</p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">
            No audio profile is configured for this field.
          </p>
        )}
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
            )) : <p className="rounded-lg bg-[var(--background)] p-4 text-sm leading-6 text-[var(--muted)]">No active alerts.</p>}
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
          <h2 className="text-xl font-black">Community contributions</h2>
          <div className="mt-4 grid gap-3">
            {pendingActivations.map((activation) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={activation.id}>
                <p className="text-sm font-black">{getActivationLabel(activation.activationType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{activation.displayName}</p>
                <div className="mt-3 [&_button]:min-h-12 [&_button]:w-full">
                  <ActivationStatusButton id={activation.id} label="Mark active" status="active" />
                </div>
              </article>
            ))}
            {pendingVolunteerRoles.map((role) => (
              <article className="rounded-lg bg-[var(--background)] p-4" key={role.id}>
                <p className="text-sm font-black">{getVolunteerRoleLabel(role.roleType)}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{role.displayName}</p>
                <div className="mt-3 [&_button]:min-h-12 [&_button]:w-full">
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
            {suppressedPlacements.length > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-950">
                  {suppressedPlacements.length} placement{suppressedPlacements.length === 1 ? "" : "s"} hidden by your advertising policy
                </p>
                <ul className="mt-2 grid gap-1">
                  {suppressedPlacements.map((placement: SponsorPlacement) => (
                    <li className="text-sm text-amber-950" key={placement.id}>
                      {placement.sponsor.name} — {sponsorCategoryLabel(placement.sponsor.category)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-900">
                  These are not shown on public field pages or scoreboards. Change the policy under Sponsors → Advertising policy.
                </p>
              </div>
            ) : null}
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
