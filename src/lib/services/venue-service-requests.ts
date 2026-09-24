import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { createWorkOrder } from "@/lib/services/work-orders";
import {
  canTransitionVenueServiceRequest,
  deriveVenueServiceRequestPriority,
  isMaintenanceSeverity,
  isVenueServiceOperationalImpact,
  isVenueServiceRequestStatus,
  isVenueServiceRequestType,
  maintenanceSeverityToWorkOrderPriority,
  venueServiceRequestTypeLabel,
  type MaintenanceSeverity,
  type VenueServiceOperationalImpact,
  type VenueServiceRequestPriority,
  type VenueServiceRequestStatus,
  type VenueServiceRequestType,
} from "@/lib/services/venue-service-request-core";

export type VenueServiceRequest = {
  id: string;
  organizationId: string;
  venueId: string;
  fieldId: string | null;
  sessionId: string | null;
  requestType: VenueServiceRequestType;
  status: VenueServiceRequestStatus;
  severity: MaintenanceSeverity | null;
  priority: VenueServiceRequestPriority;
  operationalImpact: VenueServiceOperationalImpact | null;
  requesterName: string | null;
  note: string | null;
  photoPath: string | null;
  source: string;
  fieldWorkOrderId: string | null;
  assignedRole: string | null;
  assignedToUserId: string | null;
  resolutionNote: string | null;
  requestedAt: string;
  updatedAt: string;
};

export type CreateVenueServiceRequestInput = {
  fieldId: string;
  sessionId?: string | null;
  requestType: VenueServiceRequestType;
  severity?: MaintenanceSeverity | null;
  operationalImpact?: VenueServiceOperationalImpact | null;
  requesterUserId?: string | null;
  requesterName?: string | null;
  note?: string | null;
  photoPath?: string | null;
  source?: "FIELD_PAGE" | "GAME_PAGE" | "FIELD_QR" | "OPS_DASHBOARD" | "API";
};

type RequestRow = {
  id: string;
  organization_id: string;
  venue_id: string;
  field_id: string | null;
  session_id: string | null;
  request_type: string;
  status: string;
  severity: string | null;
  priority: string;
  operational_impact: string | null;
  requester_name: string | null;
  note: string | null;
  photo_path: string | null;
  source: string;
  field_work_order_id: string | null;
  assigned_role: string | null;
  assigned_to_user_id: string | null;
  resolution_note: string | null;
  requested_at: string;
  updated_at: string;
};

function mapRequest(row: RequestRow): VenueServiceRequest {
  if (!isVenueServiceRequestType(row.request_type) || !isVenueServiceRequestStatus(row.status)) {
    throw new Error("Venue service request contains an unsupported type or status.");
  }
  if (!(["URGENT", "HIGH", "NORMAL", "LOW"] as const).includes(row.priority as VenueServiceRequestPriority)) {
    throw new Error("Venue service request contains an unsupported priority.");
  }
  if (row.operational_impact && !isVenueServiceOperationalImpact(row.operational_impact)) {
    throw new Error("Venue service request contains an unsupported operational impact.");
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    venueId: row.venue_id,
    fieldId: row.field_id,
    sessionId: row.session_id,
    requestType: row.request_type,
    status: row.status,
    severity: row.severity && isMaintenanceSeverity(row.severity) ? row.severity : null,
    priority: row.priority as VenueServiceRequestPriority,
    operationalImpact: row.operational_impact as VenueServiceOperationalImpact | null,
    requesterName: row.requester_name,
    note: row.note,
    photoPath: row.photo_path,
    source: row.source,
    fieldWorkOrderId: row.field_work_order_id,
    assignedRole: row.assigned_role,
    assignedToUserId: row.assigned_to_user_id,
    resolutionNote: row.resolution_note,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
  };
}

