import type { GameRecord } from "@/lib/game-engine/game-service";
import type { SessionOfficial } from "@/lib/services/officials";
import type { WorkOrder } from "@/lib/services/work-orders";
import type { StormRiskLevel } from "@/lib/services/storm-assessment";
import type { Field, VenueAsset } from "@/lib/types";

// Pure core of the GameDay Command Center — mode resolution, delay math, field
// board, attention queue, and summary. Type-only imports keep this dependency-
// free so it is unit-testable in isolation (mirrors the storm-assessment /
// storm-watch split). All IO lives in command-center.ts.

// A late game is only worth flagging past this many minutes behind.
export const LATE_ATTENTION_THRESHOLD_MIN = 20;
// A live game with a known scheduled end is "running late" only once it overruns.
export const DEFAULT_GAME_MINUTES = 90;

const CHICAGO = "America/Chicago";

export type CommandCenterMode = "pregame" | "live" | "postgame";
export type AttentionTier = "urgent" | "soon" | "info";

export type AttentionItem = {
  id: string;
  tier: AttentionTier;
  title: string; // what happened
  why: string; // why it matters
  action: string; // recommended action (human sentence)
  href: string | null; // one-click surface, when we have one
  fieldName: string | null;
};

export type FieldBoardEntry = {
  fieldId: string;
  fieldName: string;
  status: string; // open | delayed | closed | maintenance
  currentGame: {
    id: string;
    label: string;
    scoreHome: number;
    scoreAway: number;
    lifecycleStatus: string;
    startLabel: string;
    minutesBehind: number;
  } | null;
  nextGame: { id: string; label: string; startLabel: string } | null;
  officialsConfirmed: boolean;
  recommendedAction: string | null;
};

export type CommandCenterSummary = {
  gamesScheduled: number;
  gamesLive: number;
  gamesBehind: number;
  fieldsNeedAttention: number;
  weatherRisk: StormRiskLevel | null;
  officialsUnconfirmed: number;
  systemsOffline: number;
  systemsTotal: number;
};

export type WeatherSnapshot = { risk: StormRiskLevel; reasons: string[] } | null;

const FIELD_ATTENTION_STATUSES = new Set(["delayed", "closed", "maintenance"]);
const TIER_RANK: Record<AttentionTier, number> = { urgent: 0, soon: 1, info: 2 };

export function chicagoDateString(now: number): string {
  // en-CA renders as YYYY-MM-DD, which is what listGamesForVenue's date filter wants.
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHICAGO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

export function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: CHICAGO }).format(date);
}

export function gameLabel(game: Pick<GameRecord, "title" | "homeTeam" | "awayTeam">): string {
  return game.title || game.homeTeam + " vs " + game.awayTeam;
}

function isLive(game: GameRecord): boolean {
  return game.status === "active" || game.lifecycleStatus === "live" || game.lifecycleStatus === "suspended";
}

// Minutes a game is running behind its slot. For a live game, that's overrun
// past its scheduled (or assumed) finish; for a game that should have started
// but is still scheduled, it's how late first pitch is. 0 when on time or done.
export function minutesBehind(game: GameRecord, now: number): number {
  const start = new Date(game.startTime).getTime();
  if (Number.isNaN(start)) return 0;
  if (isLive(game)) {
    const end = game.endTime ? new Date(game.endTime).getTime() : start + DEFAULT_GAME_MINUTES * 60_000;
    if (Number.isNaN(end)) return 0;
    return Math.max(0, Math.round((now - end) / 60_000));
  }
  if (game.status === "scheduled" && now > start) {
    return Math.round((now - start) / 60_000);
  }
  return 0;
}

// Which operating phase is the venue in, from today's games?
export function resolveMode(games: GameRecord[], now: number): CommandCenterMode {
  if (games.some(isLive)) return "live";
  const upcoming = games.filter((g) => g.status === "scheduled" && new Date(g.startTime).getTime() > now - 30 * 60_000);
  if (upcoming.length > 0) return "pregame";
  if (games.some((g) => g.status === "final")) return "postgame";
  return "pregame";
}

function hasConfirmedOfficial(gameId: string, officials: SessionOfficial[]): boolean {
  return officials.some((o) => o.sessionId === gameId && o.status === "confirmed");
}

