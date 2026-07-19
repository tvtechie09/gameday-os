"use server";

import { revalidatePath } from "next/cache";
import { clearActiveOperationsAlerts, createAlert, getAlert, updateAlertLifecycle } from "@/lib/services/alerts";
import { assertOrganizationInScope, assertVenueInScope } from "@/lib/access/scoped-venue-data";
import type { Alert } from "@/lib/types";
import { readAlertFormData } from "./form-utils";

// Match the alerts-list read filter: venue/field alerts gate on the venue,
// global/tournament alerts gate on the org. Returns false when the alert is
// missing (caller should no-op) and throws when it's out of the caller's scope.
async function assertAlertActionable(alertId: string): Promise<boolean> {
  const alert = await getAlert(alertId);
  if (!alert) {
    return false;
  }
  if (alert.alertScope === "venue" || alert.alertScope === "field") {
    await assertVenueInScope(alert.venueId);
  } else {
    await assertOrganizationInScope(alert.organizationId);
  }
  return true;
}

export type CreateAlertResult = {
  alert?: Alert;
  error?: string;
};

function revalidateAlertSurfaces() {
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/operations-center");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");
}

export async function createAlertAction(formData: FormData): Promise<CreateAlertResult> {
  const parsed = readAlertFormData(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    // Can only post an alert to a venue the caller manages.
    await assertVenueInScope(parsed.data.venue_id);
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
  if (!(await assertAlertActionable(alertId))) return;

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function expireAlertAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) return;
  if (!(await assertAlertActionable(alertId))) return;

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function hideAlertFromPublicAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) return;
  if (!(await assertAlertActionable(alertId))) return;

  await updateAlertLifecycle(alertId, {
    alert_visibility: "admin_only",
  });
  revalidateAlertSurfaces();
}

export async function clearAllActiveOperationsAlertsAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();

  if (!venueId) return;
  // Can only bulk-clear a venue the caller manages.
  await assertVenueInScope(venueId);

  await clearActiveOperationsAlerts(venueId);
  revalidateAlertSurfaces();
}
