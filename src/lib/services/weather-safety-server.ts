import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { FieldStatus, SessionStatus } from "../types.ts";
import { fieldStatuses, readFieldStatus } from "./fields.ts";
import { assertActorUserId, requirePermission } from "./identity.ts";
import type {
  WeatherSafetyIncident,
  WeatherSafetyTransition,
  WeatherSafetyTransitionType,
} from "./weather-safety-core.ts";
import { ensureWeatherSafetyFieldStatus } from "./weather-safety-fields.ts";
import {
  createWeatherSafetyOrchestrator,
  WeatherSafetyOperationError,
  type WeatherSafetyOrchestratorDependencies,
} from "./weather-safety-orchestrator.ts";

const sessionStatuses: SessionStatus[] = ["scheduled", "active", "final"];
const transitionTypes: WeatherSafetyTransitionType[] = ["declared", "cleared", "delivery_failed", "delivery_succeeded"];

// The migration in this PR intentionally lands before a generated Supabase
// type refresh. Keep the temporary storage schema local to this server-only
// adapter; once staging is migrated, the normal generated Database type can
// absorb this table without changing the orchestrator contract.
type WeatherSafetyIncidentRow = {
  id: string;
  organization_id: string;
  venue_id: string;
  incident_type: "LIGHTNING_HOLD";
  status: "active" | "cleared";
  source: "manual" | "automatic";
  provider_health: "online" | "offline" | "unavailable";
  declare_operation_id: string;
  clear_operation_id: string | null;
  declared_by_user_id: string;
  declared_at: string;
  cleared_by_user_id: string | null;
  cleared_at: string | null;
  next_update_at: string | null;
  clearance_criteria: string | null;
  affected_field_ids: Json;
  affected_session_ids: Json;
  prior_field_states: Json;
  session_lifecycle_states: Json;
  history: Json;
  created_at: string;
  updated_at: string;
};

type WeatherSafetyIncidentInsert = Omit<WeatherSafetyIncidentRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

type WeatherSafetyIncidentUpdate = Partial<WeatherSafetyIncidentInsert>;

