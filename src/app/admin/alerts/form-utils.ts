import type { AlertType } from "@/lib/types";

const validAlertTypes: AlertType[] = ["info", "weather", "delay", "emergency", "parking", "concession", "field_closure"];

export function readAlertFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const alertType = String(formData.get("alert_type") ?? "info").trim();
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

  return {
    data: {
      title,
      message,
      alert_type: alertType as AlertType,
      venue_id: venueId,
      tournament_id: tournamentId || null,
      field_id: fieldId || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      is_active: isActive,
    },
  };
}
