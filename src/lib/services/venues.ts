import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Venue } from "@/lib/types";
import { getCurrentOrganizationScope, getWritableOrganizationId } from "../organization-scope";
import { assertActorUserId, requirePermission, safelyLogAudit } from "./identity";

type VenueRow = Database["public"]["Tables"]["venues"]["Row"];

export type CreateVenueInput = {
  name: string;
  description: string;
  address: string;
  logo_url?: string | null;
  banner_url?: string | null;
  map_image_url?: string | null;
  map_notes?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type UpdateVenueInput = CreateVenueInput;

function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    organizationId: row.organization_id ?? null,
    name: row.name,
    description: row.description ?? "",
    address: row.address ?? "",
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    parkingNote: row.parking_note ?? "",
    fieldCount: 0,
    status: row.status === "Live" ? "Live" : "Draft",
    logoUrl: row.logo_url ?? null,
    bannerUrl: row.banner_url ?? null,
    mapImageUrl: row.map_image_url ?? null,
    mapNotes: row.map_notes ?? null,
    primaryColor: row.primary_color ?? null,
    secondaryColor: row.secondary_color ?? null,
    updatedAt: row.updated_at,
  };
}

function countFieldsByVenueId(fields: Array<{ venue_id: string }>) {
  return fields.reduce<Record<string, number>>((counts, field) => {
    counts[field.venue_id] = (counts[field.venue_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getVenues(): Promise<Venue[]> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getCurrentOrganizationScope();
  let venueQuery = supabase
    .from("venues")
    .select("id,organization_id,name,description,address,city,state,parking_note,status,logo_url,banner_url,map_image_url,map_notes,primary_color,secondary_color,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (organizationId) {
    venueQuery = venueQuery.eq("organization_id", organizationId);
  }

  const { data: venues, error: venuesError } = await venueQuery;

  if (venuesError) {
    throw new Error(venuesError.message);
  }

  let fieldQuery = supabase.from("fields").select("venue_id,organization_id");
  if (organizationId) {
    fieldQuery = fieldQuery.eq("organization_id", organizationId);
  }
  const { data: fields, error: fieldsError } = await fieldQuery;

  if (fieldsError) {
    throw new Error(fieldsError.message);
  }

  const fieldCounts = countFieldsByVenueId(fields ?? []);

  return (venues ?? []).map((venue) => ({
    ...mapVenue(venue),
    fieldCount: fieldCounts[venue.id] ?? 0,
  }));
}

export async function getVenue(id: string): Promise<Venue | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id,organization_id,name,description,address,city,state,parking_note,status,logo_url,banner_url,map_image_url,map_notes,primary_color,secondary_color,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapVenue(data) : null;
}

export async function createVenue(data: CreateVenueInput, actorUserId?: string | null): Promise<Venue> {
  const supabase = getSupabaseServerClient();
  const organizationId = await getWritableOrganizationId();
  const actor = assertActorUserId(actorUserId);
  if (!organizationId) {
    throw new Error("Organization scope is required to create a venue.");
  }
  await requirePermission(actor, "venue.manage", "organization", organizationId);

  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      organization_id: organizationId,
      name: data.name,
      description: data.description,
      address: data.address,
      logo_url: data.logo_url,
      banner_url: data.banner_url,
      map_image_url: data.map_image_url,
      map_notes: data.map_notes,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      status: "Draft",
    })
    .select("id,organization_id,name,description,address,city,state,parking_note,status,logo_url,banner_url,map_image_url,map_notes,primary_color,secondary_color,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedVenue = mapVenue(venue);
  await safelyLogAudit({
    action: "venue.created",
    actorUserId: actor,
    metadata: { name: mappedVenue.name },
    resourceId: mappedVenue.id,
    resourceType: "venue",
    scopeId: mappedVenue.organizationId ?? null,
    scopeType: "organization",
  });

  return mappedVenue;
}

export async function updateVenue(id: string, data: UpdateVenueInput, actorUserId?: string | null): Promise<Venue> {
  const actor = assertActorUserId(actorUserId);
  await requirePermission(actor, "venue.manage", "venue", id);

  const supabase = getSupabaseAdminClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .update({
      name: data.name,
      description: data.description,
      address: data.address,
      logo_url: data.logo_url,
      banner_url: data.banner_url,
      map_image_url: data.map_image_url,
      map_notes: data.map_notes,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,organization_id,name,description,address,city,state,parking_note,status,logo_url,banner_url,map_image_url,map_notes,primary_color,secondary_color,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const mappedVenue = mapVenue(venue);
  await safelyLogAudit({
    action: "venue.updated",
    actorUserId: actor,
    metadata: { name: mappedVenue.name },
    resourceId: mappedVenue.id,
    resourceType: "venue",
    scopeId: mappedVenue.id,
    scopeType: "venue",
  });

  return mappedVenue;
}
