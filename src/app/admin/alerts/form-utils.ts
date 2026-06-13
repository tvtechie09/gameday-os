import type { AlertPriority, AlertScope, AlertType, AlertVisibility } from "@/lib/types";

const validAlertTypes: AlertType[] = ["info", "weather", "delay", "emergency", "parking", "concession", "field_closure"];
const validAlertScopes: AlertScope[] = ["venue", "field", "tournament", "global"];
const validAlertPriorities: AlertPriority[] = ["low", "normal", "high", "urgent"];
const validAlertVisibilities: AlertVisibility[] = ["public", "admin_only"];

export function readAlertFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const alertType = String(formData.get("alert_type") ?? "info").trim();
  const alertScope = String(formData.get("alert_scope") ?? "venue").trim();
  const alertPriority = String(formData.get("alert_priority") ?? "normal").trim();
  const alertVisibility = String(formData.get("alert_visibility") ?? "public").trim();
  const venueId = String(formData.get("venue_id") ?? "").trim();
  const tournamentId = String(formData.get("tournament_id") ?? "").trim();
  const fieldId = String(formData.get("field_id") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!title || !message || !venueId || !startTime || !endTime) {
    return { error: "Title, message, venue, start time, and end time are required." };
  }

  if (!validAlertTypes.includes(alertType as AlertType)) {
    return { error: "Choose a valid alert type." };
  }

  if (!validAlertScopes.includes(alertScope as AlertScope)) {
    return { error: "Choose a valid alert scope." };
  }

  if (!validAlertPriorities.includes(alertPriority as AlertPriority)) {
    return { error: "Choose a valid alert priority." };
  }

  if (!validAlertVisibilities.includes(alertVisibility as AlertVisibility)) {
    return { error: "Choose a valid alert visibility." };
  }

  return {
    data: {
      title,
      message,
      alert_type: alertType as AlertType,
      alert_scope: alertScope as AlertScope,
      alert_priority: alertPriority as AlertPriority,
      alert_visibility: alertVisibility as AlertVisibility,
      venue_id: venueId,
      tournament_id: tournamentId || null,
      field_id: fieldId || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_active: isActive,
    },
  };
}
