"use server";

import { revalidatePath } from "next/cache";
import { clearActiveOperationsAlerts, createAlert, hasRecentAllClearAlert, updateAlertLifecycle } from "@/lib/services/alerts";
import { updateFieldStatus } from "@/lib/services/fields";
import { safelyCreateNotification } from "@/lib/services/notifications";
import type { AlertPriority, AlertType, FieldStatus } from "@/lib/types";

export type VenueOperationType =
  | "normal_operations"
  | "delay"
  | "weather_delay"
  | "schedule_delay"
  | "closed"
  | "emergency"
  | "maintenance"
  | "rain_delay"
  | "lightning_delay"
  | "heat_delay"
  | "field_closure"
  | "field_reopened"
  | "all_clear";

type OperationConfig = {
  alertType: AlertType;
  fieldStatus: FieldStatus | null;
  message: string;
  priority: AlertPriority;
  title: string;
};

const operationConfigs: Record<VenueOperationType, OperationConfig> = {
  all_clear: {
    alertType: "weather",
    fieldStatus: "open",
    message: "All clear. Games may resume.",
    priority: "normal",
    title: "All Clear",
  },
  closed: {
    alertType: "field_closure",
    fieldStatus: "closed",
    message: "Venue closed. Please check updated schedule.",
    priority: "high",
    title: "Venue Closed",
  },
  delay: {
    alertType: "delay",
    fieldStatus: "delayed",
    message: "Venue delay. Please wait for updated game times.",
    priority: "high",
    title: "Venue Delay",
  },
  schedule_delay: {
    alertType: "delay",
    fieldStatus: "delayed",
    message: "Schedule delay. Games are running behind. Please watch for updated start times.",
    priority: "high",
    title: "Schedule Delay",
  },
  emergency: {
    alertType: "emergency",
    fieldStatus: null,
    message: "Emergency alert. Follow venue staff instructions.",
    priority: "urgent",
    title: "Emergency Alert",
  },
  maintenance: {
    alertType: "field_closure",
    fieldStatus: "maintenance",
    message: "Maintenance in progress. Please follow venue staff guidance before using affected areas.",
    priority: "high",
    title: "Maintenance",
  },
  field_closure: {
    alertType: "field_closure",
    fieldStatus: "closed",
    message: "Field closed. Please check updated schedule.",
    priority: "high",
    title: "Field Closed",
  },
  field_reopened: {
    alertType: "info",
    fieldStatus: "open",
    message: "Field reopened. Please check with venue staff for the latest schedule.",
    priority: "normal",
    title: "Field Reopened",
  },
  heat_delay: {
    alertType: "weather",
    fieldStatus: "delayed",
    message: "Heat delay. Games are paused while venue staff monitors player safety.",
    priority: "high",
    title: "Heat Delay",
  },
  lightning_delay: {
    alertType: "weather",
    fieldStatus: "delayed",
    message: "Lightning delay. All games are paused.",
    priority: "urgent",
    title: "Lightning Delay",
  },
  normal_operations: {
    alertType: "info",
    fieldStatus: "open",
    message: "Normal operations. Games are proceeding as scheduled.",
    priority: "normal",
    title: "Normal Operations",
  },
  rain_delay: {
    alertType: "weather",
    fieldStatus: "delayed",
    message: "Rain delay. Games will resume when fields are playable.",
    priority: "high",
    title: "Rain Delay",
  },
  weather_delay: {
    alertType: "weather",
    fieldStatus: "delayed",
    message: "Weather delay. Games are paused while venue staff monitors conditions.",
    priority: "high",
    title: "Weather Delay",
  },
};

const announcementConfig: Record<string, { alertType: AlertType; priority: AlertPriority; title: string }> = {
  concessions: { alertType: "concession", priority: "normal", title: "Concessions Announcement" },
  emergency: { alertType: "emergency", priority: "urgent", title: "Emergency Announcement" },
  field_change: { alertType: "info", priority: "high", title: "Field Change Announcement" },
  general: { alertType: "info", priority: "normal", title: "Venue Announcement" },
  lost_child: { alertType: "emergency", priority: "urgent", title: "Lost Child Announcement" },
  maintenance: { alertType: "field_closure", priority: "high", title: "Maintenance Announcement" },
  medical: { alertType: "emergency", priority: "urgent", title: "Medical Announcement" },
  parking: { alertType: "parking", priority: "normal", title: "Parking Announcement" },
  tournament: { alertType: "info", priority: "normal", title: "Tournament Announcement" },
  weather: { alertType: "weather", priority: "high", title: "Weather Announcement" },
};

