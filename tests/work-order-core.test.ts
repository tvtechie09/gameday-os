import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionWorkOrder,
  issueLifecycle,
  issueStageLabel,
  orderIssues,
  primaryWorkOrderAction,
  resolveIssueStage,
  rollupIssues,
  workOrderAgeLabel,
  workOrderAuditPresentation,
  workOrderPriorityPresentation,
} from "../src/lib/services/work-order-core.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";

const NOW = Date.parse("2026-07-25T18:00:00.000Z");
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const minsAhead = (m: number) => new Date(NOW + m * 60_000).toISOString();

function order(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "w1",
    venueId: "V1",
    fieldId: "F1",
    title: "Sprinkler head broken",
    detail: null,
    priority: "normal",
    status: "open",
    reportedBy: null,
    createdAt: minsAgo(60),
    updatedAt: minsAgo(60),
    closedAt: null,
    assignedRole: null,
    assignedToUserId: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    dueAt: null,
    resolutionNotes: null,
    source: "manual",
    gameId: null,
    assetId: null,
    issueType: "maintenance",
    systemKey: null,
    detectedAt: minsAgo(60),
    assignedAt: null,
    startedAt: null,
    metadata: {},
    ...overrides,
  };
}

// ---- stage derivation ------------------------------------------------------

test("stage: honors explicit lifecycle states and legacy lifecycle columns", () => {
  assert.equal(resolveIssueStage(order()), "open");
  assert.equal(resolveIssueStage(order({ assignedRole: "grounds" })), "assigned");
  assert.equal(resolveIssueStage(order({ assignedToUserId: "u1" })), "assigned");
  assert.equal(resolveIssueStage(order({ assignedRole: "grounds", acknowledgedAt: minsAgo(10) })), "acknowledged");
  assert.equal(resolveIssueStage(order({ status: "in_progress" })), "in_progress");
  assert.equal(resolveIssueStage(order({ status: "assigned" })), "assigned");
  assert.equal(resolveIssueStage(order({ status: "acknowledged" })), "acknowledged");
  assert.equal(resolveIssueStage(order({ status: "resolved" })), "resolved");
  assert.equal(resolveIssueStage(order({ status: "done" })), "resolved");
});

test("stage: a legacy row with every lifecycle column null is simply open", () => {
  // Rows created before the migration must not break or read as assigned.
  assert.equal(resolveIssueStage(order({ source: "manual" })), "open");
});

test("stage: closedAt alone counts as resolved even if status lagged", () => {
  assert.equal(resolveIssueStage(order({ status: "open", closedAt: minsAgo(5) })), "resolved");
});

test("visible lifecycle uses plain language without changing backend values", () => {
  assert.deepEqual(
    ["open", "assigned", "acknowledged", "in_progress", "resolved"].map((stage) => issueStageLabel(stage as Parameters<typeof issueStageLabel>[0])),
    ["New", "Assigned", "Acknowledged", "In progress", "Resolved"],
  );
});

test("state transitions accept only the sequential lifecycle and reopen", () => {
  assert.equal(canTransitionWorkOrder("open", "assigned"), true);
  assert.equal(canTransitionWorkOrder("assigned", "acknowledged"), true);
  assert.equal(canTransitionWorkOrder("acknowledged", "in_progress"), true);
  assert.equal(canTransitionWorkOrder("in_progress", "resolved"), true);
  assert.equal(canTransitionWorkOrder("resolved", "open"), true);
  assert.equal(canTransitionWorkOrder("open", "resolved"), false);
  assert.equal(canTransitionWorkOrder("resolved", "in_progress"), false);
});

test("next action advances one step for the authorized owner", () => {
  const viewer = { canManage: false, canWork: true, userId: "u1" };
  assert.equal(primaryWorkOrderAction(order(), viewer), "claim");
  assert.equal(primaryWorkOrderAction(order({ status: "assigned", assignedToUserId: "u1" }), viewer), "acknowledge");
  assert.equal(primaryWorkOrderAction(order({ status: "acknowledged", acknowledgedBy: "u1" }), viewer), "start");
  assert.equal(primaryWorkOrderAction(order({ status: "in_progress", assignedToUserId: "u1" }), viewer), "resolve");
  assert.equal(primaryWorkOrderAction(order({ status: "resolved" }), viewer), "view");
});

test("next action does not let staff advance another teammate's work", () => {
  const anotherWorker = { canManage: false, canWork: true, userId: "u2" };
  assert.equal(primaryWorkOrderAction(order({ status: "assigned", assignedToUserId: "u1" }), anotherWorker), "view");
  assert.equal(primaryWorkOrderAction(order({ status: "acknowledged", acknowledgedBy: "u1" }), anotherWorker), "view");
  assert.equal(primaryWorkOrderAction(order({ status: "in_progress", assignedToUserId: "u1" }), anotherWorker), "view");
  assert.equal(primaryWorkOrderAction(order(), { ...anotherWorker, canWork: false }), "view");
  assert.equal(primaryWorkOrderAction(order({ status: "assigned", assignedToUserId: "u1" }), { ...anotherWorker, canManage: true }), "acknowledge");
});

test("priority and age presentation collapse technical levels for scanning", () => {
  assert.deepEqual(workOrderPriorityPresentation("low"), { label: "Normal", tone: "neutral" });
  assert.deepEqual(workOrderPriorityPresentation("high"), { label: "Important", tone: "warning" });
  assert.deepEqual(workOrderPriorityPresentation("urgent"), { label: "Urgent", tone: "danger" });
  assert.equal(workOrderAgeLabel(minsAgo(22), NOW), "Reported 22 min ago");
  assert.equal(workOrderAgeLabel(minsAgo(120), NOW), "Reported 2 hrs ago");
});

