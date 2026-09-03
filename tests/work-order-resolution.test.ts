import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/app/admin/fields/work-orders/actions.ts", "utf8");
const card = readFileSync("src/app/admin/fields/work-orders/work-order-card.tsx", "utf8");
const detail = readFileSync("src/app/admin/fields/work-orders/[workOrderId]/page.tsx", "utf8");
const fieldsBoard = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
const fieldsPage = readFileSync("src/app/admin/fields/page.tsx", "utf8");
const form = readFileSync("src/app/admin/fields/work-orders/work-order-form.tsx", "utf8");
const root = readFileSync("src/app/admin/fields/work-orders/page.tsx", "utf8");
const service = readFileSync("src/lib/services/work-orders.ts", "utf8");

test("every mutation requires an authenticated venue worker and object scope", () => {
  assert.match(actions, /requireWorker\(ctx\)/);
  assert.match(actions, /isOrgScoped\(ctx\)/);
  assert.match(actions, /canOpenCloseField\(ctx\)/);
  assert.match(actions, /assertVenueInScope\(order\.venueId\)/);
  assert.match(actions, /assertFieldInScope\(order\.fieldId\)/);
  assert.match(actions, /assertActorUserId\(ctx\.userId\)/);
});

test("assignment, escalation, and reopen remain management-only", () => {
  assert.match(actions, /managementOnly && !canManageVenueSettings\(ctx\)/);
  assert.match(actions, /authorizeOrder\(id, true\)/);
  assert.match(actions, /person\.venueIds\.includes\(order\.venueId\)/);
  assert.match(service, /scope_type", "venue"/);
  assert.match(service, /assignment_status", "approved"/);
  assert.match(service, /eligibleRoleKeys/);
});

test("server transitions are sequential and concurrency guarded", () => {
  assert.match(service, /eq\("updated_at", expectedUpdatedAt\)/);
  assert.match(service, /eq\("status", "open"\)/);
  assert.match(service, /\["assigned"\]/);
  assert.match(service, /\["acknowledged"\]/);
  assert.match(service, /\["in_progress"\]/);
  assert.match(service, /\["resolved", "done"\]/);
  assert.match(service, /WorkOrderConflictError/);
  assert.doesNotMatch(actions, /setWorkOrderStatusAction/);
});

test("the card exposes one state-derived primary action and progressive disclosure", () => {
  assert.match(card, /primaryWorkOrderAction/);
  assert.match(card, /const primaryControl/);
  assert.match(card, /More Actions/);
  assert.match(card, /disabled=\{pending\}/);
  assert.match(card, /router\.refresh\(\)/);
  assert.match(card, /setMessage\(result\)/);
});

test("weak-network failures preserve operator notes and never render optimistic success", () => {
  assert.match(card, /value=\{resolutionNote\}/);
  assert.match(card, /value=\{note\}/);
  assert.match(card, /if \(result\.ok\)/);
  assert.doesNotMatch(card, /setResolutionNote\(""\)/);
});

test("field context survives creation, list, detail, and return navigation", () => {
  assert.match(fieldsBoard, /work-orders\?fieldId=/);
  assert.match(fieldsPage, /initialSelectedId/);
  assert.match(root, /Back to \{selectedField\.name\}/);
  assert.match(root, /initialFieldId=\{selectedField\?\.id\}/);
  assert.match(form, /input name="fieldId" type="hidden" value=\{initialFieldId\}/);
  assert.match(detail, /Back to Work Orders/);
  assert.match(detail, /Review \{field\.name\}/);
});

test("trusted game and disruption context deep-link to canonical surfaces", () => {
  assert.match(root, /order\.gameId \? data\.sessionsById\.get\(order\.gameId\)/);
  assert.match(root, /\/admin\/sessions\/\$\{session\.id\}/);
  assert.match(root, /\/admin\/fields\/\$\{order\.fieldId\}\/disruption/);
  assert.match(card, /Open Related Game/);
  assert.match(card, /View Affected Games/);
});

test("list queries stay lightweight while detail reads canonical history", () => {
  assert.match(root, /getWorkOrdersForVenues\(venueIds\)/);
  assert.match(root, /getSessionsByIds\(gameIds\)/);
  assert.doesNotMatch(root, /getSessions\(\)/);
  assert.doesNotMatch(root, /getWorkOrderHistory/);
  assert.match(detail, /getWorkOrderHistory\(order\.id\)/);
  assert.match(service, /from\("audit_logs"\)/);
  assert.match(service, /eq\("resource_type", "field_work_order"\)/);
});

test("resolving work does not silently alter field status", () => {
  assert.doesNotMatch(actions, /setFieldOperationalStatus/);
  assert.match(detail, /Resolving work does not automatically reopen the field/);
  assert.match(detail, /field\.status !== "open"/);
});

test("the root is a compact triage view, not another operations dashboard", () => {
  assert.match(root, /"attention" \| "mine" \| "open" \| "resolved"/);
  assert.match(root, /md:grid-cols-2/);
  assert.doesNotMatch(root, /Command Center/);
  assert.doesNotMatch(root, /setInterval|poll/);
});
