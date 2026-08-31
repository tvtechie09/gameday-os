"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/access/session";
import { canViewCommandCenter } from "@/lib/access/capabilities";
import { assertFieldInScope, assertVenueInScope } from "@/lib/access/scoped-venue-data";
import { buildCommandCenter } from "@/lib/services/command-center";
import { refreshDemoDay } from "@/lib/services/demo-day";
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
