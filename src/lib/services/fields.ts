import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { Field } from "@/lib/types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];

export type CreateFieldInput = {
  venue_id: string;
  name: string;
  sport_type: string;
};

function readResources(resources: Json): string[] {
  return Array.isArray(resources) ? resources.filter((resource): resource is string => typeof resource === "string") : [];
}

function mapField(row: FieldRow): Field {
  return {
    id: row.id,
    venueId: row.venue_id,
    name: row.name,
    sportType: row.sport_type,
    surface: row.surface ?? undefined,
    status: row.status === "Maintenance" || row.status === "Weather hold" ? row.status : "Ready",
    qrPath: `/fields/${row.id}`,
    resources: readResources(row.resources),
  };
}

export async function getFields(): Promise<Field[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fields")
    .select("id,venue_id,name,sport_type,surface,status,resources,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapField);
}

export async function getField(id: string): Promise<Field | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fields")
    .select("id,venue_id,name,sport_type,surface,status,resources,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapField(data) : null;
}

export async function createField(data: CreateFieldInput): Promise<Field> {
  const supabase = getSupabaseServerClient();
  const { data: field, error } = await supabase
    .from("fields")
    .insert({
      venue_id: data.venue_id,
      name: data.name,
      sport_type: data.sport_type,
      status: "Ready",
    })
    .select("id,venue_id,name,sport_type,surface,status,resources,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapField(field);
}
