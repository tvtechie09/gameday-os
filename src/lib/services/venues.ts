import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Venue } from "@/lib/types";

type VenueRow = Database["public"]["Tables"]["venues"]["Row"];

export type CreateVenueInput = {
  name: string;
  description: string;
  address: string;
};

function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    address: row.address ?? "",
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    parkingNote: row.parking_note ?? "",
    fieldCount: 0,
    status: row.status === "Live" ? "Live" : "Draft",
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
  const { data: venues, error: venuesError } = await supabase
    .from("venues")
    .select("id,name,description,address,city,state,parking_note,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (venuesError) {
    throw new Error(venuesError.message);
  }

  const { data: fields, error: fieldsError } = await supabase.from("fields").select("venue_id");

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
    .select("id,name,description,address,city,state,parking_note,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapVenue(data) : null;
}

export async function createVenue(data: CreateVenueInput): Promise<Venue> {
  const supabase = getSupabaseServerClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      name: data.name,
      description: data.description,
      address: data.address,
      status: "Draft",
    })
    .select("id,name,description,address,city,state,parking_note,status,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVenue(venue);
}
