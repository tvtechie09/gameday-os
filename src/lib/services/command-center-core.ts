import type { GameRecord } from "@/lib/game-engine/game-service";
import type { SessionOfficial } from "@/lib/services/officials";
import type { WorkOrder } from "@/lib/services/work-orders";
import type { StormRiskLevel } from "@/lib/services/storm-assessment";
import type { AudioProfile, Field, VenueAsset } from "@/lib/types";

// Pure core of the GameDay Command Center — mode resolution, delay math, field
// board, attention queue, and summary. Type-only imports keep this dependency-
// free so it is unit-testable in isolation (mirrors the storm-assessment /
// storm-watch split). All IO lives in command-center.ts.

// A late game is only worth flagging past this many minutes behind.
export const LATE_ATTENTION_THRESHOLD_MIN = 20;
// A live game with a known scheduled end is "running late" only once it overruns.
export const DEFAULT_GAME_MINUTES = 90;

// Typical slot length by sport, used ONLY when a game has no scheduled end —
// a real end_time always wins. These are scheduling heuristics, not rules:
// clockless sports (volleyball, baseball) can't be timed exactly, but a
// tournament director still plans courts in ~60-minute waves, and "running
// behind" has to be measured against SOMETHING. Baseball stays at the original
// 90 so the flagship demo's math doesn't shift.
const SPORT_GAME_MINUTES: Record<string, number> = {
  baseball: DEFAULT_GAME_MINUTES,
  softball: DEFAULT_GAME_MINUTES,
  soccer: 75,
  football: 120,
  lacrosse: 75,
  basketball: 75,
  volleyball: 60,
};

export function defaultGameMinutes(sportType: string | null | undefined): number {
  return SPORT_GAME_MINUTES[sportType ?? ""] ?? DEFAULT_GAME_MINUTES;
}

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
  // Registered but never heard from -- onboarding records hardware before it is
  // installed, and a manual scoreboard never reports at all. These are NOT
  // healthy; counting them as such is how the tile read a green 9/9 for a venue
  // with six boards nobody had ever verified.
  systemsUnknown: number;
  systemsTotal: number;
};

export type WeatherSnapshot = { risk: StormRiskLevel; reasons: string[] } | null;

const FIELD_ATTENTION_STATUSES = new Set(["delayed", "closed", "maintenance"]);
const TIER_RANK: Record<AttentionTier, number> = { urgent: 0, soon: 1, info: 2 };

