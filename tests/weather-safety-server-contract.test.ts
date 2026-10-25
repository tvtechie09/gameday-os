import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(
  new URL("../src/lib/services/weather-safety-server.ts", import.meta.url),
  "utf8",
);

function loadSessionsSource() {
  const start = serverSource.indexOf("const loadSessions = async () => {");
  const end = serverSource.indexOf("const [fields, sessions]", start);
  assert.notEqual(start, -1, "weather-safety server must define the trusted session loader");
  assert.notEqual(end, -1, "weather-safety server must resolve scope only after session loading");
  return serverSource.slice(start, end);
}

test("Weather & Safety trusted loader fails closed on unknown session lifecycle values", () => {
  const source = loadSessionsSource();

  assert.match(
    source,
    /if \(!sessionStatuses\.includes\(row\.status as SessionStatus\)\) \{\s*throw new Error\(`Invalid session lifecycle status for \$\{row\.id\}\.`\);\s*\}/,
  );
  assert.doesNotMatch(
    source,
    /:\s*"scheduled"\s+as const/,
    "unknown lifecycle values must never be normalized to scheduled",
  );
});

test("Weather & Safety trusted loader preserves supported lifecycle values without normalization", () => {
  assert.match(
    serverSource,
    /const sessionStatuses: SessionStatus\[\] = \["scheduled", "active", "final"\];/,
  );
  assert.match(loadSessionsSource(), /status: row\.status as SessionStatus/);
});
