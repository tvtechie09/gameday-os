"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/access/session";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { assertFieldInScope, assertVenueInScope } from "@/lib/access/scoped-venue-data";
import { buildCommandCenter } from "@/lib/services/command-center";
import { refreshDemoDay } from "@/lib/services/demo-day";
import { executeRapidScheduleOperation, type RapidScheduleOperation } from "@/lib/services/schedule-operations";
import {
  acknowledgeWorkOrder,
  assignWorkOrder,
  createSystemWorkOrder,
  getWorkOrders,
  resolveWorkOrder,
  startWorkOrder,
} from "@/lib/services/work-orders";

function revalidateOperations() {
  revalidatePath("/admin/command-center");
  revalidatePath("/admin/fields/work-orders");
}

function scheduleRedirect(kind: "success" | "error", message: string): never {
  redirect(`/admin/command-center?schedule_${kind}=${encodeURIComponent(message.slice(0, 180))}`);
}

export async function rapidScheduleAction(formData: FormData): Promise<void> {
  const ctx = await requireCommandCenter();
  const type = String(formData.get("operation") || "");
  const sessionId = String(formData.get("session_id") || "");
  const fieldId = String(formData.get("field_id") || "");
  const targetFieldId = String(formData.get("target_field_id") || "");
  const minutes = Number(formData.get("minutes") || 0);
  let operation: RapidScheduleOperation;
  if (type === "delay_game") operation = { type, sessionId, minutes };
  else if (type === "delay_remaining") operation = { type, fieldId, fromTime: String(formData.get("from_time") || new Date().toISOString()), minutes };
  else if (type === "move_game") operation = { type, sessionId, fieldId: targetFieldId };
  else if (type === "cancel" || type === "postpone") operation = { type, sessionId };
  else return scheduleRedirect("error", "Unknown schedule action.");

  let count = 0;
  try {
    if (fieldId) await assertFieldInScope(fieldId);
    if (targetFieldId) await assertFieldInScope(targetFieldId);
    const result = await executeRapidScheduleOperation(operation, ctx.userId);
    count = result.count;
    revalidateOperations();
    revalidatePath("/admin/sessions");
    revalidatePath("/fields/[fieldId]", "page");
    revalidatePath("/venues/[venueId]", "page");
  } catch (error) {
    return scheduleRedirect("error", error instanceof Error ? error.message : "Schedule update failed.");
  }
  return scheduleRedirect("success", `${count} game${count === 1 ? "" : "s"} updated.`);
}

async function requireCommandCenter() {
  const ctx = await getSessionContext();
  if (!canViewCommandCenter(ctx)) throw new Error("Not authorized.");
  return ctx!;
}

export async function trackAttentionItemAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get("item_id") || "");
  if (!itemId) return;
  const ctx = await requireCommandCenter();
  const view = await buildCommandCenter(ctx);
  const item = view.attention.find((candidate) => candidate.id === itemId && candidate.source === "computed" && candidate.systemKey);
  if (!item || !view.venueId || !item.systemKey || !item.issueType) return;
  await assertVenueInScope(view.venueId);
  if (item.fieldId) await assertFieldInScope(item.fieldId);
  await createSystemWorkOrder({
    venueId: view.venueId,
    fieldId: item.fieldId,
    gameId: item.gameId,
    assetId: item.assetId,
    issueType: item.issueType,
    systemKey: item.systemKey,
    title: item.title,
    detail: `${item.why} Recommended action: ${item.action}`,
    priority: item.tier === "urgent" ? "urgent" : item.tier === "soon" ? "high" : "normal",
    reportedBy: "GameDay OS",
    metadata: { attention_item_id: item.id, href: item.href },
  });
  revalidateOperations();
}

export async function updateAttentionIssueAction(formData: FormData): Promise<void> {
  const id = String(formData.get("issue_id") || "");
  const operation = String(formData.get("operation") || "");
  if (!id) return;
  const ctx = await requireCommandCenter();
  const issue = (await getWorkOrders()).find((candidate) => candidate.id === id);
  if (!issue) return;
  await assertVenueInScope(issue.venueId);
  if (issue.fieldId) await assertFieldInScope(issue.fieldId);

  if (operation === "assign_self") await assignWorkOrder(id, { userId: ctx.userId });
  else if (operation === "acknowledge") await acknowledgeWorkOrder(id, ctx.userId);
  else if (operation === "start") await startWorkOrder(id);
  else if (operation === "resolve") await resolveWorkOrder(id, "Resolved from Command Center");
  revalidateOperations();
}

// Re-times the DEMO games onto today so the Command Center shows a live Saturday
// for a walkthrough. Only touches sessions flagged is_demo (see demo-day.ts) —
// a real venue's schedule can't be reached from here.
export async function refreshDemoDayAction(): Promise<void> {
  const ctx = await getSessionContext();
  await refreshDemoDay(ctx); // throws unless platform staff
  revalidatePath("/admin/command-center");
  revalidatePath("/today");
  revalidatePath("/admin/impact");
}
