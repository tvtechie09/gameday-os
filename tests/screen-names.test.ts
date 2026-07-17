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

// Screens deleted 2026-07-17 as unreachable duplicates:
//   /admin/dashboard    (855 lines, 1 action: field status -> /admin/fields has it)
//   /admin/game-day     (492 lines, ZERO actions -- a read-only view of what the
//                        Command Center and the wall display already show)
//   /admin/status-board (319 lines, 1 action: field status, and it was broken)
//
// ~1,666 lines that no nav could reach. A link or revalidatePath left pointing at
// them is either a 404 for a GM or a silent no-op, and both look like the code
// works. Same failure shape as the rest of this codebase's bugs.
const DELETED_ROUTES = ["/admin/dashboard", "/admin/game-day", "/admin/status-board"];

test("nothing references a deleted ops screen", () => {
  const offenders: string[] = [];
  const roots = [new URL("../src/app/", import.meta.url).pathname, new URL("../src/lib/", import.meta.url).pathname, new URL("../src/components/", import.meta.url).pathname];
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
  };
  for (const root of roots) {
    for (const file of walk(root)) {
      const source = readFileSync(file, "utf8");
      for (const route of DELETED_ROUTES) {
        // Match the route as a whole path segment, not a prefix of a live one.
        if (new RegExp(`["'\`]${route}(["'\`/?])`).test(source)) {
          offenders.push(`${file.split("/src/")[1]} -> ${route}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `these point at deleted screens:\n  ${offenders.join("\n  ")}`);
});

test("no link is labelled for a screen that no longer exists", () => {
  // A button reading "Status Board" that opens /admin/fields is how a codebase
  // starts lying about itself again.
  const dead = ["Status Board", "Game Day Center", "Operations Dashboard"];
  const offenders: string[] = [];
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
  };
  for (const file of walk(new URL("../src/app/", import.meta.url).pathname)) {
    const source = readFileSync(file, "utf8");
    for (const label of dead) {
      if (source.includes(label)) offenders.push(`${file.split("/src/")[1]} -> "${label}"`);
    }
  }
  assert.deepEqual(offenders, [], `stale labels:\n  ${offenders.join("\n  ")}`);
});
