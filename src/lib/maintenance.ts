export type MaintenanceLocationType = "venue" | "zone" | "field" | "playSurface" | "poi" | "equipment";
export type MaintenanceCategory = "field" | "restroom" | "trash" | "scoreboard" | "audio" | "lighting" | "safety" | "concessions" | "parking" | "general";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "new" | "assigned" | "in_progress" | "resolved" | "closed";

export interface MaintenanceRequest {
  id: string;
  venueId: string;
  locationType: MaintenanceLocationType;
  locationId: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  title: string;
  description: string;
  reportedByRole: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  photoUrl?: string | null;
  externalTicketId?: string | null;
}

export interface MaintenanceRequestDraft {
  venueId: string;
  locationType: MaintenanceLocationType;
  locationId: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  title: string;
  description: string;
  reportedByRole: string;
  assignedTo?: string;
  photoUrl?: string | null;
}

export interface ExternalMaintenanceTicketResult {
  externalTicketId: string;
  providerStatus: "future_integration";
  message: string;
}

export const maintenanceStatuses: MaintenanceStatus[] = ["new", "assigned", "in_progress", "resolved", "closed"];
export const maintenancePriorities: MaintenancePriority[] = ["low", "medium", "high", "urgent"];
export const maintenanceCategories: MaintenanceCategory[] = ["field", "restroom", "trash", "scoreboard", "audio", "lighting", "safety", "concessions", "parking", "general"];
export const maintenanceLocationTypes: MaintenanceLocationType[] = ["venue", "zone", "field", "playSurface", "poi", "equipment"];

export function createMaintenanceRequest(draft: MaintenanceRequestDraft, now = new Date()): MaintenanceRequest {
  const timestamp = now.toISOString();

  return {
    assignedTo: draft.assignedTo ?? "Unassigned",
    category: draft.category,
    createdAt: timestamp,
    description: draft.description,
    id: `maintenance-${timestamp.replace(/\D/g, "").slice(0, 14)}-${draft.locationId}`,
    locationId: draft.locationId,
    locationType: draft.locationType,
    photoUrl: draft.photoUrl ?? null,
    priority: draft.priority,
    reportedByRole: draft.reportedByRole,
    status: "new",
    title: draft.title,
    updatedAt: timestamp,
    venueId: draft.venueId,
  };
}

export function updateMaintenanceStatus(request: MaintenanceRequest, status: MaintenanceStatus, now = new Date()): MaintenanceRequest {
  return {
    ...request,
    status,
    updatedAt: now.toISOString(),
  };
}

export async function createExternalTicket(_request: MaintenanceRequest): Promise<ExternalMaintenanceTicketResult> {
  return {
    externalTicketId: "future-cmms-ticket",
    message: "Future integration placeholder. No external ticketing or CMMS platform is connected.",
    providerStatus: "future_integration",
  };
}

export async function syncExternalTicketStatus(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  return {
    ...request,
    updatedAt: new Date().toISOString(),
  };
}

export async function closeExternalTicket(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  return updateMaintenanceStatus(request, "closed");
}
