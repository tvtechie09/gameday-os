import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveActingVenue } from "@/lib/services/venue-operations";
import { getGameLifecycleTimestamps, listGamesForVenue } from "@/lib/game-engine/game-service";
import { getFields } from "@/lib/services/fields";
import { getWorkOrdersForVenue, type WorkOrder } from "@/lib/services/work-orders";
import { getSponsorCampaigns, getCampaignProof } from "@/lib/services/sponsor-campaigns";
import { getVenueAssets } from "@/lib/services/venue-assets";
import type { AccessContext } from "@/lib/access/capabilities";
import { buildImpactReport, impactHeadlines, type ImpactReport } from "@/lib/services/venue-impact-core";
import { buildManagementReport, type AssetHealthEvent, type ManagementReport } from "@/lib/services/management-report-core";

// Pilot impact (IO). Assembles ONLY counted rows — see venue-impact-core for the
// rule: if we can't count it, it isn't on the report.

export * from "@/lib/services/venue-impact-core";

export type VenueImpact = {
  venueId: string | null;
  venueName: string | null;
  rangeDays: number;
  since: string;
  report: ImpactReport;
  management: ManagementReport;
  headlines: string[];
};

const EMPTY: ImpactReport = {
  gamesRun: 0, gamesCompleted: 0, gamesOnTime: 0, onTimeRate: 0, gamesBehind: 0,
  alertsPosted: 0, familiesNotified: 0, weatherHolds: 0,
  workOrdersOpened: 0, workOrdersClosed: 0, workOrderCloseRate: 0,
  sponsorPlacementsDelivered: 0, sponsorContracted: 0, sponsorDeliveryRate: 0,
  engineEventsRecorded: 0, automatedActions: 0,
};

type HealthEventRow = {
  asset_id: string;
  connection_health: AssetHealthEvent["connectionHealth"];
  observed_at: string;
};

type HealthEventDatabase = {
  from: (table: "venue_asset_health_events") => {
    select: (columns: string) => {
      eq: (column: "venue_id", value: string) => {
        lte: (column: "observed_at", value: string) => {
          order: (column: "observed_at", options: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: HealthEventRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
};

async function getHealthEvents(venueId: string, rangeEnd: string): Promise<AssetHealthEvent[]> {
  const database = getSupabaseAdminClient() as unknown as HealthEventDatabase;
  const { data, error } = await database
    .from("venue_asset_health_events")
    .select("asset_id,connection_health,observed_at")
    .eq("venue_id", venueId)
    .lte("observed_at", rangeEnd)
    .order("observed_at", { ascending: true })
    .limit(10_000);
  // Code can be released immediately before its additive migration. In that
  // narrow window reliability is unmeasured, not a page-level failure.
  if (error) return [];
  return (data ?? []).map((row) => ({
    assetId: row.asset_id,
    connectionHealth: row.connection_health,
    observedAt: row.observed_at,
  }));
}

export async function getVenueImpact(ctx: AccessContext | null, rangeDays = 30): Promise<VenueImpact> {
  const now = Date.now();
  const sinceIso = new Date(now - rangeDays * 86_400_000).toISOString();
  const rangeEnd = new Date(now).toISOString();
  const venue = await resolveActingVenue(ctx);
  if (!venue) {
    return {
      venueId: null,
      venueName: null,
      rangeDays,
      since: sinceIso,
      report: EMPTY,
      management: buildManagementReport({
        games: [], actuals: new Map(), fields: [], issues: [], assets: [], assetHealthEvents: [],
        rangeStart: sinceIso, rangeEnd, timeZone: "America/Chicago", publicPageViews: 0, sponsorImpressions: 0,
      }),
      headlines: [],
    };
  }

  const supabase = getSupabaseAdminClient();
  const [allFields, allGames, workOrders, campaigns, allAssets, healthEvents] = await Promise.all([
    getFields().catch(() => []),
    listGamesForVenue(venue.id).catch(() => []),
    getWorkOrdersForVenue(venue.id, sinceIso).catch(() => [] as WorkOrder[]),
    getSponsorCampaigns().catch(() => []),
    getVenueAssets().catch(() => []),
    getHealthEvents(venue.id, rangeEnd),
  ]);

  const venueFieldIds = new Set(allFields.filter((f) => f.venueId === venue.id).map((f) => f.id));
  const games = allGames.filter((g) => g.startTime >= sinceIso);
  const gameIds = games.map((g) => g.id);
  const assets = allAssets.filter((asset) => asset.venueId === venue.id);

  // Alerts posted at this venue in the window, and how many people were actually
  // reached (alert_deliveries rows — a real send, not an estimate).
  const [alertRows, eventCount, actuals, pageViews, sponsorImpressions] = await Promise.all([
    supabase.from("alerts").select("id,alert_type").eq("venue_id", venue.id).gte("created_at", sinceIso),
    gameIds.length
      ? supabase.from("game_events").select("id", { count: "exact", head: true }).in("game_id", gameIds)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    getGameLifecycleTimestamps(gameIds),
    supabase.from("field_page_views").select("id", { count: "exact", head: true }).eq("venue_id", venue.id).gte("viewed_at", sinceIso),
    venueFieldIds.size
      ? supabase.from("sponsor_impressions").select("id", { count: "exact", head: true }).in("field_id", [...venueFieldIds]).gte("viewed_at", sinceIso)
      : Promise.resolve({ count: 0 } as { count: number | null }),
  ]);
  const alerts = (alertRows.data ?? []) as Array<{ id: string; alert_type: string | null }>;
  const alertIds = alerts.map((a) => a.id);
  const deliveries = alertIds.length
    ? await supabase.from("alert_deliveries").select("id", { count: "exact", head: true }).in("alert_id", alertIds).eq("status", "sent")
    : { count: 0 };

  // Sponsor value we can PROVE: sum Proof-of-Performance across this venue's campaigns.
  let delivered = 0;
  let contracted = 0;
  for (const campaign of campaigns.filter((c) => c.venueId === venue.id)) {
    const proof = await getCampaignProof(campaign.id).catch(() => null);
    if (!proof) continue;
    delivered += proof.proof.deliveredTotal;
    contracted += proof.proof.contractedTotal;
  }

  const report = buildImpactReport({
    games,
    alertsPosted: alerts.length,
    familiesNotified: (deliveries as { count: number | null }).count ?? 0,
    weatherHolds: alerts.filter((a) => (a.alert_type ?? "") === "weather").length,
    workOrders,
    sponsorPlacementsDelivered: delivered,
    sponsorContracted: contracted,
    engineEventsRecorded: (eventCount as { count: number | null }).count ?? 0,
    actuals,
    now,
  });

  const management = buildManagementReport({
    games,
    actuals,
    fields: allFields.filter((field) => field.venueId === venue.id),
    issues: workOrders,
    assets,
    assetHealthEvents: healthEvents,
    rangeStart: sinceIso,
    rangeEnd,
    timeZone: venue.timezone,
    publicPageViews: (pageViews as { count: number | null }).count ?? 0,
    sponsorImpressions: (sponsorImpressions as { count: number | null }).count ?? 0,
  });

  return { venueId: venue.id, venueName: venue.name, rangeDays, since: sinceIso, report, management, headlines: impactHeadlines(report) };
}
