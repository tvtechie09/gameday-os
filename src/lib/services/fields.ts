import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { Field } from "@/lib/types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];

export type CreateFieldInput = {
  venue_id: string;
  name: string;
  sport_type: string;
  map_label?: string | null;
  map_x?: number | null;
  map_y?: number | null;
};

export type UpdateFieldInput = CreateFieldInput;

function readResources(resources: Json): string[] {
  return Array.isArray(resources) ? resources.filter((resource): resource is string => typeof resource === "string") : [];
}

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapField(row: FieldRow): Field {
  return {
    id: row.id,
    venueId: row.venue_id,
    name: row.name,
    sportType: row.sport_type,
    mapLabel: readOptionalText(row.map_label),
    mapX: readCoordinate(row.map_x),
    mapY: readCoordinate(row.map_y),
    surface: row.surface ?? undefined,
    status: row.status === "Maintenance" || row.status === "Weather hold" ? row.status : "Ready",
    qrPath: `/fields/${row.id}`,
    resources: readResources(row.resources),
    updatedAt: row.updated_at,
  };
}

export async function getFields(): Promise<Field[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("fields")
    .select("id,venue_id,name,sport_type,map_label,map_x,map_y,surface,status,resources,created_at,updated_at")
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
    .select("id,venue_id,name,sport_type,map_label,map_x,map_y,surface,status,resources,created_at,updated_at")
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
      map_label: readOptionalText(data.map_label),
      map_x: data.map_x ?? null,
      map_y: data.map_y ?? null,
      status: "Ready",
    })
    .select("id,venue_id,name,sport_type,map_label,map_x,map_y,surface,status,resources,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapField(field);
}

export async function updateField(id: string, data: UpdateFieldInput): Promise<Field> {
  const supabase = getSupabaseAdminClient();
  const { data: field, error } = await supabase
    .from("fields")
    .update({
      venue_id: data.venue_id,
      name: data.name,
      sport_type: data.sport_type,
      map_label: readOptionalText(data.map_label),
      map_x: data.map_x ?? null,
      map_y: data.map_y ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,venue_id,name,sport_type,map_label,map_x,map_y,surface,status,resources,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapField(field);
}