export async function getVenueServiceRequests(): Promise<VenueServiceRequest[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("venue_service_requests")
    .select("*")
    .order("requested_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRequest(row as RequestRow));
}

export async function createVenueServiceRequest(input: CreateVenueServiceRequestInput): Promise<VenueServiceRequest> {
  const supabase = getSupabaseAdminClient();
  const { data: field, error: fieldError } = await supabase
    .from("fields")
    .select("id,venue_id,organization_id")
    .eq("id", input.fieldId)
    .maybeSingle();

  if (fieldError || !field?.venue_id || !field.organization_id) {
    throw new Error(fieldError?.message ?? "Field is not available for service requests.");
  }

  if (input.sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id,field_id,organization_id")
      .eq("id", input.sessionId)
      .maybeSingle();
    if (sessionError || !session || session.field_id !== field.id || session.organization_id !== field.organization_id) {
      throw new Error(sessionError?.message ?? "Game/session context does not match this field.");
    }
  }

  const isMaintenance = input.requestType === "MAINTENANCE_FIELD_ISSUE";
  if (isMaintenance !== Boolean(input.severity)) {
    throw new Error(isMaintenance ? "Maintenance impact is required." : "Impact is only valid for maintenance requests.");
  }

  const requesterName = input.requesterName?.trim().slice(0, 120) || null;
  const note = isMaintenance ? input.note?.trim().slice(0, 1000) || null : null;
  const photoPath = isMaintenance ? input.photoPath?.trim().slice(0, 500) || null : null;
  const priority = deriveVenueServiceRequestPriority({
    severity: input.severity,
    operationalImpact: input.operationalImpact,
  });

  let requestId: string | null = null;
  let workOrderId: string | null = null;
  try {
    if (isMaintenance && input.severity) {
      const workOrder = await createWorkOrder({
        fieldId: field.id,
        gameId: input.sessionId || null,
        title: `${venueServiceRequestTypeLabel(input.requestType)} (${input.severity.toLowerCase().replaceAll("_", " ")})`,
        detail: note,
        priority: input.operationalImpact === "GAME_CANNOT_START_CONTINUE"
          ? "urgent"
          : maintenanceSeverityToWorkOrderPriority(input.severity),
        reportedBy: requesterName,
        source: "venue_service_request",
      });
      workOrderId = workOrder.id;
    }

    const { data: inserted, error: requestError } = await supabase
      .from("venue_service_requests")
      .insert({
        organization_id: field.organization_id,
        venue_id: field.venue_id,
        field_id: field.id,
        session_id: input.sessionId || null,
        request_type: input.requestType,
        severity: input.severity ?? null,
        priority,
        operational_impact: input.operationalImpact ?? null,
        requester_user_id: input.requesterUserId || null,
        requester_name: requesterName,
        note,
        photo_path: photoPath,
        source: input.source ?? "FIELD_PAGE",
        field_work_order_id: workOrderId,
      })
      .select("*")
      .single();
    if (requestError) throw new Error(requestError.message);
    requestId = inserted.id;

    const { error: eventError } = await supabase.from("venue_service_request_events").insert({
      request_id: requestId,
      from_status: null,
      to_status: "REQUESTED",
      actor_user_id: input.requesterUserId || null,
      actor_label: requesterName,
      note: null,
    });
    if (eventError) throw new Error(eventError.message);
    return mapRequest(inserted as RequestRow);
  } catch (error) {
    if (requestId) await supabase.from("venue_service_requests").delete().eq("id", requestId);
    if (workOrderId) await supabase.from("field_work_orders").delete().eq("id", workOrderId);
    throw error;
  }
}

export async function transitionVenueServiceRequest(input: {
  requestId: string;
  nextStatus: VenueServiceRequestStatus;
  actorUserId: string;
  actorLabel: string;
  note?: string | null;
}): Promise<VenueServiceRequest> {
  const supabase = getSupabaseAdminClient();
  const { data: currentRow, error: loadError } = await supabase
    .from("venue_service_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();
  if (loadError || !currentRow) throw new Error(loadError?.message ?? "Service request was not found.");

  const current = mapRequest(currentRow as RequestRow);
  if (!canTransitionVenueServiceRequest(current.requestType, current.status, input.nextStatus)) {
    throw new Error(`Cannot move ${current.requestType} from ${current.status} to ${input.nextStatus}.`);
  }

  const now = new Date().toISOString();
  const patch: Database["public"]["Tables"]["venue_service_requests"]["Update"] = {
    status: input.nextStatus,
    updated_at: now,
  };
  if (input.nextStatus === "ACKNOWLEDGED") patch.acknowledged_at = now;
  if (input.nextStatus === "ASSIGNED") patch.assigned_at = now;
  if (input.nextStatus === "EN_ROUTE") patch.en_route_at = now;
  if (input.nextStatus === "IN_PROGRESS") patch.in_progress_at = now;
  if (input.nextStatus === "RESOLVED") {
    patch.resolved_at = now;
    patch.resolution_note = input.note?.trim().slice(0, 1000) || null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("venue_service_requests")
    .update(patch)
    .eq("id", current.id)
    .eq("status", current.status)
    .select("*")
    .maybeSingle();
  if (updateError || !updated) throw new Error(updateError?.message ?? "Service request changed before this update could be applied.");

  const { error: eventError } = await supabase.from("venue_service_request_events").insert({
    request_id: current.id,
    from_status: current.status,
    to_status: input.nextStatus,
    actor_user_id: input.actorUserId,
    actor_label: input.actorLabel.trim().slice(0, 120) || null,
    note: input.note?.trim().slice(0, 1000) || null,
  });
  if (eventError) {
    const rollback: Database["public"]["Tables"]["venue_service_requests"]["Update"] = { status: current.status };
    if (input.nextStatus === "ACKNOWLEDGED") rollback.acknowledged_at = null;
    if (input.nextStatus === "ASSIGNED") rollback.assigned_at = null;
    if (input.nextStatus === "EN_ROUTE") rollback.en_route_at = null;
    if (input.nextStatus === "IN_PROGRESS") rollback.in_progress_at = null;
    if (input.nextStatus === "RESOLVED") {
      rollback.resolved_at = null;
      rollback.resolution_note = current.resolutionNote;
    }
    await supabase.from("venue_service_requests").update(rollback).eq("id", current.id).eq("status", input.nextStatus);
    throw new Error(eventError.message);
  }

  return mapRequest(updated as RequestRow);
}
