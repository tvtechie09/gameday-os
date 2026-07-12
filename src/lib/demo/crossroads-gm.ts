import type { VenueAsset } from "../assets.ts";
import type { FutureVisionItem } from "./presentation.ts";
import { crossroadsFields, crossroadsGames, crossroadsVenue } from "./crossroads.ts";
import { crossroadsDisplayRevenueCards } from "./crossroads-digital-experience.ts";
import { crossroadsMaintenanceRequests } from "./crossroads-maintenance.ts";

export interface ExecutiveKpi {
  label: string;
  value: string;
  note: string;
}

export interface RevenueOpportunity {
  id: string;
  title: string;
  description: string;
  status: "future opportunity" | "demo placeholder";
  value: string;
}

export interface UtilizationMetric {
  label: string;
  value: string;
  note: string;
}

export const crossroadsExecutiveKpis: ExecutiveKpi[] = [
  { label: "Weekend games hosted", note: "Friday-Sunday demo tournament window", value: "126" },
  { label: "Estimated guests", note: "Demo estimate using teams, families, and staff", value: "8,400" },
  { label: "Fields utilized", note: "Fields 1-9 plus split play surfaces", value: "9 / 9" },
  { label: "On-time start percentage", note: "Demo operations KPI", value: "87%" },
  { label: "Average delay", note: "Across delayed games", value: "14 min" },
  { label: "Weather delay minutes", note: "Simulated weather hold", value: "75" },
  { label: "Maintenance opened/resolved/pending", note: "GameDay Venue demo requests", value: "4 / 1 / 3" },
  { label: "Equipment issues", note: "Asset register demo items", value: "3" },
  { label: "Safety/incidents", note: "Placeholder, no incidents recorded", value: "0" },
  { label: "Upcoming events", note: "Next 14 days demo calendar", value: "5" },
  { label: "Revenue opportunities", note: "Future/potential, not booked revenue", value: "7" },
];

export const crossroadsAssets: VenueAsset[] = [
  asset("asset-field-6-scoreboard", "field", "field-6", "scoreboard", "Field 6 Scoreboard", "Daktronics Placeholder", "Baseball Display Concept", "offline", "high", "Manual scoreboard remains available in GameDay OS."),
  asset("asset-field-6-speaker", "field", "field-6", "speaker", "Field 6 Horn Speaker", "Community Audio", "Horn-PA Demo", "degraded", "medium", "Future PA/audio integration target only."),
  asset("asset-field-6-camera", "field", "field-6", "camera_security", "Field 6 Security Camera", "Axis Placeholder", "Awareness Only", "online", "high", "Security camera awareness only; no live streaming feed is exposed."),
  asset("asset-field-4-lighting", "field", "field-4", "lighting", "Field 4 Lighting", "Musco Placeholder", "LED Field Bank", "maintenance_due", "high", "Lighting inspection due before championship evening slot."),
  asset("asset-main-network", "equipmentRoom", "main-building-network-room", "network", "Main Building Network Equipment", "Cisco Placeholder", "Venue Network Core", "online", "high", "Future network/provider integrations are not connected."),
  asset("asset-concession-equipment", "poi", "concession-south", "concession_equipment", "South Concession Equipment", "Venue Equipment", "POS/Cold Storage", "online", "medium", "Tracks concession-readiness opportunity for high-traffic windows."),
  asset("asset-restroom-fixtures", "poi", "restroom-south", "restroom_fixture", "South Restroom Fixtures", "Facility Standard", "Restroom Fixture Group", "maintenance_due", "medium", "Related to restroom supply and facilities checklist."),
  asset("asset-main-aed", "building", "main-building", "AED", "AED near Main Building", "Zoll Placeholder", "AED Plus", "online", "life_safety", "Life-safety asset shown for executive readiness."),
  asset("asset-batting-netting", "poi", "batting-cages-east", "netting", "Batting Cage Netting", "Sports Netting Co.", "Cage Net System", "degraded", "medium", "Inspect before next tournament weekend."),
  asset("asset-digital-signage", "venue", "crossroads", "signage", "Digital / Physical Signage", "GameDay OS Placeholder", "Venue Signage Network", "unknown", "medium", "Future digital signage and sponsor placement opportunity."),
];

export const crossroadsUtilizationMetrics: UtilizationMetric[] = [
  { label: "Peak arrival window", note: "Parking and gate staffing planning", value: "10:30 AM - 12:15 PM" },
  { label: "Most active POIs", note: "Concession South, Main Gate, Playground / Family Area", value: "3" },
  { label: "Tournament weekend usage", note: "Compared with weekday training usage", value: "4.2x weekday" },
  { label: "Championship field utilization", note: "Premium final/presentation slots", value: "78%" },
];

export const crossroadsFieldUtilization = crossroadsFields.map((field) => {
  const games = crossroadsGames.filter((game) => game.fieldId === field.id);
  return {
    fieldId: field.id,
    fieldName: field.name,
    games: games.length,
    utilization: field.number === 6 ? 92 : field.number === 4 ? 76 : 68 + field.number,
  };
});

