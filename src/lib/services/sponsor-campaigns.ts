import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getWritableOrganizationId } from "../organization-scope";
import { getGameLifecycleTimestamps, listGamesForVenue } from "@/lib/game-engine/game-service";
import { labelFor } from "@/lib/services/quick-action-targets";
import { getSponsor, getSponsors, getSponsorAssignments } from "@/lib/services/sponsors";
import { getSponsorAnalyticsForSponsor } from "@/lib/services/sponsor-analytics";
import { getVenues } from "@/lib/services/venues";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getVenueAssets } from "@/lib/services/venue-assets";
import { computeRevenueOpportunities, type RevenueOpportunity } from "@/lib/services/sponsor-opportunities-core";
import {
  buildProofOfPerformance,
  isSponsorAssetType,
  type CoveredGame,
  type ProofOfPerformance,
  type SponsorAssetType,
} from "@/lib/services/sponsor-fulfillment-core";
import { getProhibitedCategories, getProhibitedCategoriesForVenue } from "./sponsor-policy.ts";
import { describeDeliverySuppression, type DeliverySuppressionWarning } from "./sponsor-policy-core.ts";

// Revenue Engine — sponsor campaigns (IO). CRUD for sold campaigns plus the
// Proof-of-Performance read that assembles the games a campaign covers, their
// Connected Game Engine lifecycle timestamps (game.started / game.completed),
// and existing digital impressions, then defers to the pure fulfillment core.

export type SponsorCampaign = {
  id: string;
  organizationId: string | null;
  sponsorId: string;
  venueId: string | null;
  name: string;
  packageName: string | null;
  startsOn: string;
  endsOn: string;
  contracted: Partial<Record<SponsorAssetType, number>>;
  status: "draft" | "active" | "completed";
  createdAt: string;
  updatedAt: string;
};

export type CreateSponsorCampaignInput = {
  sponsorId: string;
  venueId: string | null;
  name: string;
  packageName?: string | null;
  startsOn: string;
  endsOn: string;
  contracted: Partial<Record<SponsorAssetType, number>>;
};

const select = "id,organization_id,sponsor_id,venue_id,name,package_name,starts_on,ends_on,contracted,status,created_at,updated_at";

function readStatus(value: string): SponsorCampaign["status"] {
  return value === "draft" || value === "completed" ? value : "active";
}

function sanitizeContracted(input: Partial<Record<string, number>>): Partial<Record<SponsorAssetType, number>> {
  const out: Partial<Record<SponsorAssetType, number>> = {};
  for (const [key, value] of Object.entries(input)) {
    const qty = Number(value);
    if (isSponsorAssetType(key) && Number.isFinite(qty) && qty > 0) out[key] = Math.floor(qty);
  }
  return out;
}

