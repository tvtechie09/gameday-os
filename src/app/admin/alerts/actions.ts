"use server";

import { revalidatePath } from "next/cache";
import { clearActiveOperationsAlerts, createAlert, updateAlertLifecycle } from "@/lib/services/alerts";
import type { Alert } from "@/lib/types";
import { readAlertFormData } from "./form-utils";

export type CreateAlertResult = {
  alert?: Alert;
  error?: string;
};

function revalidateAlertSurfaces() {
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/operations-center");
  revalidatePath("/admin/game-day");
  revalidatePath("/admin/status-board");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function createAlertAction(formData: FormData): Promise<CreateAlertResult> {
  const parsed = readAlertFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const alert = await createAlert(parsed.data);
    revalidateAlertSurfaces();
    return { alert };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create alert." };
  }
}

export async function clearAlertAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) return;

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function expireAlertAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) return;

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function hideAlertFromPublicAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) return;

  await updateAlertLifecycle(alertId, {
    alert_visibility: "admin_only",
  });
  revalidateAlertSurfaces();
}

export async function clearAllActiveOperationsAlertsAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();

  if (!venueId) return;

  await clearActiveOperationsAlerts(venueId);
  revalidateAlertSurfaces();
}
