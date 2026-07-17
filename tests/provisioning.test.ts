import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFieldNames,
  MAX_SPLITS_PER_FIELD,
  packageForFieldCount,
  planFields,
  slugify,
  summarizeProvision,
  tierForFieldCount,
  validateProvisionInput,
  type ProvisionInput,
} from "../src/lib/services/provisioning-core.ts";

const input = (over: Partial<ProvisionInput> = {}): ProvisionInput => ({
  accountType: "complex",
  organizationName: "Riverside Parks District",
  venueName: "Riverside Sports Complex",
  fieldCount: 8,
  fieldNamePattern: "Field {n}",
  splitsPerField: 0,
  sportType: "baseball",
  technology: { scoreboards: false, cameras: false, audio: false },
  league: null,
  packageKey: "complex",
  plan: null,
  isDemo: false,
  ...over,
});

test("slugify makes a URL-safe org slug", () => {
  assert.equal(slugify("Riverside Parks District"), "riverside-parks-district");
  assert.equal(slugify("  O'Fallon Parks & Rec!  "), "ofallon-parks-rec");
  assert.equal(slugify("!!!"), "");
});

test("buildFieldNames substitutes {n} and clamps the count", () => {
  assert.deepEqual(buildFieldNames(3, "Field {n}"), ["Field 1", "Field 2", "Field 3"]);
  assert.deepEqual(buildFieldNames(2, "Diamond {n}"), ["Diamond 1", "Diamond 2"]);
  assert.equal(buildFieldNames(0, "Field {n}").length, 0);
  assert.equal(buildFieldNames(999, "Field {n}").length, 60); // clamped
});

test("buildFieldNames still yields distinct names when {n} is omitted", () => {
  // A careless pattern must not create three fields all named the same thing.
  assert.deepEqual(buildFieldNames(3, "North Diamond"), ["North Diamond 1", "North Diamond 2", "North Diamond 3"]);
  const names = buildFieldNames(5, "");
  assert.equal(new Set(names).size, 5);
});

test("validation accepts a good venue and rejects the bad cases", () => {
  assert.deepEqual(validateProvisionInput(input()), { ok: true });

  assert.match((validateProvisionInput(input({ organizationName: " " })) as { error: string }).error, /Organization name/i);
  assert.match((validateProvisionInput(input({ venueName: "" })) as { error: string }).error, /Venue name/i);
  assert.match((validateProvisionInput(input({ organizationName: "!!!" })) as { error: string }).error, /letter or number/i);
  assert.match((validateProvisionInput(input({ fieldCount: 0 })) as { error: string }).error, /at least one field/i);
  assert.match((validateProvisionInput(input({ fieldCount: 99 })) as { error: string }).error, /60 fields/i);
});

test("validation guards the billing plan amount", () => {
  assert.deepEqual(validateProvisionInput(input({ plan: { label: "Complex", amountCents: 150000, interval: "month" } })), { ok: true });
  assert.match((validateProvisionInput(input({ plan: { label: "x", amountCents: -1, interval: "month" } })) as { error: string }).error, /zero or more/i);
  // $20,000/yr is a legitimate flagship-sized number — must NOT be rejected.
  assert.deepEqual(validateProvisionInput(input({ plan: { label: "Flagship", amountCents: 20_000_00, interval: "year" } })), { ok: true });
  // A fat-fingered $200,000 is over the guard.
  assert.match((validateProvisionInput(input({ plan: { label: "x", amountCents: 200_000_00, interval: "year" } })) as { error: string }).error, /looks wrong/i);
});

test("tier is derived from field count, matching published pricing", () => {
  assert.equal(tierForFieldCount(1), "Single park");
  assert.equal(tierForFieldCount(4), "Single park");
  assert.equal(tierForFieldCount(5), "Complex");
  assert.equal(tierForFieldCount(12), "Complex");
  assert.equal(tierForFieldCount(13), "Flagship");
  assert.equal(tierForFieldCount(31), "Flagship");
});

// ---- Packages ---------------------------------------------------------------

test("package is inferred from field count and never guesses District", () => {
  assert.equal(packageForFieldCount(4).key, "single_park");
  assert.equal(packageForFieldCount(5).key, "complex");
  assert.equal(packageForFieldCount(13).key, "flagship");
  assert.equal(packageForFieldCount(500).key, "flagship");
  // District is a multi-venue decision, not something one venue's size implies.
  assert.notEqual(packageForFieldCount(99).key, "district");
});

// ---- Divisible fields -------------------------------------------------------

test("planFields: undivided fields are standalone, not parents of nothing", () => {
  const planned = planFields({ fieldCount: 3, fieldNamePattern: "Field {n}", splitsPerField: 0 });
  assert.equal(planned.length, 3);
  assert.ok(planned.every((f) => f.layoutRole === "standalone"));
  assert.ok(planned.every((f) => f.parentIndex === null && f.surfaceCode === null));
});

