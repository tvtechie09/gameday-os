import type { SponsorCampaign } from "@/lib/services/sponsor-campaigns";
import type { Field, Sponsor, SponsorAssignment, VenueAsset } from "@/lib/types";

// Revenue Engine — "where are we leaving money on the table?" (pure).
//
// Cross-references what CAN be sponsored (fields, upcoming games, display
// surfaces, sponsors on file) against what IS sold (assignments + campaigns) to
// surface unsold inventory and warm upsell leads. Type-only imports keep this
// unit-testable; getRevenueOpportunities does the IO.

export type OpportunitySeverity = "high" | "medium" | "low";

export type RevenueOpportunity = {
  key: string;
  title: string;
  count: number;
  detail: string;
  href: string;
  severity: OpportunitySeverity;
};

const SPONSORABLE_ASSET_TYPES = new Set(["scoreboard", "display", "tv", "camera"]);

function sample(names: string[], max = 3): string {
  if (names.length === 0) return "";
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} +${names.length - max} more` : shown;
}

export type OpportunityInput = {
  fields: Field[];
  upcomingGames: Array<{ id: string }>; // games not yet final
  assignments: SponsorAssignment[];
  sponsors: Sponsor[];
  campaigns: SponsorCampaign[];
  assets: VenueAsset[];
};

export function computeRevenueOpportunities(input: OpportunityInput): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = [];

  // A field is sold if it has its own field sponsor OR a venue-wide sponsor.
  const fieldSponsored = new Set(input.assignments.filter((a) => a.assignmentType === "field" && a.fieldId).map((a) => a.fieldId as string));
  const venueSponsored = new Set(input.assignments.filter((a) => a.assignmentType === "venue" && a.venueId).map((a) => a.venueId as string));
  const unsoldFields = input.fields.filter((f) => !fieldSponsored.has(f.id) && !venueSponsored.has(f.venueId));
  if (unsoldFields.length > 0) {
    opportunities.push({
      key: "unsold_fields",
      title: "Fields with no sponsor",
      count: unsoldFields.length,
      detail: sample(unsoldFields.map((f) => f.name)),
      href: "/admin/sponsors",
      severity: "medium",
    });
  }

  // Upcoming games with no game-level sponsor.
  const gameSponsored = new Set(input.assignments.filter((a) => a.assignmentType === "session" && a.sessionId).map((a) => a.sessionId as string));
  const unsoldGames = input.upcomingGames.filter((g) => !gameSponsored.has(g.id));
  if (unsoldGames.length > 0) {
    opportunities.push({
      key: "unsold_games",
      title: "Upcoming games with no game sponsor",
      count: unsoldGames.length,
      detail: `${unsoldGames.length} of ${input.upcomingGames.length} upcoming games are unsponsored`,
      href: "/admin/sponsors",
      severity: "high",
    });
  }

  // Sponsors on file with no active campaign — warm upsell leads.
  const sponsorsWithCampaign = new Set(input.campaigns.map((c) => c.sponsorId));
  const noCampaign = input.sponsors.filter((s) => !sponsorsWithCampaign.has(s.id));
  if (noCampaign.length > 0) {
    opportunities.push({
      key: "sponsors_no_campaign",
      title: "Sponsors with no campaign",
      count: noCampaign.length,
      detail: `Upsell a package to ${sample(noCampaign.map((s) => s.name))}`,
      href: "/admin/sponsors/campaigns",
      severity: "high",
    });
  }

  // Display surfaces that could carry sponsor inventory.
  const surfaces = input.assets.filter((a) => SPONSORABLE_ASSET_TYPES.has(a.assetType));
  if (surfaces.length > 0 && input.campaigns.length === 0) {
    opportunities.push({
      key: "idle_surfaces",
      title: "Sponsorable display surfaces idle",
      count: surfaces.length,
      detail: `${surfaces.length} scoreboards/displays with no campaign running`,
      href: "/admin/sponsors/campaigns",
      severity: "low",
    });
  }

  const rank: Record<OpportunitySeverity, number> = { high: 0, medium: 1, low: 2 };
  return opportunities.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
