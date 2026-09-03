import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { rolePermissionCatalog } from "../src/lib/access/catalog.ts";

const roleMigration = readFileSync(
  "supabase/migrations/20260902214644_reconcile_staging_access_roles_1_0b.sql",
  "utf8",
);
const inviteMigration = readFileSync(
  "supabase/migrations/20260902214646_harden_identity_invites_access_1_0b.sql",
  "utf8",
);

test("Venue Staff migration matches the existing application role contract", () => {
  const expected = [
    "venue.field.manage",
    "venue.alert.send",
    "device.control",
    "game.status.update",
  ];

  assert.deepEqual(rolePermissionCatalog.venue_staff, expected);
  assert.match(roleMigration, /'venue_staff'/);
  for (const permission of expected) {
    assert.ok(roleMigration.includes(`'${permission}'`));
  }
  assert.doesNotMatch(roleMigration, /venue\.manage|venue\.staff\.manage|identity\.role\.manage|audit\.review/);
  assert.doesNotMatch(roleMigration, /user_role_assignments|auth\.users/);
});

test("Venue Staff migration is additive and leaves the GM mapping untouched", () => {
  assert.match(roleMigration, /on conflict \(key\) do nothing/i);
  assert.match(roleMigration, /on conflict \(role_id, permission_id\) do nothing/i);
  assert.doesNotMatch(roleMigration, /delete\s+from|drop\s+|truncate\s+|venue_director/i);
});

test("identity_invites is server-only after grant hardening", () => {
  assert.match(
    inviteMigration,
    /revoke all privileges on table public\.identity_invites from anon, authenticated/i,
  );
  assert.match(
    inviteMigration,
    /grant select, insert, update, delete on table public\.identity_invites to service_role/i,
  );
  assert.doesNotMatch(inviteMigration, /create policy|using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i);
});
