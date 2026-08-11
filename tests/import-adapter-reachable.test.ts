// A built import that nothing renders is not an import.
//
// CalendarImportAdapter, its server actions (fetchCalendarEventsAction,
// importCalendarSessionsAction) and its field matching were all complete and
// mounted NOWHERE. The integrations page imported only the framework console,
// so the one path onto a customer's existing schedule — the "bring your own
// platform" half of a standing product rule — could not be reached by anybody.
// It was found only by tracing what would actually unblock a pilot.
//
// This is the fifth orphan of its kind: a finished feature with no caller. The
// pattern is always the same, so the guard is the same — assert the component
// is imported and rendered by a page, not merely that it exists.
//
// Source-level, matching tests/nav-anchors-exist in the sibling repo: the value
// is in catching a deletion or a refactor that quietly drops the mount, and
// that is a textual property.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/admin/integrations/page.tsx", import.meta.url), "utf8");

// Strip comments so the explanation above the mount cannot satisfy the checks.
const code = page
  .split("\n")
  .filter((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*") && !trimmed.startsWith("{/*");
  })
  .join("\n");

test("REGRESSION: the calendar/CSV import adapter is actually rendered", () => {
  assert.match(code, /import \{ CalendarImportAdapter \}/, "the page must import it");
  assert.match(code, /<CalendarImportAdapter\b/, "importing it is not rendering it — this is exactly how it was orphaned");
});

test("it is handed every prop it needs to function", () => {
  // Rendering it without sessions or sources would mount a component that
  // cannot dedupe against existing games or name its source.
  const mount = code.slice(code.indexOf("<CalendarImportAdapter"));
  for (const prop of ["fields=", "sessions=", "sources=", "venues="]) {
    assert.ok(mount.includes(prop), `CalendarImportAdapter is missing ${prop}`);
  }
});

test("the page actually loads that data server-side", () => {
  assert.match(code, /getScopedVenuesAndFields\(\)/);
  assert.match(code, /getSessions\(\)/, "without existing sessions the import cannot tell an update from a duplicate");
  assert.match(code, /getExternalSources\(\)/);
});

test("the server actions behind it still exist", () => {
  const actions = readFileSync(new URL("../src/app/admin/integrations/import-actions.ts", import.meta.url), "utf8");
  assert.match(actions, /export async function fetchCalendarEventsAction/);
  assert.match(actions, /export async function importCalendarSessionsAction/);
});

test("the adapter still offers the no-credentials paths", () => {
  // The whole point of this route is that it needs no OAuth and no secret.
  // If these modes disappear, the fall pilot loses its unblocked path.
  const adapter = readFileSync(new URL("../src/app/admin/integrations/calendar-import-adapter.tsx", import.meta.url), "utf8");
  assert.match(adapter, /"csv"/);
  assert.match(adapter, /"calendar"/);
});
