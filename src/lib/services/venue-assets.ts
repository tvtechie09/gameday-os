import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { VenueAsset, VenueAssetCategory, VenueAssetIntegrationStatus, VenueAssetStatus, VenueAssetType, VenueBuilding } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";

type DynamicSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null }>;
      eq: (column: string, value: string) => {
        order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null }>;
      };
    };
  };
};

type DynamicAdminSupabase = {
  from: (table: string) => {
    insert: (input: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
      };
    };
  };
};

export const venueAssetCategories: VenueAssetCategory[] = ["scoreboards", "displays", "audio", "video", "networking", "lighting", "infrastructure", "miscellaneous"];
export const venueAssetTypes: VenueAssetType[] = ["scoreboard", "display", "tv", "speaker", "audio_zone", "camera", "network_equipment", "lighting", "parking_sign", "wifi", "emergency_device", "other"];
export const venueAssetStatuses: VenueAssetStatus[] = ["healthy", "offline", "maintenance_needed", "unknown"];
export const venueAssetIntegrationStatuses: VenueAssetIntegrationStatus[] = ["not_configured", "configured", "connected", "testing"];

const assetSelect = "id,organization_id,venue_id,building_id,field_id,asset_name,asset_type,asset_category,manufacturer,model,serial_number,ip_address,physical_location,map_x,map_y,status,integration_status,notes,installation_date,warranty_end,photos,manuals,created_at,updated_at";
const buildingSelect = "id,organization_id,venue_id,name,description,map_x,map_y,created_at,updated_at";

function isMissingVenueAssetsError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205"
    || error?.message?.includes("venue_assets") === true
    || error?.message?.includes("venue_buildings") === true
    || error?.message?.includes("schema cache") === true;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readCategory(value: unknown): VenueAssetCategory {
  return venueAssetCategories.find((category) => category === value) ?? "miscellaneous";
}

function readType(value: unknown): VenueAssetType {
  return venueAssetTypes.find((type) => type === value) ?? "other";
}

function readStatus(value: unknown): VenueAssetStatus {
  return venueAssetStatuses.find((status) => status === value) ?? "unknown";
}

function readIntegrationStatus(value: unknown): VenueAssetIntegrationStatus {
  return venueAssetIntegrationStatuses.find((status) => status === value) ?? "not_configured";
}

function mapBuilding(row: Record<string, unknown>): VenueBuilding {
  return {
    createdAt: text(row.created_at) ?? "",
    description: text(row.description),
    id: text(row.id) ?? "",
    mapX: numberValue(row.map_x),
    mapY: numberValue(row.map_y),
    name: text(row.name) ?? "Building",
    organizationId: text(row.organization_id),
    updatedAt: text(row.updated_at) ?? "",
    venueId: text(row.venue_id) ?? "",
  };
}

function mapAsset(row: Record<string, unknown>): VenueAsset {
  return {
    assetCategory: readCategory(row.asset_category),
    assetName: text(row.asset_name) ?? "Asset",
    assetType: readType(row.asset_type),
    buildingId: text(row.building_id),
    createdAt: text(row.created_at) ?? "",
    fieldId: text(row.field_id),
    id: text(row.id) ?? "",
    installationDate: text(row.installation_date),
    integrationStatus: readIntegrationStatus(row.integration_status),
    ipAddress: text(row.ip_address),
    manuals: stringArray(row.manuals),
    manufacturer: text(row.manufacturer),
    mapX: numberValue(row.map_x),
    mapY: numberValue(row.map_y),
    model: text(row.model),
    notes: text(row.notes),
    organizationId: text(row.organization_id),
    physicalLocation: text(row.physical_location),
    photos: stringArray(row.photos),
    serialNumber: text(row.serial_number),
    status: readStatus(row.status),
    updatedAt: text(row.updated_at) ?? "",
    venueId: text(row.venue_id) ?? "",
    warrantyEnd: text(row.warranty_end),
  };
}

export function getVenueAssetStatusLabel(status: VenueAssetStatus) {
  const labels: Record<VenueAssetStatus, string> = {
    healthy: "Healthy",
    maintenance_needed: "Maintenance Needed",
    offline: "Offline",
    unknown: "Unknown",
  };

  return labels[status];
}

export function getVenueAssetTypeLabel(type: VenueAssetType) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getVenueAssetCategoryLabel(category: VenueAssetCategory) {
  return category.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getVenueAssetStatusClass(status: VenueAssetStatus) {
  if (status === "healthy") return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  if (status === "offline") return "bg-red-100 text-red-900";
  if (status === "maintenance_needed") return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export async function getVenueBuildings(): Promise<VenueBuilding[]> {
  const supabase = getSupabaseServerClient() as unknown as DynamicSupabase;
  const organizationId = await getCurrentOrganizationScope();
  const base = supabase.from("venue_buildings").select(buildingSelect);
  const { data, error } = organizationId
    ? await base.eq("organization_id", organizationId).order("name", { ascending: true })
    : await base.order("name", { ascending: true });

  if (error) {
    if (isMissingVenueAssetsError(error)) {
      console.error("venue_buildings table is unavailable; returning no buildings.", error);
      return [];
    }
    throw new Error(error.message ?? "Unable to load venue buildings.");
  }

  return (data ?? []).map(mapBuilding);
}

export async function getVenueAssets(): Promise<VenueAsset[]> {
  const supabase = getSupabaseServerClient() as unknown as DynamicSupabase;
  const organizationId = await getCurrentOrganizationScope();
  const base = supabase.from("venue_assets").select(assetSelect);
  const { data, error } = organizationId
    ? await base.eq("organization_id", organizationId).order("created_at", { ascending: false })
    : await base.order("created_at", { ascending: false });

  if (error) {
    if (isMissingVenueAssetsError(error)) {
      console.error("venue_assets table is unavailable; returning no assets.", error);
      return [];
    }
    throw new Error(error.message ?? "Unable to load venue assets.");
  }

  return (data ?? []).map(mapAsset);
}

export async function createVenueAsset(input: {
  asset_category: VenueAssetCategory;
  asset_name: string;
  asset_type: VenueAssetType;
  building_id?: string | null;
  field_id?: string | null;
  integration_status?: VenueAssetIntegrationStatus;
  ip_address?: string | null;
  manufacturer?: string | null;
  map_x?: number | null;
  map_y?: number | null;
  model?: string | null;
  notes?: string | null;
  physical_location?: string | null;
  serial_number?: string | null;
  status?: VenueAssetStatus;
  venue_id: string;
}): Promise<VenueAsset> {
  const supabase = getSupabaseAdminClient() as unknown as DynamicAdminSupabase;
  const organizationId = await getWritableOrganizationId();
  const { data, error } = await supabase
    .from("venue_assets")
    .insert({
      asset_category: input.asset_category,
      asset_name: input.asset_name,
      asset_type: input.asset_type,
      building_id: input.building_id ?? null,
      field_id: input.field_id ?? null,
      integration_status: input.integration_status ?? "not_configured",
      ip_address: input.ip_address ?? null,
      manufacturer: input.manufacturer ?? null,
      map_x: input.map_x ?? null,
      map_y: input.map_y ?? null,
      model: input.model ?? null,
      notes: input.notes ?? null,
      organization_id: organizationId,
      physical_location: input.physical_location ?? null,
      serial_number: input.serial_number ?? null,
      status: input.status ?? "unknown",
      venue_id: input.venue_id,
    })
    .select(assetSelect)
    .single();

  if (error) {
    throw new Error(error.message ?? "Unable to create venue asset.");
  }

  return mapAsset(data ?? {});
}
