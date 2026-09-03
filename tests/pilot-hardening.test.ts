import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fieldActions = readFileSync("src/app/admin/fields/actions.ts", "utf8");
const fieldBoard = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
const fieldsPage = readFileSync("src/app/admin/fields/page.tsx", "utf8");
const fieldService = readFileSync("src/lib/services/fields.ts", "utf8");
const sessionsService = readFileSync("src/lib/services/sessions.ts", "utf8");
const workOrderActions = readFileSync("src/app/admin/fields/work-orders/actions.ts", "utf8");
const workOrderCard = readFileSync("src/app/admin/fields/work-orders/work-order-card.tsx", "utf8");
const workOrderForm = readFileSync("src/app/admin/fields/work-orders/work-order-form.tsx", "utf8");
const moveAction = readFileSync("src/app/admin/fields/[fieldId]/disruption/actions.ts", "utf8");
const moveForm = readFileSync("src/app/admin/fields/[fieldId]/disruption/[sessionId]/move/move-game-form.tsx", "utf8");
const todayService = readFileSync("src/lib/services/venue-operations.ts", "utf8");
const adminError = readFileSync("src/app/admin/error.tsx", "utf8");
const appLayout = readFileSync("src/app/layout.tsx", "utf8");
const overlays = readFileSync("src/components/ui/overlays.tsx", "utf8");
const announcements = readFileSync("src/app/admin/alerts/announcement-actions.tsx", "utf8");
const announcementActions = readFileSync("src/app/admin/alerts/actions.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260902170000_harden_pilot_public_base_tables.sql", "utf8");

test("field status changes reject stale writes and refresh the authoritative state", () => {
  assert.match(fieldService, /FieldStatusConflictError/);
  assert.match(fieldService, /eq\("updated_at", expectedUpdatedAt\)/);
  assert.match(fieldActions, /code: "conflict"/);
  assert.match(fieldBoard, /item\.updatedAt/);
  assert.match(fieldBoard, /result\.code === "conflict"/);
  assert.match(fieldBoard, /router\.refresh\(\)/);
});

test("field status failures remain visible and never apply an optimistic success", () => {
  assert.match(fieldBoard, /Couldn't update \$\{item\.fieldName\}/);
  assert.match(fieldBoard, /Field not updated/);
  assert.match(fieldBoard, /if \(result\.ok && result\.updatedAt\)/);
  assert.doesNotMatch(fieldBoard, /setStatusOverrides[\s\S]{0,120}if \(!result\.ok\)/);
});

test("work-order network and concurrency failures stay inside the active workflow", () => {
  assert.match(workOrderActions, /error instanceof WorkOrderConflictError/);
  assert.match(workOrderCard, /const overlayMessage/);
  assert.match(workOrderCard, /Work order changed/);
  assert.match(workOrderCard, /result\.code === "conflict"/);
  assert.match(workOrderCard, /Check your connection and try again/);
  assert.match(workOrderForm, /catch \{/);
  assert.match(workOrderCard, /value=\{resolutionNote\}/);
  assert.match(workOrderCard, /value=\{note\}/);
});

test("game movement failures are localized, retryable, and do not expose provider errors", () => {
  assert.match(moveForm, /if \(next\.ok\) setConfirming\(false\)/);
  assert.match(moveForm, /role="alert"/);
  assert.match(moveForm, /Check your connection and try again/);
  assert.match(moveAction, /Review the latest schedule and try again/);
  assert.doesNotMatch(moveAction, /return \{ ok: false, message: error instanceof Error/);
});

test("operational read failures cannot masquerade as an empty healthy day", () => {
  for (const read of ["getVenues()", "getFields()", "getSessions()", "getActiveAlerts()", "getWorkOrders()"]) {
    assert.match(todayService, new RegExp(read.replace(/[()]/g, "\\$&")));
  }
  assert.match(todayService, /buildTodayView[\s\S]*getVenues\(\),[\s\S]*getWorkOrders\(\),/);
});

test("31-field operations use bounded bulk reads rather than per-field requests", () => {
  assert.match(fieldsPage, /getSessionsByFieldIds/);
  assert.match(fieldsPage, /getWorkOrdersForVenues/);
  assert.match(sessionsService, /\.in\("field_id", uniqueIds\)/);
  assert.doesNotMatch(fieldsPage, /getSessionsByFieldId\(/);
});

test("shared accessibility and error boundaries preserve focus without rendering raw errors", () => {
  assert.match(appLayout, /Skip to main content/);
  assert.match(appLayout, /id="main-content"/);
  assert.match(overlays, /previouslyFocused\?\.focus\(\)/);
  assert.match(overlays, /useId\(\)/);
  assert.doesNotMatch(adminError, /\{error\.message\}/);
});

test("announcement removal is explicit, confirmed, and failure-aware", () => {
  assert.match(announcements, /End this announcement\?/);
  assert.match(announcements, /history is not deleted/);
  assert.match(announcements, /Couldn't update this announcement/);
  assert.match(announcements, /Make staff-only/);
  assert.match(announcementActions, /throw new Error\("Announcement not found\."\)/);
});

test("browser roles cannot read or mutate canonical Venue base tables", () => {
  for (const table of ["sessions", "alerts", "venues", "field_work_orders"]) {
    assert.match(migration, new RegExp(`revoke all privileges on table public\\.${table} from public, anon, authenticated`));
    assert.match(migration, new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`));
  }
  assert.match(migration, /revoke insert, update, delete on table public\.fields from public, anon, authenticated/);
});
