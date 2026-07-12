export type BuildingInfrastructureType =
  | "electrical_room"
  | "fire_sprinkler_room"
  | "network_room"
  | "staff_room"
  | "storage_room"
  | "restroom"
  | "water_station"
  | "first_aid_location"
  | "access_controlled_door"
  | "poster_qr_location"
  | "hallway"
  | "concession_counter"
  | "bar_area";

export type InfrastructureStatus = "open" | "staff_only" | "restricted" | "future_integration";
export type AccessSystem = "unknown" | "keypad" | "badge" | "future_integration";
export type AccessAreaStatus = "role_awareness" | "restricted" | "future_integration";

export interface BuildingInfrastructureObject {
  id: string;
  venueId: string;
  name: string;
  infrastructureType: BuildingInfrastructureType;
  locationType: "venue" | "building" | "poi" | "field" | "hallway" | "room";
  locationId: string;
  status: InfrastructureStatus;
  notes: string;
  mapX?: number | null;
  mapY?: number | null;
}

export interface AccessControlledArea {
  id: string;
  venueId: string;
  name: string;
  locationId: string;
  accessSystem: AccessSystem;
  allowedRoles: string[];
  notes: string;
  status: AccessAreaStatus;
}

export function getFutureIntegrationAccessAreas(areas: AccessControlledArea[]) {
  return areas.filter((area) => area.accessSystem === "future_integration" || area.status === "future_integration");
}
