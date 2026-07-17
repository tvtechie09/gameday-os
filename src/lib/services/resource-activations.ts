import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ResourceActivation, ResourceActivationStatus, ResourceActivationType } from "@/lib/types";
import { safelyCreateNotification } from "./notifications";
import { getOrganizationDataScope } from "./organization-data-scope";

type ResourceActivationRow = Database["public"]["Tables"]["resource_activations"]["Row"];

export type CreateResourceActivationInput = {
  resource_id?: string | null;
  venue_id: string;
  field_id: string;
  session_id?: string | null;
  activation_type: ResourceActivationType;
  display_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  resource_url?: string | null;
  assigned_to_session?: boolean;
  notes?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export const resourceActivationTypes: ResourceActivationType[] = ["parent_camera", "livestream_link", "bluetooth_speaker", "scoreboard_operator", "announcer", "other"];
export const resourceActivationStatuses: ResourceActivationStatus[] = ["requested", "active", "ended", "rejected"];

const activationSelect = "id,resource_id,venue_id,field_id,session_id,activation_type,display_name,contact_name,contact_email,resource_url,status,notes,starts_at,ends_at,assigned_to_session,approved_by,approved_at,created_at,updated_at";

function readOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readActivationType(value: string): ResourceActivationType {
  return resourceActivationTypes.find((type) => type === value) ?? "other";
}

function readActivationStatus(value: string): ResourceActivationStatus {
  return resourceActivationStatuses.find((status) => status === value) ?? "requested";
}

function mapActivation(row: ResourceActivationRow): ResourceActivation {
  return {
    id: row.id,
    resourceId: row.resource_id,
    venueId: row.venue_id,
    fieldId: row.field_id,
    sessionId: row.session_id,
    activationType: readActivationType(row.activation_type),
    displayName: row.display_name,
    contactName: readOptionalText(row.contact_name),
    contactEmail: readOptionalText(row.contact_email),
    resourceUrl: readOptionalText(row.resource_url),
    status: readActivationStatus(row.status),
    notes: readOptionalText(row.notes),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    assignedToSession: row.assigned_to_session,
    approvedBy: readOptionalText(row.approved_by),
    approvedAt: readOptionalText(row.approved_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isActivationInScope(activation: ResourceActivation, scope: Awaited<ReturnType<typeof getOrganizationDataScope>>) {
  if (!scope) return true;
  return scope.fieldIds.has(activation.fieldId) || scope.venueIds.has(activation.venueId);
}

export function getActivationLabel(type: ResourceActivationType) {
  const labels: Record<ResourceActivationType, string> = {
    parent_camera: "Camera active",
    livestream_link: "Livestream available",
    bluetooth_speaker: "Audio active",
    scoreboard_operator: "Scoreboard operator active",
    announcer: "Announcer active",
    other: "Resource active",
  };
  return labels[type];
}

export function getAttachmentOptionLabel(type: ResourceActivationType) {
  const labels: Record<ResourceActivationType, string> = {
    parent_camera: "Camera",
    livestream_link: "Livestream",
    bluetooth_speaker: "Audio",
    scoreboard_operator: "Scoreboard Operator",
    announcer: "Announcer",
    other: "Resource",
  };

  return labels[type];
}

export async function getResourceActivations(): Promise<ResourceActivation[]> {
  const supabase = getSupabaseAdminClient();
  const scope = await getOrganizationDataScope();
  const { data, error } = await supabase
    .from("resource_activations")
    .select(activationSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapActivation).filter((activation) => isActivationInScope(activation, scope));
}

export async function getActiveResourceActivationsForField({ fieldId, sessionId }: { fieldId: string; sessionId?: string | null }): Promise<ResourceActivation[]> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  let query = supabase
    .from("resource_activations")
    .select(activationSelect)
    .eq("field_id", fieldId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("created_at", { ascending: false });

  if (sessionId) {
    query = query.or(`session_id.is.null,session_id.eq.${sessionId}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapActivation);
}

export async function createResourceActivationRequest(data: CreateResourceActivationInput): Promise<ResourceActivation> {
  const now = new Date();
  const defaultEnd = new Date(now);
  defaultEnd.setHours(defaultEnd.getHours() + 4);
  const supabase = getSupabaseAdminClient();
  const { data: activation, error } = await supabase
    .from("resource_activations")
    .insert({
      resource_id: readOptionalText(data.resource_id),
      venue_id: data.venue_id,
      field_id: data.field_id,
      session_id: readOptionalText(data.session_id),
      activation_type: data.activation_type,
      display_name: data.display_name,
      contact_name: readOptionalText(data.contact_name),
      contact_email: readOptionalText(data.contact_email),
      resource_url: readOptionalText(data.resource_url),
      assigned_to_session: data.assigned_to_session ?? Boolean(readOptionalText(data.session_id)),
      status: "active",
      approved_by: "Community",
      approved_at: now.toISOString(),
      notes: readOptionalText(data.notes),
      starts_at: data.starts_at ?? now.toISOString(),
      ends_at: data.ends_at ?? defaultEnd.toISOString(),
    })
    .select(activationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapActivation(activation);
}

export async function updateResourceActivationStatus(id: string, status: ResourceActivationStatus): Promise<ResourceActivation> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("resource_activations")
    .update({
      status,
      ...(status === "active" ? { approved_by: "Admin", approved_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
      ...(status === "ended" ? { ends_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .select(activationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const activation = mapActivation(data);
  if (status === "active") {
    await safelyCreateNotification({
      field_id: activation.fieldId,
      message: `${activation.displayName} activated ${getAttachmentOptionLabel(activation.activationType).toLowerCase()}.`,
      notification_type: "resource",
      session_id: activation.sessionId,
      title: "Resource activated",
      venue_id: activation.venueId,
    });
  }

  return activation;
}

export async function assignResourceActivationToSession(id: string, sessionId: string): Promise<ResourceActivation> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("resource_activations")
    .update({
      session_id: sessionId,
      assigned_to_session: true,
      status: "active",
      approved_by: "Admin",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(activationSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const activation = mapActivation(data);
  await safelyCreateNotification({
    field_id: activation.fieldId,
    message: `${activation.displayName} activated ${getAttachmentOptionLabel(activation.activationType).toLowerCase()} for a session.`,
    notification_type: "resource",
    session_id: activation.sessionId,
    title: "Resource activated",
    venue_id: activation.venueId,
  });

  return activation;
}
