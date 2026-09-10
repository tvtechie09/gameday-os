import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { friendlyNetworkMessage } from "../src/lib/client-network.ts";

const status = readFileSync("src/components/connection-status.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const search = readFileSync("src/components/universal-search.tsx", "utf8");
const fields = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
const move = readFileSync("src/app/admin/fields/[fieldId]/disruption/[sessionId]/move/move-game-form.tsx", "utf8");
const workOrder = readFileSync("src/app/admin/fields/work-orders/work-order-card.tsx", "utf8");
const workOrderForm = readFileSync("src/app/admin/fields/work-orders/work-order-form.tsx", "utf8");
const photo = readFileSync("src/app/admin/fields/work-orders/work-order-photo-evidence.tsx", "utf8");
const announcement = readFileSync("src/app/admin/alerts/new/alert-form.tsx", "utf8");
const preferences = readFileSync("src/app/admin/account/notification-preferences-form.tsx", "utf8");

test("offline indication is global, honest, and never claims queued sync", () => {
  assert.match(layout, /<ConnectionStatus/);
  assert.match(status, /navigator\.onLine/);
  assert.match(status, /Changes cannot be saved right now/);
  assert.doesNotMatch(status, /queued|sync when/i);
});

test("friendly failure taxonomy stays plain-language and payload-free", () => {
  assert.match(friendlyNetworkMessage("request_timeout"), /taking too long/);
  assert.match(friendlyNetworkMessage("state_changed"), /latest information/);
  assert.doesNotMatch(friendlyNetworkMessage("server_unavailable"), /supabase|postgres|stack|provider/i);
});

test("critical mutations fail fast offline and retain pending duplicate protection", () => {
  for (const source of [fields, move, workOrder, workOrderForm, photo, announcement, preferences]) {
    assert.match(source, /offlineMutationMessage/);
    assert.match(source, /pending|isSaving/);
  }
  assert.match(move, /disabled=\{pending\}/);
  assert.match(workOrder, /value=\{resolutionNote\}/);
  assert.match(announcement, /if \(result\.error\)[\s\S]+setIsSaving\(false\)/);
});

test("search debounces, cancels stale requests, and has a bounded timeout", () => {
  assert.match(search, /new AbortController/);
  assert.match(search, /window\.setTimeout\(async/);
  assert.match(search, /}, 250\)/);
  assert.match(search, /controller\.abort\(\)/);
  assert.match(search, /}, 8000\)/);
  assert.match(search, /Search took too long/);
});

test("photo failures remain separate from Work Order lifecycle", () => {
  const actions = readFileSync("src/app/admin/fields/work-orders/actions.ts", "utf8");
  assert.match(actions, /const updated = await resolveWorkOrder[\s\S]+uploadWorkOrderPhoto/);
  assert.match(actions, /Work order resolved, but the optional photo did not upload/);
  assert.match(photo, /router\.refresh\(\)/);
});