function readOperationType(value: string): VenueOperationType {
  return Object.keys(operationConfigs).includes(value) ? value as VenueOperationType : "normal_operations";
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function readFieldIds(formData: FormData) {
  const scopeMode = String(formData.get("scope_mode") ?? "all");
  const selectedFieldIds = formData.getAll("field_ids").map((value) => String(value).trim()).filter(Boolean);
  const allFieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);

  return {
    affectedFieldIds: scopeMode === "selected" ? selectedFieldIds : allFieldIds,
    scopeMode,
  };
}

function revalidateOperationSurfaces(fieldIds: string[]) {
  revalidatePath("/admin/operations-center");
  revalidatePath("/admin/weather");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/game-day");
  revalidatePath("/admin/status-board");
  revalidatePath("/admin/pilot-launch");
  revalidatePath("/display/venue/[venueId]", "page");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");

  for (const fieldId of fieldIds) {
    revalidatePath(`/fields/${fieldId}`);
  }
}

async function notifyOperationsEvent({
  fieldId,
  message,
  title,
  venueId,
}: {
  fieldId?: string | null;
  message: string;
  title: string;
  venueId: string;
}) {
  await safelyCreateNotification({
    field_id: fieldId,
    message,
    notification_type: "alert",
    title,
    venue_id: venueId,
  });
}

async function createScopedAlert({
  affectedFieldIds,
  alertType,
  endTime,
  message,
  priority,
  scopeMode,
  title,
  venueId,
}: {
  affectedFieldIds: string[];
  alertType: AlertType;
  endTime: string;
  message: string;
  priority: AlertPriority;
  scopeMode: string;
  title: string;
  venueId: string;
}) {
  const now = new Date().toISOString();

  if (scopeMode === "selected" && affectedFieldIds.length > 0) {
    await Promise.all(affectedFieldIds.map((fieldId) => createAlert({
      alert_priority: priority,
      alert_scope: "field",
      alert_type: alertType,
      alert_visibility: "public",
      end_time: endTime,
      field_id: fieldId,
      is_active: true,
      message,
      start_time: now,
      title,
      venue_id: venueId,
    })));
    return;
  }

  await createAlert({
    alert_priority: priority,
    alert_scope: "venue",
    alert_type: alertType,
    alert_visibility: "public",
    end_time: endTime,
    is_active: true,
    message,
    start_time: now,
    title,
    venue_id: venueId,
  });
}

async function createOperationsHistoryAlert({
  alertType = "info",
  message,
  priority = "normal",
  title,
  venueId,
}: {
  alertType?: AlertType;
  message: string;
  priority?: AlertPriority;
  title: string;
  venueId: string;
}) {
  const now = new Date().toISOString();

  await createAlert({
    alert_priority: priority,
    alert_scope: "venue",
    alert_type: alertType,
    alert_visibility: "public",
    end_time: now,
    is_active: false,
    message,
    start_time: now,
    title,
    venue_id: venueId,
  });
}

export async function createVenueStatusAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const operationType = readOperationType(String(formData.get("operation_type") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!venueId) return;

  const { affectedFieldIds, scopeMode } = readFieldIds(formData);
  const config = operationConfigs[operationType];
  const endTime = addHours(new Date(), operationType === "normal_operations" || operationType === "all_clear" || operationType === "field_reopened" ? 2 : 8).toISOString();

  if (operationType === "normal_operations" || operationType === "all_clear") {
    await clearActiveOperationsAlerts(venueId);

    if (affectedFieldIds.length > 0) {
      await Promise.all(affectedFieldIds.map((fieldId) => updateFieldStatus(fieldId, "open")));
    }

    const historyTitle = operationType === "all_clear" ? "All Clear" : "Normal Operations";

    if (operationType !== "all_clear" || !(await hasRecentAllClearAlert(venueId))) {
      await createOperationsHistoryAlert({
        message: message || config.message,
        title: historyTitle,
        venueId,
      });
    }

    revalidateOperationSurfaces(affectedFieldIds);
    return;
  }

  await createScopedAlert({
    affectedFieldIds,
    alertType: config.alertType,
    endTime,
    message: message || config.message,
    priority: config.priority,
    scopeMode,
    title: title || config.title,
    venueId,
  });

  const fieldStatus = config.fieldStatus;

  if (fieldStatus && affectedFieldIds.length > 0) {
    await Promise.all(affectedFieldIds.map((fieldId) => updateFieldStatus(fieldId, fieldStatus)));
  }

  revalidateOperationSurfaces(affectedFieldIds);
}

