export const VENUE_SERVICE_REQUEST_TYPES = [
  "TRAINER_ASSISTANCE",
  "MAINTENANCE_FIELD_ISSUE",
  "SECURITY",
  "TOURNAMENT_DIRECTOR",
  "VENUE_STAFF",
  "EMT",
  "CUSTODIAL",
  "IT_AV",
] as const;

export const VENUE_SERVICE_REQUEST_STATUSES = [
  "REQUESTED",
  "ACKNOWLEDGED",
  "EN_ROUTE",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
] as const;

export const MAINTENANCE_SEVERITIES = ["SAFETY", "GAME_BLOCKING", "NEEDS_ATTENTION", "ROUTINE"] as const;

export type VenueServiceRequestType = (typeof VENUE_SERVICE_REQUEST_TYPES)[number];
export type VenueServiceRequestStatus = (typeof VENUE_SERVICE_REQUEST_STATUSES)[number];
export type MaintenanceSeverity = (typeof MAINTENANCE_SEVERITIES)[number];

const transitions: Record<VenueServiceRequestStatus, readonly VenueServiceRequestStatus[]> = {
  REQUESTED: ["ACKNOWLEDGED", "ASSIGNED", "RESOLVED"],
  ACKNOWLEDGED: ["EN_ROUTE", "ASSIGNED", "IN_PROGRESS", "RESOLVED"],
  EN_ROUTE: ["IN_PROGRESS", "RESOLVED"],
  ASSIGNED: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
};

export function isVenueServiceRequestType(value: string): value is VenueServiceRequestType {
  return (VENUE_SERVICE_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isVenueServiceRequestStatus(value: string): value is VenueServiceRequestStatus {
  return (VENUE_SERVICE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isMaintenanceSeverity(value: string): value is MaintenanceSeverity {
  return (MAINTENANCE_SEVERITIES as readonly string[]).includes(value);
}

export function canTransitionVenueServiceRequest(
  requestType: VenueServiceRequestType,
  from: VenueServiceRequestStatus,
  to: VenueServiceRequestStatus,
): boolean {
  if (!transitions[from].includes(to)) return false;
  if (to === "EN_ROUTE") return requestType === "TRAINER_ASSISTANCE" || requestType === "EMT";
  if (to === "ASSIGNED") return requestType !== "TRAINER_ASSISTANCE" && requestType !== "EMT";
  return true;
}

export function maintenanceSeverityToWorkOrderPriority(severity: MaintenanceSeverity): "urgent" | "high" | "normal" | "low" {
  if (severity === "SAFETY") return "urgent";
  if (severity === "GAME_BLOCKING") return "high";
  if (severity === "NEEDS_ATTENTION") return "normal";
  return "low";
}

export function venueServiceRequestTypeLabel(type: VenueServiceRequestType): string {
  const labels: Record<VenueServiceRequestType, string> = {
    TRAINER_ASSISTANCE: "Trainer assistance",
    MAINTENANCE_FIELD_ISSUE: "Maintenance / field issue",
    SECURITY: "Security",
    TOURNAMENT_DIRECTOR: "Tournament director",
    VENUE_STAFF: "Venue staff",
    EMT: "EMT",
    CUSTODIAL: "Custodial",
    IT_AV: "IT / AV",
  };
  return labels[type];
}

export function venueServiceRequestStatusLabel(status: VenueServiceRequestStatus): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export const TRAINER_DISPATCH_NOTICE =
  "This alerts venue staff to send assistance. It is not medical diagnosis or treatment. For an emergency, call 911.";
