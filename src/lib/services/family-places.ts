import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { assertActorUserId, requirePermission, safelyLogAudit } from "@/lib/services/identity";

export type FamilyPlaceAdminRow = {
  id: string;
  sourceType: "field" | "zone" | "play_surface" | "amenity";
  name: string;
  type: string;
  parentVisible: boolean;
  status: string;
};

export type FamilyVenuePublicStatus = "open" | "closed" | "delayed" | "maintenance" | "weather_hold" | "unavailable" | "unknown";

export async function getFamilyVenueStatusAdmin(venueId: string) {
  const { data, error } = await getSupabaseAdminClient().from("venues")
    .select("id,public_status,public_status_message,public_status_effective_at,public_status_expires_at")
    .eq("id", venueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? {
    status: (data.public_status || "unknown") as FamilyVenuePublicStatus,
    message: data.public_status_message || "",
    effectiveAt: data.public_status_effective_at || "",
    expiresAt: data.public_status_expires_at || "",
  } : null;
}

export async function setFamilyVenueStatus(input: {
  venueId: string;
  status: FamilyVenuePublicStatus;
  message?: string;
  effectiveAt?: string | null;
  expiresAt?: string | null;
}, actorUserId?: string | null) {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "venue.manage", "venue", input.venueId);
  const { error } = await getSupabaseAdminClient().from("venues").update({
    public_status: input.status,
    public_status_message: input.message?.trim() || null,
    public_status_effective_at: input.effectiveAt || new Date().toISOString(),
    public_status_expires_at: input.expiresAt || null,
    updated_at: new Date().toISOString(),
  }).eq("id", input.venueId);
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "family_venue.status_published", actorUserId: actor, resourceId: input.venueId, resourceType: "venue", scopeId: input.venueId, scopeType: "venue", metadata: { status: input.status } });
}

export async function getFamilyPlacesAdmin(venueId: string): Promise<FamilyPlaceAdminRow[]> {
  const supabase = getSupabaseAdminClient();
  const [fields, zones, surfaces, amenities] = await Promise.all([
    supabase.from("fields").select("id,name,sport_type,parent_visible,field_status").eq("venue_id", venueId).order("name"),
    supabase.from("venue_zones").select("id,name,zone_type,parent_visible,status").eq("venue_id", venueId).order("sort_order").order("name"),
    supabase.from("play_surfaces").select("id,name,surface_type,parent_visible,status").eq("venue_id", venueId).order("sort_order").order("name"),
    supabase.from("amenities").select("id,name,amenity_type,parent_visible,status").eq("venue_id", venueId).order("sort_order").order("name"),
  ]);
  const error = fields.error || zones.error || surfaces.error || amenities.error;
  if (error) throw new Error(error.message);
  return [
    ...(fields.data ?? []).map((row) => ({ id: row.id, sourceType: "field" as const, name: row.name, type: row.sport_type, parentVisible: Boolean(row.parent_visible), status: row.field_status })),
    ...(zones.data ?? []).map((row) => ({ id: row.id, sourceType: "zone" as const, name: row.name, type: row.zone_type, parentVisible: Boolean(row.parent_visible), status: row.status || "open" })),
    ...(surfaces.data ?? []).map((row) => ({ id: row.id, sourceType: "play_surface" as const, name: row.name, type: row.surface_type, parentVisible: Boolean(row.parent_visible), status: row.status })),
    ...(amenities.data ?? []).map((row) => ({ id: row.id, sourceType: "amenity" as const, name: row.name, type: row.amenity_type, parentVisible: row.parent_visible, status: row.status })),
  ];
}

export async function createFamilyAmenity(input: {
  venueId: string;
  name: string;
  amenityType: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  accessibilityNotes?: string;
  operatingHours?: string;
  parentVisible: boolean;
}, actorUserId?: string | null) {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "venue.manage", "venue", input.venueId);
  const supabase = getSupabaseAdminClient();
  const { data: venue, error: venueError } = await supabase.from("venues").select("organization_id").eq("id", input.venueId).single();
  if (venueError) throw new Error(venueError.message);
  const { data, error } = await supabase.from("amenities").insert({
    organization_id: venue.organization_id,
    venue_id: input.venueId,
    name: input.name,
    amenity_type: input.amenityType,
    description: input.description || null,
    address: input.address || null,
    latitude: input.latitude,
    longitude: input.longitude,
    accessibility_notes: input.accessibilityNotes || null,
    operating_hours: input.operatingHours || null,
    parent_visible: input.parentVisible,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "family_place.created", actorUserId: actor, resourceId: data.id, resourceType: "amenity", scopeId: input.venueId, scopeType: "venue", metadata: { name: input.name } });
}

export async function setFamilyPlaceVisibility(input: { venueId: string; sourceType: FamilyPlaceAdminRow["sourceType"]; sourceId: string; parentVisible: boolean }, actorUserId?: string | null) {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "venue.manage", "venue", input.venueId);
  const table = input.sourceType === "field" ? "fields" : input.sourceType === "zone" ? "venue_zones" : input.sourceType === "play_surface" ? "play_surfaces" : "amenities";
  const { error } = await getSupabaseAdminClient().from(table).update({ parent_visible: input.parentVisible, updated_at: new Date().toISOString() }).eq("id", input.sourceId).eq("venue_id", input.venueId);
  if (error) throw new Error(error.message);
  await safelyLogAudit({ action: "family_place.visibility_changed", actorUserId: actor, resourceId: input.sourceId, resourceType: input.sourceType, scopeId: input.venueId, scopeType: "venue", metadata: { parentVisible: input.parentVisible } });
}
