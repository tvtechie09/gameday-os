import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/command-center/page.tsx", "utf8");

test("mobile operations links land on the matching Command Center sections", () => {
  const attentionSection = page.indexOf('id="attention-queue"');
  const attentionHeading = page.indexOf("Attention Queue", attentionSection);
  const fieldSection = page.indexOf('id="field-board"');
  const fieldHeading = page.indexOf("Field Board", fieldSection);

  assert.ok(attentionSection >= 0);
  assert.ok(attentionHeading > attentionSection);
  assert.ok(fieldSection >= 0);
  assert.ok(fieldHeading > fieldSection);
  assert.match(page, /href="#field-board">Fields<\/a>/);
  assert.match(page, /href="#attention-queue">Attention<\/a>/);
});
