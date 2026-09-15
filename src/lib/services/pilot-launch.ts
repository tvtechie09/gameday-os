import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type {
  PilotIncidentSeverity,
  PilotLaunch,
  PilotLaunchStatus,
  PilotRehearsalCheck,
  PilotRehearsalStatus,
  PilotSupportIncident,
} from "@/lib/types";
import { PILOT_REHEARSAL_STEPS } from "./pilot-launch-core";

type LaunchRow = Database["public"]["Tables"]["pilot_launches"]["Row"];
type CheckRow = Database["public"]["Tables"]["pilot_rehearsal_checks"]["Row"];
type IncidentRow = Database["public"]["Tables"]["pilot_support_incidents"]["Row"];

export type PilotOperationalMetrics = {
  alertAttempts: number;
  alertSent: number;
  developerInterventions: number;
  openIncidents: number;
  qrViewsLast7Days: number;
  scheduledGames: number;
  sourceLinkedGames: number;
};

export type PilotLaunchWorkspace = {
  available: boolean;
  checks: PilotRehearsalCheck[];
  incidents: PilotSupportIncident[];
  launch: PilotLaunch | null;
  metrics: PilotOperationalMetrics;
};

const emptyMetrics: PilotOperationalMetrics = {
  alertAttempts: 0,
  alertSent: 0,
  developerInterventions: 0,
  openIncidents: 0,
  qrViewsLast7Days: 0,
  scheduledGames: 0,
  sourceLinkedGames: 0,
};

function missingPilotTables(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST205" || message.includes("pilot_launch") || message.includes("schema cache");
}

function readLaunchStatus(value: string): PilotLaunchStatus {
  return (["setup", "rehearsal", "approved", "live", "paused"] as const).includes(value as PilotLaunchStatus)
    ? value as PilotLaunchStatus
    : "setup";
}

function readCheckStatus(value: string): PilotRehearsalStatus {
  return (["pending", "passed", "failed", "blocked"] as const).includes(value as PilotRehearsalStatus)
    ? value as PilotRehearsalStatus
    : "pending";
}

function readIncidentSeverity(value: string): PilotIncidentSeverity {
  return (["low", "normal", "high", "urgent"] as const).includes(value as PilotIncidentSeverity)
    ? value as PilotIncidentSeverity
    : "normal";
}

function mapLaunch(row: LaunchRow): PilotLaunch {
  return {
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    backupOwnerContact: row.backup_owner_contact,
    backupOwnerName: row.backup_owner_name,
    createdAt: row.created_at,
    escalationContact: row.escalation_contact,
    goNoGoNotes: row.go_no_go_notes,
    id: row.id,
    launchedAt: row.launched_at,
    organizationId: row.organization_id,
    primaryOwnerContact: row.primary_owner_contact,
    primaryOwnerName: row.primary_owner_name,
    status: readLaunchStatus(row.status),
    supportNotes: row.support_notes,
    targetLaunchDate: row.target_launch_date,
    updatedAt: row.updated_at,
    venueId: row.venue_id,
  };
}

function mapCheck(row: CheckRow): PilotRehearsalCheck {
  return {
    checkKey: row.check_key,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    createdAt: row.created_at,
    id: row.id,
    notes: row.notes,
    pilotLaunchId: row.pilot_launch_id,
    status: readCheckStatus(row.status),
    updatedAt: row.updated_at,
  };
}

function mapIncident(row: IncidentRow): PilotSupportIncident {
  return {
    createdAt: row.created_at,
    id: row.id,
    ownerName: row.owner_name,
    pilotLaunchId: row.pilot_launch_id,
    reportedBy: row.reported_by,
    requiresDeveloper: row.requires_developer,
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at,
    severity: readIncidentSeverity(row.severity),
    status: row.status === "resolved" ? "resolved" : "open",
    summary: row.summary,
    updatedAt: row.updated_at,
    venueId: row.venue_id,
  };
}

async function getMetrics(venueId: string, incidents: PilotSupportIncident[]): Promise<PilotOperationalMetrics> {
  const supabase = getSupabaseAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: fields } = await supabase.from("fields").select("id").eq("venue_id", venueId);
  const fieldIds = (fields ?? []).map((field) => field.id);
  if (fieldIds.length === 0) {
    return {
      ...emptyMetrics,
      developerInterventions: incidents.filter((incident) => incident.requiresDeveloper).length,
      openIncidents: incidents.filter((incident) => incident.status === "open").length,
    };
  }

  const [{ data: sessions }, { count: qrViews }, { data: alerts }] = await Promise.all([
    supabase.from("sessions").select("id,external_source").in("field_id", fieldIds),
    supabase.from("field_page_views").select("id", { count: "exact", head: true }).in("field_id", fieldIds).gte("viewed_at", since),
    supabase.from("alerts").select("id").eq("venue_id", venueId),
  ]);
  const alertIds = (alerts ?? []).map((alert) => alert.id);
  const { data: deliveries } = alertIds.length > 0
    ? await supabase.from("alert_deliveries").select("status").in("alert_id", alertIds)
    : { data: [] as Array<{ status: string }> };

  return {
    alertAttempts: deliveries?.length ?? 0,
    alertSent: deliveries?.filter((delivery) => delivery.status === "sent").length ?? 0,
    developerInterventions: incidents.filter((incident) => incident.requiresDeveloper).length,
    openIncidents: incidents.filter((incident) => incident.status === "open").length,
    qrViewsLast7Days: qrViews ?? 0,
    scheduledGames: sessions?.length ?? 0,
    sourceLinkedGames: sessions?.filter((session) => Boolean(session.external_source)).length ?? 0,
  };
}

