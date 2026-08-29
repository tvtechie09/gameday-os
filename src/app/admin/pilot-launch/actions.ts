"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageVenueSettings, isOrgScoped } from "@/lib/access/capabilities";
import { getRoleHome } from "@/lib/access/navigation";
import { assertVenueInScope, getScopedVenuesAndFields, OrganizationScopeError } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { publicAppUrlPointsToLocalhost } from "@/lib/public-url";
import {
  buildAutomaticPilotChecks,
  evaluatePilotGate,
  PILOT_REHEARSAL_STEPS,
} from "@/lib/services/pilot-launch-core";
import {
  createPilotSupportIncident,
  getPilotLaunchWorkspace,
  resolvePilotSupportIncident,
  savePilotRehearsalCheck,
  savePilotSupportPlan,
  setPilotLaunchStatus,
  startPilotLaunch,
} from "@/lib/services/pilot-launch";
import { getSessions } from "@/lib/services/sessions";
import { getWeatherProfilesByVenueId } from "@/lib/services/weather-profiles";
import type { PilotIncidentSeverity, PilotRehearsalStatus } from "@/lib/types";

function clean(value: FormDataEntryValue | null, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function pilotUrl(venueId: string, message?: string, error?: string) {
  const query = new URLSearchParams({ venueId });
  if (message) query.set("message", message);
  if (error) query.set("error", error);
  return `/admin/pilot-launch?${query.toString()}`;
}

async function requirePilotManager() {
  const ctx = await getSessionContext();
  if (!ctx || !canManageVenueSettings(ctx) || isOrgScoped(ctx)) redirect(getRoleHome(ctx));
  return ctx;
}

async function requireLaunch(venueId: string, launchId: string) {
  await assertVenueInScope(venueId);
  const workspace = await getPilotLaunchWorkspace(venueId);
  if (!workspace.launch || workspace.launch.id !== launchId) throw new OrganizationScopeError();
  return workspace;
}

function refreshPilot(venueId: string) {
  revalidatePath("/admin/pilot-launch");
  revalidatePath("/admin/pilot-launch/runbook");
  revalidatePath(`/venues/${venueId}`);
}

export async function startPilotLaunchAction(formData: FormData): Promise<void> {
  await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  await assertVenueInScope(venueId);
  const { venues } = await getScopedVenuesAndFields();
  const venue = venues.find((item) => item.id === venueId);
  if (!venue) throw new OrganizationScopeError();
  await startPilotLaunch(venue.id, venue.organizationId ?? null);
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Pilot launch workflow started."));
}

export async function savePilotSupportPlanAction(formData: FormData): Promise<void> {
  await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const workspace = await requireLaunch(venueId, launchId);
  await savePilotSupportPlan(launchId, {
    backupOwnerContact: clean(formData.get("backup_owner_contact"), 240),
    backupOwnerName: clean(formData.get("backup_owner_name"), 120),
    escalationContact: clean(formData.get("escalation_contact"), 500),
    goNoGoNotes: clean(formData.get("go_no_go_notes"), 2000),
    primaryOwnerContact: clean(formData.get("primary_owner_contact"), 240),
    primaryOwnerName: clean(formData.get("primary_owner_name"), 120),
    supportNotes: clean(formData.get("support_notes"), 2000),
    targetLaunchDate: clean(formData.get("target_launch_date"), 10) || null,
  });
  if (workspace.launch?.status === "setup") await setPilotLaunchStatus(launchId, "rehearsal");
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Support plan saved."));
}

export async function savePilotRehearsalCheckAction(formData: FormData): Promise<void> {
  const ctx = await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const checkKey = clean(formData.get("check_key"), 80);
  const statusValue = clean(formData.get("status"), 20);
  const status: PilotRehearsalStatus = (["pending", "passed", "failed", "blocked"] as const).includes(statusValue as PilotRehearsalStatus)
    ? statusValue as PilotRehearsalStatus
    : "pending";
  if (!PILOT_REHEARSAL_STEPS.some((step) => step.key === checkKey)) redirect(pilotUrl(venueId, undefined, "Unknown rehearsal step."));
  await requireLaunch(venueId, launchId);
  await savePilotRehearsalCheck(launchId, checkKey, status, clean(formData.get("notes"), 1000), ctx.userId);
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Rehearsal evidence updated."));
}

export async function createPilotSupportIncidentAction(formData: FormData): Promise<void> {
  const ctx = await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const summary = clean(formData.get("summary"), 1000);
  if (summary.length < 5) redirect(pilotUrl(venueId, undefined, "Describe the support incident."));
  const severityValue = clean(formData.get("severity"), 20);
  const severity: PilotIncidentSeverity = (["low", "normal", "high", "urgent"] as const).includes(severityValue as PilotIncidentSeverity)
    ? severityValue as PilotIncidentSeverity
    : "normal";
  await requireLaunch(venueId, launchId);
  await createPilotSupportIncident(launchId, venueId, {
    ownerName: clean(formData.get("owner_name"), 120),
    requiresDeveloper: clean(formData.get("requires_developer"), 10) === "on",
    severity,
    summary,
  }, ctx.userId);
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Support incident recorded."));
}

export async function resolvePilotSupportIncidentAction(formData: FormData): Promise<void> {
  await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const incidentId = clean(formData.get("incident_id"), 128);
  const workspace = await requireLaunch(venueId, launchId);
  if (!workspace.incidents.some((incident) => incident.id === incidentId)) throw new OrganizationScopeError();
  await resolvePilotSupportIncident(incidentId, clean(formData.get("resolution_notes"), 1000));
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Support incident resolved."));
}

async function currentGate(venueId: string, launchId: string) {
  const workspace = await requireLaunch(venueId, launchId);
  const { venues, fields } = await getScopedVenuesAndFields();
  const venue = venues.find((item) => item.id === venueId);
  if (!venue || !workspace.launch) throw new OrganizationScopeError();
  const fieldIds = new Set(fields.filter((field) => field.venueId === venueId).map((field) => field.id));
  const now = Date.now();
  const sessions = (await getSessions()).filter((session) => fieldIds.has(session.fieldId) && (
    session.status === "active" || new Date(session.startTime).getTime() >= now
  ));
  const weatherProfiles = await getWeatherProfilesByVenueId(venueId).catch(() => []);
  const checks = buildAutomaticPilotChecks({
    backupOwnerReady: Boolean(workspace.launch.backupOwnerName && workspace.launch.backupOwnerContact),
    escalationReady: Boolean(workspace.launch.escalationContact),
    fieldCount: fieldIds.size,
    primaryOwnerReady: Boolean(workspace.launch.primaryOwnerName && workspace.launch.primaryOwnerContact),
    publicUrlReady: !publicAppUrlPointsToLocalhost(),
    scheduleCount: sessions.length,
    targetDateReady: Boolean(workspace.launch.targetLaunchDate),
    venueProfileReady: Boolean(venue.name && venue.address && venue.timezone),
    weatherReady: weatherProfiles.some((profile) => profile.status !== "not_configured" && profile.status !== "offline"),
  });
  const rehearsalStatuses = Object.fromEntries(workspace.checks.map((check) => [check.checkKey, check.status]));
  const openHighSeverityIncidents = workspace.incidents.filter((incident) => incident.status === "open" && (incident.severity === "high" || incident.severity === "urgent")).length;
  return {
    gate: evaluatePilotGate({ automaticChecks: checks, openHighSeverityIncidents, rehearsalStatuses }),
    launchStatus: workspace.launch.status,
  };
}

export async function approvePilotLaunchAction(formData: FormData): Promise<void> {
  const ctx = await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const { gate, launchStatus } = await currentGate(venueId, launchId);
  if (!["setup", "rehearsal", "paused"].includes(launchStatus)) redirect(pilotUrl(venueId, undefined, "This pilot is already approved or live."));
  if (!gate.canApprove) redirect(pilotUrl(venueId, undefined, `${gate.blockers.length} launch blocker${gate.blockers.length === 1 ? " remains" : "s remain"}.`));
  await setPilotLaunchStatus(launchId, "approved", ctx.userId);
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Pilot approved to launch."));
}

export async function markPilotLiveAction(formData: FormData): Promise<void> {
  const ctx = await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  const workspace = await requireLaunch(venueId, launchId);
  if (workspace.launch?.status !== "approved") redirect(pilotUrl(venueId, undefined, "Approve the pilot before marking it live."));
  const { gate } = await currentGate(venueId, launchId);
  if (!gate.canApprove) redirect(pilotUrl(venueId, undefined, "Launch readiness changed after approval. Resolve the new blocker before going live."));
  await setPilotLaunchStatus(launchId, "live", ctx.userId);
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Pilot is live."));
}

export async function pausePilotLaunchAction(formData: FormData): Promise<void> {
  await requirePilotManager();
  const venueId = clean(formData.get("venue_id"), 128);
  const launchId = clean(formData.get("launch_id"), 128);
  await requireLaunch(venueId, launchId);
  await setPilotLaunchStatus(launchId, "paused");
  refreshPilot(venueId);
  redirect(pilotUrl(venueId, "Pilot paused. Public operations remain available, but launch status is on hold."));
}
