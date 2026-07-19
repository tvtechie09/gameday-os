import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A venue-scoped admin (venue_director / venue_staff / venue_tech_manager) must
// never see or write another venue's data. Isolation is not enforced by the
// database -- every query runs as the service-role key -- so it lives entirely
// in application code. The canonical safe path is getScopedVenuesAndFields(),
// which filters venues + fields to the caller's scope (managesAllVenues ->
// everything; otherwise venueInScope only).
//
// An admin page or action that calls getVenues()/getFields() DIRECTLY, with no
// scope guard, hands a venue-scoped GM a picker or list containing EVERY
// tenant's fields. That is exactly how the schedule generator + import leaked
// (fixed in 778731e): identical "Field 1" names across venues make a mispick
// silent and cross-tenant.
//
// This test is a RATCHET. ALLOWLIST is the set of admin files that still call
// the raw loaders unscoped -- known debt. It may only SHRINK:
//   * add a NEW unscoped admin caller  -> test 1 fails
//   * scope a file but forget to remove it from ALLOWLIST -> test 2 fails
// To clear an entry: route the page through getScopedVenuesAndFields() (see
// src/app/admin/sessions/generate + import for the pattern), then delete its
// line below. The list is done when it is empty.

const SRC = new URL("../src/", import.meta.url).pathname;
const ADMIN_DIR = join(SRC, "app/admin");

// Files that call getVenues()/getFields() but are already scoped (they filter
// with venueInScope / managesAllVenues, or use the helper) are NOT offenders.
const SCOPE_GUARD = /getScopedVenuesAndFields|venueInScope|managesAllVenues/;
const RAW_LOADER = /\bgetVenues\(|\bgetFields\(/;

// Admin files that still load venues/fields WITHOUT a scope guard. Debt to burn
// down -- shrink only, never add.
const ALLOWLIST = new Set<string>([
]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function isUnscopedOffender(file: string): boolean {
  const source = readFileSync(file, "utf8");
  return RAW_LOADER.test(source) && !SCOPE_GUARD.test(source);
}

test("no NEW admin page/action loads venues or fields unscoped", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(ADMIN_DIR)) {
    const rel = "app/" + file.slice(join(SRC, "app/").length);
    if (isUnscopedOffender(file) && !ALLOWLIST.has(rel)) {
      offenders.push(rel);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "these admin files call getVenues()/getFields() with no scope guard and leak every " +
      "tenant's data to venue-scoped admins. Route them through getScopedVenuesAndFields():\n  " +
      offenders.join("\n  "),
  );
});

test("the allowlist only shrinks -- remove entries once scoped", () => {
  const stale: string[] = [];
  for (const rel of ALLOWLIST) {
    const full = join(SRC, rel);
    let exists = true;
    try {
      readFileSync(full, "utf8");
    } catch {
      exists = false;
    }
    // Either the file is gone, or it is no longer an unscoped offender -> the
    // allowlist entry is stale and must be deleted so the ratchet keeps tension.
    if (!exists || !isUnscopedOffender(full)) {
      stale.push(rel);
    }
  }
  assert.deepEqual(
    stale,
    [],
    "these files are on the tenant-isolation allowlist but are no longer unscoped " +
      "offenders (fixed or moved) -- delete them from ALLOWLIST:\n  " + stale.join("\n  "),
  );
});
