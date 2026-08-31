import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

// Lightweight operational issues for the venue command center. Historical
// field-maintenance work orders remain valid records in this same table.

export type WorkOrder = {
  id: string;
  venueId: string;
  fieldId: string | null;
  title: string;
  detail: string | null;
  priority: string;
  status: string;
  reportedBy: string | null;
  createdAt: string;
  closedAt: string | null;
  // Issue lifecycle (migration 20260725020000). All nullable so rows created
  // before it, and the existing create/status paths, keep working untouched.
  // The lifecycle STAGE is derived from these in work-order-core.
  assignedRole: string | null;
  assignedToUserId: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  dueAt: string | null;
  resolutionNotes: string | null;
  source: string;
  gameId: string | null;
  assetId: string | null;
  issueType: OperationalIssueType;
  systemKey: string | null;
  detectedAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  metadata: Json;
};

export type OperationalIssueStatus = "open" | "assigned" | "acknowledged" | "in_progress" | "resolved";
export type OperationalIssueType = "maintenance" | "schedule" | "staffing" | "device" | "scoreboard" | "audio" | "camera" | "weather" | "incident" | "task" | "other";

export type CreateWorkOrderInput = {
  venueId?: string | null;
  fieldId?: string | null;
  title: string;
  detail?: string | null;
  priority?: string;
  reportedBy?: string | null;
  issueType?: OperationalIssueType;
  source?: "manual" | "system";
  systemKey?: string | null;
  gameId?: string | null;
  assetId?: string | null;
  detectedAt?: string | null;
  metadata?: Json;
};

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set<OperationalIssueStatus>(["open", "assigned", "acknowledged", "in_progress", "resolved"]);
const ISSUE_TYPES = new Set<OperationalIssueType>(["maintenance", "schedule", "staffing", "device", "scoreboard", "audio", "camera", "weather", "incident", "task", "other"]);

// Lifecycle columns are optional on the row type: a deploy where the code is
// ahead of the migration (or an old cached row shape) must degrade to nulls
// rather than throw.
function mapWorkOrder(row: {
  id: string;
  venue_id?: string | null;
  field_id: string | null;
  title: string;
  detail: string | null;
  priority: string;
  status: string;
  reported_by: string | null;
  created_at: string;
  closed_at: string | null;
  assigned_role?: string | null;
  assigned_to_user_id?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  due_at?: string | null;
  resolution_notes?: string | null;
  source?: string | null;
  game_id?: string | null;
  asset_id?: string | null;
  issue_type?: string | null;
  system_key?: string | null;
  detected_at?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  metadata?: Json | null;
}): WorkOrder {
  return {
    id: row.id,
    venueId: row.venue_id ?? "",
    fieldId: row.field_id,
    title: row.title,
    detail: row.detail,
    priority: row.priority,
    status: row.status,
    reportedBy: row.reported_by,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    assignedRole: row.assigned_role ?? null,
    assignedToUserId: row.assigned_to_user_id ?? null,
    acknowledgedAt: row.acknowledged_at ?? null,
    acknowledgedBy: row.acknowledged_by ?? null,
    dueAt: row.due_at ?? null,
    resolutionNotes: row.resolution_notes ?? null,
    source: row.source ?? "manual",
    gameId: row.game_id ?? null,
    assetId: row.asset_id ?? null,
    issueType: ISSUE_TYPES.has(row.issue_type as OperationalIssueType) ? row.issue_type as OperationalIssueType : "maintenance",
    systemKey: row.system_key ?? null,
    detectedAt: row.detected_at ?? row.created_at,
    assignedAt: row.assigned_at ?? null,
    startedAt: row.started_at ?? null,
    metadata: row.metadata ?? {},
  };
}

export async function getWorkOrders(): Promise<WorkOrder[]> {
  let supabase: ReturnType<typeof getSupabaseAdminClient>;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    return [];
  }
  const { data, error } = await supabase
    .from("field_work_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(mapWorkOrder);
}

