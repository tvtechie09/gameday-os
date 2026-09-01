import assert from "node:assert/strict";
import test from "node:test";
import { sessionMatchesQuery, type SearchableSession } from "../src/lib/ui/session-search.ts";

const game: SearchableSession = {
  title: "12U Championship",
  homeTeam: "Illinois Celtics",
  awayTeam: "Sparks Elite",
  fieldName: "Field 8A",
  venueName: "Wintrust Crossroads Sports Complex",
  tournamentName: "Summer Classic",
  startLabel: "Sep 1, 2026, 10:00 AM",
  sportType: "baseball",
};

test("schedule search is forgiving across event, team, location, time, and tournament metadata", () => {
  for (const query of ["championship", "celtics", "sparks", "field 8a", "wintrust", "10 00", "summer classic", "baseball"]) {
    assert.equal(sessionMatchesQuery(game, query), true, query);
  }
});

test("schedule search ignores case, punctuation, accents, and word order", () => {
  assert.equal(sessionMatchesQuery(game, "CELTICS - 8A"), true);
  assert.equal(sessionMatchesQuery({ ...game, homeTeam: "Águilas" }, "aguilas"), true);
  assert.equal(sessionMatchesQuery(game, "8A Sparks"), true);
});

test("all query terms must match and blank queries show everything", () => {
  assert.equal(sessionMatchesQuery(game, "Celtics soccer"), false);
  assert.equal(sessionMatchesQuery(game, "   "), true);
});
