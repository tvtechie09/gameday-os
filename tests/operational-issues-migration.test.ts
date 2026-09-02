import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260831021258_operational_issue_command_center.sql", "utf8");
const workOrderActions = readFileSync("src/app/admin/fields/work-orders/actions.ts", "utf8");

test("operational issues are venue-scoped, deduplicated, and support the explicit lifecycle", () => {
  assert.match(migration, /add column if not exists venue_id uuid references public\.venues/);
  assert.match(migration, /field_work_orders_open_system_key_unique/);
  for (const state of ["open", "assigned", "acknowledged", "in_progress", "resolved"]) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
});

test("operational issues remain deny-by-default to browser roles", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.field_work_orders from anon, authenticated/);
  assert.doesNotMatch(migration, /grant\s+(?:all|select|insert|update|delete)[^;]*\b(?:anon|authenticated)\b/i);
  assert.match(migration, /grant select, insert, update, delete on public\.field_work_orders to service_role/);
});

test("canonical work-order mutations recheck tenant and field scope server-side", () => {
  assert.match(workOrderActions, /assertVenueInScope\(order\.venueId\)/);
  assert.match(workOrderActions, /assertFieldInScope\(order\.fieldId\)/);
});
