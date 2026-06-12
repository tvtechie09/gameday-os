import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { Resource, ResourceStatus, ResourceType } from "@/lib/types";

type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export type CreateResourceInput = {
  venue_id: string;
  field_id?: string | null;
  resource_name: string;
  resource_type: ResourceType;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  status: ResourceStatus;
  notes?: string | null;
};

export type UpdateResourceInput = CreateResourceInput;

export const resourceTypes: ResourceType[] = ["camera", "audio", "scoreboard", "display", "network", "streaming", "other"];
export const resourceStatuses: ResourceStatus[] = ["active", "inactive", "maintenance", "unknown"];

const resourceSelect = "id,venue_id,field_id,resource_name,resource_type,manufacturer,model,serial_number,status,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readResourceType(value: string): ResourceType {
  return resourceTypes.find((type) => type === value) ?? "other";
}

function readResourceStatus(value: string): ResourceStatus {
  return resourceStatuses.find((status) => status === value) ?? "unknown";
}

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    venueId: row.venue_id,
    fieldId: row.field_id,
    resourceName: row.resource_name,
    resourceType: readResourceType(row.resource_type),
    manufacturer: readOptionalText(row.manufacturer),
    model: readOptionalText(row.model),
    serialNumber: readOptionalText(row.serial_number),
    status: readResourceStatus(row.status),
    notes: readOptionalText(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getResources(): Promise<Resource[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .select(resourceSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapResource);
}

export async function getResource(id: string): Promise<Resource | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("resources")
    .select(resourceSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapResource(data) : null;
}

export async function getResourcesForFieldPage({ venueId, fieldId }: { venueId: string; fieldId: string }): Promise<Resource[]> {
  const resources = await getResources();
  return resources.filter((resource) => resource.status === "active" && resource.venueId === venueId && (!resource.fieldId || resource.fieldId === fieldId));
}

export async function createResource(data: CreateResourceInput): Promise<Resource> {
  const supabase = getSupabaseAdminClient();
  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      venue_id: data.venue_id,
      field_id: readOptionalText(data.field_id),
      resource_name: data.resource_name,
      resource_type: data.resource_type,
      manufacturer: readOptionalText(data.manufacturer),
      model: readOptionalText(data.model),
      serial_number: readOptionalText(data.serial_number),
      status: data.status,
      notes: readOptionalText(data.notes),
    })
    .select(resourceSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapResource(resource);
}

export async function updateResource(id: string, data: UpdateResourceInput): Promise<Resource> {
  const supabase = getSupabaseAdminClient();
  const { data: resource, error } = await supabase
    .from("resources")
    .update({
      venue_id: data.venue_id,
      field_id: readOptionalText(data.field_id),
      resource_name: data.resource_name,
      resource_type: data.resource_type,
      manufacturer: readOptionalText(data.manufacturer),
      model: readOptionalText(data.model),
      serial_number: readOptionalText(data.serial_number),
      status: data.status,
      notes: readOptionalText(data.notes),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(resourceSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapResource(resource);
}
