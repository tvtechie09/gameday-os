import type { GameRecord } from "@/lib/game-engine/game-service";
import type { WorkOrder } from "@/lib/services/work-orders";
import type { Field, VenueAsset, VenueAssetConnectionHealth } from "@/lib/types";
import { defaultGameMinutes, venueDateString } from "./command-center-core.ts";

export const MANAGEMENT_DELAY_GRACE_MIN = 5;

export type AssetHealthEvent = {
  assetId: string;
  connectionHealth: VenueAssetConnectionHealth;
  observedAt: string;
};

export type ManagementReportInput = {
  games: GameRecord[];
  actuals: Map<string, { startedAt: string | null; finalAt: string | null }>;
  fields: Field[];
  issues: WorkOrder[];
  assets: VenueAsset[];
  assetHealthEvents: AssetHealthEvent[];
  rangeStart: string;
  rangeEnd: string;
  timeZone: string;
  publicPageViews: number;
  sponsorImpressions: number;
};

export type RecurringIssue = {
  key: string;
  label: string;
  occurrences: number;
  unresolved: number;
};

export type ManagementReport = {
  games: {
    scheduled: number;
    completed: number;
    cancelled: number;
    postponed: number;
    delayed: number;
    delayMeasured: number;
    delayUnmeasured: number;
    averageDelayMin: number;
  };
  utilization: {
    activeFields: number;
    scheduledMinutes: number;
    activeScheduleWindowMinutes: number;
    scheduleUtilizationRate: number;
  };
  incidents: {
    count: number;
    resolved: number;
    unresolved: number;
    assignedMeasured: number;
    acknowledgedMeasured: number;
    resolvedMeasured: number;
    meanAssignmentMin: number;
    meanAcknowledgementMin: number;
    meanResolutionMin: number;
    recurringUnresolved: RecurringIssue[];
  };
  devices: {
    configured: number;
    onlineNow: number;
    degradedNow: number;
    offlineNow: number;
    unknownNow: number;
    currentOnlineRate: number;
    uptimeRate: number;
    uptimeObservedMinutes: number;
    uptimeCoverageRate: number;
  };
  audience: {
    publicPageViews: number;
    sponsorImpressions: number;
  };
  notes: string[];
};

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.min(1, numerator / denominator) : 0;
}

function validTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function elapsedMinutes(start: string, end: string | null): number | null {
  const from = validTime(start);
  const to = validTime(end);
  if (from === null || to === null || to < from) return null;
  return Math.round((to - from) / 60_000);
}

function mean(values: number[]) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
}

type Interval = { start: number; end: number };

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((item) => item.end > item.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const current = merged.at(-1);
    if (!current || interval.start > current.end) {
      merged.push({ ...interval });
    } else {
      current.end = Math.max(current.end, interval.end);
    }
  }
  return merged;
}

function buildScheduleUtilization(input: ManagementReportInput) {
  const groups = new Map<string, Interval[]>();
  const activeFields = new Set<string>();
  for (const game of input.games) {
    if (game.lifecycleStatus === "cancelled" || game.lifecycleStatus === "postponed") continue;
    const start = validTime(game.startTime);
    if (start === null) continue;
    const explicitEnd = validTime(game.endTime);
    const end = explicitEnd ?? start + defaultGameMinutes(game.sportType) * 60_000;
    if (end <= start) continue;
    const day = venueDateString(start, input.timeZone);
    const key = `${game.fieldId}:${day}`;
    groups.set(key, [...(groups.get(key) ?? []), { start, end }]);
    activeFields.add(game.fieldId);
  }

  let scheduledMinutes = 0;
  let activeScheduleWindowMinutes = 0;
  for (const intervals of groups.values()) {
    const merged = mergeIntervals(intervals);
    scheduledMinutes += merged.reduce((total, item) => total + (item.end - item.start) / 60_000, 0);
    const first = merged.at(0);
    const last = merged.at(-1);
    if (first && last) activeScheduleWindowMinutes += (last.end - first.start) / 60_000;
  }

  return {
    activeFields: activeFields.size,
    scheduledMinutes: Math.round(scheduledMinutes),
    activeScheduleWindowMinutes: Math.round(activeScheduleWindowMinutes),
    scheduleUtilizationRate: rate(scheduledMinutes, activeScheduleWindowMinutes),
  };
}

