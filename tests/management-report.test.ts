import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { GameRecord } from "../src/lib/game-engine/game-service.ts";
import { buildManagementReport, type ManagementReportInput } from "../src/lib/services/management-report-core.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";
import type { Field, VenueAsset } from "../src/lib/types.ts";

const RANGE_START = "2026-08-30T10:00:00.000Z";
const RANGE_END = "2026-08-30T12:00:00.000Z";

function game(id: string, startTime: string, endTime: string, overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id,
    fieldId: "field-1",
    title: id,
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 0,
    awayScore: 0,
    startTime,
    endTime,
    status: "scheduled",
    lifecycleStatus: "scheduled",
    sportType: "baseball",
    ...overrides,
  } as unknown as GameRecord;
}

function issue(id: string, overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id,
    venueId: "venue-1",
    fieldId: "field-1",
    title: "Scoreboard offline",
    detail: null,
    priority: "high",
    status: "open",
    reportedBy: null,
    createdAt: RANGE_START,
    closedAt: null,
    assignedRole: null,
    assignedToUserId: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    dueAt: null,
    resolutionNotes: null,
    source: "system",
    gameId: null,
    assetId: "asset-1",
    issueType: "scoreboard",
    systemKey: "device:asset-1:offline",
    detectedAt: RANGE_START,
    assignedAt: null,
    startedAt: null,
    metadata: {},
    ...overrides,
  };
}

function asset(id: string, health: VenueAsset["connectionHealth"]): VenueAsset {
  return {
    id,
    venueId: "venue-1",
    fieldId: "field-1",
    assetName: id,
    connectionHealth: health,
  } as unknown as VenueAsset;
}

function input(overrides: Partial<ManagementReportInput> = {}): ManagementReportInput {
  return {
    games: [],
    actuals: new Map(),
    fields: [{ id: "field-1", venueId: "venue-1", name: "Field 1" } as Field],
    issues: [],
    assets: [],
    assetHealthEvents: [],
    rangeStart: RANGE_START,
    rangeEnd: RANGE_END,
    timeZone: "UTC",
    publicPageViews: 0,
    sponsorImpressions: 0,
    ...overrides,
  };
}

test("management schedule metrics use recorded first pitch and measured schedule packing", () => {
  const games = [
    game("g1", "2026-08-30T10:00:00Z", "2026-08-30T11:00:00Z", { status: "final", lifecycleStatus: "final" }),
    game("g2", "2026-08-30T11:30:00Z", "2026-08-30T12:30:00Z", { status: "active", lifecycleStatus: "live" }),
    game("g3", "2026-08-30T13:00:00Z", "2026-08-30T14:00:00Z", { lifecycleStatus: "cancelled" }),
  ];
  const report = buildManagementReport(input({
    games,
    actuals: new Map([
      ["g1", { startedAt: "2026-08-30T10:03:00Z", finalAt: "2026-08-30T11:00:00Z" }],
      ["g2", { startedAt: "2026-08-30T11:45:00Z", finalAt: null }],
    ]),
  }));

  assert.equal(report.games.completed, 1);
  assert.equal(report.games.cancelled, 1);
  assert.equal(report.games.delayed, 1);
  assert.equal(report.games.averageDelayMin, 9);
  assert.equal(report.utilization.scheduledMinutes, 120);
  assert.equal(report.utilization.activeScheduleWindowMinutes, 150);
  assert.equal(report.utilization.scheduleUtilizationRate, 0.8);
});

test("incident response reports assignment, acknowledgement, resolution, and recurring open issues", () => {
  const report = buildManagementReport(input({
    issues: [
      issue("i1", {
        assignedAt: "2026-08-30T10:05:00Z",
        acknowledgedAt: "2026-08-30T10:08:00Z",
        closedAt: "2026-08-30T10:30:00Z",
        status: "resolved",
      }),
      issue("i2", {
        detectedAt: "2026-08-30T11:00:00Z",
        createdAt: "2026-08-30T11:00:00Z",
        assignedAt: "2026-08-30T11:15:00Z",
        acknowledgedAt: "2026-08-30T11:20:00Z",
      }),
    ],
  }));

  assert.equal(report.incidents.count, 2);
  assert.equal(report.incidents.unresolved, 1);
  assert.equal(report.incidents.meanAssignmentMin, 10);
  assert.equal(report.incidents.meanAcknowledgementMin, 14);
  assert.equal(report.incidents.meanResolutionMin, 30);
  assert.equal(report.incidents.recurringUnresolved.length, 1);
  assert.equal(report.incidents.recurringUnresolved[0].occurrences, 2);
});

test("device uptime counts only health-history intervals and reports coverage", () => {
  const report = buildManagementReport(input({
    assets: [asset("asset-1", "offline"), asset("asset-2", "online")],
    assetHealthEvents: [
      { assetId: "asset-1", connectionHealth: "online", observedAt: "2026-08-30T09:30:00Z" },
      { assetId: "asset-1", connectionHealth: "offline", observedAt: "2026-08-30T11:00:00Z" },
      { assetId: "asset-2", connectionHealth: "online", observedAt: RANGE_START },
    ],
  }));

  assert.equal(report.devices.currentOnlineRate, 0.5);
  assert.equal(report.devices.uptimeObservedMinutes, 240);
  assert.equal(report.devices.uptimeCoverageRate, 1);
  assert.equal(report.devices.uptimeRate, 0.75);
});

test("missing game and device history stays visibly unmeasured", () => {
  const report = buildManagementReport(input({
    games: [game("g1", RANGE_START, RANGE_END, { status: "final", lifecycleStatus: "final" })],
    assets: [asset("asset-1", "online")],
  }));
  assert.equal(report.games.delayMeasured, 0);
  assert.equal(report.games.delayUnmeasured, 1);
  assert.equal(report.devices.uptimeObservedMinutes, 0);
  assert.ok(report.notes.some((note) => /excluded from delay averages/.test(note)));
  assert.ok(report.notes.some((note) => /history accumulates/.test(note)));
});

test("asset health history is deny-by-default and records logical transitions", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260831024531_venue_asset_health_history.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.venue_asset_health_events from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.venue_asset_health_events to service_role/i);
  assert.match(migration, /old\.connection_health is distinct from new\.connection_health/i);
  assert.doesNotMatch(migration, /edge_device_id|diagnostic_summary|ip_address/i);
});
