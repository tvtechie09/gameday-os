"use server";

import { revalidatePath } from "next/cache";
import { canOpenCloseField } from "@/lib/access/capabilities";
import { assertFieldInScope, OrganizationScopeError } from "@/lib/access/scoped-venue-data";
import { getSessionContext } from "@/lib/access/session";
import { FieldStatusConflictError, fieldStatuses, updateFieldStatus } from "@/lib/services/fields";
import type { FieldStatus } from "@/lib/types";

export type FieldStatusActionResult = {
  ok: boolean;
  message: string;
  code?: "conflict" | "permission" | "temporary";
  updatedAt?: string;
};

export async function setFieldOperationalStatusAction(fieldId: string, status: FieldStatus, expectedUpdatedAt: string): Promise<FieldStatusActionResult> {
  const ctx = await getSessionContext();
  if (!ctx || !canOpenCloseField(ctx)) return { ok: false, code: "permission", message: "You don't have permission to change field status." };
  if (!fieldId || !fieldStatuses.includes(status)) return { ok: false, message: "Choose a valid field status." };

  try {
    await assertFieldInScope(fieldId);
    const field = await updateFieldStatus(fieldId, status, ctx.userId, expectedUpdatedAt);
    revalidatePath("/admin/fields");
    revalidatePath("/today");
    revalidatePath("/admin/operations-center");
    revalidatePath(`/admin/fields/${fieldId}/control`);
    revalidatePath(`/fields/${fieldId}`);
    return { ok: true, message: `${field.name} is now ${status}. The public field status has been updated.`, updatedAt: field.updatedAt };
  } catch (error) {
    if (error instanceof FieldStatusConflictError) return { ok: false, code: "conflict", message: error.message };
    if (error instanceof OrganizationScopeError) return { ok: false, code: "permission", message: "You don't have access to change this field." };
    console.error("Failed to update field operational status", error);
    return { ok: false, code: "temporary", message: "Couldn't update this field. Check your connection and try again." };
  }
}