function recurringIssues(issues: WorkOrder[]): RecurringIssue[] {
  const groups = new Map<string, { label: string; occurrences: number; unresolved: number }>();
  for (const issue of issues) {
    const identity = issue.systemKey?.trim().toLowerCase()
      || `${issue.fieldId ?? "venue"}:${issue.issueType}:${issue.title.trim().toLowerCase()}`;
    const prior = groups.get(identity) ?? { label: issue.title, occurrences: 0, unresolved: 0 };
    prior.occurrences += 1;
    if (issue.status !== "resolved" && issue.status !== "done" && !issue.closedAt) prior.unresolved += 1;
    groups.set(identity, prior);
  }
  return [...groups.entries()]
    .filter(([, value]) => value.occurrences >= 2 && value.unresolved > 0)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.unresolved - a.unresolved || b.occurrences - a.occurrences || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function buildDeviceReliability(input: ManagementReportInput) {
  const configured = input.assets.filter((asset) => asset.connectionHealth !== "not_configured");
  const nowCounts = (health: VenueAssetConnectionHealth) => configured.filter((asset) => asset.connectionHealth === health).length;
  const rangeStart = validTime(input.rangeStart) ?? 0;
  const rangeEnd = validTime(input.rangeEnd) ?? rangeStart;
  const expectedMinutes = configured.length * Math.max(0, (rangeEnd - rangeStart) / 60_000);
  let observedMinutes = 0;
  let onlineMinutes = 0;

  for (const asset of configured) {
    const events = input.assetHealthEvents
      .filter((event) => event.assetId === asset.id)
      .map((event) => ({ ...event, time: validTime(event.observedAt) }))
      .filter((event): event is AssetHealthEvent & { time: number } => event.time !== null && event.time <= rangeEnd)
      .sort((a, b) => a.time - b.time);
    if (!events.length) continue;

    // The most recent event at/before the range anchors health at range start.
    const before = events.filter((event) => event.time <= rangeStart).at(-1);
    const inRange = events.filter((event) => event.time > rangeStart);
    const timeline = before ? [{ ...before, time: rangeStart }, ...inRange] : inRange;
    for (let index = 0; index < timeline.length; index += 1) {
      const event = timeline[index];
      const next = timeline[index + 1];
      const start = Math.max(rangeStart, event.time);
      const end = Math.min(rangeEnd, next?.time ?? rangeEnd);
      if (end <= start) continue;
      const minutes = (end - start) / 60_000;
      observedMinutes += minutes;
      if (event.connectionHealth === "online") onlineMinutes += minutes;
    }
  }

  return {
    configured: configured.length,
    onlineNow: nowCounts("online"),
    degradedNow: nowCounts("degraded"),
    offlineNow: nowCounts("offline"),
    unknownNow: nowCounts("unknown"),
    currentOnlineRate: rate(nowCounts("online"), configured.length),
    uptimeRate: rate(onlineMinutes, observedMinutes),
    uptimeObservedMinutes: Math.round(observedMinutes),
    uptimeCoverageRate: rate(observedMinutes, expectedMinutes),
  };
}

export function buildManagementReport(input: ManagementReportInput): ManagementReport {
  let delayed = 0;
  let delayMeasured = 0;
  const delayMinutes: number[] = [];
  for (const game of input.games) {
    if (game.lifecycleStatus === "cancelled" || game.lifecycleStatus === "postponed") continue;
    const startedAt = input.actuals.get(game.id)?.startedAt;
    const start = validTime(game.startTime);
    const actual = validTime(startedAt);
    if (start === null || actual === null) continue;
    delayMeasured += 1;
    const minutes = Math.max(0, Math.round((actual - start) / 60_000));
    delayMinutes.push(minutes);
    if (minutes > MANAGEMENT_DELAY_GRACE_MIN) delayed += 1;
  }

  const assignmentTimes = input.issues.map((issue) => elapsedMinutes(issue.detectedAt || issue.createdAt, issue.assignedAt)).filter((value): value is number => value !== null);
  const acknowledgementTimes = input.issues.map((issue) => elapsedMinutes(issue.detectedAt || issue.createdAt, issue.acknowledgedAt)).filter((value): value is number => value !== null);
  const resolutionTimes = input.issues.map((issue) => elapsedMinutes(issue.detectedAt || issue.createdAt, issue.closedAt)).filter((value): value is number => value !== null);
  const unresolved = input.issues.filter((issue) => issue.status !== "resolved" && issue.status !== "done" && !issue.closedAt).length;
  const devices = buildDeviceReliability(input);
  const playable = input.games.filter((game) => game.lifecycleStatus !== "cancelled" && game.lifecycleStatus !== "postponed").length;

  const notes: string[] = [
    "Field utilization is schedule packing: occupied game minutes divided by each field's first-to-last scheduled event span, not assumed facility hours.",
  ];
  if (delayMeasured < playable) notes.push(`${playable - delayMeasured} playable game(s) have no recorded first pitch and are excluded from delay averages.`);
  if (devices.configured > 0 && devices.uptimeCoverageRate < 1) {
    notes.push(`Device uptime covers ${Math.round(devices.uptimeCoverageRate * 100)}% of configured device-minutes; unobserved time is excluded, not assumed online.`);
  }
  if (devices.configured > 0 && devices.uptimeObservedMinutes === 0) {
    notes.push("Device uptime will appear after health-transition history accumulates; current health is shown separately.");
  }

  return {
    games: {
      scheduled: input.games.length,
      completed: input.games.filter((game) => game.status === "final" || game.lifecycleStatus === "final" || game.lifecycleStatus === "archived").length,
      cancelled: input.games.filter((game) => game.lifecycleStatus === "cancelled").length,
      postponed: input.games.filter((game) => game.lifecycleStatus === "postponed").length,
      delayed,
      delayMeasured,
      delayUnmeasured: Math.max(0, playable - delayMeasured),
      averageDelayMin: mean(delayMinutes),
    },
    utilization: buildScheduleUtilization(input),
    incidents: {
      count: input.issues.length,
      resolved: input.issues.length - unresolved,
      unresolved,
      assignedMeasured: assignmentTimes.length,
      acknowledgedMeasured: acknowledgementTimes.length,
      resolvedMeasured: resolutionTimes.length,
      meanAssignmentMin: mean(assignmentTimes),
      meanAcknowledgementMin: mean(acknowledgementTimes),
      meanResolutionMin: mean(resolutionTimes),
      recurringUnresolved: recurringIssues(input.issues),
    },
    devices,
    audience: {
      publicPageViews: input.publicPageViews,
      sponsorImpressions: input.sponsorImpressions,
    },
    notes,
  };
}
