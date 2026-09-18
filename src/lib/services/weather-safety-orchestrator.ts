import type { FieldStatus } from "../types.ts";
import {
  beginLightningAllClearRecovery,
  finalizeLightningAllClear,
  planManualLightningHold,
  type WeatherSafetyIncident,
  type WeatherSafetyProviderHealth,
  type WeatherSafetySource,
} from "./weather-safety-core.ts";
import {
  resolveWeatherSafetyScope,
  type WeatherSafetyCanonicalField,
  type WeatherSafetyCanonicalSession,
  type WeatherSafetyCanonicalVenue,
} from "./weather-safety-scope.ts";

export type WeatherSafetyScopeSnapshot = {
  venue: WeatherSafetyCanonicalVenue | null;
  fields: WeatherSafetyCanonicalField[];
  sessions: WeatherSafetyCanonicalSession[];
};

export type WeatherSafetyFieldProjectionOutcome = {
  fieldId: string;
  status: FieldStatus;
  mutated: boolean;
};

export type DeclareManualLightningHoldCommand = {
  operationId: string;
  organizationId: string;
  venueId: string;
  actorUserId: string;
  providerHealth: WeatherSafetyProviderHealth;
  source?: WeatherSafetySource;
  fieldIds: string[];
  sessionIds: string[];
  declaredAt?: string;
  nextUpdateAt?: string | null;
  clearanceCriteria?: string | null;
};

export type ClearLightningHoldCommand = {
  incidentId: string;
  operationId: string;
  organizationId: string;
  venueId: string;
  actorUserId: string;
  clearedAt?: string;
};

export type WeatherSafetyOrchestrationResult = {
  incident: WeatherSafetyIncident;
  fieldProjections: WeatherSafetyFieldProjectionOutcome[];
};

export type WeatherSafetyOperationErrorCode =
  | "active_incident_exists"
  | "incident_not_found"
  | "scope_denied"
  | "plan_denied"
  | "clear_operation_conflict";

export class WeatherSafetyOperationError extends Error {
  constructor(
    public readonly code: WeatherSafetyOperationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WeatherSafetyOperationError";
  }
}

export type WeatherSafetyOrchestratorDependencies = {
  authorizeVenueIncident(actorUserId: string, venueId: string): Promise<void>;
  loadScopeSnapshot(input: {
    organizationId: string;
    venueId: string;
    fieldIds: string[];
    sessionIds: string[];
  }): Promise<WeatherSafetyScopeSnapshot>;
  findIncidentByDeclareOperation(input: {
    organizationId: string;
    venueId: string;
    operationId: string;
  }): Promise<WeatherSafetyIncident | null>;
  findActiveIncident(input: {
    organizationId: string;
    venueId: string;
    incidentType: WeatherSafetyIncident["type"];
  }): Promise<WeatherSafetyIncident | null>;
  insertIncident(incident: WeatherSafetyIncident): Promise<WeatherSafetyIncident>;
  getIncident(input: {
    incidentId: string;
    organizationId: string;
    venueId: string;
  }): Promise<WeatherSafetyIncident | null>;
  claimClearOperation(input: {
    incident: WeatherSafetyIncident;
    operationId: string;
  }): Promise<WeatherSafetyIncident>;
  saveClearedIncident(incident: WeatherSafetyIncident): Promise<WeatherSafetyIncident>;
  ensureFieldStatus(
    fieldId: string,
    status: FieldStatus,
    actorUserId: string,
  ): Promise<{ mutated: boolean }>;
  newIncidentId(): string;
  now(): string;
};

function setsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function assertRetryMatchesIncident(
  incident: WeatherSafetyIncident,
  command: DeclareManualLightningHoldCommand,
) {
  if (
    incident.organizationId !== command.organizationId
    || incident.venueId !== command.venueId
    || !setsEqual(incident.affectedFieldIds, command.fieldIds)
    || !setsEqual(incident.affectedSessionIds, command.sessionIds)
  ) {
    throw new WeatherSafetyOperationError(
      "plan_denied",
      "The declaration operation already exists with different incident targets.",
    );
  }
}

function deniedPlan(reason: string): never {
  throw new WeatherSafetyOperationError("plan_denied", `Weather & Safety plan denied: ${reason}.`);
}

