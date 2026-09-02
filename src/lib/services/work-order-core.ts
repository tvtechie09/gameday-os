import type { WorkOrder } from "@/lib/services/work-orders";

// Pure core of the issue lifecycle. Dependency-free so it is unit-testable in
// isolation (same split as command-center-core / storm-assessment); all IO lives
// in work-orders.ts.
//
// The canonical lifecycle is explicit. Legacy `done` rows are still accepted
// during rollout so old records do not reopen or disappear from reporting.

export type IssueStage = "open" | "assigned" | "acknowledged" | "in_progress" | "resolved";

export type WorkOrderPrimaryAction = "claim" | "acknowledge" | "start" | "resolve" | "view";

export type WorkOrderViewer = {
  canManage: boolean;
  canWork: boolean;
  userId: string;
};

export type WorkOrderAuditEvent = {
  action: string;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type IssueLifecycle = {
  stage: IssueStage;
  ageMinutes: number;
  minutesUntilDue: number | null; // negative once overdue; null when no due time
  isOverdue: boolean;
  unowned: boolean; // nobody has been given it
  unacknowledged: boolean; // owned, but nobody has confirmed they're on it
};

const STAGE_LABELS: Record<IssueStage, string> = {
  open: "New",
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
};

export function issueStageLabel(stage: IssueStage): string {
  return STAGE_LABELS[stage];
}

const NEXT_STAGE: Partial<Record<IssueStage, IssueStage>> = {
  open: "assigned",
  assigned: "acknowledged",
  acknowledged: "in_progress",
  in_progress: "resolved",
};

export function canTransitionWorkOrder(from: IssueStage, to: IssueStage): boolean {
  return NEXT_STAGE[from] === to || (from === "resolved" && to === "open");
}

export function primaryWorkOrderAction(order: WorkOrder, viewer: WorkOrderViewer): WorkOrderPrimaryAction {
  const stage = resolveIssueStage(order);
  if (!viewer.canWork) return "view";
  if (stage === "open") return "claim";
  if (stage === "assigned") {
    return !order.assignedToUserId || order.assignedToUserId === viewer.userId || viewer.canManage ? "acknowledge" : "view";
  }
  if (stage === "acknowledged") {
    return !order.acknowledgedBy || order.acknowledgedBy === viewer.userId || viewer.canManage ? "start" : "view";
  }
  if (stage === "in_progress") {
    return !order.assignedToUserId || order.assignedToUserId === viewer.userId || viewer.canManage ? "resolve" : "view";
  }
  return "view";
}

export function workOrderPriorityPresentation(priority: string): { label: string; tone: "neutral" | "warning" | "danger" } {
  if (priority === "urgent") return { label: "Urgent", tone: "danger" };
  if (priority === "high") return { label: "Important", tone: "warning" };
  return { label: "Normal", tone: "neutral" };
}

export function workOrderAgeLabel(createdAt: string, now: number): string {
  const minutes = minutesBetween(createdAt, now);
  if (minutes === null || minutes < 1) return "Reported just now";
  if (minutes < 60) return `Reported ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Reported ${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Reported ${days} day${days === 1 ? "" : "s"} ago`;
}

function metadataText(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function workOrderAuditPresentation(event: WorkOrderAuditEvent): string {
  const assignee = metadataText(event.metadata, "assignee_name");
  const note = metadataText(event.metadata, "note");
  const resolution = metadataText(event.metadata, "resolution_note");
  const messages: Record<string, string> = {
    "work_order.created": `Reported by ${event.actorName}`,
    "work_order.claimed": `${event.actorName} took responsibility`,
    "work_order.assigned": assignee ? `Assigned to ${assignee} by ${event.actorName}` : `Assignment updated by ${event.actorName}`,
    "work_order.acknowledged": `Acknowledged by ${event.actorName}`,
    "work_order.started": `Work started by ${event.actorName}`,
    "work_order.resolved": resolution ? `Resolved by ${event.actorName}: ${resolution}` : `Resolved by ${event.actorName}`,
    "work_order.escalated": `Escalated for management attention by ${event.actorName}`,
    "work_order.note_added": note ? `${event.actorName} added a note: ${note}` : `${event.actorName} added a note`,
    "work_order.reopened": `Reopened by ${event.actorName}`,
  };
  return messages[event.action] ?? `Updated by ${event.actorName}`;
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