export function chicagoDateString(now: number): string {
  // en-CA renders as YYYY-MM-DD, which is what listGamesForVenue's date filter wants.
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHICAGO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

// Does this timestamp fall on `date` AT THE VENUE?
//
// Never compare iso.slice(0,10) to this — that's the UTC date, and after ~7pm
// Chicago (midnight UTC) an evening game rolls onto the next UTC day and silently
// disappears from "today" — precisely when a venue is running games under lights.
export function isSameVenueDay(iso: string, date: string): boolean {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return chicagoDateString(parsed.getTime()) === date;
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
    const end = game.endTime ? new Date(game.endTime).getTime() : start + defaultGameMinutes(game.sportType) * 60_000;
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

// Which game owns a field right now, and which is queued behind it. Shared by
// the field board and the schedule pulse so both can never disagree about what
// "current" means.
function fieldSlot(field: Field, games: GameRecord[], now: number): { games: GameRecord[]; current: GameRecord | undefined; next: GameRecord | undefined } {
  const fieldGames = games.filter((g) => g.fieldId === field.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const current = fieldGames.find(isLive)
    ?? fieldGames.find((g) => g.status === "scheduled" && now >= new Date(g.startTime).getTime());
  const next = fieldGames.find((g) => g.status === "scheduled" && (!current || g.id !== current.id) && new Date(g.startTime).getTime() > now);
  return { games: fieldGames, current, next };
}

export function buildFieldBoard(fields: Field[], games: GameRecord[], officials: SessionOfficial[], now: number): FieldBoardEntry[] {
  return fields.map((field) => {
    const { current, next } = fieldSlot(field, games, now);

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
  // Field-level audio POLICY (where sound comes from on this field), distinct
  // from the speaker hardware in `assets`. A field default has sessionId null; a
  // per-game override names the session.
  audioProfiles: AudioProfile[];
  weather: WeatherSnapshot;
  now: number;
};

// How far ahead a game still counts as "coming up" for readiness warnings. Past
// this, a broken PA is tomorrow's problem and does not belong in today's queue.
export const UPCOMING_WINDOW_MIN = 120;

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

  // Audio that's down on a field where a game is actually happening.
  //
  // The discipline here is when NOT to fire. A dead PA on an empty field at 7am
  // is not a GM's problem, and a queue that cries about it stops being read --
  // which costs us the items that matter. So: only fields with a game live now or
  // starting inside the window, and never audio_mode "none" (that field has no
  // sound by design; "offline" there is meaningless).
  //
  // Deliberately "soon", not "urgent": urgent is for lightning and dead systems.
  // But it isn't cosmetic either -- a venue that can't make announcements can't
  // announce a weather hold, which is exactly when it matters most.
  for (const profile of input.audioProfiles) {
    if (profile.status !== "offline" || profile.audioMode === "none") continue;

    const gamesHere = input.games.filter((g) => g.fieldId === profile.fieldId);
    // A per-game override only speaks for its own game; a field default speaks
    // for any game on the field.
    const relevant = profile.sessionId
      ? gamesHere.filter((g) => g.id === profile.sessionId)
      : gamesHere;

    const live = relevant.find((g) => g.lifecycleStatus === "live");
    const upcoming = relevant
      .filter((g) => g.lifecycleStatus === "scheduled")
      .filter((g) => {
        const startsIn = (Date.parse(g.startTime) - input.now) / 60_000;
        return startsIn >= 0 && startsIn <= UPCOMING_WINDOW_MIN;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    const game = live ?? upcoming;
    if (!game) continue;

    items.push({
      id: `audio:${profile.id}`,
      tier: "soon",
      title: `Audio is offline on ${fieldName.get(profile.fieldId) ?? "a field"}`,
      why: live
        ? `${gameLabel(live)} is playing there now — no announcements, including a weather hold.`
        : `${gameLabel(upcoming!)} starts at ${timeLabel(upcoming!.startTime)} and has no working audio.`,
      action: "Check the speaker or switch this field to a backup audio mode.",
      href: `/admin/audio/${profile.id}/edit`,
      fieldName: fieldName.get(profile.fieldId) ?? null,
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
    systemsUnknown: input.assets.filter((a) => a.status === "unknown").length,
    systemsTotal: input.assets.length,
  };
}

// ---- Schedule pulse ---------------------------------------------------------
//
// Venue-wide schedule HEALTH — how the day as a whole is holding up, as opposed
// to the per-field detail on the board. Answers a tournament director's actual
// question: "are we still going to finish on time, and which field is hurting us?"
//
// Scope: games still in play or pending (live + scheduled). A game that already
// went final can't be recovered, so folding its delay in here would keep a
// recovered afternoon looking broken all evening.

// A delay only counts as a "downstream impact" once it will visibly push the
// next game's start. Matches the field board's recommendedAction threshold so
// the two surfaces never disagree.
export const DOWNSTREAM_IMPACT_THRESHOLD_MIN = 10;

export type SchedulePulse = {
  tracked: number; // games this pulse covers (live + scheduled)
  onTime: number;
  late1to10: number;
  late11to20: number;
  late20plus: number;
  averageDelayMin: number; // mean across ALL tracked games, on-time ones included
  worstDelayMin: number;
  worstFields: Array<{ fieldName: string; minutesBehind: number }>;
  downstreamImpacts: Array<{
    fieldName: string;
    nextGameLabel: string;
    scheduledStartLabel: string;
    projectedStartLabel: string;
    minutesLate: number;
  }>;
  // If nothing changes, the venue's worst field is this far behind — the
  // headline "how long to get whole again" number.
  recoveryMinutes: number;
  curfewRisks: Array<{ fieldName: string; gameLabel: string; projectedFinishLabel: string; minutesPastClose: number }>;
};

export type SchedulePulseInput = {
  fields: Field[];
  games: GameRecord[];
  now: number;
  // Venue closing / curfew time for the operating day. Omit it and we report NO
  // curfew risk rather than inventing a closing time.
  venueCloseIso?: string | null;
};

export function buildSchedulePulse(input: SchedulePulseInput): SchedulePulse {
  const { fields, games, now } = input;
  const tracked = games.filter((g) => isLive(g) || g.status === "scheduled");
  const delays = tracked.map((g) => minutesBehind(g, now));

  const onTime = delays.filter((d) => d === 0).length;
  const late1to10 = delays.filter((d) => d >= 1 && d <= 10).length;
  const late11to20 = delays.filter((d) => d >= 11 && d <= 20).length;
  const late20plus = delays.filter((d) => d > 20).length;
  const totalDelay = delays.reduce((sum, d) => sum + d, 0);
  const worstDelayMin = delays.reduce((max, d) => Math.max(max, d), 0);

  // Worst-hit fields: the largest current delay on each field, biggest first.
  const worstFields = fields
    .map((field) => {
      const { current } = fieldSlot(field, games, now);
      return { fieldName: field.name, minutesBehind: current ? minutesBehind(current, now) : 0 };
    })
    .filter((entry) => entry.minutesBehind > 0)
    .sort((a, b) => b.minutesBehind - a.minutesBehind)
    .slice(0, 3);

  // Where a delay is about to land on the next game in that field's queue.
  const downstreamImpacts: SchedulePulse["downstreamImpacts"] = [];
  const curfewRisks: SchedulePulse["curfewRisks"] = [];
  const closeAt = input.venueCloseIso ? new Date(input.venueCloseIso).getTime() : NaN;

  for (const field of fields) {
    const { games: fieldGames, current, next } = fieldSlot(field, games, now);
    const behind = current ? minutesBehind(current, now) : 0;

    if (current && next && behind >= DOWNSTREAM_IMPACT_THRESHOLD_MIN) {
      const projected = new Date(new Date(next.startTime).getTime() + behind * 60_000);
      downstreamImpacts.push({
        fieldName: field.name,
        nextGameLabel: gameLabel(next),
        scheduledStartLabel: timeLabel(next.startTime),
        projectedStartLabel: timeLabel(projected.toISOString()),
        minutesLate: behind,
      });
    }

    // Curfew: assume today's delay carries forward unchanged to this field's
    // last remaining game. A projection, not a promise — labelled as such in the UI.
    if (!Number.isNaN(closeAt) && behind > 0) {
      const remaining = fieldGames.filter((g) => isLive(g) || g.status === "scheduled");
      const last = remaining[remaining.length - 1];
      if (last) {
        const scheduledEnd = last.endTime
          ? new Date(last.endTime).getTime()
          : new Date(last.startTime).getTime() + defaultGameMinutes(last.sportType) * 60_000;
        const projectedFinish = scheduledEnd + behind * 60_000;
        if (!Number.isNaN(scheduledEnd) && projectedFinish > closeAt) {
          curfewRisks.push({
            fieldName: field.name,
            gameLabel: gameLabel(last),
            projectedFinishLabel: timeLabel(new Date(projectedFinish).toISOString()),
            minutesPastClose: Math.round((projectedFinish - closeAt) / 60_000),
          });
        }
      }
    }
  }

  return {
    tracked: tracked.length,
    onTime,
    late1to10,
    late11to20,
    late20plus,
    averageDelayMin: tracked.length ? Math.round(totalDelay / tracked.length) : 0,
    worstDelayMin,
    worstFields,
    downstreamImpacts: downstreamImpacts.sort((a, b) => b.minutesLate - a.minutesLate),
    recoveryMinutes: worstDelayMin,
    curfewRisks: curfewRisks.sort((a, b) => b.minutesPastClose - a.minutesPastClose),
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
  if (down.length > 0) return item(key, label, `${down.length} of ${group.length} need attention`, "todo");

  // "unknown" means we have never heard from the device — onboarding registers
  // hardware before it is installed, so a freshly provisioned venue is full of
  // them. Reporting those as "online" would turn this checklist into a lie that
  // reads exactly like success: a GM would see green for boards not yet on a wall.
  const reporting = group.filter((a) => a.status === "healthy");
  if (reporting.length === 0) return item(key, label, `${group.length} registered, none reporting yet`, "manual");
  if (reporting.length < group.length) {
    return item(key, label, `${reporting.length} of ${group.length} reporting`, "todo");
  }
  return item(key, label, `${group.length} online`, "ready");
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
