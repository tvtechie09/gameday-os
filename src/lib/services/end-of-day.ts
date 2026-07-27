import { resolveActingVenue } from "@/lib/services/venue-operations";
import { getGameLifecycleTimestamps, listGamesForVenue } from "@/lib/game-engine/game-service";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { getVenueAssets } from "@/lib/services/venue-assets";
import { chicagoDateString } from "@/lib/services/command-center-core";
import { buildEndOfDayReport, type EndOfDayReport } from "@/lib/services/end-of-day-core";
import type { AccessContext } from "@/lib/access/capabilities";
import type { Field, Session, VenueAsset } from "@/lib/types";

// IO for the end-of-day operations report. Assembly only — every calculation
// lives in the dependency-free end-of-day-core (same split as command-center).

export * from "@/lib/services/end-of-day-core";

export async function buildEndOfDay(ctx: AccessContext | null, dateOverride?: string): Promise<EndOfDayReport> {
  const now = Date.now();
  const date = dateOverride || chicagoDateString(now);
  const venue = await resolveActingVenue(ctx);

  if (!venue) {
    return buildEndOfDayReport({ venueName: null, date, games: [], fields: [], workOrders: [], assets: [], now });
  }

  const [allSessions, allFields, workOrders, assets] = await Promise.all([
    getSessions().catch(() => [] as Session[]),
    getFields().catch(() => [] as Field[]),
    getWorkOrders().catch(() => [] as WorkOrder[]),
    getVenueAssets().catch(() => [] as VenueAsset[]),
  ]);

  const venueFields = allFields.filter((field) => field.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((field) => field.id));
  const games = await listGamesForVenue(venue.id, { date, preloaded: { sessions: allSessions, fields: allFields } });

  // ACTUAL first-pitch/final times. If the ledger has nothing (pre-engine data),
  // the core reports those games as unmeasured rather than assuming on time.
  const actuals = await getGameLifecycleTimestamps(games.map((game) => game.id)).catch(() => new Map());

  return buildEndOfDayReport({
    venueName: venue.name,
    date,
    games,
    fields: venueFields,
    workOrders: workOrders.filter((order) => fieldIds.has(order.fieldId)),
    assets: assets.filter((asset) => asset.venueId === venue.id),
    actuals,
    now,
  });
}
