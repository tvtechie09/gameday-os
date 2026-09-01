import assert from "node:assert/strict";
import test from "node:test";
import {
  alertLevelFor,
  alertLevelPresentation,
  alertTypeLabel,
  fieldStatusPresentation,
  gameStatusPresentation,
} from "../src/lib/ui/status-presentation.ts";

test("game lifecycle values collapse into consistent user-facing vocabulary", () => {
  assert.deepEqual(gameStatusPresentation("scheduled", "scheduled"), { label: "ON TIME", tone: "info" });
  assert.equal(gameStatusPresentation("scheduled", "ready").label, "STARTING SOON");
  assert.equal(gameStatusPresentation("active", "live").label, "IN PROGRESS");
  assert.equal(gameStatusPresentation("scheduled", "postponed").label, "DELAYED");
  assert.equal(gameStatusPresentation("scheduled", "cancelled").label, "CANCELLED");
  assert.equal(gameStatusPresentation("final", "final").label, "FINAL");
});

test("field vocabulary keeps immediate operating meaning", () => {
  assert.equal(fieldStatusPresentation("open").label, "FIELD OPEN");
  assert.equal(fieldStatusPresentation("active").label, "IN USE");
  assert.equal(fieldStatusPresentation("delayed").label, "DELAYED");
  assert.equal(fieldStatusPresentation("maintenance").label, "FIELD CLOSED");
});

test("alerts use only Informational, Important, and Urgent levels", () => {
  assert.equal(alertLevelFor("normal", "info"), "informational");
  assert.equal(alertLevelFor("high", "parking"), "important");
  assert.equal(alertLevelFor("low", "weather"), "important");
  assert.equal(alertLevelFor("normal", "field_closure"), "urgent");
  assert.equal(alertLevelPresentation("informational").label, "INFORMATIONAL");
  assert.equal(alertLevelPresentation("important").label, "IMPORTANT");
  assert.equal(alertLevelPresentation("urgent").label, "URGENT");
});

test("raw alert enum values are translated into normal language", () => {
  assert.equal(alertTypeLabel("field_closure"), "Field closure");
  assert.equal(alertTypeLabel("info"), "General update");
});
