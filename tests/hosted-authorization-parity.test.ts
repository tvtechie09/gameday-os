import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { actorFromDevSession, actorFromHostedSnapshot, type CanonicalActorSnapshot } from "../src/lib/access/actor.ts";
import { guardForAdminPath } from "../src/lib/access/navigation.ts";
import { scopeReportData, type ReportData } from "../src/lib/access/report-scope.ts";
import type { SessionPayload } from "../src/lib/access/session-cookie.ts";

const crossroads = "11111111-1111-4111-8111-111111111101";
const riverside = "22222222-2222-4222-8222-222222222241";

const permissions = {
  venue_director: ["venue.manage", "venue.field.manage", "venue.alert.send", "game.status.update"],
  venue_staff: ["venue.field.manage", "venue.alert.send", "device.control", "game.status.update"],
};

function devActor(roleKey: keyof typeof permissions) {
  const payload: SessionPayload = {
    userId: `dev-${roleKey}`,
    email: `${roleKey}@dev.test`,
    displayName: roleKey,
    roleKey,
    scopeType: "venue",
    scopeId: crossroads,
    venueId: crossroads,
    venueName: "Crossroads",
  };
  return actorFromDevSession(payload);
}

function hostedSnapshot(roleKey: keyof typeof permissions): CanonicalActorSnapshot {
  return {
    authUserId: `auth-${roleKey}`,
    userId: `hosted-${roleKey}`,
    email: `${roleKey}@hosted.test`,
    displayName: roleKey,
    userStatus: "active",
    assignments: [{
      roleId: `role-${roleKey}`,
      roleKey,
      scopeType: "venue",
      scopeId: crossroads,
      permissionKeys: permissions[roleKey],
      assignmentStatus: "approved",
    }],
    existingVenueIds: new Set([crossroads]),
  };
}

function assertRouteParity(roleKey: keyof typeof permissions, expected: Record<string, boolean>) {
  const dev = devActor(roleKey);
  assert.ok(dev);
  const hosted = actorFromHostedSnapshot(hostedSnapshot(roleKey));
  assert.ok(hosted);
  for (const [path, allowed] of Object.entries(expected)) {
    assert.equal(guardForAdminPath(path)(dev), allowed, `dev ${roleKey}: ${path}`);
    assert.equal(guardForAdminPath(path)(hosted), allowed, `hosted ${roleKey}: ${path}`);
  }
}

test("dev-login and hosted Venue GM receive identical route decisions", () => {
  assertRouteParity("venue_director", {
    "/admin": true,
    "/admin/fields": true,
    "/admin/sessions": true,
    "/admin/fields/work-orders": true,
    "/admin/operations-center": true,
    "/admin/alerts": true,
    "/admin/venues": true,
    "/admin/executive": true,
    "/admin/roles": false,
    "/admin/identity": false,
    "/admin/organizations": false,
    "/admin/billing": false,
    "/admin/developer": false,
  });
});

test("1.0C restores the complete additive Venue GM permission mapping", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20260903000219_reconcile_venue_director_permissions_1_0c.sql", import.meta.url),
    "utf8",
  );
  for (const permission of [
    "venue.manage",
    "venue.staff.manage",
    "venue.field.manage",
    "venue.device.control",
    "venue.alert.send",
    "venue.emergency.override",
    "device.manage",
    "device.control",
    "sponsor.manage",
    "media.manage",
    "audit.review",
    "identity.role.manage",
    "game.status.update",
    "tournament.game.delay",
  ]) {
    assert.match(migration, new RegExp(`'${permission.replaceAll(".", "\\.")}'`));
  }
  assert.match(migration, /roles\.key = 'venue_director'/);
  assert.match(migration, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(migration, /\b(delete|truncate)\b/i);
});

test("dev-login and hosted Venue Staff receive identical route decisions", () => {
  assertRouteParity("venue_staff", {
    "/admin": false,
    "/admin/fields": true,
    "/admin/fields/work-orders": true,
    "/admin/fields/crossroads/disruption": true,
    "/admin/operations-center": true,
    "/admin/alerts": true,
    "/admin/sessions": false,
    "/admin/venues": false,
    "/admin/executive": false,
    "/admin/roles": false,
    "/admin/identity": false,
    "/admin/organizations": false,
    "/admin/billing": false,
  });
});

test("hosted actor resolution fails closed for invalid identity states", () => {
  const baseline = hostedSnapshot("venue_staff");
  assert.equal(actorFromHostedSnapshot({ ...baseline, assignments: [] }), null, "missing assignment");
  assert.equal(actorFromHostedSnapshot({ ...baseline, userStatus: "disabled" }), null, "inactive user");
  assert.equal(actorFromHostedSnapshot({ ...baseline, assignments: baseline.assignments.map((row) => ({ ...row, assignmentStatus: "revoked" })) }), null, "inactive assignment");
  assert.equal(actorFromHostedSnapshot({ ...baseline, assignments: baseline.assignments.map((row) => ({ ...row, roleKey: "unknown_role" })) }), null, "unknown role");
  assert.equal(actorFromHostedSnapshot({ ...baseline, assignments: baseline.assignments.map((row) => ({ ...row, permissionKeys: [] })) }), null, "missing capability mapping");
  assert.equal(actorFromHostedSnapshot({ ...baseline, existingVenueIds: new Set() }), null, "dangling venue");
});

