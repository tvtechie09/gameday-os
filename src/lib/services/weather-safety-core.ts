import type { FieldStatus, SessionStatus } from "../types.ts";

export const WEATHER_SAFETY_INCIDENT_TYPES = ["LIGHTNING_HOLD"] as const;
export type WeatherSafetyIncidentType = (typeof WEATHER_SAFETY_INCIDENT_TYPES)[number];

export const WEATHER_SAFETY_PROVIDER_HEALTH_VALUES = ["online", "offline", "unavailable"] as const;
export type WeatherSafetyProviderHealth = (typeof WEATHER_SAFETY_PROVIDER_HEALTH_VALUES)[number];
export type WeatherSafetyIncidentStatus = "active" | "cleared";
export type WeatherSafetySource = "manual" | "automatic";
export type WeatherSafetyTransitionType = "declared" | "cleared" | "delivery_failed" | "delivery_succeeded";

export type WeatherSafetyFieldTarget = {
  fieldId: string;
  organizationId: string;
  venueId: string;
  status: FieldStatus;
};

export type WeatherSafetySessionTarget = {
  sessionId: string;
  organizationId: string;
  venueId: string;
  fieldId: string;
  status: SessionStatus;
};

export type WeatherSafetyTransition = {
  type: WeatherSafetyTransitionType;
  at: string;
  actorUserId: string | null;
  detail?: string;
};

export type WeatherSafetyIncident = {
  id: string;
  type: WeatherSafetyIncidentType;
  status: WeatherSafetyIncidentStatus;
  organizationId: string;
  venueId: string;
  source: WeatherSafetySource;
  providerHealth: WeatherSafetyProviderHealth;
  declareOperationId: string;
  clearOperationId: string | null;
  declaredByUserId: string;
  declaredAt: string;
  clearedByUserId: string | null;
  clearedAt: string | null;
  nextUpdateAt: string | null;
  clearanceCriteria: string | null;
  affectedFieldIds: string[];
  affectedSessionIds: string[];
  priorFieldStates: Record<string, FieldStatus>;
  sessionLifecycleStates: Record<string, SessionStatus>;
  history: WeatherSafetyTransition[];
};

export type WeatherSafetyFieldProjection = {
  fieldId: string;
  status: FieldStatus;
};

export type WeatherSafetySessionOverlay = {
  sessionId: string;
  hold: boolean;
};

export type WeatherSafetyMutationPlan = {
  incident: WeatherSafetyIncident;
  fieldUpdates: WeatherSafetyFieldProjection[];
  sessionOverlays: WeatherSafetySessionOverlay[];
};

export type WeatherSafetyDenied = {
  ok: false;
  reason:
    | "not_authorized"
    | "scope_mismatch"
    | "incident_not_active"
    | "missing_prior_state"
    | "clear_operation_conflict"
    | "recovery_not_started"
    | "recovery_incomplete";
};

export type WeatherSafetyPlanned = {
  ok: true;
  plan: WeatherSafetyMutationPlan;
};

export type WeatherSafetyPlanResult = WeatherSafetyDenied | WeatherSafetyPlanned;

export type DeclareLightningHoldInput = {
  incidentId: string;
  operationId: string;
  organizationId: string;
  venueId: string;
  actorUserId: string;
  authorized: boolean;
  providerHealth: WeatherSafetyProviderHealth;
  source: WeatherSafetySource;
  declaredAt: string;
  nextUpdateAt?: string | null;
  clearanceCriteria?: string | null;
  fields: WeatherSafetyFieldTarget[];
  sessions: WeatherSafetySessionTarget[];
};

function targetsMatchScope(
  organizationId: string,
  venueId: string,
  fields: WeatherSafetyFieldTarget[],
  sessions: WeatherSafetySessionTarget[],
) {
  return fields.every((field) => field.organizationId === organizationId && field.venueId === venueId)
    && sessions.every((session) => session.organizationId === organizationId && session.venueId === venueId);
}

function hasCompleteRecoverySnapshot(incident: WeatherSafetyIncident) {
  return incident.affectedFieldIds.every((fieldId) =>
    Object.prototype.hasOwnProperty.call(incident.priorFieldStates, fieldId),
  );
}

function priorFieldRecoveryUpdates(incident: WeatherSafetyIncident): WeatherSafetyFieldProjection[] {
  return incident.affectedFieldIds.map((fieldId) => ({
    fieldId,
    status: incident.priorFieldStates[fieldId],
  }));
}

export function planManualLightningHold(input: DeclareLightningHoldInput): WeatherSafetyPlanResult {
  if (!input.authorized) {
    return { ok: false, reason: "not_authorized" };
  }

  if (!targetsMatchScope(input.organizationId, input.venueId, input.fields, input.sessions)) {
    return { ok: false, reason: "scope_mismatch" };
  }

  const priorFieldStates = Object.fromEntries(input.fields.map((field) => [field.fieldId, field.status])) as Record<string, FieldStatus>;
  const sessionLifecycleStates = Object.fromEntries(input.sessions.map((session) => [session.sessionId, session.status])) as Record<string, SessionStatus>;

  const incident: WeatherSafetyIncident = {
    id: input.incidentId,
    type: "LIGHTNING_HOLD",
    status: "active",
    organizationId: input.organizationId,
    venueId: input.venueId,
    source: input.source,
    providerHealth: input.providerHealth,
    declareOperationId: input.operationId,
    clearOperationId: null,
    declaredByUserId: input.actorUserId,
    declaredAt: input.declaredAt,
    clearedByUserId: null,
    clearedAt: null,
    nextUpdateAt: input.nextUpdateAt ?? null,
    clearanceCriteria: input.clearanceCriteria ?? null,
    affectedFieldIds: input.fields.map((field) => field.fieldId),
    affectedSessionIds: input.sessions.map((session) => session.sessionId),
    priorFieldStates,
    sessionLifecycleStates,
    history: [
      {
        type: "declared",
        at: input.declaredAt,
        actorUserId: input.actorUserId,
        detail: `provider:${input.providerHealth};source:${input.source}`,
      },
    ],
  };

  return {
    ok: true,
    plan: {
      incident,
      fieldUpdates: input.fields.map((field) => ({ fieldId: field.fieldId, status: "delayed" })),
      sessionOverlays: input.sessions.map((session) => ({ sessionId: session.sessionId, hold: true })),
    },
  };
}

