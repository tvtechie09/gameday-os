"use server";

import { revalidatePath } from "next/cache";
import { canManageVenueSettings, canOpenCloseField, isOrgScoped, type AccessContext } from "@/lib/access/capabilities";
import { assertFieldInScope, assertVenueInScope } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { publicErrorMessage } from "@/lib/public-error";
import { assertActorUserId, PermissionDeniedError, safelyLogAudit } from "@/lib/services/identity";
import {
  acknowledgeWorkOrder,
  assignWorkOrder,
  claimWorkOrder,
  createWorkOrder,
  escalateWorkOrder,
  getWorkOrder,
  getWorkOrderPeople,
  reopenWorkOrder,
  resolveWorkOrder,
  startWorkOrder,
  type WorkOrder,
} from "@/lib/services/work-orders";

export type WorkOrderActionResult = {
  ok: boolean;
  message: string;
  workOrderId?: string;
};

type AuthorizedOrder = {
  ctx: AccessContext;
  order: WorkOrder;
};

function requireWorker(ctx: AccessContext | null): asserts ctx is AccessContext {
  if (!ctx || isOrgScoped(ctx) || !canOpenCloseField(ctx)) {
    throw new PermissionDeniedError("You do not have permission to update work orders.");
  }
}

async function authorizeOrder(id: string, managementOnly = false): Promise<AuthorizedOrder> {
  const ctx = await getSessionContext();
  requireWorker(ctx);
  if (managementOnly && !canManageVenueSettings(ctx)) {
    throw new PermissionDeniedError("Only venue management can perform this action.");
  }
  const order = await getWorkOrder(id);
  if (!order) throw new Error("Work order not found.");
  await assertVenueInScope(order.venueId);
  if (order.fieldId) await assertFieldInScope(order.fieldId);
  return { ctx, order };
}

function revalidateWorkOrder(order: WorkOrder) {
  revalidatePath("/admin");
  revalidatePath("/today");
  revalidatePath("/admin/fields");
  revalidatePath("/admin/fields/work-orders");
  revalidatePath(`/admin/fields/work-orders/${order.id}`);
  if (order.fieldId) revalidatePath(`/admin/fields/${order.fieldId}/disruption`);
}

async function auditWorkOrder(order: WorkOrder, ctx: AccessContext, action: string, metadata: Record<string, string | null> = {}) {
  await safelyLogAudit({
    action,
    actorUserId: assertActorUserId(ctx.userId),
    metadata,
    resourceId: order.id,
    resourceType: "field_work_order",
    scopeId: order.venueId,
    scopeType: "venue",
  });
}

function failure(error: unknown, fallback: string): WorkOrderActionResult {
  return { ok: false, message: publicErrorMessage(error, fallback) };
}

export async function createWorkOrderAction(formData: FormData): Promise<WorkOrderActionResult> {
  try {
    const ctx = await getSessionContext();
    requireWorker(ctx);
    const fieldId = String(formData.get("fieldId") || "");
    const title = String(formData.get("title") || "").trim();
    if (!fieldId || !title) return { ok: false, message: "Field and a short description are required." };
    await assertFieldInScope(fieldId);
    const order = await createWorkOrder({
      fieldId,
      title,
      detail: String(formData.get("detail") || "") || null,
      priority: String(formData.get("priority") || "normal"),
      reportedBy: ctx.displayName || ctx.email,
    });
    await auditWorkOrder(order, ctx, "work_order.created", { title: order.title });
    revalidateWorkOrder(order);
    return { ok: true, message: "Work order created.", workOrderId: order.id };
  } catch (error) {
    return failure(error, "Unable to create the work order.");
  }
}

export async function claimWorkOrderAction(id: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx } = await authorizeOrder(id);
    const updated = await claimWorkOrder(id, assertActorUserId(ctx.userId), expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.claimed");
    revalidateWorkOrder(updated);
    return { ok: true, message: "This work order is assigned to you." };
  } catch (error) {
    return failure(error, "Unable to assign the work order.");
  }
}

