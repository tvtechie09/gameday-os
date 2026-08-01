import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCoachRoster,
  expandGrantSlots,
  resolveSlotStates,
  isClaimableSlot,
  timeLabel,
  type ClaimForRoster,
  type ClaimLite,
  type GrantRecurrence,
} from "../src/lib/services/field-reservations-core.ts";

// Illinois Celtics: Tue/Wed/Thu, 6:00-9:00pm, 90-min slots.
const grant = (over: Partial<GrantRecurrence> = {}): GrantRecurrence => ({
  daysOfWeek: [2, 3, 4],
  windowStartMinute: 18 * 60,
  windowEndMinute: 21 * 60,
  slotMinutes: 90,
  seasonStartDate: "2026-07-01",
  seasonEndDate: "2026-08-31",
  ...over,
});

const ms = (iso: string) => Date.parse(iso);

test("expandGrantSlots: a 3-hour window at 90 min yields exactly two slots per day", () => {
  // Tue 2026-07-21, 6-9pm Chicago (CDT, -05:00).
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  assert.equal(slots.length, 2);
  assert.equal(slots[0].startLabel, "Tue 6:00 PM");
  assert.equal(slots[0].endLabel, "7:30 PM");
  assert.equal(slots[1].startLabel, "Tue 7:30 PM");
  assert.equal(slots[1].endLabel, "9:00 PM");
  // The absolute instants are the Chicago wall-clock times, not UTC-naive.
  assert.equal(slots[0].startsAt, "2026-07-21T23:00:00.000Z"); // 6pm CDT = 23:00Z
});

test("expandGrantSlots: only the grant's days appear", () => {
  // A full week; Tue/Wed/Thu only -> 3 days x 2 slots.
  const slots = expandGrantSlots(grant(), ms("2026-07-20T00:00:00-05:00"), ms("2026-07-27T00:00:00-05:00"));
  assert.equal(slots.length, 6);
  const days = new Set(slots.map((s) => s.startLabel.slice(0, 3)));
  assert.deepEqual([...days].sort(), ["Thu", "Tue", "Wed"]);
});