export function buildFieldBoard(fields: Field[], games: GameRecord[], officials: SessionOfficial[], now: number): FieldBoardEntry[] {
  return fields.map((field) => {
    const fieldGames = games.filter((g) => g.fieldId === field.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const current = fieldGames.find(isLive)
      ?? fieldGames.find((g) => g.status === "scheduled" && now >= new Date(g.startTime).getTime());
    const next = fieldGames.find((g) => g.status === "scheduled" && (!current || g.id !== current.id) && new Date(g.startTime).getTime() > now);

    const behind = current ? minutesBehind(current, now) : 0;
    let recommendedAction: string | null = null;
    if (current && next && behind >= 10) {
      const projected = new Date(new Date(next.startTime).getTime() + behind * 60_000);
      recommendedAction = `Running ${behind} min behind — consider moving the next game to ~${timeLabel(projected.toISOString())}.`;
    }

    return {
      fieldId: field.id,
      fieldName: field.name,
      status: field.status,
      currentGame: current
        ? {
            id: current.id,
            label: gameLabel(current),
            scoreHome: current.homeScore,
            scoreAway: current.awayScore,
            lifecycleStatus: current.lifecycleStatus,
            startLabel: timeLabel(current.startTime),
            minutesBehind: behind,
          }
        : null,
      nextGame: next ? { id: next.id, label: gameLabel(next), startLabel: timeLabel(next.startTime) } : null,
      officialsConfirmed: next ? hasConfirmedOfficial(next.id, officials) : true,
      recommendedAction,
    };
  });
}

export type AttentionInputs = {
  fields: Field[];
  games: GameRecord[];
  officials: SessionOfficial[];
  workOrders: WorkOrder[];
  assets: VenueAsset[];
  weather: WeatherSnapshot;
  now: number;
};

// The prioritized work queue — the heart of the Command Center. Turns raw
// signals into "what happened / why it matters / what to do", ranked.
export function buildAttentionQueue(input: AttentionInputs): AttentionItem[] {
  const items: AttentionItem[] = [];
  const fieldName = new Map(input.fields.map((f) => [f.id, f.name]));

  if (input.weather && input.weather.risk === "severe") {
    items.push({
      id: "weather",
      tier: "urgent",
      title: "Severe weather detected near the venue",
      why: input.weather.reasons.join("; ") || "Lightning or storm conditions in the safety radius.",
      action: "Clear the fields and post a weather hold.",
      href: "/admin/alerts/storm",
      fieldName: null,
    });
  } else if (input.weather && input.weather.risk === "caution") {
    items.push({
      id: "weather",
      tier: "soon",
      title: "Weather is deteriorating",
      why: input.weather.reasons.join("; ") || "Conditions trending toward a possible hold.",
      action: "Review the storm assessment and pre-stage an advisory.",
      href: "/admin/alerts/storm",
      fieldName: null,
    });
  }

  for (const asset of input.assets.filter((a) => a.status === "offline")) {
    items.push({
      id: `asset:${asset.id}`,
      tier: "urgent",
      title: `${asset.assetName} is offline`,
      why: "A venue system is down and may affect operations or the fan experience.",
      action: "Dispatch a technician or check the connection.",
      href: "/admin/assets",
      fieldName: asset.physicalLocation ?? null,
    });
  }

  for (const game of input.games) {
    const behind = minutesBehind(game, input.now);
    if (behind >= LATE_ATTENTION_THRESHOLD_MIN) {
      items.push({
        id: `late:${game.id}`,
        tier: "soon",
        title: `${gameLabel(game)} is running ${behind} minutes behind`,
        why: "Downstream games on this field are at risk of cascading delays.",
        action: "Adjust the next start time or notify waiting teams.",
        href: "/admin/operations-center",
        fieldName: fieldName.get(game.fieldId) ?? null,
      });
    }
  }

  const board = buildFieldBoard(input.fields, input.games, input.officials, input.now);
  for (const entry of board) {
    if (entry.nextGame && !entry.officialsConfirmed) {
      items.push({
        id: `umpire:${entry.fieldId}`,
        tier: "soon",
        title: `${entry.fieldName} has no confirmed official for the next game`,
        why: `${entry.nextGame.label} at ${entry.nextGame.startLabel} may start without an umpire.`,
        action: "Assign or confirm an official.",
        href: "/admin/sessions/officials",
        fieldName: entry.fieldName,
      });
    }
  }

  for (const field of input.fields.filter((f) => FIELD_ATTENTION_STATUSES.has(f.status))) {
    items.push({
      id: `field:${field.id}`,
      tier: field.status === "closed" ? "urgent" : "soon",
      title: `${field.name} is ${field.status}`,
      why: "Games on this field are affected until it returns to normal.",
      action: field.status === "maintenance" ? "Confirm the maintenance item and ETA." : "Resolve the delay or reopen the field.",
      href: "/admin/operations-center",
      fieldName: field.name,
    });
  }

  for (const order of input.workOrders.filter((o) => o.status !== "done" && !o.closedAt)) {
    items.push({
      id: `workorder:${order.id}`,
      tier: order.priority === "urgent" ? "urgent" : order.priority === "high" ? "soon" : "info",
      title: order.title,
      why: order.detail || "Open field work order.",
      action: "Assign and track to completion.",
      href: "/admin/fields/work-orders",
      fieldName: fieldName.get(order.fieldId) ?? null,
    });
  }

  return items.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
}

export function summarize(input: {
  games: GameRecord[];
  fields: Field[];
  officials: SessionOfficial[];
  assets: VenueAsset[];
  weather: WeatherSnapshot;
  now: number;
}): CommandCenterSummary {
  const board = buildFieldBoard(input.fields, input.games, input.officials, input.now);
  return {
    gamesScheduled: input.games.length,
    gamesLive: input.games.filter(isLive).length,
    gamesBehind: input.games.filter((g) => minutesBehind(g, input.now) >= LATE_ATTENTION_THRESHOLD_MIN).length,
    fieldsNeedAttention: input.fields.filter((f) => FIELD_ATTENTION_STATUSES.has(f.status)).length,
    weatherRisk: input.weather ? input.weather.risk : null,
    officialsUnconfirmed: board.filter((e) => e.nextGame && !e.officialsConfirmed).length,
    systemsOffline: input.assets.filter((a) => a.status === "offline" || a.status === "maintenance_needed").length,
    systemsTotal: input.assets.length,
  };
}

// ---- Operating-mode checklist ----------------------------------------------
//
// The screen changes with the venue's phase: a readiness checklist before games
// start, live-ops during, and a closing workflow at end of day. Items that can
// be derived from real signals auto-check (ready|todo); the rest are manual
// coordination steps the GM ticks off (transient client state).

export type ChecklistStatus = "ready" | "todo" | "manual";
export type ChecklistItem = { key: string; label: string; detail: string; status: ChecklistStatus };
export type ModeChecklist = { title: string; caption: string; items: ChecklistItem[]; readyCount: number; autoCount: number };

const item = (key: string, label: string, detail: string, status: ChecklistStatus): ChecklistItem => ({ key, label, detail, status });

// Health of a group of venue devices matching a predicate. No devices of that
// kind registered -> a manual check rather than a false "all clear".
function deviceCheck(key: string, label: string, assets: VenueAsset[], match: (a: VenueAsset) => boolean): ChecklistItem {
  const group = assets.filter(match);
  if (group.length === 0) return item(key, label, "None registered — verify manually", "manual");
  const down = group.filter((a) => a.status === "offline" || a.status === "maintenance_needed");
  return down.length === 0
    ? item(key, label, `${group.length} online`, "ready")
    : item(key, label, `${down.length} of ${group.length} need attention`, "todo");
}

const isAudio = (a: VenueAsset) => a.assetCategory === "audio" || a.assetType === "speaker" || a.assetType === "audio_zone";
const isScoreboard = (a: VenueAsset) => a.assetCategory === "scoreboards" || a.assetType === "scoreboard";
const isCamera = (a: VenueAsset) => a.assetType === "camera";

export type ModeChecklistInput = {
  mode: CommandCenterMode;
  fields: Field[];
  games: GameRecord[];
  officials: SessionOfficial[];
  assets: VenueAsset[];
  weather: WeatherSnapshot;
  workOrders: WorkOrder[];
  now: number;
};

export function buildModeChecklist(input: ModeChecklistInput): ModeChecklist {
  const { mode, fields, games, officials, assets, weather, workOrders, now } = input;
  const openWorkOrders = workOrders.filter((o) => o.status !== "done" && !o.closedAt).length;
  const flaggedFields = fields.filter((f) => FIELD_ATTENTION_STATUSES.has(f.status));

  let title: string;
  let caption: string;
  const items: ChecklistItem[] = [];

  if (mode === "postgame") {
    title = "End-of-day closing";
    caption = "Wrap the day: confirm finals, shut down, secure the complex, and file the report.";
    const notFinal = games.filter((g) => g.status !== "final");
    items.push(
      games.length === 0
        ? item("games_completed", "All games completed", "No games today", "manual")
        : notFinal.length === 0
          ? item("games_completed", "All games completed", `${games.length} games final`, "ready")
          : item("games_completed", "All games completed", `${notFinal.length} game(s) not final yet`, "todo"),
      item("finals_confirmed", "Final scores confirmed", "Confirm each field's final", "manual"),
      item("devices_shutdown", "Devices shut down", "Scoreboards, cameras, audio, displays", "manual"),
      item("equipment_returned", "Equipment returned", "Bases, radios, tablets", "manual"),
      item("cash_closeout", "Cash / concessions closeout", "Reconcile the day's take", "manual"),
      item("incidents_documented", "Incidents documented", "File any injuries or safety events", "manual"),
      item("fields_secured", "Fields & facility secured", "Gates, lights, restrooms locked", "manual"),
      openWorkOrders > 0
        ? item("maintenance_created", "Maintenance items logged", `${openWorkOrders} open work order(s)`, "ready")
        : item("maintenance_created", "Maintenance items logged", "Log anything needing repair", "manual"),
      item("daily_report", "Daily report generated", "Executive summary for the district", "manual"),
    );
  } else if (mode === "live") {
    title = "Live operations";
    caption = "Games are running. Work the attention queue; keep the day on schedule.";
    const behind = games.filter((g) => minutesBehind(g, now) >= LATE_ATTENTION_THRESHOLD_MIN).length;
    items.push(
      behind === 0
        ? item("schedule_on_track", "Schedule on track", "No games materially behind", "ready")
        : item("schedule_on_track", "Schedule on track", `${behind} game(s) running behind`, "todo"),
      deviceCheck("scoreboards_live", "Scoreboards feeding", assets, isScoreboard),
      flaggedFields.length === 0
        ? item("fields_clear", "All fields playable", "No fields flagged", "ready")
        : item("fields_clear", "All fields playable", `${flaggedFields.length} field(s) flagged`, "todo"),
      item("field_turnovers", "Field turnovers on time", "Clear and reset between games", "manual"),
      item("incidents_logged", "Incidents handled", "Log and respond to any events", "manual"),
    );
  } else {
    title = "Pre-game readiness";
    caption = "Before first pitch: confirm the complex, systems, and staff are ready.";
    const gamesToStaff = games.filter((g) => g.status !== "final");
    const unconfirmed = gamesToStaff.filter((g) => !officials.some((o) => o.sessionId === g.id && o.status === "confirmed"));
    items.push(
      flaggedFields.length === 0
        ? item("fields_inspected", "Fields inspected & ready", `${fields.length} field(s) clear`, "ready")
        : item("fields_inspected", "Fields inspected & ready", `${flaggedFields.length} field(s) flagged`, "todo"),
      deviceCheck("scoreboards_online", "Scoreboards online", assets, isScoreboard),
      deviceCheck("cameras_online", "Cameras online", assets, isCamera),
      deviceCheck("audio_online", "Audio / PA online", assets, isAudio),
      gamesToStaff.length === 0
        ? item("officials_assigned", "Officials assigned", "No games to staff", "manual")
        : unconfirmed.length === 0
          ? item("officials_assigned", "Officials assigned", `${gamesToStaff.length} game(s) staffed`, "ready")
          : item("officials_assigned", "Officials assigned", `${unconfirmed.length} game(s) without a confirmed official`, "todo"),
      weather
        ? item("weather_reviewed", "Weather reviewed", `Current risk: ${weather.risk}`, "ready")
        : item("weather_reviewed", "Weather reviewed", "Check conditions before opening", "manual"),
      item("gates_opened", "Gates opened", "Entrances and parking ready", "manual"),
      item("concessions_staffed", "Concessions staffed", "Stands open and stocked", "manual"),
      item("restrooms_checked", "Restrooms checked", "Clean and stocked", "manual"),
      item("emergency_contacts", "Emergency contacts confirmed", "First aid and on-call reachable", "manual"),
    );
  }

  const autoItems = items.filter((i) => i.status !== "manual");
  return {
    title,
    caption,
    items,
    readyCount: autoItems.filter((i) => i.status === "ready").length,
    autoCount: autoItems.length,
  };
}
