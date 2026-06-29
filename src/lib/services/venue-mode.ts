import { getPublicFieldUrl, getPublicVenueDisplayUrl, getPublicVenueUrl } from "@/lib/public-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import {
  buildFallbackPlaySurfaces,
  buildScheduleBySurface,
  buildVenueModeLiveStatus,
  buildVenueModeQrEntries,
  getSessionsForVenueOnDate,
} from "@/lib/venue-mode-helpers";
import type {
  Field,
  FieldLayout,
  FieldLayoutType,
  FieldStatus,
  PlaySurface,
  PlaySurfaceLayoutRole,
  PlaySurfaceType,
  Session,
  SessionSportType,
  Venue,
  VenueModeEndpoint,
  VenueModeEndpointStatus,
  VenueModeEndpointType,
  VenueModeProviderKey,
  VenueZone,
  VenueZoneType,
} from "@/lib/types";
import { getFields } from "./fields";
import { getSessions } from "./sessions";
import { getVenue } from "./venues";

type VenueZoneRow = Database["public"]["Tables"]["venue_zones"]["Row"];
type PlaySurfaceRow = Database["public"]["Tables"]["play_surfaces"]["Row"];
type FieldLayoutRow = Database["public"]["Tables"]["field_layouts"]["Row"];
type FieldLayoutSurfaceRow = Database["public"]["Tables"]["field_layout_surfaces"]["Row"];
type VenueModeEndpointRow = Database["public"]["Tables"]["venue_mode_endpoints"]["Row"];

export interface VenueModeScheduleGroup {
  surfaceId: string;
  surfaceName: string;
  surfaceCode: string | null;
  fieldId: string | null;
  status: FieldStatus;
  sessions: Session[];
}

export interface VenueModeQrEntry {
  label: string;
  url: string;
  entryType: "venue" | "venue_display" | "parent_field" | "field" | "play_surface" | "endpoint";
  fieldId?: string;
  playSurfaceId?: string;
  endpointId?: string;
}

export interface VenueModeData {
  venue: Venue;
  zones: VenueZone[];
  fields: Field[];
  playSurfaces: PlaySurface[];
  fieldLayouts: FieldLayout[];
  sessionsToday: Session[];
  scheduleBySurface: VenueModeScheduleGroup[];
  endpoints: VenueModeEndpoint[];
  qrEntries: VenueModeQrEntry[];
  liveStatus: {
    totalSurfaces: number;
    openSurfaces: number;
    activeSurfaces: number;
    delayedSurfaces: number;
    closedSurfaces: number;
    maintenanceSurfaces: number;
    activeSessions: number;
  };
}

const validZoneTypes: VenueZoneType[] = ["field_area", "building", "parking", "entrance", "concourse", "support", "other"];
const validSurfaceTypes: PlaySurfaceType[] = ["field", "court", "pitch", "diamond", "track", "turf", "room", "other"];
const validLayoutRoles: PlaySurfaceLayoutRole[] = ["standalone", "parent", "split_child", "overlay", "temporary"];
const validLayoutTypes: FieldLayoutType[] = ["full", "split", "overlay", "temporary"];
const validStatuses: FieldStatus[] = ["open", "active", "delayed", "closed", "maintenance"];
const validSportTypes: SessionSportType[] = ["baseball", "softball", "soccer", "football", "lacrosse", "basketball", "volleyball", "other"];
const validEndpointTypes: VenueModeEndpointType[] = ["qr_entry", "equipment", "location_provider", "display", "api", "other"];
const validProviderKeys: VenueModeProviderKey[] = ["manual", "meraki", "cisco_spaces", "future_provider", "other"];
const validEndpointStatuses: VenueModeEndpointStatus[] = ["not_configured", "configured", "active", "offline", "error"];