export async function assignWorkOrderAction(id: string, assigneeUserId: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx, order } = await authorizeOrder(id, true);
    const people = await getWorkOrderPeople([order.venueId], [assigneeUserId]);
    const assignee = people.find((person) => person.id === assigneeUserId && person.venueIds.includes(order.venueId));
    if (!assignee) throw new PermissionDeniedError("Choose a teammate assigned to this venue.");
    const updated = await assignWorkOrder(id, { userId: assignee.id }, expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.assigned", { assignee_name: assignee.displayName, assignee_user_id: assignee.id });
    revalidateWorkOrder(updated);
    return { ok: true, message: `Assigned to ${assignee.displayName}.` };
  } catch (error) {
    return failure(error, "Unable to update the assignment.");
  }
}

export async function acknowledgeWorkOrderAction(id: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx, order } = await authorizeOrder(id);
    if (order.assignedToUserId && order.assignedToUserId !== ctx.userId && !canManageVenueSettings(ctx)) {
      throw new PermissionDeniedError("This work order is assigned to another teammate.");
    }
    const updated = await acknowledgeWorkOrder(id, assertActorUserId(ctx.userId), expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.acknowledged");
    revalidateWorkOrder(updated);
    return { ok: true, message: "Responsibility acknowledged." };
  } catch (error) {
    return failure(error, "Unable to acknowledge the work order.");
  }
}

export async function startWorkOrderAction(id: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx, order } = await authorizeOrder(id);
    if (order.acknowledgedBy && order.acknowledgedBy !== ctx.userId && !canManageVenueSettings(ctx)) {
      throw new PermissionDeniedError("Another teammate acknowledged this work order.");
    }
    const updated = await startWorkOrder(id, expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.started");
    revalidateWorkOrder(updated);
    return { ok: true, message: "Work started." };
  } catch (error) {
    return failure(error, "Unable to start the work order.");
  }
}

export async function resolveWorkOrderAction(id: string, expectedUpdatedAt: string, resolutionNote: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx, order } = await authorizeOrder(id);
    if (order.assignedToUserId && order.assignedToUserId !== ctx.userId && !canManageVenueSettings(ctx)) {
      throw new PermissionDeniedError("Another teammate owns this work order.");
    }
    const note = resolutionNote.trim();
    const updated = await resolveWorkOrder(id, expectedUpdatedAt, note || null);
    await auditWorkOrder(updated, ctx, "work_order.resolved", { resolution_note: note || null });
    revalidateWorkOrder(updated);
    return { ok: true, message: "Work order resolved." };
  } catch (error) {
    return failure(error, "Unable to resolve the work order.");
  }
}

export async function escalateWorkOrderAction(id: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx } = await authorizeOrder(id, true);
    const updated = await escalateWorkOrder(id, expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.escalated");
    revalidateWorkOrder(updated);
    return { ok: true, message: "Flagged as urgent for venue management." };
  } catch (error) {
    return failure(error, "Unable to escalate the work order.");
  }
}

export async function addWorkOrderNoteAction(id: string, noteValue: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx, order } = await authorizeOrder(id);
    const note = noteValue.trim().slice(0, 1000);
    if (!note) return { ok: false, message: "Write a note before saving." };
    await auditWorkOrder(order, ctx, "work_order.note_added", { note });
    revalidateWorkOrder(order);
    return { ok: true, message: "Note added to history." };
  } catch (error) {
    return failure(error, "Unable to add the note.");
  }
}

export async function reopenWorkOrderAction(id: string, expectedUpdatedAt: string): Promise<WorkOrderActionResult> {
  try {
    const { ctx } = await authorizeOrder(id, true);
    const updated = await reopenWorkOrder(id, expectedUpdatedAt);
    await auditWorkOrder(updated, ctx, "work_order.reopened");
    revalidateWorkOrder(updated);
    return { ok: true, message: "Work order reopened." };
  } catch (error) {
    return failure(error, "Unable to reopen the work order.");
  }
}