async function resolveVenueId(input: Pick<CreateWorkOrderInput, "venueId" | "fieldId">): Promise<string> {
  if (input.venueId) return input.venueId;
  if (!input.fieldId) throw new Error("Venue is required for a venue-wide issue.");
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("fields").select("venue_id").eq("id", input.fieldId).maybeSingle();
  if (error || !data?.venue_id) throw new Error(error?.message ?? "The issue field has no venue.");
  return data.venue_id;
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
  const supabase = getSupabaseAdminClient();
  const venueId = await resolveVenueId(input);
  const priority = PRIORITIES.has(input.priority ?? "") ? (input.priority as string) : "normal";
  const issueType = ISSUE_TYPES.has(input.issueType ?? "maintenance") ? input.issueType as OperationalIssueType : "maintenance";
  const { data, error } = await supabase
    .from("field_work_orders")
    .insert({
      venue_id: venueId,
      field_id: input.fieldId ?? null,
      title: input.title.trim().slice(0, 160),
      detail: input.detail?.trim().slice(0, 1000) || null,
      priority,
      reported_by: input.reportedBy?.trim().slice(0, 120) || null,
      issue_type: issueType,
      source: input.source ?? "manual",
      system_key: input.systemKey?.trim().slice(0, 240) || null,
      game_id: input.gameId ?? null,
      asset_id: input.assetId ?? null,
      detected_at: input.detectedAt ?? new Date().toISOString(),
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapWorkOrder(data);
}

export async function createSystemWorkOrder(input: CreateWorkOrderInput & { venueId: string; systemKey: string }): Promise<WorkOrder> {
  const supabase = getSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("field_work_orders")
    .select("*")
    .eq("venue_id", input.venueId)
    .eq("system_key", input.systemKey)
    .not("status", "in", "(resolved,done)")
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return mapWorkOrder(existing);
  return createWorkOrder({ ...input, source: "system" });
}

// ---- Issue lifecycle -------------------------------------------------------

export async function assignWorkOrder(id: string, input: { role?: string | null; userId?: string | null; dueAt?: string | null }): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const patch: {
    updated_at: string;
    status: OperationalIssueStatus;
    assigned_at: string;
    assigned_role?: string | null;
    assigned_to_user_id?: string | null;
    due_at?: string | null;
  } = { updated_at: now, status: "assigned", assigned_at: now };
  // Only touch what the caller actually passed, so assigning a role doesn't
  // silently clear a due time (or vice versa).
  if (input.role !== undefined) patch.assigned_role = input.role?.trim().slice(0, 60) || null;
  if (input.userId !== undefined) patch.assigned_to_user_id = input.userId || null;
  if (input.dueAt !== undefined) patch.due_at = input.dueAt || null;

  const { error } = await supabase.from("field_work_orders").update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

// Somebody has seen it and is on it — the step a computed queue cannot express.
// Idempotent: re-acknowledging keeps the FIRST acknowledgement, so the audit
// trail records when it was actually picked up, not the last click.
export async function acknowledgeWorkOrder(id: string, actorUserId?: string | null): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      acknowledged_at: now,
      acknowledged_by: actorUserId || null,
      status: "acknowledged",
      updated_at: now,
    })
    .eq("id", id)
    .is("acknowledged_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function startWorkOrder(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("field_work_orders")
    .update({ status: "in_progress", started_at: now, updated_at: now })
    .eq("id", id)
    .in("status", ["assigned", "acknowledged", "open", "in_progress"]);
  if (error) throw new Error(error.message);
}

export async function resolveWorkOrder(id: string, notes?: string | null): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const closedAt = new Date().toISOString();
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      status: "resolved",
      resolution_notes: notes?.trim().slice(0, 2000) || null,
      closed_at: closedAt,
      updated_at: closedAt,
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setWorkOrderStatus(id: string, status: string): Promise<void> {
  if (!STATUSES.has(status as OperationalIssueStatus)) {
    throw new Error("Unknown work order status.");
  }
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      status: status as OperationalIssueStatus,
      updated_at: now,
      closed_at: status === "resolved" ? now : null,
      ...(status === "assigned" ? { assigned_at: now } : {}),
      ...(status === "acknowledged" ? { acknowledged_at: now } : {}),
      ...(status === "in_progress" ? { started_at: now } : {}),
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
