import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageVenueSettings, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { getScopedVenuesAndFields } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import { buildAutomaticPilotChecks, evaluatePilotGate, PILOT_REHEARSAL_STEPS, pilotStatusLabel } from "@/lib/services/pilot-launch-core";
import { getPilotLaunchWorkspace } from "@/lib/services/pilot-launch";
import { getSessions } from "@/lib/services/sessions";
import { getWeatherProfilesByVenueId } from "@/lib/services/weather-profiles";
import type { PilotRehearsalStatus } from "@/lib/types";
import {
  approvePilotLaunchAction,
  createPilotSupportIncidentAction,
  markPilotLiveAction,
  pausePilotLaunchAction,
  resolvePilotSupportIncidentAction,
  savePilotRehearsalCheckAction,
  savePilotSupportPlanAction,
  startPilotLaunchAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string; message?: string; venueId?: string };

const inputClass = "min-h-12 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-semibold";

function statusClass(status: string) {
  if (status === "live" || status === "approved" || status === "passed" || status === "resolved") return "bg-emerald-100 text-emerald-900";
  if (status === "failed" || status === "paused" || status === "urgent") return "bg-red-100 text-red-900";
  if (status === "blocked" || status === "high" || status === "open") return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-800";
}

function Metric({ label, value, note }: { label: string; note: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{note}</p>
    </article>
  );
}