export type BeginLightningAllClearRecoveryInput = {
  incident: WeatherSafetyIncident;
  operationId: string;
  actorUserId: string;
  authorized: boolean;
};

export function beginLightningAllClearRecovery(
  input: BeginLightningAllClearRecoveryInput,
): WeatherSafetyPlanResult {
  if (!input.authorized) {
    return { ok: false, reason: "not_authorized" };
  }

  if (input.incident.status !== "active") {
    return { ok: false, reason: "incident_not_active" };
  }

  if (!hasCompleteRecoverySnapshot(input.incident)) {
    return { ok: false, reason: "missing_prior_state" };
  }

  if (
    input.incident.clearOperationId !== null
    && input.incident.clearOperationId !== input.operationId
  ) {
    return { ok: false, reason: "clear_operation_conflict" };
  }

  const incident: WeatherSafetyIncident = input.incident.clearOperationId === input.operationId
    ? input.incident
    : {
        ...input.incident,
        clearOperationId: input.operationId,
      };

  return {
    ok: true,
    plan: {
      incident,
      fieldUpdates: priorFieldRecoveryUpdates(incident),
      sessionOverlays: [],
    },
  };
}

export type FinalizeLightningAllClearInput = {
  incident: WeatherSafetyIncident;
  operationId: string;
  actorUserId: string;
  authorized: boolean;
  clearedAt: string;
  recoveredFieldIds: string[];
};

export function finalizeLightningAllClear(input: FinalizeLightningAllClearInput): WeatherSafetyPlanResult {
  if (!input.authorized) {
    return { ok: false, reason: "not_authorized" };
  }

  if (input.incident.status === "cleared") {
    if (input.incident.clearOperationId !== input.operationId) {
      return { ok: false, reason: "clear_operation_conflict" };
    }

    return {
      ok: true,
      plan: {
        incident: input.incident,
        fieldUpdates: [],
        sessionOverlays: [],
      },
    };
  }

  if (input.incident.clearOperationId === null) {
    return { ok: false, reason: "recovery_not_started" };
  }

  if (input.incident.clearOperationId !== input.operationId) {
    return { ok: false, reason: "clear_operation_conflict" };
  }

  if (!hasCompleteRecoverySnapshot(input.incident)) {
    return { ok: false, reason: "missing_prior_state" };
  }

  const recoveredFieldIds = new Set(input.recoveredFieldIds);
  if (!input.incident.affectedFieldIds.every((fieldId) => recoveredFieldIds.has(fieldId))) {
    return { ok: false, reason: "recovery_incomplete" };
  }

  const incident: WeatherSafetyIncident = {
    ...input.incident,
    status: "cleared",
    clearedByUserId: input.actorUserId,
    clearedAt: input.clearedAt,
    history: [
      ...input.incident.history,
      { type: "cleared", at: input.clearedAt, actorUserId: input.actorUserId },
    ],
  };

  return {
    ok: true,
    plan: {
      incident,
      fieldUpdates: [],
      sessionOverlays: input.incident.affectedSessionIds.map((sessionId) => ({ sessionId, hold: false })),
    },
  };
}

export function recordWeatherSafetyDelivery(
  incident: WeatherSafetyIncident,
  input: { delivered: boolean; at: string; detail?: string },
): WeatherSafetyIncident {
  return {
    ...incident,
    history: [
      ...incident.history,
      {
        type: input.delivered ? "delivery_succeeded" : "delivery_failed",
        at: input.at,
        actorUserId: null,
        detail: input.detail,
      },
    ],
  };
}

export type WeatherSafetyScopedView = {
  incidentId: string;
  status: WeatherSafetyIncidentStatus;
  providerHealth: WeatherSafetyProviderHealth;
  source: WeatherSafetySource;
  affectedSessionIds: string[];
  nextUpdateAt: string | null;
  clearanceCriteria: string | null;
};

export function projectWeatherSafetyForSessions(
  incident: WeatherSafetyIncident,
  relevantSessionIds: string[],
): WeatherSafetyScopedView | null {
  const relevant = new Set(relevantSessionIds);
  const affectedSessionIds = incident.affectedSessionIds.filter((sessionId) => relevant.has(sessionId));
  if (affectedSessionIds.length === 0) {
    return null;
  }

  return {
    incidentId: incident.id,
    status: incident.status,
    providerHealth: incident.providerHealth,
    source: incident.source,
    affectedSessionIds,
    nextUpdateAt: incident.nextUpdateAt,
    clearanceCriteria: incident.clearanceCriteria,
  };
}