export async function createVenueAnnouncementAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const announcementType = String(formData.get("announcement_type") ?? "general");
  const message = String(formData.get("message") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!venueId || !message) return;

  const config = announcementConfig[announcementType] ?? announcementConfig.general;
  const { affectedFieldIds, scopeMode } = readFieldIds(formData);

  await createScopedAlert({
    affectedFieldIds,
    alertType: config.alertType,
    endTime: addHours(new Date(), announcementType === "emergency" ? 8 : 4).toISOString(),
    message,
    priority: config.priority,
    scopeMode,
    title: title || config.title,
    venueId,
  });

  revalidateOperationSurfaces(affectedFieldIds);
}

export async function createDelayUpdateAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const fieldName = String(formData.get("field_name") ?? "Field").trim();
  const delayStatus = String(formData.get("delay_status") ?? "on_time");

  if (!venueId || !fieldId) return;

  const isOnTime = delayStatus === "on_time";
  const isClosed = delayStatus === "closed";
  const label = isOnTime ? "On Time" : delayStatus.replaceAll("_", " ");
  const message = isOnTime
    ? `${fieldName} is on time.`
    : isClosed
      ? `${fieldName} is closed. Please check venue updates before heading to this field.`
      : `${fieldName} is ${label} behind. Please watch for updated game times.`;

  await createAlert({
    alert_priority: isOnTime ? "normal" : "high",
    alert_scope: "field",
    alert_type: isOnTime ? "info" : isClosed ? "field_closure" : "delay",
    alert_visibility: "public",
    end_time: addHours(new Date(), isOnTime ? 2 : 6).toISOString(),
    field_id: fieldId,
    is_active: true,
    message,
    start_time: new Date().toISOString(),
    title: isOnTime ? `${fieldName} On Time` : isClosed ? `${fieldName} Closed` : `${fieldName} Delay Update`,
    venue_id: venueId,
  });

  await updateFieldStatus(fieldId, isOnTime ? "open" : isClosed ? "closed" : "delayed");
  revalidateOperationSurfaces([fieldId]);
}

export async function resetAllFieldDelaysAction(formData: FormData): Promise<void> {
  const fieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);
  const venueId = String(formData.get("venue_id") ?? "").trim();

  await Promise.all(fieldIds.map((fieldId) => updateFieldStatus(fieldId, "open")));
  if (venueId) {
    await notifyOperationsEvent({
      message: "All fields reset to on time.",
      title: "Fields Reset",
      venueId,
    });
  }
  revalidateOperationSurfaces(fieldIds);
}

export async function resetSelectedFieldDelayAction(formData: FormData): Promise<void> {
  const fieldId = String(formData.get("field_id") ?? "").trim();

  if (!fieldId) return;

  await updateFieldStatus(fieldId, "open");
  revalidateOperationSurfaces([fieldId]);
}

export async function reopenAllClosedFieldsAction(formData: FormData): Promise<void> {
  const fieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);
  const venueId = String(formData.get("venue_id") ?? "").trim();

  await Promise.all(fieldIds.map((fieldId) => updateFieldStatus(fieldId, "open")));
  if (venueId) {
    await notifyOperationsEvent({
      message: "Closed fields reopened.",
      title: "Fields Reopened",
      venueId,
    });
  }
  revalidateOperationSurfaces(fieldIds);
}

export async function clearActiveOperationsAlertsAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const fieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);

  if (!venueId) return;

  await clearActiveOperationsAlerts(venueId);
  await notifyOperationsEvent({
    message: "Active operations alerts cleared.",
    title: "Operations Alerts Cleared",
    venueId,
  });
  revalidateOperationSurfaces(fieldIds);
}

export async function clearAnnouncementAction(formData: FormData): Promise<void> {
  const alertId = String(formData.get("alert_id") ?? "").trim();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const fieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);

  if (!alertId) return;

  await updateAlertLifecycle(alertId, {
    end_time: new Date().toISOString(),
    is_active: false,
  });

  if (venueId) {
    await notifyOperationsEvent({
      message: "Announcement cleared from public active displays.",
      title: "Announcement Cleared",
      venueId,
    });
  }

  revalidateOperationSurfaces(fieldIds);
}
