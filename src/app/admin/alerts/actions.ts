"use server";

import { revalidatePath } from "next/cache";
import { clearActiveOperationsAlerts, createAlert, getAlert, updateAlertLifecycle } from "@/lib/services/alerts";
import { assertOrganizationInScope, assertVenueInScope, OrganizationScopeError } from "@/lib/access/scoped-venue-data";
import type { Alert } from "@/lib/types";
import { readAlertFormData } from "./form-utils";

// Match the alerts-list read filter: venue/field alerts gate on the venue,
// global/tournament alerts gate on the org. A missing alert is not success:
// callers surface a retryable stale-state message instead of falsely confirming.
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
    if (error instanceof OrganizationScopeError) return { error: "You don't have access to publish an announcement for this venue." };
    console.error("Failed to create announcement", error);
    return { error: "Couldn't publish this announcement. Check your connection and try again." };
  }
}

export async function clearAlertAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  if (!(await assertAlertActionable(alertId))) throw new Error("Announcement not found.");

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function expireAlertAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  if (!(await assertAlertActionable(alertId))) throw new Error("Announcement not found.");

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  revalidateAlertSurfaces();
}

export async function hideAlertFromPublicAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  if (!(await assertAlertActionable(alertId))) throw new Error("Announcement not found.");

  await updateAlertLifecycle(alertId, {
    alert_visibility: "admin_only",
  });
  revalidateAlertSurfaces();
}

export async function clearAllActiveOperationsAlertsAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();

  if (!venueId) throw new Error("Venue not found.");
  // Can only bulk-clear a venue the caller manages.
  await assertVenueInScope(venueId);

  await clearActiveOperationsAlerts(venueId);
  revalidateAlertSurfaces();
}
