"use server";

import { revalidatePath } from "next/cache";
import { canViewCommandCenter, isOrgScoped } from "@/lib/access/capabilities";
import { clearActiveOperationsAlerts, createAlert, hasRecentAllClearAlert } from "@/lib/services/alerts";
import { updateFieldStatus } from "@/lib/services/fields";
import { getSessionContext } from "@/lib/access/session";
import type { AlertPriority, AlertType, FieldStatus } from "@/lib/types";
import { assertVenueInScope, getScopedVenuesAndFields, OrganizationScopeError } from "@/lib/access/scoped-venue-data";

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

async function assertOperationScope(venueId: string, fieldIds: string[]) {
  await assertVenueInScope(venueId);
  if (fieldIds.length === 0) return;

  const { fields } = await getScopedVenuesAndFields();
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  if (fieldIds.some((fieldId) => fieldsById.get(fieldId)?.venueId !== venueId)) {
    throw new OrganizationScopeError();
  }
}

function revalidateOperationSurfaces(fieldIds: string[]) {
  revalidatePath("/admin/operations-center");
  revalidatePath("/admin/alerts");
  revalidatePath("/admin/fields");
  revalidatePath("/admin/sessions");
  revalidatePath("/today");
  revalidatePath("/admin/weather");
  revalidatePath("/admin/pilot-launch");
  revalidatePath("/display/venue/[venueId]", "page");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");

  for (const fieldId of fieldIds) {
    revalidatePath(`/fields/${fieldId}`);
  }
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
  const ctx = await getSessionContext();
  if (!ctx || !canViewCommandCenter(ctx) || isOrgScoped(ctx)) {
    throw new Error("Forbidden");
  }

  const venueId = String(formData.get("venue_id") ?? "").trim();
  const operationType = readOperationType(String(formData.get("operation_type") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!venueId) return;

  const { affectedFieldIds, scopeMode } = readFieldIds(formData);
  await assertOperationScope(venueId, affectedFieldIds);
  const config = operationConfigs[operationType];
  const endTime = addHours(new Date(), operationType === "normal_operations" || operationType === "all_clear" || operationType === "field_reopened" ? 2 : 8).toISOString();

  if (operationType === "normal_operations" || operationType === "all_clear") {
    await clearActiveOperationsAlerts(venueId);

    if (affectedFieldIds.length > 0) {
      await Promise.all(affectedFieldIds.map((fieldId) => updateFieldStatus(fieldId, "open", ctx.userId)));
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
    await Promise.all(affectedFieldIds.map((fieldId) => updateFieldStatus(fieldId, fieldStatus, ctx.userId)));
  }

  revalidateOperationSurfaces(affectedFieldIds);
}