test("planFields: a split field mirrors the flagship's real shape", () => {
  // Verified against Crossroads: parent = parent/Full/no code;
  // child = split_child/Split/code A|B|C with parent_field_id set.
  const planned = planFields({ fieldCount: 2, fieldNamePattern: "Field {n}", splitsPerField: 3 });
  assert.equal(planned.length, 2 + 2 * 3);

  const parents = planned.filter((f) => f.parentIndex === null);
  assert.deepEqual(parents.map((f) => f.name), ["Field 1", "Field 2"]);
  assert.ok(parents.every((f) => f.layoutRole === "parent" && f.layoutType === "Full" && f.surfaceCode === null));

  const kids = planned.filter((f) => f.parentIndex !== null);
  assert.deepEqual(kids.map((f) => f.name), ["Field 1A", "Field 1B", "Field 1C", "Field 2A", "Field 2B", "Field 2C"]);
  assert.ok(kids.every((f) => f.layoutRole === "split_child" && f.layoutType === "Split"));
  assert.deepEqual(kids.filter((f) => f.parentIndex === 0).map((f) => f.surfaceCode), ["A", "B", "C"]);
});

test("planFields: every parent is written before any child", () => {
  // provisioning.ts inserts parents first and maps ids by index; a child that
  // appeared before its parent would reference an id that doesn't exist yet.
  const planned = planFields({ fieldCount: 4, fieldNamePattern: "Field {n}", splitsPerField: 2 });
  const firstChild = planned.findIndex((f) => f.parentIndex !== null);
  const lastParent = planned.map((f) => f.parentIndex).lastIndexOf(null);
  assert.ok(lastParent < firstChild, "a child is planned before a parent exists");
  for (const child of planned.filter((f) => f.parentIndex !== null)) {
    assert.ok(child.parentIndex! < firstChild, "parentIndex must point at a parent row");
  }
});

test("validation rejects a one-way split and over-splitting", () => {
  assert.match((validateProvisionInput(input({ splitsPerField: 1 })) as { error: string }).error, /just the field/i);
  assert.match(
    (validateProvisionInput(input({ splitsPerField: MAX_SPLITS_PER_FIELD + 1 })) as { error: string }).error,
    /up to 4 ways/i,
  );
  assert.deepEqual(validateProvisionInput(input({ splitsPerField: 0 })), { ok: true });
  assert.deepEqual(validateProvisionInput(input({ splitsPerField: 3 })), { ok: true });
});

test("validation stops a submit that would create hundreds of rows", () => {
  // 60 fields x 4 splits = 300 rows, right at the ceiling.
  assert.deepEqual(validateProvisionInput(input({ fieldCount: 60, splitsPerField: 4 })), { ok: true });
  // 61 is already rejected by the field cap, so push splits instead.
  const tooMany = validateProvisionInput(input({ fieldCount: 60, splitsPerField: 5 }));
  assert.match((tooMany as { error: string }).error, /up to 4 ways/i);
});

// ---- Organizations vs complexes ---------------------------------------------

test("an organization requires league details and a valid owner email", () => {
  const org = (league: ProvisionInput["league"]) => validateProvisionInput(input({ accountType: "organization", league }));

  assert.match((org(null) as { error: string }).error, /add the league details/i);
  assert.match((org({ leagueName: "", teamCount: 8, ownerEmail: "a@b.co" }) as { error: string }).error, /League name/i);
  assert.match((org({ leagueName: "Riverside Youth", teamCount: 0, ownerEmail: "a@b.co" }) as { error: string }).error, /at least one team/i);
  // The owner email is how the league actually gets created (the team app keys an
  // org to a real auth user), so a typo here is a dead end, not a cosmetic bug.
  assert.match((org({ leagueName: "Riverside Youth", teamCount: 8, ownerEmail: "not-an-email" }) as { error: string }).error, /valid owner email/i);
  assert.deepEqual(org({ leagueName: "Riverside Youth", teamCount: 8, ownerEmail: "gm@riverside.org" }), { ok: true });
});

test("a plain complex needs no league details", () => {
  assert.deepEqual(validateProvisionInput(input({ accountType: "complex", league: null })), { ok: true });
});

// ---- Summary ----------------------------------------------------------------

test("summary counts what will actually be created", () => {
  const summary = summarizeProvision(input({
    fieldCount: 4,
    splitsPerField: 2,
    technology: { scoreboards: true, cameras: true, audio: true },
  }));
  assert.equal(summary.parentFields, 4);
  assert.equal(summary.childFields, 8);
  assert.equal(summary.totalFields, 12);
  assert.equal(summary.playSurfaces, 12);
  // Boards follow playable surfaces (games happen on the halves when split)...
  assert.equal(summary.scoreboards, 12);
  // ...cameras follow the physical field, not each half...
  assert.equal(summary.cameras, 4);
  // ...and PA is venue-wide.
  assert.equal(summary.audioProfiles, 1);
});

test("summary reports nothing for technology that wasn't selected", () => {
  const summary = summarizeProvision(input({ fieldCount: 3, splitsPerField: 0 }));
  assert.equal(summary.scoreboards, 0);
  assert.equal(summary.cameras, 0);
  assert.equal(summary.audioProfiles, 0);
  assert.equal(summary.teamsInvited, 0);
});

test("summary reports teams only for an organization", () => {
  const league = { leagueName: "Riverside Youth", teamCount: 12, ownerEmail: "gm@riverside.org" };
  assert.equal(summarizeProvision(input({ accountType: "organization", league })).teamsInvited, 12);
  // Same league data on a complex is not an org -- don't promise team invites.
  assert.equal(summarizeProvision(input({ accountType: "complex", league })).teamsInvited, 0);
});
