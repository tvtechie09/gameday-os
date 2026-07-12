import assert from "node:assert/strict";
import test from "node:test";
import { buildAlertEmail, dedupeFollowerEmails } from "../src/lib/services/alert-delivery.ts";

test("dedupeFollowerEmails keeps one valid entry per address", () => {
  const rows = [
    { id: "f1", email: "Parent@Example.com", field_id: "a" },
    { id: "f2", email: "parent@example.com", field_id: "b" },
    { id: "f3", email: "not-an-email", field_id: "a" },
    { id: "f4", email: null, field_id: "a" },
    { id: "f5", email: "other@example.com ", field_id: "a" }
  ];
  const result = dedupeFollowerEmails(rows);
  assert.deepEqual(result.map((item) => item.email), ["parent@example.com", "other@example.com"]);
  assert.equal(result[0].followId, "f1");
});

test("buildAlertEmail prefixes urgency and weather", () => {
  const urgent = buildAlertEmail({ title: "Clear the fields", message: "Lightning within 8 miles.", alertType: "weather", alertPriority: "urgent" }, "Crossroads");
  assert.match(urgent.subject, /^\[URGENT\] Clear the fields — Crossroads$/);
  const weather = buildAlertEmail({ title: "Rain delay", message: "Games resume 3:30.", alertType: "weather", alertPriority: "normal" }, "Crossroads");
  assert.match(weather.subject, /^\[Weather\] /);
  assert.match(weather.text, /via GameDay OS/);
});
