import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

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
  updatedAt: string;
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
type WorkOrderUpdate = Database["public"]["Tables"]["field_work_orders"]["Update"];

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
const ISSUE_TYPES = new Set<OperationalIssueType>(["maintenance", "schedule", "staffing", "device", "scoreboard", "audio", "camera", "weather", "incident", "task", "other"]);

export type WorkOrderPerson = {
  id: string;
  displayName: string;
  email: string | null;
  roleLabel: string | null;
  venueIds: string[];
};

export type WorkOrderHistoryRecord = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export class WorkOrderConflictError extends Error {
  constructor(message = "This work order changed while you were viewing it. Review the latest state and try again.") {
    super(message);
    this.name = "WorkOrderConflictError";
  }
}

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
  updated_at: string;
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
    updatedAt: row.updated_at,
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

export async function getWorkOrdersForVenues(venueIds: string[]): Promise<WorkOrder[]> {
  if (venueIds.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("field_work_orders")
    .select("*")
    .in("venue_id", venueIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapWorkOrder);
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("field_work_orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapWorkOrder(data) : null;
}

export async function getWorkOrderPeople(venueIds: string[], includeUserIds: string[] = []): Promise<WorkOrderPerson[]> {
  if (venueIds.length === 0 && includeUserIds.length === 0) return [];
  const supabase = getSupabaseAdminClient();
  const now = Date.now();
  const { data: assignments, error: assignmentError } = venueIds.length > 0
    ? await supabase
      .from("user_role_assignments")
      .select("user_id,role_id,scope_id,starts_at,ends_at,assignment_status")
      .eq("scope_type", "venue")
      .in("scope_id", venueIds)
      .eq("assignment_status", "approved")
    : { data: [], error: null };
  if (assignmentError) throw new Error(assignmentError.message);

  const activeAssignments = (assignments ?? []).filter((assignment) => {
    const starts = assignment.starts_at ? new Date(assignment.starts_at).getTime() : null;
    const ends = assignment.ends_at ? new Date(assignment.ends_at).getTime() : null;
    return (starts === null || starts <= now) && (ends === null || ends > now);
  });
  const roleIds = [...new Set(activeAssignments.map((assignment) => assignment.role_id))];
  const { data: roles, error: roleError } = roleIds.length > 0
    ? await supabase.from("roles").select("id,key,name").in("id", roleIds)
    : { data: [], error: null };
  if (roleError) throw new Error(roleError.message);

  const eligibleRoleKeys = new Set(["super_admin", "platform_admin", "venue_director", "venue_staff", "venue_tech_manager"]);
  const roleById = new Map((roles ?? []).filter((role) => eligibleRoleKeys.has(role.key)).map((role) => [role.id, role]));
  const eligibleAssignments = activeAssignments.filter((assignment) => roleById.has(assignment.role_id));
  const userIds = [...new Set([...eligibleAssignments.map((assignment) => assignment.user_id), ...includeUserIds.filter(Boolean)])];
  if (userIds.length === 0) return [];
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id,email,display_name,user_status")
    .in("id", userIds);
  if (userError) throw new Error(userError.message);

  return (users ?? [])
    .filter((user) => user.user_status === "active" || includeUserIds.includes(user.id))
    .map((user) => {
      const userAssignments = eligibleAssignments.filter((assignment) => assignment.user_id === user.id);
      const role = userAssignments.map((assignment) => roleById.get(assignment.role_id)).find(Boolean);
      return {
        id: user.id,
        displayName: user.display_name?.trim() || user.email?.trim() || "Venue teammate",
        email: user.email,
        roleLabel: role?.name ?? null,
        venueIds: [...new Set(userAssignments.map((assignment) => assignment.scope_id))],
      };
    })
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName));
}

function metadataRecord(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function getWorkOrderHistory(id: string): Promise<WorkOrderHistoryRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("audit_logs")
    .select("id,actor_user_id,action,metadata,created_at")
    .eq("resource_type", "field_work_order")
    .eq("resource_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const actorIds = [...new Set((rows ?? []).map((row) => row.actor_user_id).filter((actorId): actorId is string => Boolean(actorId)))];
  const { data: users, error: userError } = actorIds.length > 0
    ? await supabase.from("users").select("id,display_name,email").in("id", actorIds)
    : { data: [], error: null };
  if (userError) throw new Error(userError.message);
  const userById = new Map((users ?? []).map((user) => [user.id, user.display_name?.trim() || user.email?.trim() || "Venue teammate"]));
  return (rows ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    actorUserId: row.actor_user_id,
    actorName: row.actor_user_id ? userById.get(row.actor_user_id) ?? "Venue teammate" : "GameDay system",
    createdAt: row.created_at,
    metadata: metadataRecord(row.metadata),
  }));
}

