import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canTransitionVenueServiceRequest,
  maintenanceSeverityToWorkOrderPriority,
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

describe("Venue Service Requests domain", () => {
  it("keeps the approved first types and future routing types in one contract", () => {
    assert.deepEqual(VENUE_SERVICE_REQUEST_TYPES.slice(0, 2), ["TRAINER_ASSISTANCE", "MAINTENANCE_FIELD_ISSUE"]);
    for (const type of ["SECURITY", "TOURNAMENT_DIRECTOR", "VENUE_STAFF", "EMT", "CUSTODIAL", "IT_AV"]) {
      assert(VENUE_SERVICE_REQUEST_TYPES.includes(type as (typeof VENUE_SERVICE_REQUEST_TYPES)[number]));
    }
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
  });

  it("accepts only storage object paths for future photo support", () => {
    assert.match(migration, /photo_path text check/);
    assert.match(migration, /photo_path !~ '\^\[a-z\]\+:\/\/'/);
  });
});
