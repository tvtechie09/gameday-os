import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { VolunteerRole, VolunteerRoleStatus, VolunteerRoleType } from "@/lib/types";

type VolunteerRoleRow = Database["public"]["Tables"]["volunteer_roles"]["Row"];

export type CreateVolunteerRoleInput = {
  venue_id: string;
  field_id: string;
  session_id?: string | null;
  role_type: VolunteerRoleType;
  display_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
};

export const volunteerRoleTypes: VolunteerRoleType[] = ["scorekeeper", "stream_operator", "audio_operator", "announcer", "scoreboard_operator", "field_admin", "other"];
export const volunteerRoleStatuses: VolunteerRoleStatus[] = ["requested", "approved", "active", "ended", "rejected"];

const volunteerRoleSelect = "id,venue_id,field_id,session_id,role_type,display_name,contact_name,contact_email,contact_phone,status,notes,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readRoleType(value: string): VolunteerRoleType {
  return volunteerRoleTypes.find((type) => type === value) ?? "other";
}

function readRoleStatus(value: string): VolunteerRoleStatus {
  return volunteerRoleStatuses.find((status) => status === value) ?? "requested";
}

function mapVolunteerRole(row: VolunteerRoleRow): VolunteerRole {
  return {
    id: row.id,
    venueId: row.venue_id,
    fieldId: row.field_id,
    sessionId: row.session_id,
    roleType: readRoleType(row.role_type),
    displayName: row.display_name,
    contactName: readOptionalText(row.contact_name),
    contactEmail: readOptionalText(row.contact_email),
    contactPhone: readOptionalText(row.contact_phone),
    status: readRoleStatus(row.status),
    notes: readOptionalText(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getVolunteerRoleLabel(type: VolunteerRoleType) {
  const labels: Record<VolunteerRoleType, string> = {
    scorekeeper: "Scorekeeper",
    stream_operator: "Stream Operator",
    audio_operator: "Audio Operator",
    announcer: "Announcer",
    scoreboard_operator: "Scoreboard Operator",
    field_admin: "Field Admin",
    other: "Volunteer",
  };

  return labels[type];
}

export async function getVolunteerRoles(): Promise<VolunteerRole[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteer_roles")
    .select(volunteerRoleSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapVolunteerRole);
}

export async function getVolunteerRolesBySessionId(sessionId: string): Promise<VolunteerRole[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteer_roles")
    .select(volunteerRoleSelect)
    .eq("session_id", sessionId)
    .in("status", ["approved", "active"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapVolunteerRole);
}

export async function createVolunteerRoleRequest(data: CreateVolunteerRoleInput): Promise<VolunteerRole> {
  const supabase = getSupabaseAdminClient();
  const { data: role, error } = await supabase
    .from("volunteer_roles")
    .insert({
      venue_id: data.venue_id,
      field_id: data.field_id,
      session_id: readOptionalText(data.session_id),
      role_type: data.role_type,
      display_name: data.display_name,
      contact_name: readOptionalText(data.contact_name),
      contact_email: readOptionalText(data.contact_email),
      contact_phone: readOptionalText(data.contact_phone),
      status: "requested",
      notes: readOptionalText(data.notes),
    })
    .select(volunteerRoleSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVolunteerRole(role);
}

export async function updateVolunteerRoleStatus(id: string, status: VolunteerRoleStatus): Promise<VolunteerRole> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("volunteer_roles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(volunteerRoleSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapVolunteerRole(data);
}
