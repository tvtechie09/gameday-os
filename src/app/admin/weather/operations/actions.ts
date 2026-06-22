"use server";

import { revalidatePath } from "next/cache";
import { createAlert } from "@/lib/services/alerts";
import { updateFieldStatus } from "@/lib/services/fields";
import type { AlertPriority, AlertType, FieldStatus } from "@/lib/types";

export type WeatherOperationType = "normal" | "rain_delay" | "lightning_delay" | "heat_delay" | "field_closure" | "field_reopened" | "all_clear";

type WeatherOperationConfig = {
  alertType: AlertType;
  fieldStatus: FieldStatus | null;
  message: string;
  priority: AlertPriority;
  title: string;
};

const operationConfigs: Record<WeatherOperationType, WeatherOperationConfig> = {
  all_clear: {
    alertType: "weather",
    fieldStatus: "open",
    message: "All clear. Games may resume.",
    priority: "normal",
    title: "All Clear",
  },
  field_closure: {
    alertType: "field_closure",
    fieldStatus: "closed",
    message: "Field closed. Please check updated schedule.",
    priority: "high",
    title: "Field Closed",
  },
  field_reopened: {
    alertType: "weather",
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
  normal: {
    alertType: "weather",
    fieldStatus: "open",
    message: "Venue normal. Fields are open for scheduled play.",
    priority: "normal",
    title: "Venue Normal",
  },
  rain_delay: {
    alertType: "weather",
    fieldStatus: "delayed",
    message: "Rain delay. Games will resume when fields are playable.",
    priority: "high",
    title: "Rain Delay",
  },
};

function readOperationType(value: string): WeatherOperationType {
  return Object.keys(operationConfigs).includes(value) ? value as WeatherOperationType : "rain_delay";
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function revalidateWeatherOperationSurfaces(fieldIds: string[]) {
  revalidatePath("/admin/weather");
  revalidatePath("/admin/weather/operations");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/game-day");
  revalidatePath("/admin/status-board");
  revalidatePath("/venues/[venueId]", "page");
  revalidatePath("/fields/[fieldId]", "page");

  for (const fieldId of fieldIds) {
    revalidatePath(`/fields/${fieldId}`);
  }
}

export async function createWeatherOperationAction(formData: FormData): Promise<void> {
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const operationType = readOperationType(String(formData.get("operation_type") ?? ""));
  const scopeMode = String(formData.get("scope_mode") ?? "all");
  const selectedFieldIds = formData.getAll("field_ids").map((value) => String(value).trim()).filter(Boolean);
  const allFieldIds = formData.getAll("all_field_ids").map((value) => String(value).trim()).filter(Boolean);
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!venueId) {
    return;
  }

  const config = operationConfigs[operationType];
  const affectedFieldIds = scopeMode === "selected" ? selectedFieldIds : allFieldIds;
  const now = new Date();
  const endTime = addHours(now, operationType === "all_clear" || operationType === "normal" || operationType === "field_reopened" ? 2 : 8);

  if (scopeMode === "selected" && affectedFieldIds.length > 0) {
    await Promise.all(affectedFieldIds.map((fieldId) => createAlert({
      alert_priority: config.priority,
      alert_scope: "field",
      alert_type: config.alertType,
      alert_visibility: "public",
      end_time: endTime.toISOString(),
      field_id: fieldId,
      is_active: true,
      message: message || config.message,
      start_time: now.toISOString(),
      title: title || config.title,
      venue_id: venueId,
    })));
  } else {
    await createAlert({
      alert_priority: config.priority,
      alert_scope: "global",
      alert_type: config.alertType,
      alert_visibility: "public",
      end_time: endTime.toISOString(),
      is_active: true,
      message: message || config.message,
      start_time: now.toISOString(),
      title: title || config.title,
      venue_id: venueId,
    });
  }

  const fieldStatus = config.fieldStatus;

  if (fieldStatus && affectedFieldIds.length > 0) {
    await Promise.all(affectedFieldIds.map((fieldId) => updateFieldStatus(fieldId, fieldStatus)));
  }

  revalidateWeatherOperationSurfaces(affectedFieldIds);
}
