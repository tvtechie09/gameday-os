"use server";

import { revalidatePath } from "next/cache";
import { clearActiveOperationsAlerts, createAlertWithResult, getAlert, updateAlertLifecycle } from "@/lib/services/alerts";
import { assertOrganizationInScope, assertVenueInScope, OrganizationScopeError } from "@/lib/access/scoped-venue-data";
import type { Alert } from "@/lib/types";
import { readAlertFormData } from "./form-utils";
import { canSendAnnouncement } from "@/lib/access/capabilities";
import { getSessionContext } from "@/lib/access/session";
import { safelyLogAudit } from "@/lib/services/identity";
import { getVenueTimezone } from "@/lib/services/venues";

async function requireAnnouncementActor() {
  const ctx = await getSessionContext();
  if (!ctx || !canSendAnnouncement(ctx)) throw new Error("You do not have permission to publish announcements.");
  return ctx;
}

// Match the alerts-list read filter: venue/field alerts gate on the venue,
// global/tournament alerts gate on the org. A missing alert is not success:
// callers surface a retryable stale-state message instead of falsely confirming.
async function assertAlertActionable(alertId: string): Promise<Alert | null> {
  const alert = await getAlert(alertId);
  if (!alert) {
    return null;
  }
  if (alert.alertScope === "venue" || alert.alertScope === "field") {
    await assertVenueInScope(alert.venueId);
  } else {
    await assertOrganizationInScope(alert.organizationId);
  }
  return alert;
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
  const ctx = await requireAnnouncementActor();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const parsed = readAlertFormData(formData, await getVenueTimezone(venueId));

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    // Can only post an alert to a venue the caller manages.
    await assertVenueInScope(parsed.data.venue_id);
    const result = await createAlertWithResult(parsed.data);
    const alert = result.alert;
    if (result.created) {
      await safelyLogAudit({
        action: "announcement.published",
        actorUserId: ctx.userId,
        metadata: { priority: alert.alertPriority, state: alert.isActive ? "published" : "inactive", visibility: alert.alertVisibility },
        resourceId: alert.id,
        resourceType: "alert",
        scopeId: alert.venueId,
        scopeType: "venue",
      });
    }
    revalidateAlertSurfaces();
    return { alert };
  } catch (error) {
    if (error instanceof OrganizationScopeError) return { error: "You don't have access to publish an announcement for this venue." };
    console.error("Failed to create announcement", error);
    return { error: "Couldn't publish this announcement. Check your connection and try again." };
  }
}

export async function clearAlertAction(formData: FormData): Promise<void> {
  const ctx = await requireAnnouncementActor();
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  const current = await assertAlertActionable(alertId);
  if (!current) throw new Error("Announcement not found.");
  if (!current.isActive || new Date(current.endTime).getTime() <= Date.now()) return;

  const updated = await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  await safelyLogAudit({ action: "announcement.expired", actorUserId: ctx.userId, metadata: { previousState: "published", state: "expired", priority: updated.alertPriority }, resourceId: updated.id, resourceType: "alert", scopeId: updated.venueId, scopeType: "venue" });
  revalidateAlertSurfaces();
}

export async function expireAlertAction(formData: FormData): Promise<void> {
  const ctx = await requireAnnouncementActor();
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  const current = await assertAlertActionable(alertId);
  if (!current) throw new Error("Announcement not found.");
  if (!current.isActive || new Date(current.endTime).getTime() <= Date.now()) return;

  const updated = await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });
  await safelyLogAudit({ action: "announcement.expired", actorUserId: ctx.userId, metadata: { previousState: "published", state: "expired", priority: updated.alertPriority }, resourceId: updated.id, resourceType: "alert", scopeId: updated.venueId, scopeType: "venue" });
  revalidateAlertSurfaces();
}

export async function hideAlertFromPublicAction(formData: FormData): Promise<void> {
  const ctx = await requireAnnouncementActor();
  const alertId = String(formData.get("alert_id") ?? "").trim();

  if (!alertId) throw new Error("Announcement not found.");
  const current = await assertAlertActionable(alertId);
  if (!current) throw new Error("Announcement not found.");
  if (current.alertVisibility === "admin_only") return;

  const updated = await updateAlertLifecycle(alertId, {
    alert_visibility: "admin_only",
  });
  await safelyLogAudit({ action: "announcement.visibility_changed", actorUserId: ctx.userId, metadata: { previousVisibility: current.alertVisibility, visibility: updated.alertVisibility }, resourceId: updated.id, resourceType: "alert", scopeId: updated.venueId, scopeType: "venue" });
  revalidateAlertSurfaces();
}

export async function clearAllActiveOperationsAlertsAction(formData: FormData): Promise<void> {
  await requireAnnouncementActor();
  const venueId = String(formData.get("venue_id") ?? "").trim();

  if (!venueId) throw new Error("Venue not found.");
  // Can only bulk-clear a venue the caller manages.
  await assertVenueInScope(venueId);

  await clearActiveOperationsAlerts(venueId);
  revalidateAlertSurfaces();
}
