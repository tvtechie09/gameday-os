// Reading a SportsEngine schedule into venue sessions.
//
// GameDay is not the system of record for a SportsEngine organization, which
// makes these tests unusually load-bearing: if our copy disagrees with theirs,
// it will disagree during a rainout, when sixty games move at once and a parent
// is deciding whether to get in the car.
//
// The field-matching cases matter most. SportsEngine stores whatever the club
// typed into a free-text location, and we hold real diamonds with ids. Putting
// a game on the wrong one sends a family to the far corner of a fifteen-diamond
// complex, so anything ambiguous is refused out loud rather than guessed.

import assert from "node:assert/strict";
import test from "node:test";
import {
  mapEventPage, mapKind, mapStatus, externalIdFor, hasNextPage,
  matchFieldByName, toSessionDraft, reconcileSessions, describeChanges,
  type SportsEngineEvent, type StoredSession
} from "../src/lib/integrations/sportsengine-import.ts";

const FIELDS = [
  { id: "field-b13", name: "B13" },
  { id: "field-b7", name: "B7" },
  { id: "field-b1", name: "Field 1" }
];

function node(overrides: Partial<SportsEngineEvent> = {}): SportsEngineEvent {
  return {
    id: "evt-1001",
    organizationId: 884422,
    name: "Rebels 10U vs Celtics 10U",
    type: "game",
    start: "2026-09-12T14:40:00Z",
    end: "2026-09-12T16:10:00Z",
    status: "scheduled",
    updated: "2026-08-11T12:00:00Z",
    location: { name: "B13", address: "13900 S Cedar Rd, New Lenox, IL", url: "https://example.org/b13" },
    eventTeams: [
      { name: "New Lenox Rebels 10U", homeTeam: true, score: null },
      { name: "Illinois Celtics 10U", homeTeam: false, score: null }
    ],
    ...overrides
  };
}

// --- mapping ------------------------------------------------------------------

test("a game maps across with its teams and a stable id", () => {
  const { events, problems } = mapEventPage([node()]);
  assert.deepEqual(problems, []);
  assert.equal(events[0].externalId, "sportsengine:884422:evt-1001");
  assert.equal(events[0].kind, "game");
  assert.equal(events[0].startsAt, "2026-09-12T14:40:00.000Z");
  assert.equal(events[0].homeTeam, "New Lenox Rebels 10U");
  assert.equal(events[0].awayTeam, "Illinois Celtics 10U");
});

test("the id is stable across imports — it is the whole idempotency story", () => {
  const first = mapEventPage([node()]).events[0];
  const second = mapEventPage([node({ name: "Renamed", start: "2026-09-12T16:00:00Z" })]).events[0];
  assert.equal(first.externalId, second.externalId, "a moved, renamed game is the same game");
});

test("the namespace keeps a second provider from colliding", () => {
  assert.equal(externalIdFor("884422", "evt-1001"), "sportsengine:884422:evt-1001");
});

test("an unnamed game names itself from its teams", () => {
  assert.equal(mapEventPage([node({ name: "" })]).events[0].title, "New Lenox Rebels 10U vs Illinois Celtics 10U");
});

test("an unknown type lands on 'event' rather than being dropped", () => {
  assert.equal(mapKind("Tournament Pool Play"), "event");
  assert.equal(mapKind("GAME"), "game");
  assert.equal(mapKind(null), "event");
});

test("cancellations are recognised by shape, not by an exact string", () => {
  // SportsEngine documents "scheduled" and nothing else, so this is a reading,
  // not a spec. If they publish the enumeration, replace this wholesale.
  assert.equal(mapStatus("CANCELED"), "cancelled");
  assert.equal(mapStatus("postponed"), "postponed");
  assert.equal(mapStatus("complete"), "final");
});

test("an unrecognised status stays scheduled, deliberately", () => {
  // Showing a called-off game wastes a trip. Hiding a game that is on means a
  // child misses it. Both are bad; only one is silent.
  assert.equal(mapStatus("weather_watch"), "scheduled");
  assert.equal(mapStatus(""), "scheduled");
});

test("bad rows are reported, never silently skipped", () => {
  const { events, problems } = mapEventPage([node({ id: "" }), node({ id: "e2", start: "soon" }), node({ id: "e3" })]);
  assert.equal(events.length, 1);
  assert.equal(problems.length, 2);
  assert.match(problems[0].reason, /no id/);
  assert.match(problems[1].reason, /start time/);
  assert.equal(problems[1].id, "e2", "the operator needs to know WHICH row");
});

test("pagination walks to the end and refuses to loop on garbage", () => {
  assert.equal(hasNextPage({ page: 1, pages: 3 }), true);
  assert.equal(hasNextPage({ page: 3, pages: 3 }), false);
  assert.equal(hasNextPage(null), false);
  assert.equal(hasNextPage({ page: "?" as unknown as number, pages: 3 }), false);
});

// --- field matching -------------------------------------------------------------

test("an exact field name matches", () => {
  const match = matchFieldByName("B13", FIELDS);
  assert.equal(match.matched, true);
  if (match.matched) assert.equal(match.fieldId, "field-b13");
});

test("human variations of the same diamond match", () => {
  for (const written of ["Field 1", "field 1", "FIELD #1", "  Field  1 "]) {
    const match = matchFieldByName(written, FIELDS);
    assert.equal(match.matched, true, `"${written}" should match Field 1`);
    if (match.matched) assert.equal(match.fieldId, "field-b1");
  }
});

