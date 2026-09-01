"use server";

import { revalidatePath } from "next/cache";
import { canOpenCloseField } from "@/lib/access/capabilities";
import { assertFieldInScope } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { fieldStatuses, updateFieldStatus } from "@/lib/services/fields";
import type { FieldStatus } from "@/lib/types";

export type FieldStatusActionResult = { ok: boolean; message: string };

export async function setFieldOperationalStatusAction(fieldId: string, status: FieldStatus): Promise<FieldStatusActionResult> {
  const ctx = await getSessionContext();
  if (!ctx || !canOpenCloseField(ctx)) return { ok: false, message: "You don't have permission to change field status." };
  if (!fieldId || !fieldStatuses.includes(status)) return { ok: false, message: "Choose a valid field status." };

  try {
    await assertFieldInScope(fieldId);
    const field = await updateFieldStatus(fieldId, status, ctx.userId);
    revalidatePath("/admin/fields");
    revalidatePath("/admin/command-center");
    revalidatePath("/today");
    revalidatePath("/admin/operations-center");
    revalidatePath(`/admin/fields/${fieldId}/control`);
    revalidatePath(`/fields/${fieldId}`);
    return { ok: true, message: `${field.name} is now ${status}. The public field status has been updated.` };
  } catch (error) {
    console.error("Failed to update field operational status", error);
    return { ok: false, message: "The field status could not be updated. Try again." };
  }
}
