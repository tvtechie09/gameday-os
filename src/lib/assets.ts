import type { MaintenanceRequestDraft } from "./maintenance.ts";

export type AssetLocationType = "venue" | "zone" | "field" | "playSurface" | "poi" | "building" | "equipmentRoom";
export type AssetType =
  | "scoreboard"
  | "speaker"
  | "camera_security"
  | "network"
  | "lighting"
  | "gate"
  | "netting"
  | "bleachers"
  | "restroom_fixture"
  | "concession_equipment"
  | "irrigation"
  | "field_equipment"
  | "AED"
  | "signage"
  | "general";
export type AssetStatus = "online" | "offline" | "degraded" | "maintenance_due" | "unknown";
export type AssetCriticality = "low" | "medium" | "high" | "life_safety";

export interface VenueAsset {
  id: string;
  venueId: string;
  locationType: AssetLocationType;
  locationId: string;
  assetType: AssetType;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber?: string | null;
  installDate?: string | null;
  warrantyEnd?: string | null;
  status: AssetStatus;
  criticality: AssetCriticality;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDue?: string | null;
  notes: string;
  photoUrl?: string | null;
  documentUrl?: string | null;
  externalAssetId?: string | null;
}

export const assetTypes: AssetType[] = [
  "scoreboard",
  "speaker",
  "camera_security",
  "network",
  "lighting",
  "gate",
  "netting",
  "bleachers",
  "restroom_fixture",
  "concession_equipment",
  "irrigation",
  "field_equipment",
  "AED",
  "signage",
  "general",
];

export const assetStatuses: AssetStatus[] = ["online", "offline", "degraded", "maintenance_due", "unknown"];
export const assetCriticalities: AssetCriticality[] = ["low", "medium", "high", "life_safety"];

export function createMaintenanceDraftFromAsset(asset: VenueAsset): MaintenanceRequestDraft {
  return {
    assignedTo: asset.criticality === "life_safety" ? "Venue Safety Lead" : "Venue Ops",
    category: asset.assetType === "scoreboard"
      ? "scoreboard"
      : asset.assetType === "speaker"
        ? "audio"
        : asset.assetType === "lighting"
          ? "lighting"
          : asset.assetType === "concession_equipment"
            ? "concessions"
            : asset.criticality === "life_safety"
              ? "safety"
              : "general",
    description: `Inspect ${asset.name}. Current asset status: ${asset.status}. ${asset.notes}`,
    locationId: asset.id,
    locationType: "equipment",
    priority: asset.criticality === "life_safety" || asset.status === "offline" ? "urgent" : asset.status === "degraded" ? "high" : "medium",
    reportedByRole: "venue staff",
    title: `Maintenance request for ${asset.name}`,
    venueId: asset.venueId,
  };
}

export function filterAssets(
  assets: VenueAsset[],
  filters: {
    assetType?: AssetType | "all";
    criticality?: AssetCriticality | "all";
    locationType?: AssetLocationType | "all";
    status?: AssetStatus | "all";
  },
) {
  return assets.filter((asset) => {
    const typeMatch = !filters.assetType || filters.assetType === "all" || asset.assetType === filters.assetType;
    const criticalityMatch = !filters.criticality || filters.criticality === "all" || asset.criticality === filters.criticality;
    const locationMatch = !filters.locationType || filters.locationType === "all" || asset.locationType === filters.locationType;
    const statusMatch = !filters.status || filters.status === "all" || asset.status === filters.status;

    return typeMatch && criticalityMatch && locationMatch && statusMatch;
  });
}