export const crossroadsRevenueOpportunities: RevenueOpportunity[] = [
  opportunity("digital-sponsorship-zones", "Digital sponsorship zones", "Sponsor placements on public venue, field, display, and scoreboard surfaces.", "$18K-$35K seasonal inventory"),
  opportunity("field-sponsorship", "Field sponsorship / naming", "Field and play-surface sponsorship packages for tournament weekends.", "$5K-$15K per field package"),
  opportunity("concessions-insights", "Concessions traffic insights", "Use POI activity and schedule peaks to optimize staffing and offers.", "Higher throughput during peak windows"),
  opportunity("premium-packages", "Tournament premium packages", "Director hospitality, championship presentation, and family concierge packages.", "Premium tournament differentiation"),
  opportunity("batting-cage-reservations", "Batting cage reservation opportunity", "Future reservation layer for teams and pre-game warmups.", "New bookable venue inventory"),
  opportunity("digital-signage", "Digital signage future opportunity", "Venue-wide signage inventory for alerts, sponsors, schedules, and wayfinding.", "Sponsor and operations surface"),
  opportunity("family-app-sponsorship", "Family app sponsorship placements", "Future family app cards for local sponsors and tournament partners.", "Direct family engagement"),
  ...crossroadsDisplayRevenueCards.map((card) => ({
    description: card.description,
    id: card.id,
    status: card.status,
    title: card.title,
    value: card.value,
  })),
];

export const crossroadsGmPermissions = [
  { role: "venue_gm", scope: "venue:crossroads", visible: true, note: "Executive venue overview, assets, maintenance, utilization, and revenue opportunity views." },
  { role: "venue_admin", scope: "venue:crossroads", visible: true, note: "Venue operations and configuration access." },
  { role: "maintenance_manager", scope: "venue:crossroads", visible: true, note: "Maintenance request and asset-health responsibility." },
  { role: "maintenance_staff", scope: "venue:crossroads", visible: true, note: "Assigned maintenance request execution." },
  { role: "asset_manager", scope: "venue:crossroads", visible: true, note: "Asset register upkeep and inspection workflow." },
  { role: "executive_viewer", scope: "venue:crossroads", visible: true, note: "Read-only GM/Village leadership reporting view." },
  { role: "parent", scope: "family:demo-family", visible: false, note: "Parent/family users should not see the Operations Center executive summary." },
];

export const crossroadsGmFutureItems: FutureVisionItem[] = [
  future("External CMMS integration", "Sync GameDay Venue maintenance requests with an approved CMMS or work-order platform.", "venue operations", "future integration", true),
  future("Municipal asset management integration", "Connect facility assets to Village or municipal asset systems where approved.", "integrations", "partner opportunity", true),
  future("Work order sync", "Push request status and closeout notes between GameDay OS and external systems.", "venue operations", "future integration", true),
  future("Capital planning", "Use maintenance history and asset age to inform long-term capital planning.", "intelligence", "roadmap", false),
  future("Sponsorship management", "Package, track, and report venue sponsorship inventory across public pages and displays.", "revenue", "roadmap", false),
  future("Facility rental / reservation tools", "Expose rentable inventory such as batting cages, fields, hospitality spaces, and premium areas.", "revenue", "roadmap", false),
];

export function getAssetRelatedMaintenance(asset: VenueAsset) {
  const endpointLikeId = asset.id.replace("asset-", "");
  return crossroadsMaintenanceRequests.filter((request) => request.locationId === asset.id || request.locationId === endpointLikeId || request.locationId === asset.locationId);
}

function asset(
  id: string,
  locationType: VenueAsset["locationType"],
  locationId: string,
  assetType: VenueAsset["assetType"],
  name: string,
  manufacturer: string,
  model: string,
  status: VenueAsset["status"],
  criticality: VenueAsset["criticality"],
  notes: string,
): VenueAsset {
  return {
    assetType,
    criticality,
    documentUrl: null,
    externalAssetId: id.replace("asset-", "future-asset-"),
    id,
    installDate: "2024-04-01",
    lastMaintenanceDate: "2026-05-15",
    locationId,
    locationType,
    manufacturer,
    model,
    name,
    nextMaintenanceDue: status === "maintenance_due" ? "2026-07-15" : "2026-09-01",
    notes,
    photoUrl: null,
    serialNumber: null,
    status,
    venueId: crossroadsVenue.id,
    warrantyEnd: "2029-04-01",
  };
}

function opportunity(id: string, title: string, description: string, value: string): RevenueOpportunity {
  return { description, id, status: "future opportunity", title, value };
}

function future(
  title: string,
  description: string,
  category: FutureVisionItem["category"],
  status: FutureVisionItem["status"],
  requiresPartnerApproval: boolean,
): FutureVisionItem {
  return {
    category,
    description,
    requiresPartnerApproval,
    status,
    title,
    valueToFamiliesTournaments: "Creates clearer, faster, or more premium game-day experiences when implemented.",
    valueToVenue: "Extends GameDay OS from demo foundation into a measurable venue operating layer.",
  };
}
