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
