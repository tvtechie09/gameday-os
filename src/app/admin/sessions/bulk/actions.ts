"use server";

import { revalidatePath } from "next/cache";
import { bulkUpdateSessions, deleteSessions, duplicateSessionsToDate } from "@/lib/services/sessions";
import type { Session } from "@/lib/types";

export type BulkActionResult = {
  count?: number;
  error?: string;
};

const validStatuses = ["scheduled", "active", "final"] as const;

function readSessionIds(formData: FormData) {
  const rawValue = String(formData.get("session_ids") ?? "").trim();

  if (!rawValue) {
    return [];
  }

  return rawValue.split(",").map((id) => id.trim()).filter(Boolean);
}

function revalidateSessionSurfaces() {
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/sessions/bulk");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function bulkUpdateSessionsAction(formData: FormData): Promise<BulkActionResult> {
  const sessionIds = readSessionIds(formData);
  const status = String(formData.get("status") ?? "").trim();
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const shiftMinutesRaw = String(formData.get("shift_minutes") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");
  const shiftMinutes = shiftMinutesRaw ? Number(shiftMinutesRaw) : null;

  if (sessionIds.length === 0) {
    return { error: "Preview and select at least one session before applying a bulk update." };
  }

  if (status && !validStatuses.includes(status as Session["status"])) {
    return { error: "Choose a valid status." };
  }

  if (shiftMinutesRaw && !Number.isFinite(shiftMinutes)) {
    return { error: "Shift minutes must be a number." };
  }

  if (!status && !fieldId && !shiftMinutes && !notes.trim()) {
    return { error: "Choose at least one bulk update action." };
  }

  try {
    const count = await bulkUpdateSessions({
      sessionIds,
      status: status ? status as Session["status"] : null,
      field_id: fieldId || null,
      shift_minutes: shiftMinutes,
      notes: notes.trim() ? notes : undefined,
    });
    revalidateSessionSurfaces();
    return { count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update sessions." };
  }
}

export async function duplicateSessionsAction(formData: FormData): Promise<BulkActionResult> {
  const sessionIds = readSessionIds(formData);
  const targetDate = String(formData.get("target_date") ?? "").trim();

  if (sessionIds.length === 0) {
    return { error: "Preview and select at least one source session before duplicating." };
  }

  if (!targetDate) {
    return { error: "Choose a target date." };
  }

  try {
    const count = await duplicateSessionsToDate({
      sessionIds,
      target_date: targetDate,
    });
    revalidateSessionSurfaces();
    return { count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to duplicate sessions." };
  }
}

export async function bulkDeleteSessionsAction(formData: FormData): Promise<BulkActionResult> {
  const sessionIds = readSessionIds(formData);
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (sessionIds.length === 0) {
    return { error: "Preview and select at least one session before deleting." };
  }

  if (confirmation !== "DELETE") {
    return { error: "Type DELETE to confirm bulk deletion." };
  }

  try {
    const count = await deleteSessions(sessionIds);
    revalidateSessionSurfaces();
    return { count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to delete sessions." };
  }
}
