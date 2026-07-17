import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// updateFieldStatus(id, status, actorUserId?) types the actor as OPTIONAL, but
// it immediately runs assertActorUserId(actorUserId) and then a venue-scoped
// requirePermission. Omit the actor and it throws PermissionDeniedError at
// runtime -- which every caller wrapped in a try/catch that logged and moved on.
//
// The damage that caused:
//   * /admin/fields and the field control panel: a GM picked "closed", saw no
//     error, and nothing happened. Field 1 sat untouched from 2026-07-08.
//   * storm-watch: every field hold failed, so fieldsHeld was always 0 while the
//     alert still went out. Lightning overhead, fields reading OPEN on the wall
//     display, and the cron reporting acted: true.
//
// The type can't catch this (the param is optional by signature), so this test
// does. If you add an updateFieldStatus call, pass the actor:
//   * a human triggered it  -> ctx?.userId from getSessionContext()
//   * unattended automation -> automationActorUserId
const SRC = new URL("../src/", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

// Matches updateFieldStatus(a, b) with exactly two arguments -- no actor.
// Tolerates nested parens/ternaries in the status argument.
const TWO_ARG_CALL = /updateFieldStatus\(\s*[^,()]+,\s*(?:[^,()]|\([^()]*\))+\)/g;

test("every updateFieldStatus call passes an actor", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    // The service defines the function; its own signature is not a call site.
    if (file.endsWith("/services/fields.ts")) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.match(TWO_ARG_CALL) ?? []) {
      offenders.push(`${file.slice(SRC.length)}: ${match.replace(/\s+/g, " ")}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these calls omit the actor and will throw PermissionDeniedError at runtime:\n  ${offenders.join("\n  ")}`,
  );
});

test("unattended automation has an identity to act as", () => {
  const source = readFileSync(join(SRC, "lib/access/automation-actor.ts"), "utf8");
  // Must match the users row created by migration 20260717030000. If this id
  // drifts from the migration, the storm cron silently loses permission again.
  assert.match(source, /00000000-0000-4000-9000-000000000011/);
});

test("the weather cron acts as the automation account, not a human", () => {
  const source = readFileSync(join(SRC, "app/api/weather/auto-check/route.ts"), "utf8");
  assert.match(source, /actorUserId: automationActorUserId/);
});

test("the manual storm response attributes to the human who clicked", () => {
  // If this ever passes automationActorUserId, the audit trail lies about who
  // closed the fields.
  const source = readFileSync(join(SRC, "app/admin/alerts/storm/page.tsx"), "utf8");
  assert.match(source, /actorUserId: ctx\.userId/);
  assert.doesNotMatch(source, /automationActorUserId/);
});
