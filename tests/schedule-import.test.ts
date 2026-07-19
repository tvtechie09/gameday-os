import assert from "node:assert/strict";
import test from "node:test";
import { parseScheduleCsv, validateScheduleRows } from "../src/lib/schedule-import.ts";

const fields = [{ id: "f1", name: "Field 1" }, { id: "f2", name: "Field 2" }];

test("parses tolerant headers and quoted cells", () => {
  const csv = 'Game Date,Start Time,Field Name,Home Team,Away Team\n2026-07-18,9:00 AM,Field 1,"Celtics, 10U",Panthers';
  const { rows, error } = parseScheduleCsv(csv);
  assert.equal(error, undefined);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].homeTeam, "Celtics, 10U");
  assert.equal(rows[0].fieldName, "Field 1");
});

test("requires field and time columns", () => {
  const { error } = parseScheduleCsv("home,away\nA,B");
  assert.match(error ?? "", /field column and a time column/);
});

test("validates rows: field matching, time parsing, end time from game length", () => {
  const csv = "time,field,home,away\n9:00 AM,Field 1,Celtics,Panthers\n10:00 AM,Field 9,Cubs,Saints\nnot-a-time,Field 2,Hawks,Owls";
  const { rows } = parseScheduleCsv(csv);
  const validated = validateScheduleRows(rows, fields, { defaultDate: "2026-07-18", gameMinutes: 60 });
  assert.deepEqual(validated.map((row) => row.errors.length), [0, 1, 1]);
  assert.equal(validated[0].fieldId, "f1");
  assert.equal(new Date(validated[0].endTime).getTime() - new Date(validated[0].startTime).getTime(), 60 * 60 * 1000);
  assert.match(validated[1].errors[0], /Unknown field/);
  assert.match(validated[2].errors[0], /Unreadable date\/time/);
});

test("date column overrides the default date", () => {
  const { rows } = parseScheduleCsv("date,time,field,home\n2026-08-01,1:00 PM,Field 2,Cubs");
  const validated = validateScheduleRows(rows, fields, { defaultDate: "2026-07-18" });
  assert.equal(validated[0].errors.length, 0);
  assert.equal(new Date(validated[0].startTime).getUTCDate(), new Date("2026-08-01 1:00 PM").getUTCDate());
});

test("field name -> id is scoped to the target venue (no cross-venue leak)", () => {
  // "Field 1" exists at two venues. An import for venue A must map to A's field,
  // never B's — otherwise games silently land on the wrong venue.
  const twoVenues = [
    { id: "a-f1", name: "Field 1", venueId: "venueA" },
    { id: "b-f1", name: "Field 1", venueId: "venueB" },
  ];
  const rows = [{ rowNumber: 2, date: "2026-07-18", time: "9:00 AM", fieldName: "Field 1", homeTeam: "Home", awayTeam: "Away", title: "", sport: "" }];

  const a = validateScheduleRows(rows, twoVenues, { defaultDate: "", venueId: "venueA" });
  assert.equal(a[0].fieldId, "a-f1");
  assert.deepEqual(a[0].errors, []);

  const b = validateScheduleRows(rows, twoVenues, { defaultDate: "", venueId: "venueB" });
  assert.equal(b[0].fieldId, "b-f1");

  // No venue scope + a colliding name is ambiguous — must not silently pick one as valid
  // across venues. (Here both share the name; the map would keep the last, which is the
  // exact bug. Scoping is required, so callers must pass venueId.)
  const wrongVenue = validateScheduleRows(rows, twoVenues, { defaultDate: "", venueId: "venueC" });
  assert.equal(wrongVenue[0].fieldId, "");
  assert.match(wrongVenue[0].errors.join(" "), /Unknown field/);
});
