import { resolveActingVenue } from "@/lib/services/venue-operations";
import { listGamesForVenue } from "@/lib/game-engine/game-service";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getOfficialsForSessions, type SessionOfficial } from "@/lib/services/officials";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { getVenueAssets } from "@/lib/services/venue-assets";
import { assessStormRisk } from "@/lib/services/storm-watch";
import type { AccessContext } from "@/lib/access/capabilities";
import type { Field, Session, VenueAsset } from "@/lib/types";
import {
  buildAttentionQueue,
  buildFieldBoard,
  chicagoDateString,
  resolveMode,
  summarize,
  type CommandCenterMode,
  type CommandCenterSummary,
  type AttentionItem,
  type FieldBoardEntry,
  type WeatherSnapshot,
} from "@/lib/services/command-center-core";

// GameDay Command Center — the venue's PRIMARY game-day operating screen.
//
// This is an assembly layer, not a new data store: it composes the Connected
// Game Engine (game lifecycle + live score) with the signals we already own
// (field status, officials, weather risk, work orders, asset health) into the
// four answers a GM needs at a glance — what's happening now, what's next,
// what's going wrong, and what someone needs to do. All logic lives in the
// dependency-free command-center-core; this module only does the IO.

export * from "@/lib/services/command-center-core";

export type CommandCenterView = {
  venueId: string | null;
  venueName: string | null;
  mode: CommandCenterMode;
  generatedAt: string;
  summary: CommandCenterSummary;
  fields: FieldBoardEntry[];
  attention: AttentionItem[];
  weather: WeatherSnapshot;
};

const EMPTY_SUMMARY: CommandCenterSummary = {
  gamesScheduled: 0,
  gamesLive: 0,
  gamesBehind: 0,
  fieldsNeedAttention: 0,
  weatherRisk: null,
  officialsUnconfirmed: 0,
  systemsOffline: 0,
  systemsTotal: 0,
};

export async function buildCommandCenter(ctx: AccessContext | null): Promise<CommandCenterView> {
  const venue = await resolveActingVenue(ctx);
  if (!venue) {
    return { venueId: null, venueName: null, mode: "pregame", generatedAt: new Date().toISOString(), summary: EMPTY_SUMMARY, fields: [], attention: [], weather: null };
  }

  const now = Date.now();
  const today = chicagoDateString(now);

  const [allSessions, allFields, workOrders, assets, storm] = await Promise.all([
    getSessions().catch(() => [] as Session[]),
    getFields().catch(() => [] as Field[]),
    getWorkOrders().catch(() => [] as WorkOrder[]),
    getVenueAssets().catch(() => [] as VenueAsset[]),
    assessStormRisk(venue.id).catch(() => null),
  ]);

  const venueFields = allFields.filter((f) => f.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((f) => f.id));
  const games = await listGamesForVenue(venue.id, { date: today, preloaded: { sessions: allSessions, fields: allFields } });
  const officials = await getOfficialsForSessions(games.map((g) => g.id)).catch(() => [] as SessionOfficial[]);

  const weather: WeatherSnapshot = storm ? { risk: storm.risk, reasons: storm.reasons } : null;
  const venueWorkOrders = workOrders.filter((o) => fieldIds.has(o.fieldId));
  const venueAssets = assets.filter((a) => a.venueId === venue.id);

  return {
    venueId: venue.id,
    venueName: venue.name,
    mode: resolveMode(games, now),
    generatedAt: new Date(now).toISOString(),
    summary: summarize({ games, fields: venueFields, officials, assets: venueAssets, weather, now }),
    fields: buildFieldBoard(venueFields, games, officials, now),
    attention: buildAttentionQueue({ fields: venueFields, games, officials, workOrders: venueWorkOrders, assets: venueAssets, weather, now }),
    weather,
  };
}
