import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Screens used to impersonate each other. /admin/operations-center titled itself
// "Venue Command Center" and claimed to be "the official venue-wide source of
// truth", while /admin/game-day titled itself "Operations center" -- so every
// name pointed at a different route than the one you were on. That is how a
// reader (or a demo) ends up on the wrong screen believing it is the flagship.
//
// One screen owns the Command Center name: /admin/command-center.

const APP_ADMIN = new URL("../src/app/admin/", import.meta.url).pathname;

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pageFiles(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

function h1Text(source: string): string[] {
  return [...source.matchAll(/<h1[^>]*>([^<{]+)</g)].map((m) => m[1].trim());
}

test("only the Command Center route titles itself Command Center", () => {
  const offenders: string[] = [];
  for (const file of pageFiles(APP_ADMIN)) {
    const route = file.slice(APP_ADMIN.length).replace(/\/page\.tsx$/, "");
    const claims = h1Text(readFileSync(file, "utf8")).filter((h) => /command center/i.test(h));
    if (claims.length > 0 && route !== "command-center") {
      offenders.push(`/admin/${route} -> "${claims.join('", "')}"`);
    }
  }
  assert.deepEqual(offenders, [], `these screens impersonate the Command Center:\n  ${offenders.join("\n  ")}`);
});

test("no admin screen titles itself with another screen's route name", () => {
  // A page whose h1 reads "Operations center" while living at /admin/game-day
  // sends the reader to the wrong URL.
  const routeNames: Record<string, string> = {
    "operations center": "operations-center",
    "command center": "command-center",
    "status board": "status-board",
  };
  const offenders: string[] = [];
  for (const file of pageFiles(APP_ADMIN)) {
    const route = file.slice(APP_ADMIN.length).replace(/\/page\.tsx$/, "");
    for (const h of h1Text(readFileSync(file, "utf8"))) {
      const owner = routeNames[h.toLowerCase()];
      if (owner && owner !== route) {
        offenders.push(`/admin/${route} titles itself "${h}", which belongs to /admin/${owner}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `naming collisions:\n  ${offenders.join("\n  ")}`);
});
