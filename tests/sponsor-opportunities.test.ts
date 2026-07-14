import assert from "node:assert/strict";
import test from "node:test";
import { computeRevenueOpportunities } from "../src/lib/services/sponsor-opportunities-core.ts";
import type { Field, Sponsor, SponsorAssignment, VenueAsset } from "../src/lib/types.ts";
import type { SponsorCampaign } from "../src/lib/services/sponsor-campaigns.ts";

const field = (id: string, venueId = "V1"): Field => ({ id, name: id.toUpperCase(), venueId, status: "open" } as unknown as Field);
const sponsor = (id: string): Sponsor => ({ id, name: `Sponsor ${id}` } as unknown as Sponsor);
const campaign = (sponsorId: string): SponsorCampaign => ({ id: "c-" + sponsorId, sponsorId } as unknown as SponsorCampaign);
const asset = (type: string): VenueAsset => ({ id: "a-" + Math.random(), assetType: type } as unknown as VenueAsset);
const assign = (a: Partial<SponsorAssignment>): SponsorAssignment =>
  ({ id: "as-" + Math.random(), sponsorId: "s1", assignmentType: "field", venueId: null, fieldId: null, sessionId: null, placementLabel: "Field Sponsor", ...a } as unknown as SponsorAssignment);

const byKey = (list: ReturnType<typeof computeRevenueOpportunities>) => new Map(list.map((o) => [o.key, o]));

test("unsold fields: a field with its own sponsor and a venue-wide-sponsored field are both excluded", () => {
  const opps = byKey(computeRevenueOpportunities({
    fields: [field("f1", "V1"), field("f2", "V1"), field("f3", "V2")],
    upcomingGames: [],
    assignments: [
      assign({ assignmentType: "field", fieldId: "f1" }), // f1 sold directly
      assign({ assignmentType: "venue", venueId: "V2" }), // covers f3
    ],
    sponsors: [],
    campaigns: [],
    assets: [],
  }));
  // only f2 remains unsold
  assert.equal(opps.get("unsold_fields")?.count, 1);
});

test("unsold games: counts upcoming games without a session sponsor", () => {
  const opps = byKey(computeRevenueOpportunities({
    fields: [],
    upcomingGames: [{ id: "g1" }, { id: "g2" }, { id: "g3" }],
    assignments: [assign({ assignmentType: "session", sessionId: "g2" })],
    sponsors: [],
    campaigns: [],
    assets: [],
  }));
  assert.equal(opps.get("unsold_games")?.count, 2);
  assert.equal(opps.get("unsold_games")?.severity, "high");
});

test("sponsors with no campaign surface as upsell leads", () => {
  const opps = byKey(computeRevenueOpportunities({
    fields: [],
    upcomingGames: [],
    assignments: [],
    sponsors: [sponsor("s1"), sponsor("s2"), sponsor("s3")],
    campaigns: [campaign("s2")],
    assets: [],
  }));
  assert.equal(opps.get("sponsors_no_campaign")?.count, 2); // s1, s3
});

test("idle surfaces only flagged when no campaigns are running", () => {
  const base = { fields: [], upcomingGames: [], assignments: [], sponsors: [], assets: [asset("scoreboard"), asset("display"), asset("wifi")] };
  const noCampaigns = byKey(computeRevenueOpportunities({ ...base, campaigns: [] }));
  assert.equal(noCampaigns.get("idle_surfaces")?.count, 2); // scoreboard + display (wifi not sponsorable)

  const withCampaign = byKey(computeRevenueOpportunities({ ...base, campaigns: [campaign("s1")] }));
  assert.equal(withCampaign.get("idle_surfaces"), undefined);
});

test("opportunities are sorted high severity first, and an all-sold venue yields none", () => {
  const list = computeRevenueOpportunities({
    fields: [field("f1")],
    upcomingGames: [{ id: "g1" }],
    assignments: [],
    sponsors: [sponsor("s1")],
    campaigns: [],
    assets: [],
  });
  const severities = list.map((o) => o.severity);
  assert.ok(severities.indexOf("high") <= (severities.includes("medium") ? severities.indexOf("medium") : Infinity));

  const none = computeRevenueOpportunities({
    fields: [field("f1")],
    upcomingGames: [{ id: "g1" }],
    assignments: [assign({ assignmentType: "field", fieldId: "f1" }), assign({ assignmentType: "session", sessionId: "g1" })],
    sponsors: [sponsor("s1")],
    campaigns: [campaign("s1")],
    assets: [],
  });
  assert.equal(none.length, 0);
});
