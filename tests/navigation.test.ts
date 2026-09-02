import assert from "node:assert/strict";
import test from "node:test";
import { buildNavigation, getRoleHome, guardForAdminPath } from "../src/lib/access/navigation.ts";
import type { AccessContext } from "../src/lib/access/capabilities.ts";

// Permission sets as granted in production (verified against role_permissions).
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

function opsHomeHrefs(roleKey: string): string[] {
  const ops = buildNavigation(ctxFor(roleKey)).find((g) => g.key === "operations");
  return (ops?.items ?? [])
    .filter((i) => i.key === "command-center" || i.key === "today")
    .map((i) => i.href);
}

function navHrefs(roleKey: string): string[] {
  return buildNavigation(ctxFor(roleKey)).flatMap((group) => group.items.map((item) => item.href));
}

const VENUE_OPERATORS = ["platform_admin", "venue_director", "venue_staff", "venue_tech_manager"];
const OTHER_OPS_ROLES = ["tournament_director", "emergency_coordinator", "coach", "scorekeeper"];

test("venue operators get the Command Center as Today's Operations", () => {
  for (const role of VENUE_OPERATORS) {
    assert.deepEqual(opsHomeHrefs(role), ["/admin/command-center"], `${role} should land on the Command Center`);
  }
});

test("non-operators with ops tasks keep /today and never see the Command Center", () => {
  // A coach or scorekeeper satisfies canViewOpsTasks via game.status.update
  // alone. They must not reach the venue's attention queue, officials, or work
  // orders.
  for (const role of OTHER_OPS_ROLES) {
    assert.deepEqual(opsHomeHrefs(role), ["/today"], `${role} should stay on /today`);
  }
});

test("exactly one Today's Operations entry renders for every role", () => {
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    const hrefs = opsHomeHrefs(role);
    assert.ok(hrefs.length <= 1, `${role} sees ${hrefs.length} competing entries: ${hrefs.join(", ")}`);
  }
});

test("a role with no ops permissions sees no Today's Operations entry", () => {
  assert.deepEqual(opsHomeHrefs("parent"), []);
});

// This is the regression that matters: nav visibility and the middleware guard
// are supposed to share one source of truth. Before the Command Center had its
// own guard entry it fell back to canAccessAdminWorkspace, which venue_staff
// does NOT satisfy -- the link rendered and the route bounced.
test("everyone who sees the Command Center link can actually open it", () => {
  const guard = guardForAdminPath("/admin/command-center");
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    const linked = opsHomeHrefs(role).includes("/admin/command-center");
    if (linked) {
      assert.ok(guard(ctxFor(role)), `${role} sees the link but the route guard rejects it`);
    }
  }
});

test("venue operators can open Field Operations while setup routes stay managed", () => {
  const operationsGuard = guardForAdminPath("/admin/fields");
  const workOrdersGuard = guardForAdminPath("/admin/fields/work-orders");
  const disruptionGuard = guardForAdminPath("/admin/fields/f1/disruption");
  const moveGuard = guardForAdminPath("/admin/fields/f1/disruption/g1/move");
  const newFieldGuard = guardForAdminPath("/admin/fields/new");
  for (const role of VENUE_OPERATORS) {
    assert.ok(navHrefs(role).includes("/admin/fields"), `${role} should see Field Operations`);
    assert.ok(operationsGuard(ctxFor(role)), `${role} should open Field Operations`);
    assert.ok(workOrdersGuard(ctxFor(role)), `${role} should open field issues`);
    assert.ok(disruptionGuard(ctxFor(role)), `${role} should review field disruption impact`);
    assert.ok(moveGuard(ctxFor(role)), `${role} should open the guarded movement workflow`);
  }
  assert.equal(newFieldGuard(ctxFor("venue_staff")), false, "staff must not gain field setup access");
  assert.equal(newFieldGuard(ctxFor("venue_director")), true, "venue director keeps field setup access");
  assert.equal(operationsGuard(ctxFor("parent")), false, "public/family roles cannot open internal field operations");
});

test("platform-only tools are separated from customer management navigation", () => {
  const platformAdmin = ctxFor("platform_admin");
  platformAdmin.permissions.add("platform.devtools");
  const groups = buildNavigation(platformAdmin);
  const platform = groups.find((group) => group.key === "platform");
  const manage = groups.find((group) => group.key === "admin");

  assert.equal(platform?.label, "Internal Tools");
  assert.ok(platform?.items.some((item) => item.key === "marketplace"));
  assert.equal(manage?.items.some((item) => item.key === "marketplace"), false);
});

test("the Command Center guard rejects roles that are not venue operators", () => {
  const guard = guardForAdminPath("/admin/command-center");
  for (const role of [...OTHER_OPS_ROLES, "parent"]) {
    assert.equal(guard(ctxFor(role)), false, `${role} must not reach the Command Center by URL`);
  }
});

test("getRoleHome sends venue operators to the Command Center, others to /today", () => {
  assert.equal(getRoleHome(ctxFor("platform_admin")), "/admin");
  assert.equal(getRoleHome(ctxFor("venue_director")), "/admin/command-center");
  assert.equal(getRoleHome(ctxFor("venue_staff")), "/admin/command-center");
  assert.equal(getRoleHome(ctxFor("coach")), "/today");
  assert.equal(getRoleHome(null), "/dev-login");
});
