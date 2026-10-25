import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canTransitionVenueServiceRequest,
  deriveVenueServiceRequestPriority,
  isVenueServiceOperationalImpact,
  maintenanceSeverityToWorkOrderPriority,
  PHASE_ONE_VENUE_SERVICE_REQUEST_TYPES,
  PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES,
  TRAINER_DISPATCH_NOTICE,
  VENUE_SERVICE_REQUEST_TYPES,
} from "../src/lib/services/venue-service-request-core.ts";

const migration = readFileSync(
  "supabase/migrations/20260924140226_venue_service_requests_foundation.sql",
  "utf8",
);
const publicAction = readFileSync("src/app/fields/[fieldId]/service-request/actions.ts", "utf8");
const publicForm = readFileSync("src/app/fields/[fieldId]/service-request/request-form.tsx", "utf8");
const fieldPage = readFileSync("src/app/fields/[fieldId]/page.tsx", "utf8");
const accessNavigation = readFileSync("src/lib/access/navigation.ts", "utf8");
const adminAction = readFileSync("src/app/admin/service-requests/actions.ts", "utf8");

describe("Venue Service Requests domain", () => {
  it("keeps Phase 1 user-facing types separate from the exact Phase 2 roadmap contract", () => {
    assert.deepEqual(PHASE_ONE_VENUE_SERVICE_REQUEST_TYPES, ["TRAINER_ASSISTANCE", "MAINTENANCE_FIELD_ISSUE"]);
    assert.deepEqual(PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES, [
      "SECURITY_ASSISTANCE",
      "TOURNAMENT_VENUE_DIRECTOR_ASSISTANCE",
      "OFFICIALS_ASSISTANCE",
      "TECHNOLOGY_AV_SUPPORT",
      "CUSTODIAL_FACILITY_SERVICE",
      "GAME_OPERATIONS_ASSISTANCE",
    ]);
    assert.deepEqual(VENUE_SERVICE_REQUEST_TYPES, [
      ...PHASE_ONE_VENUE_SERVICE_REQUEST_TYPES,
      ...PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES,
    ]);
  });

  it("allows request-type-appropriate status transitions", () => {
    assert.equal(canTransitionVenueServiceRequest("TRAINER_ASSISTANCE", "REQUESTED", "ACKNOWLEDGED"), true);
    assert.equal(canTransitionVenueServiceRequest("TRAINER_ASSISTANCE", "ACKNOWLEDGED", "EN_ROUTE"), true);
    assert.equal(canTransitionVenueServiceRequest("TRAINER_ASSISTANCE", "ACKNOWLEDGED", "ASSIGNED"), false);
    assert.equal(canTransitionVenueServiceRequest("MAINTENANCE_FIELD_ISSUE", "REQUESTED", "ASSIGNED"), true);
    assert.equal(canTransitionVenueServiceRequest("MAINTENANCE_FIELD_ISSUE", "ACKNOWLEDGED", "EN_ROUTE"), false);
    assert.equal(canTransitionVenueServiceRequest("TRAINER_ASSISTANCE", "RESOLVED", "IN_PROGRESS"), false);
  });

  it("maps operational impact to existing Work Order priority", () => {
    assert.equal(maintenanceSeverityToWorkOrderPriority("SAFETY"), "urgent");
    assert.equal(maintenanceSeverityToWorkOrderPriority("GAME_BLOCKING"), "high");
    assert.equal(maintenanceSeverityToWorkOrderPriority("NEEDS_ATTENTION"), "normal");
    assert.equal(maintenanceSeverityToWorkOrderPriority("ROUTINE"), "low");
    assert.equal(deriveVenueServiceRequestPriority({ operationalImpact: "GAME_CANNOT_START_CONTINUE" }), "URGENT");
    assert.equal(deriveVenueServiceRequestPriority({ severity: "SAFETY" }), "URGENT");
    assert.equal(deriveVenueServiceRequestPriority({ severity: "ROUTINE" }), "LOW");
  });

  it("models game stoppage as a cross-cutting impact signal, not a request queue", () => {
    assert.equal(isVenueServiceOperationalImpact("GAME_CANNOT_START_CONTINUE"), true);
    assert.equal(VENUE_SERVICE_REQUEST_TYPES.includes("GAME_CANNOT_START_CONTINUE" as never), false);
    assert.match(publicForm, /name="operational_impact" type="checkbox" value="GAME_CANNOT_START_CONTINUE"/);
  });

  it("exposes only Phase 1 types in the public workflow", () => {
    for (const type of PHASE_TWO_VENUE_SERVICE_REQUEST_TYPES) {
      assert.doesNotMatch(publicForm, new RegExp(type));
    }
    assert.match(publicAction, /requestTypeValue !== "TRAINER_ASSISTANCE" && requestTypeValue !== "MAINTENANCE_FIELD_ISSUE"/);
  });

  it("keeps trainer assistance dispatch-only with emergency guidance", () => {
    assert.match(TRAINER_DISPATCH_NOTICE, /alerts venue staff/i);
    assert.match(TRAINER_DISPATCH_NOTICE, /not medical diagnosis or treatment/i);
    assert.match(TRAINER_DISPATCH_NOTICE, /911/);
    assert.doesNotMatch(publicForm, /diagnos|injury description|treatment details/i);
    assert.match(publicAction, /requestTypeValue === "MAINTENANCE_FIELD_ISSUE" \? String\(formData\.get\("note"\)/);
  });

  it("prefills field and current game context from the public field page", () => {
    assert.match(fieldPage, /\/service-request\$\{currentSession \? `\?sessionId=\$\{currentSession\.id\}`/);
    assert.match(publicForm, /name="field_id" type="hidden" value=\{fieldId\}/);
    assert.match(publicForm, /name="session_id" type="hidden" value=\{sessionId \?\? ""\}/);
  });

  it("rate-limits the public create action by caller and field", () => {
    assert.match(publicAction, /rateLimit\(`venue-service-request:\$\{clientIpFromHeaders\(requestHeaders\)\}:\$\{fieldId\}`/);
    assert.match(publicAction, /6, 10 \* 60_000/);
  });

  it("routes the queue through the existing Venue/Field Ops capability", () => {
    assert.match(accessNavigation, /href: "\/admin\/service-requests"[\s\S]*canViewCommandCenter/);
    assert.match(accessNavigation, /prefix: "\/admin\/service-requests"[\s\S]*canViewCommandCenter/);
  });

  it("guards transitions by durable venue scope even after a field is deleted", () => {
    assert.match(adminAction, /getVenueServiceRequestById\(requestId\)/);
    assert.match(adminAction, /assertVenueInScope\(request\.venueId\)/);
    assert.doesNotMatch(adminAction, /assertFieldInScope\(request\.fieldId\)/);
  });
});

describe("Venue Service Requests schema boundary", () => {
  it("enables RLS and keeps public Data API roles deny-by-default", () => {
    assert.match(migration, /alter table public\.venue_service_requests enable row level security/);
    assert.match(migration, /revoke all on table public\.venue_service_requests from public, anon, authenticated/);
    assert.match(migration, /grant select, insert, update, delete on table public\.venue_service_requests to service_role/);
  });

  it("validates organization, venue, field, and session scope in the database", () => {
    assert.match(migration, /validate_venue_service_request_scope/);
    assert.match(migration, /field_venue_id is distinct from new\.venue_id/);
    assert.match(migration, /session_field_id is distinct from new\.field_id/);
    assert.match(migration, /session_org_id is distinct from new\.organization_id/);
  });

  it("preserves append-only lifecycle history and links maintenance to Work Orders", () => {
    assert.match(migration, /create table public\.venue_service_request_events/);
    assert.match(migration, /events are append-only/);
    assert.match(migration, /field_work_order_id uuid unique references public\.field_work_orders/);
    assert.match(migration, /sync_venue_service_request_work_order/);
    assert.match(migration, /when new\.status = 'RESOLVED' then 'done'/);
    assert.match(migration, /raise exception 'Venue service request work order scope does not match the request field'/);
  });

  it("supports shared priority, ownership, resolution, and operational-impact fields", () => {
    assert.match(migration, /priority text not null default 'NORMAL'/);
    assert.match(migration, /operational_impact text check \(operational_impact is null or operational_impact = 'GAME_CANNOT_START_CONTINUE'\)/);
    assert.match(migration, /assigned_role text check/);
    assert.match(migration, /assigned_to_user_id uuid references public\.users/);
    assert.match(migration, /resolution_note text check/);
  });

  it("accepts only storage object paths for future photo support", () => {
    assert.match(migration, /photo_path text check/);
    assert.match(migration, /photo_path !~ '\^\[a-z\]\+:\/\/'/);
  });
});
