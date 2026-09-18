import assert from "node:assert/strict";
import test from "node:test";
import type { FieldStatus } from "../src/lib/types.ts";
import type { WeatherSafetyIncident } from "../src/lib/services/weather-safety-core.ts";
import {
  createWeatherSafetyOrchestrator,
  WeatherSafetyOperationError,
  type WeatherSafetyOrchestratorDependencies,
} from "../src/lib/services/weather-safety-orchestrator.ts";

function createHarness() {
  let incident: WeatherSafetyIncident | null = null;
  let insertCount = 0;
  let saveCount = 0;
  let claimCount = 0;
  let authorized = true;
  let failFieldOnce: string | null = null;
  const fieldState = new Map<string, FieldStatus>([
    ["field-1", "open"],
    ["field-2", "maintenance"],
  ]);
  const events: string[] = [];

  const deps: WeatherSafetyOrchestratorDependencies = {
    async authorizeVenueIncident() {
      events.push("authorize");
      if (!authorized) throw new Error("not authorized");
    },
    async loadScopeSnapshot() {
      events.push("load-scope");
      return {
        venue: { id: "venue-a", organizationId: "org-a" },
        fields: [
          { id: "field-1", organizationId: "org-a", venueId: "venue-a", status: fieldState.get("field-1") ?? "open" },
          { id: "field-2", organizationId: "org-a", venueId: "venue-a", status: fieldState.get("field-2") ?? "open" },
        ],
        sessions: [
          { id: "game-1", organizationId: "org-a", fieldId: "field-1", status: "active" },
          { id: "game-2", organizationId: "org-a", fieldId: "field-2", status: "scheduled" },
        ],
      };
    },
    async findIncidentByDeclareOperation({ operationId }) {
      return incident?.declareOperationId === operationId ? incident : null;
    },
    async findActiveIncident() {
      return incident?.status === "active" ? incident : null;
    },
    async insertIncident(next) {
      events.push("insert");
      insertCount += 1;
      incident = next;
      return next;
    },
    async getIncident({ incidentId }) {
      return incident?.id === incidentId ? incident : null;
    },
    async claimClearOperation({ incident: next, operationId }) {
      events.push("claim-clear");
      claimCount += 1;
      if (incident?.clearOperationId && incident.clearOperationId !== operationId) {
        throw new WeatherSafetyOperationError("clear_operation_conflict", "conflict");
      }
      incident = { ...next, clearOperationId: operationId };
      return incident;
    },
    async saveClearedIncident(next) {
      events.push("save-cleared");
      saveCount += 1;
      incident = next;
      return next;
    },
    async ensureFieldStatus(fieldId, status) {
      events.push(`field:${fieldId}:${status}`);
      if (failFieldOnce === fieldId) {
        failFieldOnce = null;
        throw new Error(`simulated ${fieldId} projection failure`);
      }
      const mutated = fieldState.get(fieldId) !== status;
      fieldState.set(fieldId, status);
      return { mutated };
    },
    newIncidentId: () => "incident-1",
    now: () => "2026-09-18T02:00:00.000Z",
  };

  const orchestrator = createWeatherSafetyOrchestrator(deps);
  const declare = () => orchestrator.declareManualLightningHold({
    operationId: "declare-1",
    organizationId: "org-a",
    venueId: "venue-a",
    actorUserId: "gm-1",
    providerHealth: "offline",
    fieldIds: ["field-1", "field-2"],
    sessionIds: ["game-1", "game-2"],
  });

  return {
    orchestrator,
    declare,
    fieldState,
    events,
    get incident() { return incident; },
    get insertCount() { return insertCount; },
    get saveCount() { return saveCount; },
    get claimCount() { return claimCount; },
    setAuthorized(value: boolean) { authorized = value; },
    failNextField(fieldId: string) { failFieldOnce = fieldId; },
  };
}

test("manual hold persists incident truth before fields and same-operation retry resumes a partial projection", async () => {
  const harness = createHarness();
  harness.failNextField("field-2");

  await assert.rejects(harness.declare(), /simulated field-2 projection failure/);
  assert.equal(harness.insertCount, 1);
  assert.equal(harness.incident?.status, "active");
  assert.deepEqual(harness.incident?.priorFieldStates, { "field-1": "open", "field-2": "maintenance" });
  assert.ok(harness.events.indexOf("insert") < harness.events.indexOf("field:field-1:delayed"));
  assert.equal(harness.fieldState.get("field-1"), "delayed");
  assert.equal(harness.fieldState.get("field-2"), "maintenance");

  const retry = await harness.declare();
  assert.equal(harness.insertCount, 1, "retry must not create a second incident");
  assert.equal(retry.incident.id, "incident-1");
  assert.equal(harness.fieldState.get("field-1"), "delayed");
  assert.equal(harness.fieldState.get("field-2"), "delayed");
  assert.equal(retry.fieldProjections[0]?.mutated, false, "already-held field should be an authorized no-op");
});

test("All Clear claims the operation before recovery and same-operation retry completes after a partial failure", async () => {
  const harness = createHarness();
  await harness.declare();
  harness.events.length = 0;
  harness.failNextField("field-2");

  const clear = () => harness.orchestrator.clearLightningHold({
    incidentId: "incident-1",
    operationId: "clear-1",
    organizationId: "org-a",
    venueId: "venue-a",
    actorUserId: "gm-2",
  });

  await assert.rejects(clear(), /simulated field-2 projection failure/);
  assert.equal(harness.incident?.status, "active");
  assert.equal(harness.incident?.clearOperationId, "clear-1");
  assert.ok(harness.events.indexOf("claim-clear") < harness.events.indexOf("field:field-1:open"));
  assert.equal(harness.fieldState.get("field-1"), "open");
  assert.equal(harness.fieldState.get("field-2"), "delayed");
  assert.equal(harness.saveCount, 0);

  const retry = await clear();
  assert.equal(retry.incident.status, "cleared");
  assert.equal(retry.incident.history.filter((entry) => entry.type === "cleared").length, 1);
  assert.equal(harness.fieldState.get("field-1"), "open");
  assert.equal(harness.fieldState.get("field-2"), "maintenance");
  assert.equal(harness.saveCount, 1);
});

test("a competing All Clear operation fails closed without field recovery", async () => {
  const harness = createHarness();
  await harness.declare();
  harness.failNextField("field-2");

  await assert.rejects(
    harness.orchestrator.clearLightningHold({
      incidentId: "incident-1",
      operationId: "clear-1",
      organizationId: "org-a",
      venueId: "venue-a",
      actorUserId: "gm-2",
    }),
  );

  harness.events.length = 0;
  await assert.rejects(
    harness.orchestrator.clearLightningHold({
      incidentId: "incident-1",
      operationId: "clear-2",
      organizationId: "org-a",
      venueId: "venue-a",
      actorUserId: "gm-3",
    }),
    (error: unknown) => error instanceof WeatherSafetyOperationError && error.code === "clear_operation_conflict",
  );
  assert.equal(harness.events.some((event) => event.startsWith("field:")), false);
});

test("authorization failure happens before persistence or field mutation", async () => {
  const harness = createHarness();
  harness.setAuthorized(false);

  await assert.rejects(harness.declare(), /not authorized/);
  assert.equal(harness.insertCount, 0);
  assert.equal(harness.incident, null);
  assert.deepEqual(harness.events, ["authorize"]);
});