test("expandGrantSlots: a partial final slot that overruns the window is dropped", () => {
  // 6:00-9:00 window, 120-min slots: 6-8 fits, 8-10 would overrun -> one slot.
  const slots = expandGrantSlots(grant({ slotMinutes: 120 }), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  assert.equal(slots.length, 1);
  assert.equal(slots[0].endLabel, "8:00 PM");
});

test("expandGrantSlots: slots outside the season are not produced", () => {
  const slots = expandGrantSlots(
    grant({ seasonStartDate: "2026-07-22", seasonEndDate: "2026-07-22" }),
    ms("2026-07-20T00:00:00-05:00"),
    ms("2026-07-27T00:00:00-05:00"),
  );
  // Season is a single Wednesday.
  assert.ok(slots.every((s) => s.startLabel.startsWith("Wed")));
  assert.equal(slots.length, 2);
});

test("expandGrantSlots: 6pm means 6pm on both sides of a DST change", () => {
  // US DST ends 2026-11-01. A Tue/Wed/Thu grant spanning it must keep 6:00 PM
  // local on the Thu before (CDT) and the following week (CST) -- if the offset
  // were hardcoded, one of these would drift to 5 or 7pm.
  const slots = expandGrantSlots(
    grant({ seasonStartDate: "2026-10-01", seasonEndDate: "2026-11-30" }),
    ms("2026-10-29T00:00:00-05:00"), // Thu Oct 29 (CDT)
    ms("2026-11-06T00:00:00-06:00"), // through Thu Nov 5 (CST)
  );
  const firsts = slots.filter((s) => s.startLabel.endsWith("6:00 PM"));
  // Every day still starts at 6:00 PM local despite the Nov 1 fall-back.
  assert.ok(firsts.length >= 2);
  assert.ok(firsts.every((s) => s.startLabel.endsWith("6:00 PM")));
});

// ---- slot windows in a SECOND timezone, across DST --------------------------
//
// A grant's window is venue-local wall clock: "6-9pm" must stay 6-9pm at the
// field, in that field's zone, on both sides of a DST change. These mirror the
// Chicago DST test for an Eastern venue -- the case that a Central-only
// implementation gets wrong by an hour year-round, and by two across the change.

test("expandGrantSlots: an Eastern venue's 6pm window is 6pm Eastern, not Central", () => {
  // Tue 2026-07-21, 6-9pm New York (EDT, -04:00).
  const slots = expandGrantSlots(
    grant(),
    ms("2026-07-21T00:00:00-04:00"),
    ms("2026-07-22T00:00:00-04:00"),
    "America/New_York",
  );
  assert.equal(slots.length, 2);
  assert.equal(slots[0].startLabel, "Tue 6:00 PM");
  assert.equal(slots[0].endLabel, "7:30 PM");
  // 6:00 PM EDT is 22:00Z -- an hour earlier in absolute time than the same
  // window at a Chicago venue, which is the whole point.
  assert.equal(slots[0].startsAt, "2026-07-21T22:00:00.000Z");
});

test("expandGrantSlots: 6pm Eastern stays 6pm across the 2026-11-01 fall-back", () => {
  const slots = expandGrantSlots(
    grant({ seasonStartDate: "2026-10-01", seasonEndDate: "2026-11-30" }),
    ms("2026-10-29T00:00:00-04:00"), // Thu Oct 29 (EDT)
    ms("2026-11-06T00:00:00-05:00"), // through Thu Nov 5 (EST)
    "America/New_York",
  );
  const firsts = slots.filter((s) => s.startLabel.endsWith("6:00 PM"));
  assert.ok(firsts.length >= 2);
  assert.ok(firsts.every((s) => s.startLabel.endsWith("6:00 PM")));

  // The absolute instants must SHIFT by an hour across the change even though
  // the local label does not: 6pm EDT is 22:00Z, 6pm EST is 23:00Z. A fixed
  // offset would hold one of these wrong.
  const before = slots.find((s) => s.startsAt < "2026-11-01" && s.startLabel.endsWith("6:00 PM"));
  const after = slots.find((s) => s.startsAt > "2026-11-02" && s.startLabel.endsWith("6:00 PM"));
  assert.ok(before && after);
  assert.ok(before.startsAt.endsWith("T22:00:00.000Z"));
  assert.ok(after.startsAt.endsWith("T23:00:00.000Z"));
});

test("isClaimableSlot: a slot is only claimable in the zone that generated it", () => {
  const g = grant();
  // The Tue 2026-07-21 6:00-7:30pm slot at an EASTERN venue.
  const easternStart = "2026-07-21T22:00:00.000Z";
  const easternEnd = "2026-07-21T23:30:00.000Z";
  assert.equal(isClaimableSlot(g, easternStart, easternEnd, "America/New_York"), true);
  // The same wall-clock window at a CENTRAL venue is a different instant, so the
  // Eastern claim must not validate against Central -- that mismatch is how a
  // coach's legitimate booking gets rejected as "not an open slot".
  assert.equal(isClaimableSlot(g, easternStart, easternEnd, "America/Chicago"), false);
  assert.equal(isClaimableSlot(g, "2026-07-21T23:00:00.000Z", "2026-07-22T00:30:00.000Z", "America/Chicago"), true);
});

test("timeLabel: reservation labels follow the venue's zone", () => {
  assert.equal(timeLabel("2026-07-21T23:00:00.000Z", "America/New_York"), "7:00 PM");
  assert.equal(timeLabel("2026-07-21T23:00:00.000Z", "America/Chicago"), "6:00 PM");
  // Default stays Central for callers not yet passing a zone.
  assert.equal(timeLabel("2026-07-21T23:00:00.000Z"), "6:00 PM");
});

test("expandGrantSlots: no days, zero slot length, or inverted window yields nothing", () => {
  const range: [number, number] = [ms("2026-07-20T00:00:00-05:00"), ms("2026-07-27T00:00:00-05:00")];
  assert.equal(expandGrantSlots(grant({ daysOfWeek: [] }), ...range).length, 0);
  assert.equal(expandGrantSlots(grant({ slotMinutes: 0 }), ...range).length, 0);
  assert.equal(expandGrantSlots(grant({ windowStartMinute: 21 * 60, windowEndMinute: 18 * 60 }), ...range).length, 0);
});

// ---- Slot state resolution --------------------------------------------------

const claim = (over: Partial<ClaimLite>): ClaimLite => ({
  startsAt: "2026-07-21T23:00:00.000Z",
  endsAt: "2026-07-22T00:30:00.000Z",
  status: "confirmed",
  claimedByName: "Celtics 12U",
  claimedByUserId: null,
  ...over,
});

const NOW = ms("2026-07-21T12:00:00-05:00"); // noon Tue, before the 6pm slots

test("resolveSlotStates: an unclaimed future slot is open", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const resolved = resolveSlotStates(slots, [], NOW, null);
  assert.ok(resolved.every((s) => s.state.kind === "open"));
});

test("resolveSlotStates: a confirmed claim makes the slot taken, named", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const resolved = resolveSlotStates(slots, [claim({})], NOW, null);
  const first = resolved[0].state;
  assert.equal(first.kind, "taken");
  assert.equal(first.kind === "taken" && first.claimedByName, "Celtics 12U");
  assert.equal(resolved[1].state.kind, "open");
});

test("resolveSlotStates: my own claim reads as mine, not taken", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const resolved = resolveSlotStates(slots, [claim({ claimedByUserId: "coach-1" })], NOW, "coach-1");
  assert.equal(resolved[0].state.kind, "mine");
});

