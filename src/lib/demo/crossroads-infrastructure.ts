import type { AccessControlledArea, BuildingInfrastructureObject } from "../building-infrastructure.ts";
import { crossroadsVenue } from "./crossroads.ts";

export const crossroadsInfrastructureObjects: BuildingInfrastructureObject[] = [
  infrastructure("infra-electrical-fire-room", "Fire Sprinkler and Electrical Room", "electrical_room", "building", "main-building", "restricted", "Back-of-house infrastructure room. Role awareness only; no live access control integration.", 42, 44),
  infrastructure("infra-fire-sprinkler-room", "Fire Sprinkler Room", "fire_sprinkler_room", "building", "main-building", "restricted", "Life-safety infrastructure location for staff awareness and future partner integration.", 43, 44),
  infrastructure("infra-main-network-room", "Main Network Room", "network_room", "building", "main-building", "staff_only", "Network equipment location. Cisco/Meraki integrations are future partner work, not live.", 44, 45),
  infrastructure("infra-staff-locker-area", "Staff / Locker Area", "staff_room", "building", "main-building", "staff_only", "Venue staff staging and break area.", 41, 47),
  infrastructure("infra-storage-room", "Operations Storage Room", "storage_room", "building", "main-building", "staff_only", "Storage for event supplies, signage, and field operations materials.", 40, 48),
  infrastructure("infra-restroom-south", "South Restroom", "restroom", "poi", "restroom-south", "open", "Family-facing restroom area near south concession corridor.", 72, 79),
  infrastructure("infra-restroom-north", "North Restroom", "restroom", "poi", "restroom-north", "open", "Family-facing restroom area near the north concession corridor.", 68, 28),
  infrastructure("infra-water-main", "Main Concourse Water Station", "water_station", "poi", "main-concourse", "open", "Hydration point for families and teams.", 68, 53),
  infrastructure("infra-first-aid-main", "First Aid Location", "first_aid_location", "building", "main-building", "open", "First aid support location for venue staff routing.", 41, 43),
  infrastructure("infra-access-door-ops", "Authorized Personnel Door", "access_controlled_door", "building", "main-building", "future_integration", "Role awareness only. Badge/keypad integration is future work.", 42, 46),
  infrastructure("infra-main-poster-qr", "Main Gate QR Poster", "poster_qr_location", "poi", "main-gate", "open", "Public QR poster location for venue entry and field lookup.", 38, 39),
  infrastructure("infra-concourse-hallway", "Main Concourse Hallway", "hallway", "poi", "main-concourse", "open", "Primary family circulation spine.", 67, 52),
  infrastructure("infra-concession-counter-south", "South Concession Counter", "concession_counter", "poi", "concession-south", "open", "Concession counter for menu board and promotion workflows.", 71, 79),
  infrastructure("infra-bar-service-area", "Chill Zone Bar / Service Area", "bar_area", "poi", "chill-zone", "staff_only", "Hospitality service location for GM demo and future POS/display integrations.", 43, 46),
];

export const crossroadsAccessControlledAreas: AccessControlledArea[] = [
  accessArea("access-fire-electrical", "Fire Sprinkler and Electrical Room", "infra-electrical-fire-room", "future_integration", ["venue_gm", "venue_admin", "maintenance_manager", "maintenance_staff"], "Role awareness / future integration. No live access control system is connected."),
  accessArea("access-authorized-only", "Authorized Personnel Only Room", "infra-access-door-ops", "keypad", ["venue_admin", "venue_staff", "security_staff"], "Demo keypad awareness only; no door hardware is controlled."),
  accessArea("access-staff-locker", "Staff / Locker Area", "infra-staff-locker-area", "unknown", ["venue_staff", "event_staff", "maintenance_staff"], "Staff-only area shown for operational awareness."),
  accessArea("access-bar-service", "Bar / Service Area", "infra-bar-service-area", "future_integration", ["venue_gm", "venue_admin", "concessions_staff"], "Future POS/service access integration placeholder."),
  accessArea("access-gm-office", "Office / GM Room Placeholder", "main-building-office", "future_integration", ["venue_gm", "executive_viewer"], "Future office/badge integration placeholder for leadership spaces."),
];

export function getCrossroadsInfrastructureContext() {
  return {
    accessAreas: crossroadsAccessControlledAreas,
    futureIntegrationAreas: crossroadsAccessControlledAreas.filter((area) => area.notes.toLowerCase().includes("future")),
    infrastructure: crossroadsInfrastructureObjects,
  };
}

function infrastructure(
  id: string,
  name: string,
  infrastructureType: BuildingInfrastructureObject["infrastructureType"],
  locationType: BuildingInfrastructureObject["locationType"],
  locationId: string,
  status: BuildingInfrastructureObject["status"],
  notes: string,
  mapX?: number,
  mapY?: number,
): BuildingInfrastructureObject {
  return { id, infrastructureType, locationId, locationType, mapX, mapY, name, notes, status, venueId: crossroadsVenue.id };
}

function accessArea(
  id: string,
  name: string,
  locationId: string,
  accessSystem: AccessControlledArea["accessSystem"],
  allowedRoles: string[],
  notes: string,
): AccessControlledArea {
  return {
    accessSystem,
    allowedRoles,
    id,
    locationId,
    name,
    notes,
    status: notes.toLowerCase().includes("future") ? "future_integration" : "role_awareness",
    venueId: crossroadsVenue.id,
  };
}
