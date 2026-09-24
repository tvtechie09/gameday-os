export const PHASE_ONE_VENUE_SERVICE_REQUEST_TYPES = [
  "TRAINER_ASSISTANCE",
  "MAINTENANCE_FIELD_ISSUE",
] as const;

export const PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES = [
  "SECURITY_ASSISTANCE",
  "TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE",
  "OFFICIALS_ASSISTANCE",
  "TECHNOLOGY_AV_SUPPORT",
  "CUSTODIAL_FACILITY_SERVICE",
  "GAME_OPERATIONS_ASSISTANCE",
] as const;

export const VENUE_SERVICE_REQUEST_TYPES = [
  ...PHASE_ONE_VENUE_SERVICE_REQUEST_TYPES,
  ...PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES,
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
export const VENUE_SERVICE_REQUEST_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
export const VENUE_SERVICE_OPERATIONAL_IMPACTS = ["GAME_CANNOT_START_CONTINUE"] as const;

export type VenueServiceRequestType = (typeof VENUE_SERVICE_REQUEST_TYPES)[number];
export type VenueServiceRequestStatus = (typeof VENUE_SERVICE_REQUEST_STATUSES)[number];
export type MaintenanceSeverity = (typeof MAINTENANCE_SEVERITIES)[number];
export type VenueServiceRequestPriority = (typeof VENUE_SERVICE_REQUEST_PRIORITIES)[number];
export type VenueServiceOperationalImpact = (typeof VENUE_SERVICE_OPERATIONAL_IMPACTS)[number];

const enRouteTypes = new Set<VenueServiceRequestType>([
  "TRAINER_ASSISTANCE",
  "SECURITY_ASSISTANCE",
  "TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE",
  "OFFICIALS_ASSISTANCE",
  "GAME_OPERATIONS_ASSISTANCE",
]);

const assignedTypes = new Set<VenueServiceRequestType>([
  "MAINTENANCE_FIELD_ISSUE",
  "TECHNOLOGY_AV_SUPPORT",
  "CUSTODIAL_FACILITY_SERVICE",
]);

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

export function isVenueServiceOperationalImpact(value: string): value is VenueServiceOperationalImpact {
  return (VENUE_SERVICE_OPERATIONAL_IMPACTS as readonly string[]).includes(value);
}

export function canTransitionVenueServiceRequest(
  requestType: VenueServiceRequestType,
  from: VenueServiceRequestStatus,
  to: VenueServiceRequestStatus,
): boolean {
  if (!transitions[from].includes(to)) return false;
  if (to === "EN_ROUTE") return enRouteTypes.has(requestType);
  if (to === "ASSIGNED") return assignedTypes.has(requestType);
  return true;
}

export function maintenanceSeverityToWorkOrderPriority(severity: MaintenanceSeverity): "urgent" | "high" | "normal" | "low" {
  if (severity === "SAFETY") return "urgent";
  if (severity === "GAME_BLOCKING") return "high";
  if (severity === "NEEDS_ATTENTION") return "normal";
  return "low";
}

export function deriveVenueServiceRequestPriority(input: {
  operationalImpact?: VenueServiceOperationalImpact | null;
  severity?: MaintenanceSeverity | null;
}): VenueServiceRequestPriority {
  if (input.operationalImpact === "GAME_CANNOT_START_CONTINUE" || input.severity === "SAFETY") return "URGENT";
  if (input.severity === "GAME_BLOCKING") return "HIGH";
  if (input.severity === "ROUTINE") return "LOW";
  return "NORMAL";
}

export function venueServiceRequestTypeLabel(type: VenueServiceRequestType): string {
  const labels: Record<VenueServiceRequestType, string> = {
    TRAINER_ASSISTANCE: "Trainer assistance",
    MAINTENANCE_FIELD_ISSUE: "Maintenance / field issue",
    SECURITY_ASSISTANCE: "Security assistance",
    TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE: "Tournament / venue director assistance",
    OFFICIALS_ASSISTANCE: "Officials assistance",
    TECHNOLOGY_AV_SUPPORT: "Technology / AV support",
    CUSTODIAL_FACILITY_SERVICE: "Custodial / facility service",
    GAME_OPERATIONS_ASSISTANCE: "Game operations assistance",
  };
  return labels[type];
}

export function venueServiceRequestStatusLabel(status: VenueServiceRequestStatus): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export const TRAINER_DISPATCH_NOTICE =
  "This alerts venue staff to send assistance. It is not medical diagnosis or treatment. For an emergency, call 911.";
