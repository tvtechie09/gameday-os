import type {
  AlertPriority,
  AlertType,
  FieldStatus,
  SessionLifecycleStatus,
  SessionStatus,
} from "@/lib/types";

export type UiStatusTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StatusPresentation = { label: string; tone: UiStatusTone };
export type AlertLevel = "informational" | "important" | "urgent";

export function gameStatusPresentation(status: SessionStatus, lifecycleStatus: SessionLifecycleStatus): StatusPresentation {
  if (lifecycleStatus === "cancelled") return { label: "CANCELLED", tone: "danger" };
  if (lifecycleStatus === "delayed" || lifecycleStatus === "suspended" || lifecycleStatus === "postponed") return { label: "DELAYED", tone: "warning" };
  if (status === "final" || lifecycleStatus === "final" || lifecycleStatus === "archived") return { label: "FINAL", tone: "neutral" };
  if (status === "active" || lifecycleStatus === "live") return { label: "IN PROGRESS", tone: "success" };
  if (["check_in", "warmup", "ready"].includes(lifecycleStatus)) return { label: "STARTING SOON", tone: "info" };
  if (lifecycleStatus === "draft") return { label: "DRAFT", tone: "neutral" };
  return { label: "ON TIME", tone: "info" };
}

export function fieldStatusPresentation(status: FieldStatus): StatusPresentation {
  if (status === "closed" || status === "maintenance") return { label: "FIELD CLOSED", tone: "danger" };
  if (status === "delayed") return { label: "DELAYED", tone: "warning" };
  if (status === "active") return { label: "IN USE", tone: "success" };
  return { label: "FIELD OPEN", tone: "success" };
}

export function alertLevelFor(priority: AlertPriority, alertType: AlertType): AlertLevel {
  if (priority === "urgent" || alertType === "emergency" || alertType === "field_closure") return "urgent";
  if (priority === "high" || alertType === "delay" || alertType === "weather") return "important";
  return "informational";
}

export function alertLevelPresentation(level: AlertLevel): StatusPresentation {
  if (level === "urgent") return { label: "URGENT", tone: "danger" };
  if (level === "important") return { label: "IMPORTANT", tone: "warning" };
  return { label: "INFORMATIONAL", tone: "info" };
}

export function alertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    concession: "Concessions",
    delay: "Schedule delay",
    emergency: "Emergency",
    field_closure: "Field closure",
    info: "General update",
    parking: "Parking",
    weather: "Weather",
  };
  return labels[type];
}