type WeatherSafetyStorageDatabase = {
  public: {
    Tables: {
      weather_safety_incidents: {
        Row: WeatherSafetyIncidentRow;
        Insert: WeatherSafetyIncidentInsert;
        Update: WeatherSafetyIncidentUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function getWeatherSafetyStorageClient() {
  return getSupabaseAdminClient() as unknown as SupabaseClient<WeatherSafetyStorageDatabase>;
}

function requireJsonObject(value: Json, label: string) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`Invalid ${label} on Weather & Safety incident.`);
  }
  return value;
}

function readStringArray(value: Json, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid ${label} on Weather & Safety incident.`);
  }
  return value as string[];
}

function readFieldStates(value: Json) {
  const object = requireJsonObject(value, "prior_field_states");
  const result: Record<string, FieldStatus> = {};
  for (const [key, item] of Object.entries(object)) {
    if (typeof item !== "string" || !fieldStatuses.includes(item as FieldStatus)) {
      throw new Error(`Invalid prior field status for ${key}.`);
    }
    result[key] = item as FieldStatus;
  }
  return result;
}

function readSessionStates(value: Json) {
  const object = requireJsonObject(value, "session_lifecycle_states");
  const result: Record<string, SessionStatus> = {};
  for (const [key, item] of Object.entries(object)) {
    if (typeof item !== "string" || !sessionStatuses.includes(item as SessionStatus)) {
      throw new Error(`Invalid session lifecycle status for ${key}.`);
    }
    result[key] = item as SessionStatus;
  }
  return result;
}

function readHistory(value: Json): WeatherSafetyTransition[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid history on Weather & Safety incident.");
  }

  return value.map((item) => {
    const object = requireJsonObject(item, "history entry");
    const type = object.type;
    const at = object.at;
    const actorUserId = object.actorUserId;
    const detail = object.detail;
    if (
      typeof type !== "string"
      || !transitionTypes.includes(type as WeatherSafetyTransitionType)
      || typeof at !== "string"
      || !(actorUserId === null || typeof actorUserId === "string")
      || !(detail === null || detail === undefined || typeof detail === "string")
    ) {
      throw new Error("Invalid history entry on Weather & Safety incident.");
    }
    return {
      type: type as WeatherSafetyTransitionType,
      at,
      actorUserId,
      ...(typeof detail === "string" ? { detail } : {}),
    };
  });
}

function mapIncident(row: WeatherSafetyIncidentRow): WeatherSafetyIncident {
  return {
    id: row.id,
    type: row.incident_type,
    status: row.status,
    organizationId: row.organization_id,
    venueId: row.venue_id,
    source: row.source,
    providerHealth: row.provider_health,
    declareOperationId: row.declare_operation_id,
    clearOperationId: row.clear_operation_id,
    declaredByUserId: row.declared_by_user_id,
    declaredAt: row.declared_at,
    clearedByUserId: row.cleared_by_user_id,
    clearedAt: row.cleared_at,
    nextUpdateAt: row.next_update_at,
    clearanceCriteria: row.clearance_criteria,
    affectedFieldIds: readStringArray(row.affected_field_ids, "affected_field_ids"),
    affectedSessionIds: readStringArray(row.affected_session_ids, "affected_session_ids"),
    priorFieldStates: readFieldStates(row.prior_field_states),
    sessionLifecycleStates: readSessionStates(row.session_lifecycle_states),
    history: readHistory(row.history),
  };
}

function recordToJson(record: Record<string, string>): Json {
  return { ...record };
}

function historyToJson(history: WeatherSafetyTransition[]): Json {
  return history.map((entry) => ({
    type: entry.type,
    at: entry.at,
    actorUserId: entry.actorUserId,
    detail: entry.detail ?? null,
  }));
}

function incidentInsert(incident: WeatherSafetyIncident): WeatherSafetyIncidentInsert {
  return {
    id: incident.id,
    organization_id: incident.organizationId,
    venue_id: incident.venueId,
    incident_type: incident.type,
    status: incident.status,
    source: incident.source,
    provider_health: incident.providerHealth,
    declare_operation_id: incident.declareOperationId,
    clear_operation_id: incident.clearOperationId,
    declared_by_user_id: incident.declaredByUserId,
    declared_at: incident.declaredAt,
    cleared_by_user_id: incident.clearedByUserId,
    cleared_at: incident.clearedAt,
    next_update_at: incident.nextUpdateAt,
    clearance_criteria: incident.clearanceCriteria,
    affected_field_ids: [...incident.affectedFieldIds],
    affected_session_ids: [...incident.affectedSessionIds],
    prior_field_states: recordToJson(incident.priorFieldStates),
    session_lifecycle_states: recordToJson(incident.sessionLifecycleStates),
    history: historyToJson(incident.history),
  };
}

async function findIncidentByDeclareOperation(input: {
  organizationId: string;
  venueId: string;
  operationId: string;
}) {
  const { data, error } = await getWeatherSafetyStorageClient()
    .from("weather_safety_incidents")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("venue_id", input.venueId)
    .eq("declare_operation_id", input.operationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapIncident(data) : null;
}

async function findActiveIncident(input: {
  organizationId: string;
  venueId: string;
  incidentType: WeatherSafetyIncident["type"];
}) {
  const { data, error } = await getWeatherSafetyStorageClient()
    .from("weather_safety_incidents")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("venue_id", input.venueId)
    .eq("incident_type", input.incidentType)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapIncident(data) : null;
}

async function getIncident(input: { incidentId: string; organizationId: string; venueId: string }) {
  const { data, error } = await getWeatherSafetyStorageClient()
    .from("weather_safety_incidents")
    .select("*")
    .eq("id", input.incidentId)
    .eq("organization_id", input.organizationId)
    .eq("venue_id", input.venueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapIncident(data) : null;
}

async function loadScopeSnapshot(input: {
  organizationId: string;
  venueId: string;
  fieldIds: string[];
  sessionIds: string[];
}) {
  const supabase = getSupabaseAdminClient();
  const venueResult = await supabase
    .from("venues")
    .select("id,organization_id")
    .eq("id", input.venueId)
    .maybeSingle();
  if (venueResult.error) throw new Error(venueResult.error.message);

  const loadFields = async () => {
    if (input.fieldIds.length === 0) return [];
    const { data, error } = await supabase
      .from("fields")
      .select("id,organization_id,venue_id,field_status,status")
      .in("id", input.fieldIds);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      venueId: row.venue_id,
      status: readFieldStatus(row.field_status ?? row.status),
    }));
  };

  const loadSessions = async () => {
    if (input.sessionIds.length === 0) return [];
    const { data, error } = await supabase
      .from("sessions")
      .select("id,organization_id,field_id,status")
      .in("id", input.sessionIds);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      fieldId: row.field_id,
      status: sessionStatuses.includes(row.status as SessionStatus)
        ? row.status as SessionStatus
        : "scheduled" as const,
    }));
  };

  const [fields, sessions] = await Promise.all([loadFields(), loadSessions()]);
  return {
    venue: venueResult.data
      ? { id: venueResult.data.id, organizationId: venueResult.data.organization_id }
      : null,
    fields,
    sessions,
  };
}

const dependencies: WeatherSafetyOrchestratorDependencies = {
  async authorizeVenueIncident(actorUserId, venueId) {
    const actor = assertActorUserId(actorUserId);
    await requirePermission(actor, "venue.field.manage", "venue", venueId);
  },
  loadScopeSnapshot,
  findIncidentByDeclareOperation,
  findActiveIncident,
  async insertIncident(incident) {
    const { data, error } = await getWeatherSafetyStorageClient()
      .from("weather_safety_incidents")
      .insert(incidentInsert(incident))
      .select("*")
      .single();

    if (!error) return mapIncident(data);
    if (error.code === "23505") {
      const retry = await findIncidentByDeclareOperation({
        organizationId: incident.organizationId,
        venueId: incident.venueId,
        operationId: incident.declareOperationId,
      });
      if (retry) return retry;
      throw new WeatherSafetyOperationError(
        "active_incident_exists",
        `Venue ${incident.venueId} already has an active Lightning Hold.`,
      );
    }
    throw new Error(error.message);
  },
  getIncident,
  async claimClearOperation({ incident, operationId }) {
    const current = await getIncident({
      incidentId: incident.id,
      organizationId: incident.organizationId,
      venueId: incident.venueId,
    });
    if (!current) {
      throw new WeatherSafetyOperationError("incident_not_found", `Weather & Safety incident ${incident.id} was not found.`);
    }
    if (current.clearOperationId === operationId) return current;
    if (current.clearOperationId !== null) {
      throw new WeatherSafetyOperationError("clear_operation_conflict", "A different All Clear operation already owns recovery.");
    }

    const { data, error } = await getWeatherSafetyStorageClient()
      .from("weather_safety_incidents")
      .update({ clear_operation_id: operationId, updated_at: new Date().toISOString() })
      .eq("id", current.id)
      .eq("organization_id", current.organizationId)
      .eq("venue_id", current.venueId)
      .eq("status", "active")
      .is("clear_operation_id", null)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return mapIncident(data);

    const raced = await getIncident({
      incidentId: current.id,
      organizationId: current.organizationId,
      venueId: current.venueId,
    });
    if (raced?.clearOperationId === operationId) return raced;
    throw new WeatherSafetyOperationError("clear_operation_conflict", "A different All Clear operation already owns recovery.");
  },
  async saveClearedIncident(incident) {
    if (incident.status !== "cleared" || !incident.clearOperationId) {
      throw new Error("Cannot persist All Clear before the incident is fully finalized.");
    }

    const { data, error } = await getWeatherSafetyStorageClient()
      .from("weather_safety_incidents")
      .update({
        status: "cleared",
        cleared_by_user_id: incident.clearedByUserId,
        cleared_at: incident.clearedAt,
        history: historyToJson(incident.history),
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.id)
      .eq("organization_id", incident.organizationId)
      .eq("venue_id", incident.venueId)
      .eq("status", "active")
      .eq("clear_operation_id", incident.clearOperationId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return mapIncident(data);

    const existing = await getIncident({
      incidentId: incident.id,
      organizationId: incident.organizationId,
      venueId: incident.venueId,
    });
    if (existing?.status === "cleared" && existing.clearOperationId === incident.clearOperationId) {
      return existing;
    }
    throw new WeatherSafetyOperationError("clear_operation_conflict", "All Clear finalization lost its operation claim.");
  },
  async ensureFieldStatus(fieldId, status, actorUserId) {
    const result = await ensureWeatherSafetyFieldStatus(fieldId, status, actorUserId);
    return { mutated: result.mutated };
  },
  newIncidentId: randomUUID,
  now: () => new Date().toISOString(),
};

const serverWeatherSafetyOrchestrator = createWeatherSafetyOrchestrator(dependencies);

export const declareManualLightningHold = serverWeatherSafetyOrchestrator.declareManualLightningHold;
export const clearLightningHold = serverWeatherSafetyOrchestrator.clearLightningHold;