test("an unrecognised location is REFUSED, not guessed", () => {
  // Putting a game on the wrong diamond is worse than not placing it.
  const match = matchFieldByName("Back lot", FIELDS);
  assert.equal(match.matched, false);
  if (!match.matched) assert.match(match.reason, /no field matches/);
});

test("an exact name wins over a rival that only matches loosely", () => {
  // Documented rule: exact first. "Field 2" is unambiguous even though
  // "field #2" would normalize to the same thing.
  const match = matchFieldByName("Field 2", [{ id: "a", name: "Field 2" }, { id: "b", name: "field #2" }]);
  assert.equal(match.matched, true);
  if (match.matched) {
    assert.equal(match.fieldId, "a");
    assert.equal(match.confidence, "exact");
  }
});

test("genuine ambiguity is refused, with the candidates named", () => {
  // No exact match, and two different fields normalize to the same thing.
  const match = matchFieldByName("#2", [{ id: "a", name: "Field 2" }, { id: "b", name: "Diamond 2" }]);
  assert.equal(match.matched, false);
  if (!match.matched) {
    assert.match(match.reason, /ambiguous/);
    assert.deepEqual(match.candidates.sort(), ["Diamond 2", "Field 2"]);
  }
});

test("an empty location is a reason, not a crash", () => {
  const match = matchFieldByName("", FIELDS);
  assert.equal(match.matched, false);
  if (!match.matched) assert.match(match.reason, /no location/);
});

// --- session drafts --------------------------------------------------------------

test("a draft carries the external identity so re-import is idempotent", () => {
  const draft = toSessionDraft(mapEventPage([node()]).events[0], "field-b13");
  assert.equal(draft.externalSource, "sportsengine");
  assert.equal(draft.externalSourceId, "sportsengine:884422:evt-1001");
  assert.equal(draft.fieldId, "field-b13");
  assert.equal(draft.status, "scheduled");
});

test("a cancelled game is NOT marked final", () => {
  // SessionStatus has no "cancelled". Mapping it to final would record a game
  // as played; it stays scheduled and the reconcile report surfaces the change.
  const draft = toSessionDraft(mapEventPage([node({ status: "cancelled" })]).events[0], "field-b13");
  assert.equal(draft.status, "scheduled");
});

// --- reconciliation ---------------------------------------------------------------

function stored(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    externalSourceId: "sportsengine:884422:evt-1001",
    startTime: "2026-09-12T14:40:00.000Z",
    endTime: "2026-09-12T16:10:00.000Z",
    status: "scheduled",
    title: "Rebels 10U vs Celtics 10U",
    fieldId: "field-b13",
    ...overrides
  };
}

test("an unchanged import writes nothing", () => {
  const result = reconcileSessions([stored()], mapEventPage([node()]).events, FIELDS);
  assert.equal(result.unchanged.length, 1);
  assert.equal(result.created.length, 0);
  assert.equal(result.updated.length, 0);
});

test("a new fixture is created on the right field", () => {
  const result = reconcileSessions([], mapEventPage([node()]).events, FIELDS);
  assert.equal(result.created.length, 1);
  assert.equal(result.created[0].draft.fieldId, "field-b13");
});

test("THE RAINOUT: a moved game reports what moved, not just that it moved", () => {
  const incoming = mapEventPage([node({ start: "2026-09-12T16:20:00Z", location: { name: "B7" } })]).events;
  const result = reconcileSessions([stored()], incoming, FIELDS);
  assert.equal(result.updated.length, 1);
  assert.deepEqual(result.updated[0].changes, ["start time", "field"]);
  assert.equal(describeChanges(result.updated[0].changes), "Start time and field changed");
  assert.equal(result.updated[0].draft.fieldId, "field-b7");
});

test("a whole pool reschedules in one pass", () => {
  const before = [1, 2, 3, 4].map((n) => stored({ externalSourceId: "sportsengine:884422:evt-" + n }));
  const after = mapEventPage([1, 2, 3, 4].map((n) => node({ id: "evt-" + n, start: "2026-09-12T18:00:00Z" }))).events;
  const result = reconcileSessions(before, after, FIELDS);
  assert.equal(result.updated.length, 4);
  assert.equal(result.disappeared.length, 0);
  for (const entry of result.updated) assert.deepEqual(entry.changes, ["start time"]);
});

test("an unplaceable event does not make an existing session look deleted", () => {
  // The trap: if an unmatched event were skipped without marking it seen, its
  // stored session would fall into `disappeared` and an operator might delete
  // a real game because we could not read a location string.
  const incoming = mapEventPage([node({ location: { name: "Back lot" } })]).events;
  const result = reconcileSessions([stored()], incoming, FIELDS);
  assert.equal(result.unplaced.length, 1);
  assert.equal(result.disappeared.length, 0, "an unreadable location must not imply a deletion");
  assert.equal(result.updated.length, 0);
});

test("an event missing from the page is reported, never auto-deleted", () => {
  const result = reconcileSessions(
    [stored(), stored({ externalSourceId: "sportsengine:884422:evt-9" })],
    mapEventPage([node()]).events,
    FIELDS
  );
  assert.equal(result.disappeared.length, 1);
  assert.equal(result.disappeared[0].externalSourceId, "sportsengine:884422:evt-9");
});

test("change sentences read like English", () => {
  assert.equal(describeChanges(["status"]), "Status changed");
  assert.equal(describeChanges(["start time", "field"]), "Start time and field changed");
  assert.equal(describeChanges(["start time", "end time", "field"]), "Start time, end time and field changed");
  assert.equal(describeChanges([]), "");
});
