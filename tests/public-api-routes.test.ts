import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// The public field pages POST to these API routes with NO auth (a parent
// follows a field, a volunteer signs up, a coach shares a community link).
// The runtime middleware matcher is intentionally narrow: public form routes
// must remain outside it so unauthenticated families are never bounced to the
// login wall.
const REQUIRED_PUBLIC_API_ROUTES = [
  "/api/follows",
  "/api/volunteer-roles",
  "/api/resource-activations",
  "/api/field-page-views",
  "/api/sponsor-analytics/",
];

test("public form-submission API routes remain outside the private-route middleware", () => {
  const middleware = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /matcher: \["\/admin\/:path\*"\]/);
  for (const route of REQUIRED_PUBLIC_API_ROUTES) assert.doesNotMatch(middleware, new RegExp(route));
});
