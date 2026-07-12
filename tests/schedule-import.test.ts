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
