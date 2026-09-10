import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const contract = readFileSync(new URL("../docs/gameday-design-system-2.0.md", import.meta.url), "utf8");

test("the Venue reference layer exposes shared geometry and semantic tokens", () => {
  for (const token of ["--control-height", "--content-compact", "--content-default", "--content-wide", "--info", "--warning", "--danger", "--success"]) {
    assert.match(css, new RegExp(token.replace("--", "\\-\\-")));
  }
  assert.match(css, /\.ui-control\s*\{[\s\S]*min-height:\s*var\(--control-height\)/);
  assert.match(css, /\.ui-input\s*\{[\s\S]*min-height:\s*var\(--control-height\)/);
});

test("the contract fixes common state language and mobile acceptance widths", () => {
  for (const label of ["ON TIME", "STARTING SOON", "IN PROGRESS", "DELAYED", "CANCELLED", "FINAL"]) {
    assert.match(contract, new RegExp("`" + label + "`"));
  }
  for (const width of ["320", "390", "430", "768", "1024", "1440"]) assert.match(contract, new RegExp("\\b" + width + "\\b"));
});
