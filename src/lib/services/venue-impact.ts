import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveActingVenue } from "@/lib/services/venue-operations";
import { listGamesForVenue } from "@/lib/game-engine/game-service";
import { getFields } from "@/lib/services/fields";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { getSponsorCampaigns, getCampaignProof } from "@/lib/services/sponsor-campaigns";
import type { AccessContext } from "@/lib/access/capabilities";
import { buildImpactReport, impactHeadlines, type ImpactReport } from "@/lib/services/venue-impact-core";

// Pilot impact (IO). Assembles ONLY counted rows — see venue-impact-core for the
// rule: if we can't count it, it isn't on the report.

export * from "@/lib/services/venue-impact-core";

export type VenueImpact = {
  venueId: string | null;
  venueName: string | null;
  rangeDays: number;
  since: string;
  report: ImpactReport;
  headlines: string[];
};

const EMPTY: ImpactReport = {
  gamesRun: 0, gamesCompleted: 0, gamesOnTime: 0, onTimeRate: 0, gamesBehind: 0,
  alertsPosted: 0, familiesNotified: 0, weatherHolds: 0,
  workOrdersOpened: 0, workOrdersClosed: 0, workOrderCloseRate: 0,
  sponsorPlacementsDelivered: 0, sponsorContracted: 0, sponsorDeliveryRate: 0,
  engineEventsRecorded: 0, automatedActions: 0,
};

export async function getVenueImpact(ctx: AccessContext | null, rangeDays = 30): Promise<VenueImpact> {
  const now = Date.now();
  const sinceIso = new Date(now - rangeDays * 86_400_000).toISOString();
  const venue = await resolveActingVenue(ctx);
  if (!venue) return { venueId: null, venueName: null, rangeDays, since: sinceIso, report: EMPTY, headlines: [] };

  const supabase = getSupabaseAdminClient();
  const [allFields, allGames, workOrders, campaigns] = await Promise.all([
    getFields().catch(() => []),
    listGamesForVenue(venue.id).catch(() => []),
    getWorkOrders().catch(() => [] as WorkOrder[]),
    getSponsorCampaigns().catch(() => []),
  ]);

  const venueFieldIds = new Set(allFields.filter((f) => f.venueId === venue.id).map((f) => f.id));
  const games = allGames.filter((g) => g.startTime >= sinceIso);
  const gameIds = games.map((g) => g.id);

  // Alerts posted at this venue in the window, and how many people were actually
  // reached (alert_deliveries rows — a real send, not an estimate).
  const [alertRows, eventCount] = await Promise.all([
    supabase.from("alerts").select("id,alert_type").eq("venue_id", venue.id).gte("created_at", sinceIso),
    gameIds.length
      ? supabase.from("game_events").select("id", { count: "exact", head: true }).in("game_id", gameIds)
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
    workOrders: workOrders.filter((o) => o.venueId === venue.id || (o.fieldId !== null && venueFieldIds.has(o.fieldId))),
    sponsorPlacementsDelivered: delivered,
    sponsorContracted: contracted,
    engineEventsRecorded: (eventCount as { count: number | null }).count ?? 0,
    now,
  });

  return { venueId: venue.id, venueName: venue.name, rangeDays, since: sinceIso, report, headlines: impactHeadlines(report) };
}
