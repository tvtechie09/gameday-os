import { getSupabaseAdminClient } from "@/lib/supabase/server";

// Field maintenance work orders: broken sprinkler head, chewed-up mound,
// fence gap — logged against a field, worked by grounds staff, closed out.

export type WorkOrder = {
  id: string;
  fieldId: string;
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
};

export type CreateWorkOrderInput = {
  fieldId: string;
  title: string;
  detail?: string | null;
  priority?: string;
  reportedBy?: string | null;
};

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set(["open", "in_progress", "done"]);

// Lifecycle columns are optional on the row type: a deploy where the code is
// ahead of the migration (or an old cached row shape) must degrade to nulls
// rather than throw.
function mapWorkOrder(row: {
  id: string;
  field_id: string;
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
}): WorkOrder {
  return {
    id: row.id,
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

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
  const supabase = getSupabaseAdminClient();
  const priority = PRIORITIES.has(input.priority ?? "") ? (input.priority as string) : "normal";
  const { data, error } = await supabase
    .from("field_work_orders")
    .insert({
      field_id: input.fieldId,
      title: input.title.trim().slice(0, 160),
      detail: input.detail?.trim().slice(0, 1000) || null,
      priority,
      reported_by: input.reportedBy?.trim().slice(0, 120) || null,
    })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapWorkOrder(data);
}

// ---- Issue lifecycle -------------------------------------------------------
//
// The stored `status` vocabulary is deliberately unchanged; assignment and
// acknowledgement are separate columns, and work-order-core derives the richer
// stage from them. That keeps every existing reader/writer of status correct.

export async function assignWorkOrder(id: string, input: { role?: string | null; userId?: string | null; dueAt?: string | null }): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const patch: {
    updated_at: string;
    assigned_role?: string | null;
    assigned_to_user_id?: string | null;
    due_at?: string | null;
  } = { updated_at: new Date().toISOString() };
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
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: actorUserId || null,
      // Acknowledging an untouched issue also moves it out of "open".
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("acknowledged_at", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveWorkOrder(id: string, notes?: string | null): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const closedAt = new Date().toISOString();
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      status: "done",
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
  if (!STATUSES.has(status)) {
    throw new Error("Unknown work order status.");
  }
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("field_work_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
      closed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
