import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const board = readFileSync("src/app/admin/fields/field-operations-board.tsx", "utf8");
const fieldsPage = readFileSync("src/app/admin/fields/page.tsx", "utf8");
const publicVenue = readFileSync("src/app/venues/[venueId]/page.tsx", "utf8");
const core = readFileSync("src/lib/services/field-operations-core.ts", "utf8");

test("Fields keeps List as the default and supplies an accessible map fallback", () => {
  assert.match(board, /useState<"list" \| "map">\("list"\)/);
  assert.match(board, /Venue map not configured/);
  assert.match(board, /Return to list/);
  assert.match(board, /aria-label="Field view"/);
});

test("map markers expose text status and open canonical field detail", () => {
  assert.match(board, /aria-label=\{`\$\{item\.fieldName\}, \$\{status\.label\}\. View details`\}/);
  assert.match(board, /setSelectedId\(item\.fieldId\)/);
  assert.match(board, /min-h-11 min-w-11/);
  assert.match(board, /item\.currentGame/);
  assert.match(board, /item\.nextGame/);
});

test("map reuses the single bulk field operations projection", () => {
  assert.match(fieldsPage, /getSessionsByFieldIds\(scoped\.fields\.map/);
  assert.match(fieldsPage, /getWorkOrdersForVenues\(scoped\.venues\.map/);
  assert.match(core, /mapImageUrl: input\.venue\.mapImageUrl/);
  assert.doesNotMatch(board, /fetch\(|useEffect\([^)]*fetch/);
});

test("public map links only to canonical public field pages and avoids forced phone overflow", () => {
  const mapSection = publicVenue.slice(publicVenue.indexOf("<h2 className=\"text-2xl font-black\">Venue Map"), publicVenue.indexOf("<section className=\"grid gap-5 lg:grid-cols-2\">"));
  assert.match(mapSection, /href=\{`\/fields\/\$\{summary\.field\.id\}`\}/);
  assert.match(mapSection, /fieldStatusPresentation\(summary\.field\.status\)/);
  assert.doesNotMatch(mapSection, /min-w-\[520px\]|work.?order|activeIssue/i);
});

test("missing and partial marker data remain explicit", () => {
  assert.match(board, /mappedItems\.length < venueItems\.length/);
  assert.match(board, /no map marker and remain available in List view/);
  assert.match(publicVenue, /A venue map has not been added yet/);
});
