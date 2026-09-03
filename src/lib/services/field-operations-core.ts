import type { Field, FieldStatus, Session, Venue } from "../types.ts";
import type { WorkOrder } from "./work-orders.ts";
import { gameLabel, minutesBehind } from "./command-center-core.ts";
import { projectFieldSessions, timeLabel } from "./session-projection-core.ts";

export type FieldOperationsFilter = "all" | "active" | "attention" | "closed";

export type FieldOperationGame = {
  id: string;
  label: string;
  startLabel: string;
  lifecycleStatus: string;
  minutesBehind: number;
};

export type FieldOperationIssue = {
  id: string;
  title: string;
  priority: string;
};

export type FieldOperationItem = {
  fieldId: string;
  venueId: string;
  venueName: string;
  fieldName: string;
  sportType: string;
  mapLabel: string | null;
  status: FieldStatus;
  updatedAt: string;
  currentGame: FieldOperationGame | null;
  nextGame: FieldOperationGame | null;
  activeIssue: FieldOperationIssue | null;
  unresolvedIssueCount: number;
  upcomingGameCount: number;
  affectedUpcomingGames: number;
  needsAttention: boolean;
};

export type FieldOperationsSummary = {
  total: number;
  open: number;
  inUse: number;
  delayed: number;
  closed: number;
  needsAttention: number;
};

const naturalFieldCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const priorityRank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const unresolved = (order: WorkOrder) => order.status !== "resolved" && order.status !== "done" && !order.closedAt;
const abnormalStatuses = new Set<FieldStatus>(["delayed", "closed", "maintenance"]);
const attentionGameStatuses = new Set(["delayed", "suspended", "postponed"]);

function operationGame(session: Session, now: number, venueTimeZone: string): FieldOperationGame {
  return {
    id: session.id,
    label: gameLabel(session),
    startLabel: timeLabel(session.startTime, venueTimeZone),
    lifecycleStatus: session.lifecycleStatus,
    minutesBehind: minutesBehind(session, now),
  };
}

export function compareFieldNames(a: Pick<FieldOperationItem, "fieldName">, b: Pick<FieldOperationItem, "fieldName">): number {
  return naturalFieldCollator.compare(a.fieldName, b.fieldName);
}

export function buildFieldOperationItems(input: {
  venue: Venue;
  fields: Field[];
  sessions: Session[];
  workOrders: WorkOrder[];
  now: number;
}): FieldOperationItem[] {
  const fieldIds = new Set(input.fields.map((field) => field.id));
  const sessionsByField = new Map<string, Session[]>();
  const issuesByField = new Map<string, WorkOrder[]>();

  for (const session of input.sessions) {
    if (!fieldIds.has(session.fieldId)) continue;
    const fieldSessions = sessionsByField.get(session.fieldId) ?? [];
    fieldSessions.push(session);
    sessionsByField.set(session.fieldId, fieldSessions);
  }
  for (const order of input.workOrders) {
    if (!order.fieldId || !fieldIds.has(order.fieldId) || !unresolved(order)) continue;
    const fieldIssues = issuesByField.get(order.fieldId) ?? [];
    fieldIssues.push(order);
    issuesByField.set(order.fieldId, fieldIssues);
  }

  return input.fields.map((field) => {
    const projection = projectFieldSessions({ sessions: sessionsByField.get(field.id) ?? [], now: input.now, timeZone: input.venue.timezone });
    const current = projection.current;
    const next = projection.next;
    const upcoming = projection.remainingToday.length;
    const issues = (issuesByField.get(field.id) ?? []).toSorted((a, b) =>
      (priorityRank[a.priority] ?? priorityRank.normal) - (priorityRank[b.priority] ?? priorityRank.normal)
      || a.createdAt.localeCompare(b.createdAt),
    );
    const currentGame = current ? operationGame(current, input.now, input.venue.timezone) : null;
    const nextGame = next ? operationGame(next, input.now, input.venue.timezone) : null;
    const affectedUpcomingGames = field.status === "closed" || field.status === "maintenance" ? upcoming : 0;
    const needsAttention = abnormalStatuses.has(field.status)
      || issues.length > 0
      || Boolean(currentGame && (attentionGameStatuses.has(currentGame.lifecycleStatus) || currentGame.minutesBehind >= 20))
      || affectedUpcomingGames > 0;

    return {
      fieldId: field.id,
      venueId: field.venueId,
      venueName: input.venue.name,
      fieldName: field.name,
      sportType: field.sportType,
      mapLabel: field.mapLabel,
      status: field.status,
      updatedAt: field.updatedAt,
      currentGame,
      nextGame,
      activeIssue: issues[0] ? { id: issues[0].id, title: issues[0].title, priority: issues[0].priority } : null,
      unresolvedIssueCount: issues.length,
      upcomingGameCount: upcoming,
      affectedUpcomingGames,
      needsAttention,
    };
  }).toSorted(compareFieldNames);
}

export function summarizeFieldOperations(items: FieldOperationItem[]): FieldOperationsSummary {
  return items.reduce<FieldOperationsSummary>((summary, item) => {
    summary.total += 1;
    if (item.status === "open") summary.open += 1;
    if (item.status === "active" || item.currentGame) summary.inUse += 1;
    if (item.status === "delayed") summary.delayed += 1;
    if (item.status === "closed" || item.status === "maintenance") summary.closed += 1;
    if (item.needsAttention) summary.needsAttention += 1;
    return summary;
  }, { total: 0, open: 0, inUse: 0, delayed: 0, closed: 0, needsAttention: 0 });
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const genericFieldQueryWords = new Set(["field", "baseball", "softball", "diamond", "court", "pitch"]);

export function fieldOperationMatchesQuery(item: FieldOperationItem, query: string): boolean {
  const needle = normalized(query);
  if (!needle) return true;
  const haystack = normalized([
    item.fieldName,
    item.mapLabel,
    item.sportType,
    item.venueName,
    item.currentGame?.label,
    item.nextGame?.label,
    item.activeIssue?.title,
  ].filter(Boolean).join(" "));
  const queryTokens = needle.split(" ");
  const specificTokens = queryTokens.filter((token) => !genericFieldQueryWords.has(token));
  const tokens = specificTokens.length > 0 ? specificTokens : queryTokens;
  return tokens.every((token) => haystack.includes(token));
}

export function fieldOperationMatchesFilter(item: FieldOperationItem, filter: FieldOperationsFilter): boolean {
  if (filter === "attention") return item.needsAttention;
  if (filter === "active") return item.status === "active" || Boolean(item.currentGame);
  if (filter === "closed") return item.status === "closed" || item.status === "maintenance";
  return true;
}