function readText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readJsonObject(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readZoneType(value: string): VenueZoneType {
  return validZoneTypes.find((type) => type === value) ?? "other";
}

function readSurfaceType(value: string): PlaySurfaceType {
  return validSurfaceTypes.find((type) => type === value) ?? "field";
}

function readLayoutRole(value: string): PlaySurfaceLayoutRole {
  return validLayoutRoles.find((role) => role === value) ?? "standalone";
}

function readLayoutType(value: string): FieldLayoutType {
  return validLayoutTypes.find((type) => type === value) ?? "split";
}

function readStatus(value: string): FieldStatus {
  return validStatuses.find((status) => status === value) ?? "open";
}

function readSportTypes(value: string[] | null | undefined): SessionSportType[] {
  return (value ?? []).map((sportType) => validSportTypes.find((validSportType) => validSportType === sportType) ?? "other");
}

function readEndpointType(value: string): VenueModeEndpointType {
  return validEndpointTypes.find((type) => type === value) ?? "other";
}

function readProviderKey(value: string): VenueModeProviderKey {
  return validProviderKeys.find((key) => key === value) ?? "other";
}

function readEndpointStatus(value: string): VenueModeEndpointStatus {
  return validEndpointStatuses.find((status) => status === value) ?? "not_configured";
}

function isOptionalFoundationMissing(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  return error.code === "42P01"
    || message.includes("Could not find the table")
    || message.includes("schema cache")
    || message.includes("does not exist");
}

function mapVenueZone(row: VenueZoneRow): VenueZone {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    name: row.name,
    description: readText(row.description),
    zoneType: readZoneType(row.zone_type),
    mapLabel: readText(row.map_label),
    mapX: readNumber(row.map_x),
    mapY: readNumber(row.map_y),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlaySurface(row: PlaySurfaceRow): PlaySurface {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    zoneId: row.zone_id ?? null,
    parentFieldId: row.parent_field_id ?? null,
    fieldId: row.field_id ?? null,
    name: row.name,
    surfaceCode: readText(row.surface_code),
    sportTypes: readSportTypes(row.sport_types),
    surfaceType: readSurfaceType(row.surface_type),
    layoutRole: readLayoutRole(row.layout_role),
    status: readStatus(row.status),
    mapLabel: readText(row.map_label),
    mapX: readNumber(row.map_x),
    mapY: readNumber(row.map_y),
    capacity: row.capacity,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFieldLayout(row: FieldLayoutRow, playSurfaceIds: string[]): FieldLayout {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    parentFieldId: row.parent_field_id ?? null,
    layoutName: row.layout_name,
    layoutType: readLayoutType(row.layout_type),
    isActive: row.is_active,
    notes: readText(row.notes),
    playSurfaceIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVenueModeEndpoint(row: VenueModeEndpointRow): VenueModeEndpoint {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    venueId: row.venue_id,
    endpointType: readEndpointType(row.endpoint_type),
    providerKey: readProviderKey(row.provider_key),
    endpointLabel: row.endpoint_label,
    endpointUrl: readText(row.endpoint_url),
    status: readEndpointStatus(row.status),
    metadata: readJsonObject(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getVenueZones(venueId: string): Promise<VenueZone[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venue_zones")
    .select("id,organization_id,venue_id,name,description,zone_type,map_label,map_x,map_y,sort_order,created_at,updated_at")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isOptionalFoundationMissing(error)) {
      console.warn("Venue zones table is not available yet. Run the complex venue foundation migration.");
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapVenueZone);
}

export async function getPlaySurfaces(venueId: string): Promise<PlaySurface[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("play_surfaces")
    .select("id,organization_id,venue_id,zone_id,parent_field_id,field_id,name,surface_code,sport_types,surface_type,layout_role,status,map_label,map_x,map_y,capacity,sort_order,created_at,updated_at")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (isOptionalFoundationMissing(error)) {
      console.warn("Play surfaces table is not available yet. Run the complex venue foundation migration.");
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPlaySurface);
}

export async function getFieldLayouts(venueId: string): Promise<FieldLayout[]> {
  const supabase = getSupabaseServerClient();
  const { data: layouts, error } = await supabase
    .from("field_layouts")
    .select("id,organization_id,venue_id,parent_field_id,layout_name,layout_type,is_active,notes,created_at,updated_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isOptionalFoundationMissing(error)) {
      console.warn("Field layouts table is not available yet. Run the complex venue foundation migration.");
      return [];
    }
    throw new Error(error.message);
  }

  const layoutIds = (layouts ?? []).map((layout) => layout.id);
  let layoutSurfaces: FieldLayoutSurfaceRow[] = [];

  if (layoutIds.length > 0) {
    const { data, error: surfaceError } = await supabase
      .from("field_layout_surfaces")
      .select("layout_id,play_surface_id,created_at")
      .in("layout_id", layoutIds);

    if (surfaceError) {
      if (!isOptionalFoundationMissing(surfaceError)) {
        throw new Error(surfaceError.message);
      }
    } else {
      layoutSurfaces = data ?? [];
    }
  }

  const surfaceIdsByLayoutId = layoutSurfaces.reduce<Record<string, string[]>>((acc, item) => {
    acc[item.layout_id] = [...(acc[item.layout_id] ?? []), item.play_surface_id];
    return acc;
  }, {});

  return (layouts ?? []).map((layout) => mapFieldLayout(layout, surfaceIdsByLayoutId[layout.id] ?? []));
}

export async function getVenueModeEndpoints(venueId: string): Promise<VenueModeEndpoint[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venue_mode_endpoints")
    .select("id,organization_id,venue_id,endpoint_type,provider_key,endpoint_label,endpoint_url,status,metadata,created_at,updated_at")
    .eq("venue_id", venueId)
    .order("endpoint_type", { ascending: true })
    .order("endpoint_label", { ascending: true });

  if (error) {
    if (isOptionalFoundationMissing(error)) {
      console.warn("Venue Mode endpoints table is not available yet. Run the complex venue foundation migration.");
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map(mapVenueModeEndpoint);
}

export async function getVenueModeData(venueId: string): Promise<VenueModeData | null> {
  const venue = await getVenue(venueId);

  if (!venue) {
    return null;
  }

  const [allFields, allSessions, zones, configuredSurfaces, fieldLayouts, endpoints] = await Promise.all([
    getFields(),
    getSessions(),
    getVenueZones(venueId),
    getPlaySurfaces(venueId),
    getFieldLayouts(venueId),
    getVenueModeEndpoints(venueId),
  ]);

  const fields = allFields.filter((field) => field.venueId === venueId);
  const playSurfaces = configuredSurfaces.length > 0 ? configuredSurfaces : buildFallbackPlaySurfaces(fields) as PlaySurface[];
  const sessionsToday = getSessionsForVenueOnDate(fields, allSessions) as Session[];
  const scheduleBySurface = buildScheduleBySurface(playSurfaces, sessionsToday);
  const qrEntries = buildVenueModeQrEntries(venue, fields, playSurfaces, endpoints, {
    fieldUrl: getPublicFieldUrl,
    venueDisplayUrl: getPublicVenueDisplayUrl,
    venueUrl: getPublicVenueUrl,
  });

  return {
    endpoints,
    fieldLayouts,
    fields,
    liveStatus: buildVenueModeLiveStatus(playSurfaces, sessionsToday),
    playSurfaces,
    qrEntries,
    scheduleBySurface,
    sessionsToday,
    venue,
    zones,
  };
}
