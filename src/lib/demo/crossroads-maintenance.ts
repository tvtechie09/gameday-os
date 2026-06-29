import type { MaintenanceLocationType, MaintenanceRequest } from "../maintenance.ts";
import type { CrossroadsEquipmentEndpoint, CrossroadsHotspot } from "./crossroads.ts";
import { crossroadsAmenities, crossroadsEquipmentEndpoints, crossroadsFields, crossroadsVenue } from "./crossroads.ts";

export const crossroadsMaintenanceRequests: MaintenanceRequest[] = [
  {
    assignedTo: "Venue Ops",
    category: "trash",
    createdAt: "2026-06-29T09:15:00.000Z",
    description: "Trash bins near the Chill Zone / hospitality building are full before the afternoon games.",
    id: "maintenance-crossroads-trash-chill-zone",
    locationId: "chill-zone",
    locationType: "poi",
    priority: "medium",
    reportedByRole: "venue staff",
    status: "assigned",
    title: "Trash overflow near Chill Zone",
    updatedAt: "2026-06-29T09:22:00.000Z",
    venueId: crossroadsVenue.id,
  },
  {
    assignedTo: "Facilities",
    category: "restroom",
    createdAt: "2026-06-29T10:05:00.000Z",
    description: "South restroom area needs paper towels and soap checked before the next wave of games.",
    id: "maintenance-crossroads-restroom-south",
    locationId: "restroom-south",
    locationType: "poi",
    priority: "high",
    reportedByRole: "field marshal",
    status: "new",
    title: "Restroom supply issue",
    updatedAt: "2026-06-29T10:05:00.000Z",
    venueId: crossroadsVenue.id,
  },
  {
    assignedTo: "Grounds Crew",
    category: "field",
    createdAt: "2026-06-29T11:35:00.000Z",
    description: "Infield dirt on 4B is wet near first base after morning rain. Needs inspection before warmups.",
    id: "maintenance-crossroads-field-4b-wet",
    locationId: "surface-4b",
    locationType: "playSurface",
    priority: "urgent",
    reportedByRole: "tournament director",
    status: "in_progress",
    title: "Field 4B wet infield",
    updatedAt: "2026-06-29T11:48:00.000Z",
    venueId: crossroadsVenue.id,
  },
  {
    assignedTo: "Venue Tech",
    category: "scoreboard",
    createdAt: "2026-06-29T12:10:00.000Z",
    description: "Field 6 scoreboard endpoint is offline in the operations view. Manual scoreboard remains available.",
    externalTicketId: "future-integration-demo-only",
    id: "maintenance-crossroads-field-6-scoreboard",
    locationId: "field-6-scoreboard",
    locationType: "equipment",
    priority: "high",
    reportedByRole: "scorekeeper",
    status: "assigned",
    title: "Scoreboard offline on Field 6",
    updatedAt: "2026-06-29T12:16:00.000Z",
    venueId: crossroadsVenue.id,
  },
];

export interface MaintenanceQrEntry {
  id: string;
  label: string;
  locationType: MaintenanceLocationType;
  locationId: string;
  route: string;
}

export const crossroadsMaintenanceQrEntries: MaintenanceQrEntry[] = [
  ...crossroadsFields.map((field) => entry(`maintenance-${field.id}`, `Report issue at ${field.name}`, "field", field.id)),
  ...crossroadsAmenities
    .filter((poi) => ["concession", "hospitality", "playground", "gate", "concourse", "seating"].includes(poi.type))
    .map((poi) => entry(`maintenance-${poi.id}`, `Report issue at ${poi.label}`, "poi", poi.id)),
  entry("maintenance-restroom-south", "Report issue at South Restroom", "poi", "restroom-south"),
  entry("maintenance-restroom-north", "Report issue at North Restroom", "poi", "restroom-north"),
  ...crossroadsEquipmentEndpoints
    .filter((endpoint) => endpoint.type === "scoreboard" || endpoint.type === "speaker" || endpoint.type === "lights")
    .map((endpoint) => entry(`maintenance-${endpoint.id}`, `Report issue with ${getEquipmentLabel(endpoint)}`, "equipment", endpoint.id)),
];

export function getCrossroadsMaintenanceLocationLabel(locationType: MaintenanceLocationType, locationId: string) {
  if (locationType === "venue" && locationId === crossroadsVenue.id) {
    return crossroadsVenue.name;
  }

  const field = crossroadsFields.find((item) => item.id === locationId);
  if (field) {
    return field.name;
  }

  const poi = crossroadsAmenities.find((item: CrossroadsHotspot) => item.id === locationId);
  if (poi) {
    return poi.label;
  }

  if (locationId === "restroom-south") {
    return "South Restroom";
  }

  if (locationId === "restroom-north") {
    return "North Restroom";
  }

  const endpoint = crossroadsEquipmentEndpoints.find((item) => item.id === locationId);
  if (endpoint) {
    return getEquipmentLabel(endpoint);
  }

  return locationId;
}

export function getCrossroadsMaintenanceLocationLabels() {
  const labels: Record<string, string> = {
    [crossroadsVenue.id]: crossroadsVenue.name,
    "restroom-north": "North Restroom",
    "restroom-south": "South Restroom",
  };

  for (const field of crossroadsFields) {
    labels[field.id] = field.name;
  }

  for (const poi of crossroadsAmenities) {
    labels[poi.id] = poi.label;
  }

  for (const endpoint of crossroadsEquipmentEndpoints) {
    labels[endpoint.id] = getEquipmentLabel(endpoint);
  }

  return labels;
}

function entry(id: string, label: string, locationType: MaintenanceLocationType, locationId: string): MaintenanceQrEntry {
  const params = new URLSearchParams({ locationId, locationType });

  return {
    id,
    label,
    locationId,
    locationType,
    route: `/venue/crossroads/maintenance/new?${params.toString()}`,
  };
}

function getEquipmentLabel(endpoint: CrossroadsEquipmentEndpoint) {
  return `${endpoint.fieldId.replace("field-", "Field ")} ${endpoint.label}`;
}