test("audit presentation turns canonical events into actor-readable history", () => {
  assert.equal(workOrderAuditPresentation({ action: "work_order.assigned", actorName: "Pat", createdAt: minsAgo(20), metadata: { assignee_name: "Alex" } }), "Assigned to Alex by Pat");
  assert.equal(workOrderAuditPresentation({ action: "work_order.note_added", actorName: "Alex", createdAt: minsAgo(10), metadata: { note: "Waiting for cable" } }), "Alex added a note: Waiting for cable");
  assert.equal(workOrderAuditPresentation({ action: "work_order.resolved", actorName: "Alex", createdAt: minsAgo(1), metadata: { resolution_note: "Replaced cable" } }), "Resolved by Alex: Replaced cable");
});

// ---- lifecycle flags -------------------------------------------------------

test("lifecycle: overdue only when a due time has passed and work is unresolved", () => {
  assert.equal(issueLifecycle(order({ dueAt: minsAgo(30) }), NOW).isOverdue, true);
  assert.equal(issueLifecycle(order({ dueAt: minsAhead(30) }), NOW).isOverdue, false);
  assert.equal(issueLifecycle(order({ dueAt: null }), NOW).isOverdue, false);
  // The clock stops when the work is done.
  assert.equal(issueLifecycle(order({ dueAt: minsAgo(30), status: "done" }), NOW).isOverdue, false);
});

test("lifecycle: age and time-to-due are reported in minutes", () => {
  const life = issueLifecycle(order({ createdAt: minsAgo(90), dueAt: minsAhead(15) }), NOW);
  assert.equal(life.ageMinutes, 90);
  assert.equal(life.minutesUntilDue, 15);
  assert.equal(life.minutesUntilDue !== null && life.minutesUntilDue > 0, true);
});

test("lifecycle: unowned vs unacknowledged are distinct signals", () => {
  const unowned = issueLifecycle(order(), NOW);
  assert.equal(unowned.unowned, true);
  assert.equal(unowned.unacknowledged, false);

  const owned = issueLifecycle(order({ assignedRole: "grounds" }), NOW);
  assert.equal(owned.unowned, false);
  assert.equal(owned.unacknowledged, true);

  const ack = issueLifecycle(order({ assignedRole: "grounds", acknowledgedAt: minsAgo(2) }), NOW);
  assert.equal(ack.unacknowledged, false);
});

// ---- ordering --------------------------------------------------------------

test("orderIssues: resolved work sinks below everything unresolved", () => {
  const ranked = orderIssues([order({ id: "done", status: "done" }), order({ id: "open" })], NOW);
  assert.deepEqual(ranked.map((o) => o.id), ["open", "done"]);
});

test("orderIssues: overdue outranks a higher priority that is not yet due", () => {
  const ranked = orderIssues(
    [order({ id: "urgent-ontime", priority: "urgent", dueAt: minsAhead(60) }), order({ id: "low-overdue", priority: "low", dueAt: minsAgo(5) })],
    NOW,
  );
  assert.deepEqual(ranked.map((o) => o.id), ["low-overdue", "urgent-ontime"]);
});

test("orderIssues: priority breaks ties, then unowned before already-owned", () => {
  const ranked = orderIssues(
    [
      order({ id: "normal-unowned", priority: "normal" }),
      order({ id: "urgent-owned", priority: "urgent", assignedRole: "grounds" }),
      order({ id: "urgent-unowned", priority: "urgent" }),
    ],
    NOW,
  );
  assert.deepEqual(ranked.map((o) => o.id), ["urgent-unowned", "urgent-owned", "normal-unowned"]);
});

test("orderIssues: oldest first among otherwise equal issues", () => {
  const ranked = orderIssues([order({ id: "new", createdAt: minsAgo(5) }), order({ id: "old", createdAt: minsAgo(300) })], NOW);
  assert.deepEqual(ranked.map((o) => o.id), ["old", "new"]);
});

test("orderIssues: does not mutate the input array", () => {
  const input = [order({ id: "a", status: "done" }), order({ id: "b" })];
  orderIssues(input, NOW);
  assert.deepEqual(input.map((o) => o.id), ["a", "b"]);
});

// ---- rollup ----------------------------------------------------------------

test("rollupIssues: counts each stage plus overdue and unowned", () => {
  const rollup = rollupIssues(
    [
      order({ id: "1" }), // open, unowned
      order({ id: "2", assignedRole: "grounds" }), // assigned
      order({ id: "3", assignedRole: "grounds", acknowledgedAt: minsAgo(5) }), // acknowledged
      order({ id: "4", status: "in_progress" }), // in progress
      order({ id: "5", status: "done" }), // resolved
      order({ id: "6", dueAt: minsAgo(10) }), // open + overdue
    ],
    NOW,
  );
  assert.equal(rollup.total, 6);
  assert.equal(rollup.open, 2); // #1 and #6
  assert.equal(rollup.assigned, 1);
  assert.equal(rollup.acknowledged, 1);
  assert.equal(rollup.inProgress, 1);
  assert.equal(rollup.resolved, 1);
  assert.equal(rollup.overdue, 1);
  assert.equal(rollup.unowned, 2);
});

test("rollupIssues: empty list is all zeros", () => {
  const rollup = rollupIssues([], NOW);
  assert.equal(rollup.total, 0);
  assert.equal(rollup.open, 0);
  assert.equal(rollup.overdue, 0);
});
