"use server";

import { revalidatePath } from "next/cache";
import { createWorkOrder, setWorkOrderStatus } from "@/lib/services/work-orders";
import { publicErrorMessage } from "@/lib/public-error";
import { resolveSession } from "@/lib/access/session";

export type CreateWorkOrderResult = { ok: boolean; error?: string };

export async function createWorkOrderAction(formData: FormData): Promise<CreateWorkOrderResult> {
  try {
    const fieldId = String(formData.get("fieldId") || "");
    const title = String(formData.get("title") || "").trim();
    if (!fieldId || !title) {
      return { ok: false, error: "Field and a short description are required." };
    }
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
    await setWorkOrderStatus(id, status);
  } catch {
    // Status unchanged; page re-render shows current state.
  }
  revalidatePath("/admin/fields/work-orders");
}
