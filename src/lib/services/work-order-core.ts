import type { WorkOrder } from "@/lib/services/work-orders";

// Pure core of the issue lifecycle. Dependency-free so it is unit-testable in
// isolation (same split as command-center-core / storm-assessment); all IO lives
// in work-orders.ts.
//
// The canonical lifecycle is explicit. Legacy `done` rows are still accepted
// during rollout so old records do not reopen or disappear from reporting.

export type IssueStage = "open" | "assigned" | "acknowledged" | "in_progress" | "resolved";

export type IssueLifecycle = {
  stage: IssueStage;
  ageMinutes: number;
  minutesUntilDue: number | null; // negative once overdue; null when no due time
  isOverdue: boolean;
  unowned: boolean; // nobody has been given it
  unacknowledged: boolean; // owned, but nobody has confirmed they're on it
};

const STAGE_LABELS: Record<IssueStage, string> = {
  open: "Open",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function issueStageLabel(stage: IssueStage): string {
  return STAGE_LABELS[stage];
}

function isResolved(order: WorkOrder): boolean {
  return order.status === "resolved" || order.status === "done" || Boolean(order.closedAt);
}

export function resolveIssueStage(order: WorkOrder): IssueStage {
  if (isResolved(order)) return "resolved";
  if (order.status === "in_progress") return "in_progress";
  if (order.status === "acknowledged") return "acknowledged";
  if (order.status === "assigned") return "assigned";
  if (order.acknowledgedAt) return "acknowledged";
  if (order.assignedToUserId || order.assignedRole) return "assigned";
  return "open";
}

const minutesBetween = (fromIso: string | null, toMs: number): number | null => {
  if (!fromIso) return null;
  const ms = new Date(fromIso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((toMs - ms) / 60_000);
};

export function issueLifecycle(order: WorkOrder, now: number): IssueLifecycle {
  const stage = resolveIssueStage(order);
  const age = minutesBetween(order.createdAt, now) ?? 0;
  const dueMs = order.dueAt ? new Date(order.dueAt).getTime() : NaN;
  const minutesUntilDue = Number.isNaN(dueMs) ? null : Math.round((dueMs - now) / 60_000);

  return {
    stage,
    ageMinutes: age,
    minutesUntilDue,
    // A resolved issue is never "overdue" — the clock stops when the work is done.
    isOverdue: stage !== "resolved" && minutesUntilDue !== null && minutesUntilDue < 0,
    unowned: stage === "open",
    unacknowledged: stage === "assigned",
  };
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

// Rank by what most needs a human decision right now. Resolved work sinks to the
// bottom; overdue rises to the top; among equals, an issue nobody owns outranks
// one that's already been picked up, because it's the one that will be forgotten.
export function orderIssues(orders: WorkOrder[], now: number): WorkOrder[] {
  return [...orders].sort((a, b) => {
    const la = issueLifecycle(a, now);
    const lb = issueLifecycle(b, now);

    if ((la.stage === "resolved") !== (lb.stage === "resolved")) {
      return la.stage === "resolved" ? 1 : -1;
    }
    if (la.isOverdue !== lb.isOverdue) return la.isOverdue ? -1 : 1;

    const pa = PRIORITY_RANK[a.priority] ?? 2;
    const pb = PRIORITY_RANK[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;

    if (la.unowned !== lb.unowned) return la.unowned ? -1 : 1;
    if (la.unacknowledged !== lb.unacknowledged) return la.unacknowledged ? -1 : 1;

    return lb.ageMinutes - la.ageMinutes; // oldest first
  });
}

// Counts for the operations header / end-of-day report.
export type IssueRollup = {
  total: number;
  open: number;
  assigned: number;
  acknowledged: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  unowned: number;
};

export function rollupIssues(orders: WorkOrder[], now: number): IssueRollup {
  const rollup: IssueRollup = { total: orders.length, open: 0, assigned: 0, acknowledged: 0, inProgress: 0, resolved: 0, overdue: 0, unowned: 0 };
  for (const order of orders) {
    const life = issueLifecycle(order, now);
    if (life.stage === "open") rollup.open += 1;
    if (life.stage === "assigned") rollup.assigned += 1;
    if (life.stage === "acknowledged") rollup.acknowledged += 1;
    if (life.stage === "in_progress") rollup.inProgress += 1;
    if (life.stage === "resolved") rollup.resolved += 1;
    if (life.isOverdue) rollup.overdue += 1;
    if (life.unowned) rollup.unowned += 1;
  }
  return rollup;
}
