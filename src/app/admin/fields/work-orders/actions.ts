"use server";

import { revalidatePath } from "next/cache";
import {
  acknowledgeWorkOrder,
  assignWorkOrder,
  createWorkOrder,
  getWorkOrders,
  resolveWorkOrder,
  setWorkOrderStatus,
  startWorkOrder,
} from "@/lib/services/work-orders";
import { publicErrorMessage } from "@/lib/public-error";
import { resolveSession } from "@/lib/access/session";
import { assertFieldInScope, assertVenueInScope } from "@/lib/access/scoped-venue-data";

export type CreateWorkOrderResult = { ok: boolean; error?: string };

// Every write here takes an id or fieldId from the form, so each one has to
// re-check scope server-side: the page list is filtered to the caller's fields,
// but a crafted request isn't. Same guard shape as the sponsor/alert actions.
async function assertIssueInScope(id: string): Promise<boolean> {
  const order = (await getWorkOrders()).find((item) => item.id === id);
  if (!order) return false;
  await assertVenueInScope(order.venueId);
  if (order.fieldId) await assertFieldInScope(order.fieldId);
  return true;
}

export async function createWorkOrderAction(formData: FormData): Promise<CreateWorkOrderResult> {
  try {
    const fieldId = String(formData.get("fieldId") || "");
    const title = String(formData.get("title") || "").trim();
    if (!fieldId || !title) {
      return { ok: false, error: "Field and a short description are required." };
    }
    await assertFieldInScope(fieldId);
    const session = await resolveSession();
    const reportedBy = session.kind === "active" ? session.context?.displayName || session.context?.email || null : null;
    await createWorkOrder({
      fieldId,
      title,
      detail: String(formData.get("detail") || "") || null,
      priority: String(formData.get("priority") || "normal"),
      reportedBy,
    });
    revalidatePath("/admin/fields/work-orders");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: publicErrorMessage(error, "Unable to create the work order.") };
  }
}

export async function setWorkOrderStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !status) return;
  try {
    if (!(await assertIssueInScope(id))) return;
    await setWorkOrderStatus(id, status);
  } catch {
    // Status unchanged; page re-render shows current state.
  }
  revalidatePath("/admin/fields/work-orders");
}

// ---- Issue lifecycle -------------------------------------------------------

export async function assignWorkOrderAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    if (!(await assertIssueInScope(id))) return;
    const role = String(formData.get("assigned_role") || "").trim();
    const dueAt = String(formData.get("due_at") || "").trim();
    await assignWorkOrder(id, {
      role: role || null,
      // A datetime-local value carries no zone; treat it as the server's local
      // time by letting Date parse it, then store UTC.
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
    });
  } catch {
    // Unchanged; the re-render shows current state.
  }
  revalidatePath("/admin/fields/work-orders");
}

export async function acknowledgeWorkOrderAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    if (!(await assertIssueInScope(id))) return;
    const session = await resolveSession();
    const actor = session.kind === "active" ? session.context?.userId ?? null : null;
    await acknowledgeWorkOrder(id, actor);
  } catch {
    // Unchanged.
  }
  revalidatePath("/admin/fields/work-orders");
}

export async function startWorkOrderAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    if (!(await assertIssueInScope(id))) return;
    await startWorkOrder(id);
  } catch {
    // Unchanged.
  }
  revalidatePath("/admin/fields/work-orders");
  revalidatePath("/admin/fields");
}

export async function resolveWorkOrderAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    if (!(await assertIssueInScope(id))) return;
    await resolveWorkOrder(id, String(formData.get("resolution_notes") || "") || null);
  } catch {
    // Unchanged.
  }
  revalidatePath("/admin/fields/work-orders");
  revalidatePath("/admin/fields");
}