export default async function PilotLaunchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ctx = await getSessionContext();
  if (!ctx || !canManageVenueSettings(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));

  const sp = await searchParams;
  const scoped = await getScopedVenuesAndFields();
  const selectedVenue = scoped.venues.find((venue) => venue.id === sp.venueId) ?? scoped.venues[0] ?? null;
  const selectedFields = selectedVenue ? scoped.fields.filter((field) => field.venueId === selectedVenue.id) : [];
  const selectedFieldIds = new Set(selectedFields.map((field) => field.id));
  const now = new Date();
  const sessions = selectedVenue ? (await getSessions().catch(() => [])).filter((session) => selectedFieldIds.has(session.fieldId)) : [];
  const launchSessions = sessions.filter((session) => session.status === "active" || new Date(session.startTime).getTime() >= now.getTime());
  const weatherProfiles = selectedVenue ? await getWeatherProfilesByVenueId(selectedVenue.id).catch(() => []) : [];
  const workspace = selectedVenue
    ? await getPilotLaunchWorkspace(selectedVenue.id).catch((error) => {
      console.error("Failed to load pilot launch workspace", error);
      return null;
    })
    : null;
  const launch = workspace?.launch ?? null;
  const automaticChecks = buildAutomaticPilotChecks({
    backupOwnerReady: Boolean(launch?.backupOwnerName && launch.backupOwnerContact),
    escalationReady: Boolean(launch?.escalationContact),
    fieldCount: selectedFields.length,
    primaryOwnerReady: Boolean(launch?.primaryOwnerName && launch.primaryOwnerContact),
    publicUrlReady: !publicAppUrlPointsToLocalhost(),
    scheduleCount: launchSessions.length,
    targetDateReady: Boolean(launch?.targetLaunchDate),
    venueProfileReady: Boolean(selectedVenue?.name && selectedVenue.address && selectedVenue.timezone),
    weatherReady: weatherProfiles.some((profile) => profile.status !== "not_configured" && profile.status !== "offline"),
  });
  const checkByKey = new Map((workspace?.checks ?? []).map((check) => [check.checkKey, check]));
  const gate = evaluatePilotGate({
    automaticChecks,
    openHighSeverityIncidents: (workspace?.incidents ?? []).filter((incident) => incident.status === "open" && (incident.severity === "high" || incident.severity === "urgent")).length,
    rehearsalStatuses: Object.fromEntries((workspace?.checks ?? []).map((check) => [check.checkKey, check.status])),
  });
  const metrics = workspace?.metrics ?? {
    alertAttempts: 0,
    alertSent: 0,
    developerInterventions: 0,
    openIncidents: 0,
    qrViewsLast7Days: 0,
    scheduledGames: sessions.length,
    sourceLinkedGames: sessions.filter((session) => Boolean(session.externalSource)).length,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Pilot launch</p>
          <h1 className="mt-1 text-3xl font-black">Launch one venue with evidence</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Complete setup, rehearse the real Saturday workflow, name support ownership, then make an explicit go/no-go decision.</p>
        </div>
        <form className="flex min-w-0 gap-2" method="get">
          <select className={`${inputClass} min-w-0 flex-1 sm:min-w-72`} defaultValue={selectedVenue?.id ?? ""} name="venueId">
            {scoped.venues.length === 0 ? <option value="">No venues available</option> : null}
            {scoped.venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
          <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">Load</button>
        </form>
      </header>

      {sp.message ? <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{sp.message}</p> : null}
      {sp.error ? <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-900">{sp.error}</p> : null}

      {!selectedVenue ? (
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-black">Create a venue first</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">A pilot launch belongs to one real venue.</p>
          <Link className="mt-4 inline-flex min-h-12 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" href="/admin/onboarding">Onboard venue</Link>
        </section>
      ) : !workspace?.available ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-amber-950">Pilot tracking migration required</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">Apply the pilot-launch database migration before recording rehearsal or approval evidence.</p>
        </section>
      ) : !launch ? (
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">Selected venue</p>
          <h2 className="mt-2 text-2xl font-black">{selectedVenue.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Starting creates the rehearsal and support record. It does not publish, deploy, or change the venue’s live status.</p>
          <form action={startPilotLaunchAction} className="mt-5"><input name="venue_id" type="hidden" value={selectedVenue.id} /><button className="min-h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-white" type="submit">Start pilot launch</button></form>
        </section>
      ) : (
        <>
          <section className="mt-6 flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{selectedVenue.name}</p>
              <h2 className="mt-1 text-2xl font-black">{pilotStatusLabel(launch.status)}</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">Target: {launch.targetLaunchDate || "Not scheduled"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${statusClass(launch.status)}`}>{launch.status}</span>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href={`/admin/pilot-launch/runbook?venueId=${selectedVenue.id}`}>Open runbook</Link>
            </div>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Metric label="Launch readiness" note={`${gate.blockers.length} blockers`} value={`${gate.score}%`} />
            <Metric label="Games loaded" note={`${metrics.sourceLinkedGames} source-linked`} value={metrics.scheduledGames} />
            <Metric label="QR views" note="Last 7 days" value={metrics.qrViewsLast7Days} />
            <Metric label="Alert delivery" note={`${metrics.alertSent} sent`} value={metrics.alertAttempts} />
            <Metric label="Open incidents" note="Pilot support" value={metrics.openIncidents} />
            <Metric label="Developer assists" note="Should trend to zero" value={metrics.developerInterventions} />
          </section>

          <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">1 · Guided setup</p><h2 className="mt-1 text-xl font-black">Automatic launch checks</h2></div>
              <p className="text-sm font-bold text-[var(--muted)]">{gate.automaticPassed}/{automaticChecks.length} passed</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {automaticChecks.map((check) => (
                <article className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={check.key}>
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-black">{check.label}</h3><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase ${check.passed ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"}`}>{check.passed ? "Ready" : "Action"}</span></div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{check.detail}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href={`/admin/venues/${selectedVenue.id}/edit`}>Venue profile</Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/admin/fields">Fields &amp; QR</Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/admin/integrations">Import schedule</Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/admin/weather">Weather</Link>
              <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] px-4 text-sm font-black" href="/admin/identity/people">Staff access</Link>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5" id="support-plan">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">2 · Ownership</p><h2 className="mt-1 text-xl font-black">Game-day support plan</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">The primary operator runs the day. The backup can take over. Escalation states exactly who gets called and when.</p>
            <form action={savePilotSupportPlanAction} className="mt-5 grid gap-4">
              <input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Target launch date</span><input className={inputClass} defaultValue={launch.targetLaunchDate ?? ""} name="target_launch_date" type="date" /></label><div />
                <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Primary operator</span><input className={inputClass} defaultValue={launch.primaryOwnerName} name="primary_owner_name" placeholder="Name" /></label>
                <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Primary contact</span><input className={inputClass} defaultValue={launch.primaryOwnerContact} name="primary_owner_contact" placeholder="Phone or email" /></label>
                <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Backup operator</span><input className={inputClass} defaultValue={launch.backupOwnerName} name="backup_owner_name" placeholder="Name" /></label>
                <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Backup contact</span><input className={inputClass} defaultValue={launch.backupOwnerContact} name="backup_owner_contact" placeholder="Phone or email" /></label>
              </div>
              <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Escalation path</span><textarea className="min-h-24 rounded-lg border border-[var(--line)] p-3 text-sm" defaultValue={launch.escalationContact} name="escalation_contact" placeholder="Who is called, at what threshold, and by which channel?" /></label>
              <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Fallback and rollback notes</span><textarea className="min-h-24 rounded-lg border border-[var(--line)] p-3 text-sm" defaultValue={launch.supportNotes} name="support_notes" placeholder="Paper schedule, PA fallback, QR outage response, and manual field-status process." /></label>
              <label className="grid gap-1"><span className="text-xs font-black text-[var(--muted)]">Go / no-go notes</span><textarea className="min-h-20 rounded-lg border border-[var(--line)] p-3 text-sm" defaultValue={launch.goNoGoNotes} name="go_no_go_notes" placeholder="Known risks and the conditions that would stop launch." /></label>
              <button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white sm:w-fit" type="submit">Save support plan</button>
            </form>
          </section>

          <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">3 · Rehearsal</p><h2 className="mt-1 text-xl font-black">Successful Saturday drill</h2></div><p className="text-sm font-bold text-[var(--muted)]">{gate.rehearsalPassed}/{PILOT_REHEARSAL_STEPS.length} passed</p></div>
            <div className="mt-4 grid gap-4">
              {PILOT_REHEARSAL_STEPS.map((step, index) => {
                const evidence = checkByKey.get(step.key);
                const currentStatus: PilotRehearsalStatus = evidence?.status ?? "pending";
                return (
                  <form action={savePilotRehearsalCheckAction} className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={step.key}>
                    <input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} /><input name="check_key" type="hidden" value={step.key} />
                    <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black">{index + 1}</span><div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">{step.label}</h3><span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${statusClass(currentStatus)}`}>{currentStatus}</span></div>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Expected: {step.expected}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]"><select className={inputClass} defaultValue={currentStatus} name="status"><option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="blocked">Blocked</option></select><input className={inputClass} defaultValue={evidence?.notes ?? ""} name="notes" placeholder="Evidence or blocker" /><button className="min-h-12 rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-black" type="submit">Save</button></div>
                    </div></div>
                  </form>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">4 · Support evidence</p><h2 className="mt-1 text-xl font-black">Pilot incidents</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Record every intervention. A successful pilot trends toward zero developer-required incidents.</p>
            <form action={createPilotSupportIncidentAction} className="mt-4 grid gap-2 sm:grid-cols-[9rem_1fr_10rem_auto]">
              <input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} />
              <select className={inputClass} name="severity"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select><input className={inputClass} name="summary" placeholder="What happened?" required /><input className={inputClass} name="owner_name" placeholder="Owner" /><button className="min-h-12 rounded-lg bg-[var(--black-soft)] px-4 text-sm font-black text-white" type="submit">Record</button>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold sm:col-span-4"><input name="requires_developer" type="checkbox" /> Required developer intervention</label>
            </form>
            <div className="mt-5 grid gap-3">
              {workspace.incidents.length === 0 ? <p className="rounded-lg bg-[var(--background)] p-4 text-sm font-semibold text-[var(--muted)]">No pilot incidents recorded.</p> : workspace.incidents.map((incident) => (
                <article className="rounded-lg border border-[var(--line)] p-4" key={incident.id}>
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${statusClass(incident.status)}`}>{incident.status}</span><span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${statusClass(incident.severity)}`}>{incident.severity}</span>{incident.requiresDeveloper ? <span className="rounded-md bg-purple-100 px-2 py-1 text-[10px] font-black uppercase text-purple-900">Developer assist</span> : null}</div>
                  <h3 className="mt-2 text-sm font-black">{incident.summary}</h3><p className="mt-1 text-xs font-semibold text-[var(--muted)]">Owner: {incident.ownerName || "Unassigned"}</p>
                  {incident.status === "open" ? <form action={resolvePilotSupportIncidentAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} /><input name="incident_id" type="hidden" value={incident.id} /><input className={inputClass} name="resolution_notes" placeholder="Resolution evidence" required /><button className="min-h-12 rounded-lg border border-[var(--line)] px-4 text-sm font-black" type="submit">Resolve</button></form> : <p className="mt-2 text-sm text-[var(--muted)]">{incident.resolutionNotes}</p>}
                </article>
              ))}
            </div>
          </section>

          <section className="my-6 rounded-xl border-2 border-[var(--line)] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-strong)]">5 · Launch decision</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black">{gate.canApprove ? "Ready for go/no-go approval" : `${gate.blockers.length} blockers remain`}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Approval records readiness. Marking live is a separate deliberate action when the operating day begins.</p></div><div className="flex flex-wrap gap-2">
              {launch.status === "setup" || launch.status === "rehearsal" || launch.status === "paused" ? <form action={approvePilotLaunchAction}><input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} /><button className="min-h-12 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!gate.canApprove} type="submit">Approve launch</button></form> : null}
              {launch.status === "approved" ? <form action={markPilotLiveAction}><input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} /><button className="min-h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-black text-white" type="submit">Mark pilot live</button></form> : null}
              {launch.status !== "paused" ? <form action={pausePilotLaunchAction}><input name="venue_id" type="hidden" value={selectedVenue.id} /><input name="launch_id" type="hidden" value={launch.id} /><button className="min-h-12 rounded-lg border border-red-200 px-4 text-sm font-black text-red-700" type="submit">Pause pilot</button></form> : null}
            </div></div>
            {!gate.canApprove ? <ul className="mt-4 grid gap-1 text-sm font-semibold text-amber-900 sm:grid-cols-2">{gate.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul> : null}
          </section>
        </>
      )}
    </main>
  );
}
