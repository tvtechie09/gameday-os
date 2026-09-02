import assert from "node:assert/strict";
import test from "node:test";
import { buildNavigation, getRoleHome, guardForAdminPath } from "../src/lib/access/navigation.ts";
import type { AccessContext } from "../src/lib/access/capabilities.ts";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: ["venue.field.manage", "venue.alert.send", "game.status.update", "tournament.manage", "device.manage", "venue.manage"],
  venue_director: ["venue.field.manage", "venue.alert.send", "game.status.update", "device.manage", "venue.manage"],
  venue_staff: ["venue.field.manage", "venue.alert.send", "game.status.update"],
  venue_tech_manager: ["venue.field.manage", "game.status.update", "device.manage"],
  tournament_director: ["tournament.manage"],
  emergency_coordinator: ["venue.alert.send"],
  coach: ["game.status.update"],
  scorekeeper: ["game.status.update"],
  parent: [],
};

function ctxFor(roleKey: string): AccessContext {
  return {
    userId: "u1",
    email: `${roleKey}@test`,
    displayName: roleKey,
    roleKey,
    roleLabel: roleKey,
    scopeType: "venue",
    scopeId: "v1",
    venueId: "v1",
    venueName: "Test Venue",
    permissions: new Set(ROLE_PERMISSIONS[roleKey]),
  } as AccessContext;
}

function groupHrefs(roleKey: string, groupKey: string): string[] {
  return buildNavigation(ctxFor(roleKey)).find((group) => group.key === groupKey)?.items.map((item) => item.href) ?? [];
}

function navHrefs(roleKey: string): string[] {
  return buildNavigation(ctxFor(roleKey)).flatMap((group) => group.items.map((item) => item.href));
}

test("Venue GM primary navigation is Home, Today, Fields, and Schedule", () => {
  assert.deepEqual(groupHrefs("venue_director", "operations"), ["/admin", "/today", "/admin/fields", "/admin/sessions"]);
  assert.equal(groupHrefs("venue_director", "operations").includes("/admin/command-center"), false);
  assert.equal(groupHrefs("venue_director", "operations").includes("/admin/operations-center"), false);
});

test("Venue Staff sees Today and Fields but not Home or Schedule", () => {
  assert.deepEqual(groupHrefs("venue_staff", "operations"), ["/today", "/admin/fields"]);
  assert.equal(navHrefs("venue_staff").includes("/admin/sessions"), false);
  assert.equal(guardForAdminPath("/admin/sessions")(ctxFor("venue_staff")), false);
});

test("supporting operational tools move under More", () => {
  const more = buildNavigation(ctxFor("venue_director")).find((group) => group.key === "admin");
  assert.equal(more?.label, "More");
  for (const href of ["/admin/operations-center", "/admin/alerts", "/admin/fields/work-orders"]) {
    assert.ok(more?.items.some((item) => item.href === href), `${href} should live under More`);
  }
});

test("non-venue roles do not gain the retired internal aggregate board", () => {
  for (const role of ["tournament_director", "emergency_coordinator", "coach", "scorekeeper", "parent"]) {
    assert.equal(navHrefs(role).includes("/admin/command-center"), false);
  }
});

test("Field Operations remains frontline while setup routes stay managed", () => {
  const operationsGuard = guardForAdminPath("/admin/fields");
  const workOrdersGuard = guardForAdminPath("/admin/fields/work-orders");
  const disruptionGuard = guardForAdminPath("/admin/fields/f1/disruption");
  const newFieldGuard = guardForAdminPath("/admin/fields/new");
  for (const role of ["platform_admin", "venue_director", "venue_staff", "venue_tech_manager"]) {
    assert.ok(operationsGuard(ctxFor(role)));
    assert.ok(workOrdersGuard(ctxFor(role)));
    assert.ok(disruptionGuard(ctxFor(role)));
  }
  assert.equal(newFieldGuard(ctxFor("venue_staff")), false);
  assert.equal(newFieldGuard(ctxFor("venue_director")), true);
});

test("legacy Command Center route guard retains its former audience for a safe redirect", () => {
  const guard = guardForAdminPath("/admin/command-center");
  assert.equal(guard(ctxFor("venue_director")), true);
  assert.equal(guard(ctxFor("venue_staff")), true);
  assert.equal(guard(ctxFor("coach")), false);
});

test("platform-only tools remain separate from customer More navigation", () => {
  const platformAdmin = ctxFor("platform_admin");
  platformAdmin.permissions.add("platform.devtools");
  const groups = buildNavigation(platformAdmin);
  assert.ok(groups.find((group) => group.key === "platform")?.items.some((item) => item.key === "marketplace"));
  assert.equal(groups.find((group) => group.key === "admin")?.items.some((item) => item.key === "marketplace"), false);
});

test("role homes align with the consolidated operating model", () => {
  assert.equal(getRoleHome(ctxFor("platform_admin")), "/admin");
  assert.equal(getRoleHome(ctxFor("venue_director")), "/admin");
  assert.equal(getRoleHome(ctxFor("venue_staff")), "/today");
  assert.equal(getRoleHome(ctxFor("coach")), "/today");
  assert.equal(getRoleHome(null), "/dev-login");
});
