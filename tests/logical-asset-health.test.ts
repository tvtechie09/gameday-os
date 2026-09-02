import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { logicalAssetHealth } from "../src/lib/services/logical-asset-health-core.ts";
import type { VenueAsset } from "../src/lib/types.ts";

const NOW = Date.parse("2026-08-30T18:00:00.000Z");
const asset = (overrides: Partial<VenueAsset> = {}) => ({
  id: "a1", venueId: "V1", fieldId: "F1", assetName: "Field 1 Scoreboard", assetType: "scoreboard",
  assetCategory: "scoreboards", status: "healthy", connectionHealth: "online", lastSeenAt: new Date(NOW - 60_000).toISOString(),
  healthMessage: null, edgeDeviceId: null, diagnosticSummary: {},
  ...overrides,
} as unknown as VenueAsset);

test("logical asset health turns technical state into operator language", () => {
  assert.deepEqual(logicalAssetHealth(asset(), NOW), { status: "online", label: "Online", message: "Working normally.", lastSeenMinutes: 1 });
  assert.equal(logicalAssetHealth(asset({ connectionHealth: "degraded" }), NOW).label, "Needs attention");
  assert.match(logicalAssetHealth(asset({ connectionHealth: "offline" }), NOW).message, /Check power/);
  assert.equal(logicalAssetHealth(asset({ connectionHealth: "not_configured", lastSeenAt: null }), NOW).label, "Manual / not connected");
});

test("stale last-seen timestamps degrade and then offline an otherwise-online asset", () => {
  assert.equal(logicalAssetHealth(asset({ lastSeenAt: new Date(NOW - 5 * 60_000).toISOString() }), NOW).status, "degraded");
  assert.equal(logicalAssetHealth(asset({ lastSeenAt: new Date(NOW - 15 * 60_000).toISOString() }), NOW).status, "offline");
});

test("explicit maintenance/offline state outranks a fresh heartbeat", () => {
  assert.equal(logicalAssetHealth(asset({ status: "maintenance_needed" }), NOW).status, "degraded");
  assert.equal(logicalAssetHealth(asset({ status: "offline" }), NOW).status, "offline");
});

test("logical asset health migration preserves private service-role-only access", () => {
  const migration = readFileSync("supabase/migrations/20260831023105_logical_asset_health.sql", "utf8");
  assert.match(migration, /connection_health text not null/);
  assert.match(migration, /last_seen_at timestamptz/);
  assert.match(migration, /diagnostic_summary jsonb/);
  assert.match(migration, /revoke all on public\.venue_assets from anon, authenticated/);
  assert.match(migration, /unique index if not exists venue_assets_edge_device_unique/);
});

test("normal operators get plain health while diagnostics remain permission-gated", () => {
  const assetsPage = readFileSync("src/app/admin/assets/page.tsx", "utf8");
  const appShell = readFileSync("src/components/access/app-shell.tsx", "utf8");
  const fieldBoard = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
  assert.match(assetsPage, /showDiagnostics = canManageDevices\(ctx\)/);
  assert.match(assetsPage, /Administrator diagnostics/);
  assert.match(assetsPage, /health\.message/);
  assert.match(appShell, /buildMobileNavigation\(navGroups\)/);
  assert.match(fieldBoard, /Report an issue/);
  assert.match(fieldBoard, /min-h-12/);
});

test("mobile field start remains object-scoped and carries the verified actor", () => {
  const fieldControl = readFileSync("src/app/admin/fields/[fieldId]/control/page.tsx", "utf8");
  assert.match(fieldControl, /session\.fieldId !== fieldId/);
  assert.match(fieldControl, /updateSessionGameState\([\s\S]+ctx\?\.userId\)/);
});