test("resolveSlotStates: a past slot is past even if unclaimed", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const afterGames = ms("2026-07-22T00:00:00-05:00");
  const resolved = resolveSlotStates(slots, [], afterGames, null);
  assert.ok(resolved.every((s) => s.state.kind === "past"));
});

test("resolveSlotStates: two pending requests, none mine, read as contested", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const resolved = resolveSlotStates(
    slots,
    [claim({ status: "requested", claimedByName: "A" }), claim({ status: "requested", claimedByName: "B" })],
    NOW,
    null,
  );
  const s = resolved[0].state;
  assert.equal(s.kind, "contested");
  assert.deepEqual(s.kind === "contested" && s.requests.sort(), ["A", "B"]);
});

test("resolveSlotStates: cancelled and denied claims free the slot", () => {
  const slots = expandGrantSlots(grant(), ms("2026-07-21T00:00:00-05:00"), ms("2026-07-22T00:00:00-05:00"));
  const resolved = resolveSlotStates(
    slots,
    [claim({ status: "cancelled" }), claim({ status: "denied" })],
    NOW,
    null,
  );
  assert.equal(resolved[0].state.kind, "open");
});

// ---- Claim validation -------------------------------------------------------

test("isClaimableSlot: accepts an exact slot boundary, rejects an off-grid time", () => {
  const g = grant();
  // Exact 6:00-7:30 Tue.
  assert.equal(isClaimableSlot(g, "2026-07-21T23:00:00.000Z", "2026-07-22T00:30:00.000Z"), true);
  // 6:15-7:45 -- not a generated boundary.
  assert.equal(isClaimableSlot(g, "2026-07-21T23:15:00.000Z", "2026-07-22T00:45:00.000Z"), false);
  // Right times, wrong day (Monday).
  assert.equal(isClaimableSlot(g, "2026-07-20T23:00:00.000Z", "2026-07-21T00:30:00.000Z"), false);
});

test("timeLabel renders venue-local", () => {
  assert.equal(timeLabel("2026-07-21T23:00:00.000Z"), "6:00 PM");
});

// ---- Coaches roster (derived, no coach table exists) ------------------------

const rosterClaim = (over: Partial<ClaimForRoster> = {}): ClaimForRoster => ({
  claimedByName: "Jamie Rivera",
  claimedByEmail: "jamie@example.com",
  startsAt: "2026-07-21T23:00:00.000Z",
  status: "confirmed",
  ...over,
});

test("deriveCoachRoster groups repeat claims by the same coach into one row", () => {
  const roster = deriveCoachRoster([
    rosterClaim({ startsAt: "2026-07-21T23:00:00.000Z" }),
    rosterClaim({ startsAt: "2026-07-28T23:00:00.000Z" }),
  ]);
  assert.equal(roster.length, 1);
  assert.equal(roster[0].activeClaimCount, 2);
  assert.equal(roster[0].lastClaimAt, "2026-07-28T23:00:00.000Z");
});

test("deriveCoachRoster treats the same name with a different email as a different coach", () => {
  // A coincidence in names shouldn't conflate two different people.
  const roster = deriveCoachRoster([
    rosterClaim({ claimedByEmail: "jamie@example.com" }),
    rosterClaim({ claimedByEmail: "jamie.other@example.com" }),
  ]);
  assert.equal(roster.length, 2);
});

test("deriveCoachRoster counts only confirmed/requested as active, not cancelled or denied", () => {
  const roster = deriveCoachRoster([
    rosterClaim({ status: "confirmed" }),
    rosterClaim({ status: "cancelled", startsAt: "2026-07-28T23:00:00.000Z" }),
    rosterClaim({ status: "denied", startsAt: "2026-08-04T23:00:00.000Z" }),
  ]);
  assert.equal(roster.length, 1);
  assert.equal(roster[0].activeClaimCount, 1);
  // lastClaimAt still reflects the most recent claim regardless of status --
  // a coach who was just denied a slot is still a coach who was just active.
  assert.equal(roster[0].lastClaimAt, "2026-08-04T23:00:00.000Z");
});

test("deriveCoachRoster skips a blank name and sorts most-recent-first", () => {
  const roster = deriveCoachRoster([
    rosterClaim({ claimedByName: "  ", startsAt: "2026-09-01T23:00:00.000Z" }),
    rosterClaim({ claimedByName: "Alex Chen", claimedByEmail: "alex@example.com", startsAt: "2026-07-01T23:00:00.000Z" }),
    rosterClaim({ claimedByName: "Jamie Rivera", startsAt: "2026-08-01T23:00:00.000Z" }),
  ]);
  assert.deepEqual(roster.map((r) => r.name), ["Jamie Rivera", "Alex Chen"]);
});
