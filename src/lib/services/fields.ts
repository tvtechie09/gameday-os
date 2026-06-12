import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { Field, FieldStatus } from "@/lib/types";

type FieldRow = Database["public"]["Tables"]["fields"]["Row"];

export type CreateFieldInput = {
  venue_id: string;
  name: string;
  sport_type: string;
  status?: FieldStatus;
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

export const fieldStatuses: FieldStatus[] = ["open", "active", "delayed", "closed", "maintenance"];

export function readFieldStatus(value: string | null | undefined): FieldStatus {
  if (value === "Ready") {
    return "open";
  }

  if (value === "Weather hold") {
    return "delayed";
  }

  if (value === "Maintenance") {
    return "maintenance";
  }

  return fieldStatuses.find((status) => status === value) ?? "open";
}

export function getFieldStatusLabel(status: FieldStatus) {
  const labels: Record<FieldStatus, string> = {
    open: "Open",
    active: "Active",
    delayed: "Delayed",
    closed: "Closed",
    maintenance: "Maintenance",
  };

  return labels[status];
}

export function getFieldStatusClass(status: FieldStatus) {
  const classes: Record<FieldStatus, string> = {
    open: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    active: "bg-green-600 text-white",
    delayed: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
    closed: "bg-red-100 text-red-900 ring-1 ring-red-200",
    maintenance: "bg-slate-200 text-slate-900 ring-1 ring-slate-300",
  };

  return classes[status];
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
    status: readFieldStatus(row.status),
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
      status: data.status ?? "open",
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
      status: data.status ?? "open",
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

export async function updateFieldStatus(id: string, status: FieldStatus): Promise<Field> {
  const supabase = getSupabaseAdminClient();
  const { data: field, error } = await supabase
    .from("fields")
    .update({
      status,
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