export async function getPilotLaunchWorkspace(venueId: string): Promise<PilotLaunchWorkspace> {
  const supabase = getSupabaseAdminClient();
  const { data: launchRow, error } = await supabase.from("pilot_launches").select("*").eq("venue_id", venueId).maybeSingle();
  if (error) {
    if (missingPilotTables(error)) return { available: false, checks: [], incidents: [], launch: null, metrics: emptyMetrics };
    throw new Error(error.message);
  }
  if (!launchRow) return { available: true, checks: [], incidents: [], launch: null, metrics: await getMetrics(venueId, []) };

  const [{ data: checkRows, error: checkError }, { data: incidentRows, error: incidentError }] = await Promise.all([
    supabase.from("pilot_rehearsal_checks").select("*").eq("pilot_launch_id", launchRow.id).order("created_at"),
    supabase.from("pilot_support_incidents").select("*").eq("pilot_launch_id", launchRow.id).order("created_at", { ascending: false }),
  ]);
  if (checkError) throw new Error(checkError.message);
  if (incidentError) throw new Error(incidentError.message);
  const incidents = (incidentRows ?? []).map(mapIncident);
  return {
    available: true,
    checks: (checkRows ?? []).map(mapCheck),
    incidents,
    launch: mapLaunch(launchRow),
    metrics: await getMetrics(venueId, incidents),
  };
}

export async function startPilotLaunch(venueId: string, organizationId: string | null) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("pilot_launches").upsert({
    organization_id: organizationId,
    venue_id: venueId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "venue_id" }).select("*").single();
  if (error) throw new Error(error.message);

  const rows = PILOT_REHEARSAL_STEPS.map((step) => ({
    check_key: step.key,
    completed_by: null,
    pilot_launch_id: data.id,
    status: "pending",
  }));
  const { error: checkError } = await supabase.from("pilot_rehearsal_checks").upsert(rows, { onConflict: "pilot_launch_id,check_key", ignoreDuplicates: true });
  if (checkError) throw new Error(checkError.message);
  return mapLaunch(data);
}

export async function savePilotSupportPlan(launchId: string, input: {
  backupOwnerContact: string;
  backupOwnerName: string;
  escalationContact: string;
  goNoGoNotes: string;
  primaryOwnerContact: string;
  primaryOwnerName: string;
  supportNotes: string;
  targetLaunchDate: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("pilot_launches").update({
    backup_owner_contact: input.backupOwnerContact,
    backup_owner_name: input.backupOwnerName,
    escalation_contact: input.escalationContact,
    go_no_go_notes: input.goNoGoNotes,
    primary_owner_contact: input.primaryOwnerContact,
    primary_owner_name: input.primaryOwnerName,
    support_notes: input.supportNotes,
    target_launch_date: input.targetLaunchDate,
    updated_at: new Date().toISOString(),
  }).eq("id", launchId);
  if (error) throw new Error(error.message);
}

export async function savePilotRehearsalCheck(launchId: string, checkKey: string, status: PilotRehearsalStatus, notes: string, actorUserId?: string | null) {
  const supabase = getSupabaseAdminClient();
  const completed = status === "passed" || status === "failed";
  const { error } = await supabase.from("pilot_rehearsal_checks").upsert({
    check_key: checkKey,
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: actorUserId ?? null,
    notes,
    pilot_launch_id: launchId,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: "pilot_launch_id,check_key" });
  if (error) throw new Error(error.message);
}

export async function createPilotSupportIncident(launchId: string, venueId: string, input: {
  ownerName: string;
  requiresDeveloper: boolean;
  severity: PilotIncidentSeverity;
  summary: string;
}, actorUserId?: string | null) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("pilot_support_incidents").insert({
    owner_name: input.ownerName,
    pilot_launch_id: launchId,
    reported_by: actorUserId ?? null,
    requires_developer: input.requiresDeveloper,
    severity: input.severity,
    summary: input.summary,
    venue_id: venueId,
  });
  if (error) throw new Error(error.message);
}

export async function resolvePilotSupportIncident(incidentId: string, resolutionNotes: string) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("pilot_support_incidents").update({
    resolution_notes: resolutionNotes,
    resolved_at: now,
    status: "resolved",
    updated_at: now,
  }).eq("id", incidentId);
  if (error) throw new Error(error.message);
}

export async function setPilotLaunchStatus(launchId: string, status: PilotLaunchStatus, actorUserId?: string | null) {
  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["pilot_launches"]["Update"] = { status, updated_at: now };
  if (status === "approved") {
    update.approved_at = now;
    update.approved_by = actorUserId ?? null;
    update.launched_at = null;
  }
  if (status === "live") update.launched_at = now;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("pilot_launches").update(update).eq("id", launchId);
  if (error) throw new Error(error.message);
}
