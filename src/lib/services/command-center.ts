import { resolveActingVenue } from "@/lib/services/venue-operations";
import { listGamesForVenue } from "@/lib/game-engine/game-service";
import { getFields } from "@/lib/services/fields";
import { getSessions } from "@/lib/services/sessions";
import { getOfficialsForSessions, type SessionOfficial } from "@/lib/services/officials";
import { getWorkOrders, type WorkOrder } from "@/lib/services/work-orders";
import { getVenueAssets } from "@/lib/services/venue-assets";
import { getAudioProfiles } from "@/lib/services/audio-profiles";
import { assessStormRisk } from "@/lib/services/storm-watch";
import type { AccessContext } from "@/lib/access/capabilities";
import type { AudioProfile, Field, Session, VenueAsset } from "@/lib/types";
import { DEFAULT_VENUE_TIMEZONE } from "@/lib/venue-timezone";
import {
  buildAttentionQueue,
  buildFieldBoard,
  buildModeChecklist,
  buildSchedulePulse,
  venueDateString,
  resolveMode,
  summarize,
  type CommandCenterMode,
  type CommandCenterSummary,
  type AttentionItem,
  type FieldBoardEntry,
  type ModeChecklist,
  type SchedulePulse,
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
  // The venue's IANA zone. Every label in this view is already rendered in it;
  // carried out so the page's own header clock agrees with the board.
  timeZone: string;
  mode: CommandCenterMode;
  generatedAt: string;
  summary: CommandCenterSummary;
  pulse: SchedulePulse;
  fields: FieldBoardEntry[];
  attention: AttentionItem[];
  checklist: ModeChecklist;
  weather: WeatherSnapshot;
};

const EMPTY_PULSE: SchedulePulse = {
  tracked: 0,
  onTime: 0,
  late1to10: 0,
  late11to20: 0,
  late20plus: 0,
  averageDelayMin: 0,
  worstDelayMin: 0,
  worstFields: [],
  downstreamImpacts: [],
  recoveryMinutes: 0,
  curfewRisks: [],
};

const EMPTY_SUMMARY: CommandCenterSummary = {
  gamesScheduled: 0,
  gamesLive: 0,
  gamesBehind: 0,
  fieldsNeedAttention: 0,
  weatherRisk: null,
  officialsUnconfirmed: 0,
  systemsOffline: 0,
  systemsUnknown: 0,
  systemsTotal: 0,
};

export async function buildCommandCenter(ctx: AccessContext | null): Promise<CommandCenterView> {
  const venue = await resolveActingVenue(ctx);
  if (!venue) {
    return {
      venueId: null,
      venueName: null,
      // No venue resolved, so there is no venue clock — fall back to Central.
      timeZone: DEFAULT_VENUE_TIMEZONE,
      mode: "pregame",
      generatedAt: new Date().toISOString(),
      summary: EMPTY_SUMMARY,
      pulse: EMPTY_PULSE,
      fields: [],
      attention: [],
      checklist: buildModeChecklist({ mode: "pregame", fields: [], games: [], officials: [], assets: [], weather: null, workOrders: [], now: Date.now() }),
      weather: null,
    };
  }

  const now = Date.now();
  // The venue's own operating day, not the server's and not Central's.
  const timeZone = venue.timezone;
  const today = venueDateString(now, timeZone);

  const [allSessions, allFields, workOrders, assets, storm, audioProfiles] = await Promise.all([
    getSessions().catch(() => [] as Session[]),
    getFields().catch(() => [] as Field[]),
    getWorkOrders().catch(() => [] as WorkOrder[]),
    getVenueAssets().catch(() => [] as VenueAsset[]),
    assessStormRisk(venue.id).catch(() => null),
    getAudioProfiles().catch(() => [] as AudioProfile[]),
  ]);

  const venueFields = allFields.filter((f) => f.venueId === venue.id);
  const fieldIds = new Set(venueFields.map((f) => f.id));
  const games = await listGamesForVenue(venue.id, { date: today, timeZone, preloaded: { sessions: allSessions, fields: allFields } });
  const officials = await getOfficialsForSessions(games.map((g) => g.id)).catch(() => [] as SessionOfficial[]);

  const weather: WeatherSnapshot = storm ? { risk: storm.risk, reasons: storm.reasons } : null;
  const venueWorkOrders = workOrders.filter((o) => o.venueId === venue.id || (o.fieldId !== null && fieldIds.has(o.fieldId)));
  const venueAssets = assets.filter((a) => a.venueId === venue.id);
  const venueAudioProfiles = audioProfiles.filter((p) => p.venueId === venue.id);
  const mode = resolveMode(games, now);

  return {
    venueId: venue.id,
    venueName: venue.name,
    timeZone,
    mode,
    generatedAt: new Date(now).toISOString(),
    summary: summarize({ games, fields: venueFields, officials, assets: venueAssets, weather, now }),
    // No venue closing time is modeled yet, so curfew risk stays empty rather
    // than guessing a close hour.
    pulse: buildSchedulePulse({ fields: venueFields, games, now, timeZone }),
    fields: buildFieldBoard(venueFields, games, officials, now, timeZone, venueAssets, venueWorkOrders, weather),
    attention: buildAttentionQueue({ fields: venueFields, games, officials, workOrders: venueWorkOrders, assets: venueAssets, audioProfiles: venueAudioProfiles, weather, now, timeZone }),
    checklist: buildModeChecklist({ mode, fields: venueFields, games, officials, assets: venueAssets, weather, workOrders: venueWorkOrders, now }),
    weather,
  };
}
