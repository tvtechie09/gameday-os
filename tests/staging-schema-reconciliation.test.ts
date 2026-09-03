import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const identity = readFileSync("supabase/migrations/20260902211810_reconcile_identity_provisioning_1_0a.sql", "utf8");
const sessions = readFileSync("supabase/migrations/20260902211812_reconcile_shared_session_compatibility_1_0a.sql", "utf8");
const workOrders = readFileSync("supabase/migrations/20260902211814_reconcile_work_order_operations_1_0a.sql", "utf8");
const assets = readFileSync("supabase/migrations/20260902211817_reconcile_logical_asset_health_1_0a.sql", "utf8");
const migrations = [identity, sessions, workOrders, assets];

test("1.0A reconciles only the current identity invitation contract", () => {
  assert.match(identity, /add column organization_id uuid/);
  assert.match(identity, /identity_invites_organization_id_fkey/);
  assert.match(identity, /identity_invites_organization_id_idx/);
  assert.doesNotMatch(identity, /organization_memberships|tenant_id|scope_type_check/i);
});

test("1.0A restores the shared session fields without restoring Command Center events", () => {
  for (const column of [
    "home_organization_id",
    "away_organization_id",
    "operations_status",
    "scoreboard_profile_id",
    "streaming_profile",
    "walkup_music_profile",
    "sponsor_package",
    "media_links",
    "officials",
  ]) {
    assert.match(sessions, new RegExp(`add column ${column}`));
  }
  assert.doesNotMatch(sessions, /session_events/i);
});

test("1.0A Work Orders use a real venue precondition and remain service-role-only", () => {
  for (const column of ["venue_id", "issue_type", "system_key", "detected_at", "assigned_at", "started_at", "metadata"]) {
    assert.match(workOrders, new RegExp(`add column ${column}`));
  }
  assert.match(workOrders, /raise exception 'Cannot reconcile field_work_orders\.venue_id/);
  assert.match(workOrders, /alter column venue_id set not null/);
  assert.match(workOrders, /revoke all privileges on table public\.field_work_orders from public, anon, authenticated/);
  assert.match(workOrders, /grant select, insert, update, delete on table public\.field_work_orders to service_role/);
});

test("1.0A asset reconciliation adds no fabricated health data", () => {
  assert.match(assets, /add column health_message text/);
  assert.match(assets, /add column diagnostic_summary jsonb not null default '\{\}'::jsonb/);
  assert.match(assets, /venue_assets_connection_health_idx/);
  assert.match(assets, /venue_assets_edge_device_unique/);
  assert.doesNotMatch(assets, /update public\.venue_assets|insert into public\.venue_assets/i);
});

test("1.0A migrations contain no destructive table or column operations", () => {
  for (const migration of migrations) {
    assert.doesNotMatch(migration, /drop\s+(?:table|column)|truncate\s+table|delete\s+from/i);
    assert.doesNotMatch(migration, /grant[^;]*(?:anon|authenticated)/i);
  }
});