// Reporting uses an explicit venue predicate at the database boundary and a
// wider limit than the live queue. Do not load another tenant's rows and then
// rely on an in-memory filter for management analytics.
export async function getWorkOrdersForVenue(venueId: string, sinceIso: string): Promise<WorkOrder[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("field_work_orders")
    .select("*")
    .eq("venue_id", venueId)
    .gte("detected_at", sinceIso)
    .order("detected_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
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

async function updateWorkOrderIfCurrent(
  id: string,
  expectedUpdatedAt: string,
  statuses: string[],
  patch: WorkOrderUpdate,
): Promise<WorkOrder> {
  const supabase = getSupabaseAdminClient();
  const query = supabase
    .from("field_work_orders")
    .update(patch)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .in("status", statuses);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new WorkOrderConflictError();
  return mapWorkOrder(data);
}

export async function claimWorkOrder(id: string, actorUserId: string, expectedUpdatedAt: string): Promise<WorkOrder> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("field_work_orders")
    .update({ assigned_at: now, assigned_role: null, assigned_to_user_id: actorUserId, status: "assigned", updated_at: now })
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .eq("status", "open")
    .is("assigned_to_user_id", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new WorkOrderConflictError("Someone else took this work order first. The current assignment has been refreshed.");
  return mapWorkOrder(data);
}

export async function assignWorkOrder(id: string, input: { userId: string; dueAt?: string | null }, expectedUpdatedAt: string): Promise<WorkOrder> {
  const now = new Date().toISOString();
  const patch: WorkOrderUpdate = {
    acknowledged_at: null,
    acknowledged_by: null,
    assigned_at: now,
    assigned_role: null,
    assigned_to_user_id: input.userId,
    started_at: null,
    status: "assigned",
    updated_at: now,
  };
  if (input.dueAt !== undefined) patch.due_at = input.dueAt || null;
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["open", "assigned", "acknowledged", "in_progress"], patch);
}

// Somebody has seen it and is on it — the step a computed queue cannot express.
// Idempotent: re-acknowledging keeps the FIRST acknowledgement, so the audit
// trail records when it was actually picked up, not the last click.
export async function acknowledgeWorkOrder(id: string, actorUserId: string, expectedUpdatedAt: string): Promise<WorkOrder> {
  const now = new Date().toISOString();
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["assigned"], {
    acknowledged_at: now,
    acknowledged_by: actorUserId,
    assigned_to_user_id: actorUserId,
    status: "acknowledged",
    updated_at: now,
  });
}

export async function startWorkOrder(id: string, expectedUpdatedAt: string): Promise<WorkOrder> {
  const now = new Date().toISOString();
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["acknowledged"], { status: "in_progress", started_at: now, updated_at: now });
}

export async function resolveWorkOrder(id: string, expectedUpdatedAt: string, notes?: string | null): Promise<WorkOrder> {
  const closedAt = new Date().toISOString();
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["in_progress"], {
    status: "resolved",
    resolution_notes: notes?.trim().slice(0, 2000) || null,
    closed_at: closedAt,
    updated_at: closedAt,
  });
}

export async function escalateWorkOrder(id: string, expectedUpdatedAt: string): Promise<WorkOrder> {
  const now = new Date().toISOString();
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["open", "assigned", "acknowledged", "in_progress"], { priority: "urgent", updated_at: now });
}

export async function reopenWorkOrder(id: string, expectedUpdatedAt: string): Promise<WorkOrder> {
  const now = new Date().toISOString();
  return updateWorkOrderIfCurrent(id, expectedUpdatedAt, ["resolved", "done"], {
    acknowledged_at: null,
    acknowledged_by: null,
    assigned_at: null,
    assigned_role: null,
    assigned_to_user_id: null,
    closed_at: null,
    due_at: null,
    resolution_notes: null,
    started_at: null,
    status: "open",
    updated_at: now,
  });
}
