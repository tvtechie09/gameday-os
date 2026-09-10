import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildVenueOnboarding, hasFinishedOnboarding, onboardingRecord, onboardingStorageKey } from "../src/lib/first-use-onboarding-core.ts";
import type { NavGroup } from "../src/lib/access/navigation.ts";

const managerNavigation: NavGroup[] = [
  { key: "operations", label: "Run Today", items: [
    { key: "today", href: "/today", label: "Today", icon: "Activity", stage: "core" },
    { key: "fields", href: "/admin/fields", label: "Fields", icon: "MapPin", stage: "core" },
    { key: "schedule", href: "/admin/sessions", label: "Schedule", icon: "CalendarDays", stage: "core" },
  ] },
  { key: "admin", label: "More", items: [{ key: "work-orders", href: "/admin/fields/work-orders", label: "Work Orders", icon: "ClipboardCheck", stage: "supporting" }] },
];

test("first eligible Venue role receives a short capability-backed orientation", () => {
  const manager = buildVenueOnboarding("venue_director", managerNavigation);
  assert.deepEqual(manager?.concepts.map((item) => item.title), ["Today", "Fields", "Schedule", "More"]);
  assert.equal(manager?.startHref, "/today");
  assert.equal(buildVenueOnboarding("platform_admin", managerNavigation), null);
});

test("Venue Staff never receives Schedule or management guidance", () => {
  const staffNavigation: NavGroup[] = [
    { key: "operations", label: "Run Today", items: managerNavigation[0].items.filter((item) => item.key !== "schedule") },
    { key: "admin", label: "More", items: [{ key: "work-orders", href: "/admin/fields/work-orders", label: "Work Orders", icon: "ClipboardCheck", stage: "supporting" }] },
  ];
  const staff = buildVenueOnboarding("venue_staff", staffNavigation);
  assert.deepEqual(staff?.concepts.map((item) => item.title), ["Today", "Fields", "Work Orders", "More"]);
  assert.doesNotMatch(JSON.stringify(staff), /Schedule|Reports|Settings|management tools/);
});

test("completion is user, product, role, and version aware", () => {
  const first = onboardingStorageKey({ product: "venue", role: "venue_staff", userId: "user-a" });
  assert.notEqual(first, onboardingStorageKey({ product: "venue", role: "venue_director", userId: "user-a" }));
  assert.notEqual(first, onboardingStorageKey({ product: "venue", role: "venue_staff", userId: "user-b" }));
  assert.equal(hasFinishedOnboarding(onboardingRecord("completed")), true);
  assert.equal(hasFinishedOnboarding(onboardingRecord("dismissed")), true);
  assert.equal(hasFinishedOnboarding(onboardingRecord("completed"), 2), false);
});

test("Venue onboarding is authenticated-shell only, reopenable, accessible, and telemetry failures are non-blocking", () => {
  const frame = readFileSync(new URL("../src/components/access/app-frame.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/access/app-shell.tsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../src/components/first-use-onboarding.tsx", import.meta.url), "utf8");
  assert.match(frame, /resolved\.kind === "guest"/);
  assert.match(shell, /Getting Started/);
  assert.match(component, /Not now/);
  assert.match(component, /try \{[\s\S]*trackPilotEvent/);
  assert.doesNotMatch(component, /email|venueName|identity|canonical/i);
  assert.doesNotMatch(frame + shell, /public\/fields|field-public|\/f\//);
});