type CampaignRow = {
  id: string;
  organization_id: string | null;
  sponsor_id: string;
  venue_id: string | null;
  name: string;
  package_name: string | null;
  starts_on: string;
  ends_on: string;
  contracted: Record<string, number>;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapCampaign(row: CampaignRow): SponsorCampaign {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sponsorId: row.sponsor_id,
    venueId: row.venue_id,
    name: row.name,
    packageName: row.package_name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    contracted: sanitizeContracted(row.contracted ?? {}),
    status: readStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSponsorCampaigns(): Promise<SponsorCampaign[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sponsor_campaigns").select(select).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCampaign);
}

export async function getSponsorCampaign(id: string): Promise<SponsorCampaign | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("sponsor_campaigns").select(select).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCampaign(data) : null;
}

export async function createSponsorCampaign(input: CreateSponsorCampaignInput): Promise<SponsorCampaign> {
  const supabase = getSupabaseAdminClient();
  const organizationId = await getWritableOrganizationId();
  if (!input.name.trim()) throw new Error("Campaign name is required.");
  if (!input.startsOn || !input.endsOn) throw new Error("Start and end dates are required.");
  if (input.endsOn < input.startsOn) throw new Error("End date must be on or after the start date.");
  const { data, error } = await supabase
    .from("sponsor_campaigns")
    .insert({
      organization_id: organizationId,
      sponsor_id: input.sponsorId,
      venue_id: input.venueId,
      name: input.name.trim().slice(0, 160),
      package_name: input.packageName?.trim().slice(0, 120) || null,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      contracted: sanitizeContracted(input.contracted),
    })
    .select(select)
    .single();
  if (error) throw new Error(error.message);
  return mapCampaign(data);
}

export async function deleteSponsorCampaign(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sponsor_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type CampaignProof = {
  campaign: SponsorCampaign;
  sponsorName: string;
  venueName: string | null;
  proof: ProofOfPerformance;
  // Set when this sponsor's category is currently suppressed on public surfaces,
  // so the report can say the delivery figures may overstate what families saw.
  suppression: DeliverySuppressionWarning;
};

// Assemble the campaign's covered games + lifecycle proof + digital impressions,
// then compute Proof-of-Performance via the pure core.
export async function getCampaignProof(id: string): Promise<CampaignProof | null> {
  const campaign = await getSponsorCampaign(id);
  if (!campaign) return null;

  const [sponsor, venues] = await Promise.all([
    getSponsor(campaign.sponsorId).catch(() => null),
    getVenues().catch(() => []),
  ]);
  const venueName = campaign.venueId ? venues.find((v) => v.id === campaign.venueId)?.name ?? null : null;

  // Games the campaign covers: at its venue, starting within the date window.
  const venueGames = campaign.venueId ? await listGamesForVenue(campaign.venueId).catch(() => []) : [];
  const covered = venueGames.filter((g) => {
    const day = g.startTime.slice(0, 10);
    return day >= campaign.startsOn && day <= campaign.endsOn;
  });

  // Prefer engine ledger timestamps for the delivery proof; fall back to the
  // session's own status/times for games that predate the engine.
  const ledger = await getGameLifecycleTimestamps(covered.map((g) => g.id));
  const games: CoveredGame[] = covered.map((g) => {
    const marks = ledger.get(g.id);
    const reachedStarted = g.status === "active" || g.status === "final";
    const reachedFinal = g.status === "final";
    return {
      id: g.id,
      label: labelFor(g),
      startedAt: marks?.startedAt ?? (reachedStarted ? g.startTime : null),
      finalAt: marks?.finalAt ?? (reachedFinal ? (g.endTime ?? g.updatedAt ?? g.startTime) : null),
    };
  });

  const analytics = await getSponsorAnalyticsForSponsor(campaign.sponsorId, "all").catch(() => null);

  const proof = buildProofOfPerformance({
    contracted: campaign.contracted,
    games,
    impressions: analytics?.impressions ?? 0,
    clicks: analytics?.clicks ?? 0,
  });

  // The governing policy is the campaign's venue when it has one, otherwise the
  // owning org — the same rule the public render filter uses.
  const policy = campaign.venueId
    ? await getProhibitedCategoriesForVenue(campaign.venueId)
    : await getProhibitedCategories(campaign.organizationId);
  const suppression = describeDeliverySuppression({ category: sponsor?.category, prohibited: policy.categories });

  return { campaign, sponsorName: sponsor?.name ?? "Sponsor", venueName, proof, suppression };
}

// Revenue opportunities across the org: unsold field/game sponsorships, sponsors
// with no campaign (upsell leads), and idle display surfaces. Read-only.
export async function getRevenueOpportunities(): Promise<RevenueOpportunity[]> {
  const [fields, sessions, assignments, sponsors, campaigns, assets] = await Promise.all([
    getFields().catch(() => []),
    getSessions().catch(() => []),
    getSponsorAssignments().catch(() => []),
    getSponsors().catch(() => []),
    getSponsorCampaigns().catch(() => []),
    getVenueAssets().catch(() => []),
  ]);
  const upcomingGames = sessions.filter((s) => s.status !== "final").map((s) => ({ id: s.id }));
  return computeRevenueOpportunities({ fields, upcomingGames, assignments, sponsors, campaigns, assets });
}