export function createWeatherSafetyOrchestrator(deps: WeatherSafetyOrchestratorDependencies) {
  async function projectFieldUpdates(
    updates: Array<{ fieldId: string; status: FieldStatus }>,
    actorUserId: string,
  ) {
    const outcomes: WeatherSafetyFieldProjectionOutcome[] = [];
    for (const update of updates) {
      const result = await deps.ensureFieldStatus(update.fieldId, update.status, actorUserId);
      outcomes.push({ ...update, mutated: result.mutated });
    }
    return outcomes;
  }

  async function declareManualLightningHold(
    command: DeclareManualLightningHoldCommand,
  ): Promise<WeatherSafetyOrchestrationResult> {
    // Authorization precedes every durable or operational write. Retried no-op
    // projections are authorized again instead of becoming a bypass.
    await deps.authorizeVenueIncident(command.actorUserId, command.venueId);

    const retry = await deps.findIncidentByDeclareOperation({
      organizationId: command.organizationId,
      venueId: command.venueId,
      operationId: command.operationId,
    });
    if (retry) {
      assertRetryMatchesIncident(retry, command);
      if (retry.status === "cleared") {
        return { incident: retry, fieldProjections: [] };
      }

      const fieldProjections = await projectFieldUpdates(
        retry.affectedFieldIds.map((fieldId) => ({ fieldId, status: "delayed" as const })),
        command.actorUserId,
      );
      return { incident: retry, fieldProjections };
    }

    const existingActive = await deps.findActiveIncident({
      organizationId: command.organizationId,
      venueId: command.venueId,
      incidentType: "LIGHTNING_HOLD",
    });
    if (existingActive) {
      throw new WeatherSafetyOperationError(
        "active_incident_exists",
        `Venue ${command.venueId} already has an active Lightning Hold.`,
      );
    }

    const snapshot = await deps.loadScopeSnapshot({
      organizationId: command.organizationId,
      venueId: command.venueId,
      fieldIds: command.fieldIds,
      sessionIds: command.sessionIds,
    });
    const scope = resolveWeatherSafetyScope({
      organizationId: command.organizationId,
      venueId: command.venueId,
      requestedFieldIds: command.fieldIds,
      requestedSessionIds: command.sessionIds,
      ...snapshot,
    });
    if (!scope.ok) {
      throw new WeatherSafetyOperationError(
        "scope_denied",
        `Weather & Safety scope denied: ${scope.reason}.`,
      );
    }

    const planned = planManualLightningHold({
      incidentId: deps.newIncidentId(),
      operationId: command.operationId,
      organizationId: command.organizationId,
      venueId: command.venueId,
      actorUserId: command.actorUserId,
      authorized: true,
      providerHealth: command.providerHealth,
      source: command.source ?? "manual",
      declaredAt: command.declaredAt ?? deps.now(),
      nextUpdateAt: command.nextUpdateAt,
      clearanceCriteria: command.clearanceCriteria,
      fields: scope.fields,
      sessions: scope.sessions,
    });
    if (!planned.ok) deniedPlan(planned.reason);

    // Persist incident truth and the recovery snapshot before touching a field.
    // If a projection fails, a same-operation retry resumes from this record.
    const incident = await deps.insertIncident(planned.plan.incident);
    const fieldProjections = await projectFieldUpdates(planned.plan.fieldUpdates, command.actorUserId);
    return { incident, fieldProjections };
  }

  async function clearLightningHold(
    command: ClearLightningHoldCommand,
  ): Promise<WeatherSafetyOrchestrationResult> {
    await deps.authorizeVenueIncident(command.actorUserId, command.venueId);

    const incident = await deps.getIncident({
      incidentId: command.incidentId,
      organizationId: command.organizationId,
      venueId: command.venueId,
    });
    if (!incident) {
      throw new WeatherSafetyOperationError(
        "incident_not_found",
        `Weather & Safety incident ${command.incidentId} was not found in the requested scope.`,
      );
    }

    if (incident.status === "cleared") {
      if (incident.clearOperationId !== command.operationId) {
        throw new WeatherSafetyOperationError(
          "clear_operation_conflict",
          "The incident was already cleared by a different operation.",
        );
      }
      return { incident, fieldProjections: [] };
    }

    const begin = beginLightningAllClearRecovery({
      incident,
      operationId: command.operationId,
      actorUserId: command.actorUserId,
      authorized: true,
    });
    if (!begin.ok) {
      if (begin.reason === "clear_operation_conflict") {
        throw new WeatherSafetyOperationError("clear_operation_conflict", "A different All Clear operation already owns recovery.");
      }
      deniedPlan(begin.reason);
    }

    // Claim the operation durably before restoring any field. The server
    // adapter must implement this as compare-and-set so two clear commands
    // cannot overwrite each other under concurrency.
    const claimed = await deps.claimClearOperation({
      incident: begin.plan.incident,
      operationId: command.operationId,
    });

    const recovery = beginLightningAllClearRecovery({
      incident: claimed,
      operationId: command.operationId,
      actorUserId: command.actorUserId,
      authorized: true,
    });
    if (!recovery.ok) {
      if (recovery.reason === "clear_operation_conflict") {
        throw new WeatherSafetyOperationError("clear_operation_conflict", "A different All Clear operation already owns recovery.");
      }
      deniedPlan(recovery.reason);
    }

    const fieldProjections = await projectFieldUpdates(recovery.plan.fieldUpdates, command.actorUserId);
    const finalized = finalizeLightningAllClear({
      incident: claimed,
      operationId: command.operationId,
      actorUserId: command.actorUserId,
      authorized: true,
      clearedAt: command.clearedAt ?? deps.now(),
      recoveredFieldIds: fieldProjections.map((projection) => projection.fieldId),
    });
    if (!finalized.ok) {
      if (finalized.reason === "clear_operation_conflict") {
        throw new WeatherSafetyOperationError("clear_operation_conflict", "A different All Clear operation already owns recovery.");
      }
      deniedPlan(finalized.reason);
    }

    const saved = await deps.saveClearedIncident(finalized.plan.incident);
    return { incident: saved, fieldProjections };
  }

  return {
    declareManualLightningHold,
    clearLightningHold,
  };
}
