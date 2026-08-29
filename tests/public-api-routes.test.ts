import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// The public field pages POST to these API routes with NO auth (a parent
// follows a field, a volunteer signs up, a coach shares a community link).
// proxy.ts redirects everything it doesn't recognize as public to /login,
// so an endpoint missing from PUBLIC_CONTENT_PREFIXES is silently DEAD in
// production -- the form submits and bounces to a login page.
//
// This is exactly how /api/volunteer-roles broke: every sibling public endpoint
// was listed except that one. If you add a new unauthenticated API route that a
// public page calls, add it to the middleware allowlist and to this list.
const REQUIRED_PUBLIC_API_ROUTES = [
  "/api/follows",
  "/api/volunteer-roles",
  "/api/resource-activations",
  "/api/field-page-views",
  "/api/sponsor-analytics/",
];

test("public form-submission API routes are allowlisted in middleware", () => {
  const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
  const missing = REQUIRED_PUBLIC_API_ROUTES.filter((route) => !proxy.includes(`"${route}"`));
  assert.deepEqual(
    missing,
    [],
    "these public API routes are not in middleware's public allowlist, so the middleware " +
      "will redirect their form POSTs to /login (dead in production):\n  " + missing.join("\n  "),
  );
});