test("dev-login actor resolution also rejects unknown roles and incomplete venue scope", () => {
  const valid = {
    userId: "dev-invalid",
    email: "invalid@dev.test",
    displayName: "Invalid",
    roleKey: "venue_staff",
    scopeType: "venue",
    scopeId: crossroads,
    venueId: crossroads,
    venueName: "Crossroads",
  } satisfies SessionPayload;
  assert.equal(actorFromDevSession({ ...valid, roleKey: "unknown_role" }), null);
  assert.equal(actorFromDevSession({ ...valid, venueId: null }), null);
  assert.equal(actorFromDevSession({ ...valid, scopeId: "" }), null);
});

test("a hosted GM may hold multiple explicit venue assignments without gaining a third venue", () => {
  const snapshot = hostedSnapshot("venue_director");
  snapshot.assignments.push({ ...snapshot.assignments[0], scopeId: riverside });
  snapshot.existingVenueIds.add(riverside);
  const actor = actorFromHostedSnapshot(snapshot);
  assert.ok(actor);
  assert.deepEqual([...actor.authorizedVenueIds].sort(), [crossroads, riverside].sort());
  assert.equal(actor.authorizedVenueIds.has("third-venue"), false);
});

test("Reports removes Riverside rows for a Crossroads-only actor", () => {
  const venue = (id: string, organizationId: string) => ({ id, organizationId }) as ReportData["venues"][number];
  const field = (id: string, venueId: string) => ({ id, venueId }) as ReportData["fields"][number];
  const session = (id: string, fieldId: string) => ({ id, fieldId }) as ReportData["sessions"][number];
  const input = {
    authorizedVenues: [venue(crossroads, "crossroads-org")],
    venues: [venue(crossroads, "crossroads-org"), venue(riverside, "riverside-org")],
    fields: [field("crossroads-field", crossroads), field("riverside-field", riverside)],
    sessions: [session("crossroads-game", "crossroads-field"), session("riverside-game", "riverside-field")],
    sponsors: [{ id: "crossroads-sponsor", organizationId: "crossroads-org" }, { id: "riverside-sponsor", organizationId: "riverside-org" }],
    sponsorAssignments: [{ id: "crossroads-assignment", sponsorId: "crossroads-sponsor", venueId: crossroads }, { id: "riverside-assignment", sponsorId: "riverside-sponsor", venueId: riverside }],
    alerts: [{ id: "crossroads-alert", venueId: crossroads }, { id: "riverside-alert", venueId: riverside }],
    resources: [{ id: "crossroads-resource", venueId: crossroads }, { id: "riverside-resource", venueId: riverside }],
    activations: [{ id: "crossroads-activation", venueId: crossroads }, { id: "riverside-activation", venueId: riverside }],
    volunteerRoles: [{ id: "crossroads-volunteer", venueId: crossroads }, { id: "riverside-volunteer", venueId: riverside }],
    externalSources: [{ id: "crossroads-source", venueId: crossroads }, { id: "riverside-source", venueId: riverside }],
    syncJobs: [{ id: "crossroads-job", sourceId: "crossroads-source" }, { id: "riverside-job", sourceId: "riverside-source" }],
    syncQueueItems: [{ id: "crossroads-queue", syncJobId: "crossroads-job" }, { id: "riverside-queue", syncJobId: "riverside-job" }],
    sessionEvents: [{ id: "crossroads-event", sessionId: "crossroads-game" }, { id: "riverside-event", sessionId: "riverside-game" }],
    venueAssets: [{ id: "crossroads-asset", venueId: crossroads }, { id: "riverside-asset", venueId: riverside }],
    unrestricted: false,
  } as unknown as ReportData;
  const scoped = scopeReportData(input);
  for (const rows of Object.values(scoped)) {
    assert.equal(rows.length, 1);
  }
  assert.doesNotMatch(JSON.stringify(scoped), /riverside|22222222-2222-4222-8222-222222222241/);
});

test("Riverside identifiers cannot widen a Crossroads report projection", () => {
  const actor = actorFromHostedSnapshot(hostedSnapshot("venue_director"));
  assert.ok(actor);
  assert.equal(actor.authorizedVenueIds.has(riverside), false);
  assert.equal(guardForAdminPath("/admin/executive?venue_id=" + riverside)(actor), true);
  // The route is allowed for a GM, but the server projection remains derived
  // exclusively from actor-authorized venues, never from the query string.
  const scoped = scopeReportData({
    authorizedVenues: [{ id: crossroads, organizationId: "crossroads-org" } as ReportData["venues"][number]],
    venues: [{ id: riverside } as ReportData["venues"][number]],
    fields: [], sessions: [], sponsors: [], alerts: [], resources: [], activations: [],
    sponsorAssignments: [],
    volunteerRoles: [], externalSources: [], syncJobs: [], syncQueueItems: [], sessionEvents: [], venueAssets: [],
    unrestricted: false,
  });
  assert.deepEqual(scoped.venues, []);
});
