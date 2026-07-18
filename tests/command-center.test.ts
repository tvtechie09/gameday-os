import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAttentionQueue,
  buildFieldBoard,
  buildModeChecklist,
  chicagoDateString,
  defaultGameMinutes,
  UPCOMING_WINDOW_MIN,
  isSameVenueDay,
  minutesBehind,
  resolveMode,
  summarize,
} from "../src/lib/services/command-center-core.ts";
import type { GameRecord } from "../src/lib/game-engine/game-service.ts";
import type { SessionOfficial } from "../src/lib/services/officials.ts";
import type { WorkOrder } from "../src/lib/services/work-orders.ts";
import type { AudioProfile, Field, VenueAsset } from "../src/lib/types.ts";

const NOW = Date.parse("2026-07-14T18:00:00.000Z");
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();
const minsAhead = (m: number) => new Date(NOW + m * 60_000).toISOString();

function game(overrides: Partial<GameRecord>): GameRecord {
  return {
    id: "g1",
    fieldId: "F1",
    title: "",
    homeTeam: "Home",
    awayTeam: "Away",
    homeScore: 0,
    awayScore: 0,
    startTime: minsAgo(60),
    endTime: null,
    status: "scheduled",
    lifecycleStatus: "scheduled",
    sportType: "baseball",
    ...overrides,
  } as unknown as GameRecord;
}

function field(id: string, name: string, status = "open"): Field {
  return { id, name, status, venueId: "V1" } as unknown as Field;
}

function official(sessionId: string, status: SessionOfficial["status"]): SessionOfficial {
  return { id: "o-" + sessionId, sessionId, officialName: "Ump", officialEmail: null, officialPhone: null, role: "umpire", status, confirmToken: "t" };
}

// ---- minutesBehind ---------------------------------------------------------

test("minutesBehind: live game overrunning its scheduled end", () => {
  const g = game({ status: "active", lifecycleStatus: "live", startTime: minsAgo(120), endTime: minsAgo(30) });
  assert.equal(minutesBehind(g, NOW), 30);
});

test("minutesBehind: live game with no end assumes 90 min", () => {
  const g = game({ status: "active", lifecycleStatus: "live", startTime: minsAgo(120), endTime: null });
  assert.equal(minutesBehind(g, NOW), 30); // 120 - 90
});

test("minutesBehind: scheduled game past its start is late to first pitch", () => {
  const g = game({ status: "scheduled", startTime: minsAgo(25) });
  assert.equal(minutesBehind(g, NOW), 25);
});

test("minutesBehind: on-time live and final games are zero", () => {
  assert.equal(minutesBehind(game({ status: "active", lifecycleStatus: "live", startTime: minsAgo(30), endTime: minsAhead(60) }), NOW), 0);
  assert.equal(minutesBehind(game({ status: "final", startTime: minsAgo(300) }), NOW), 0);
});

// ---- resolveMode -----------------------------------------------------------

test("resolveMode: live when any game is in progress", () => {
  assert.equal(resolveMode([game({ status: "scheduled" }), game({ id: "g2", status: "active", lifecycleStatus: "live" })], NOW), "live");
});

test("resolveMode: pregame when games remain to start", () => {
  assert.equal(resolveMode([game({ status: "scheduled", startTime: minsAhead(60) })], NOW), "pregame");
});

test("resolveMode: postgame when all games are final", () => {
  assert.equal(resolveMode([game({ status: "final", startTime: minsAgo(200) })], NOW), "postgame");
});

test("resolveMode: empty schedule defaults to pregame", () => {
  assert.equal(resolveMode([], NOW), "pregame");
});

// ---- buildFieldBoard -------------------------------------------------------

test("buildFieldBoard: surfaces current live game, next game, umpire gap, and a recommendation", () => {
  const games = [
    game({ id: "cur", status: "active", lifecycleStatus: "live", startTime: minsAgo(120), endTime: minsAgo(30), homeScore: 4, awayScore: 2 }),
    game({ id: "nxt", status: "scheduled", startTime: minsAhead(30) }),
  ];
  const board = buildFieldBoard([field("F1", "Field 4A")], games, [], NOW);
  assert.equal(board.length, 1);
  const entry = board[0];
  assert.equal(entry.currentGame?.id, "cur");
  assert.equal(entry.currentGame?.minutesBehind, 30);
  assert.equal(entry.currentGame?.scoreHome, 4);
  assert.equal(entry.nextGame?.id, "nxt");
  assert.equal(entry.officialsConfirmed, false); // no confirmed official for the next game
  assert.ok(entry.recommendedAction && entry.recommendedAction.includes("behind"));
});

test("buildFieldBoard: confirmed official on the next game clears the gap", () => {
  const games = [
    game({ id: "cur", status: "active", lifecycleStatus: "live", startTime: minsAgo(30), endTime: minsAhead(60) }),
    game({ id: "nxt", status: "scheduled", startTime: minsAhead(90) }),
  ];
  const board = buildFieldBoard([field("F1", "Field 1")], games, [official("nxt", "confirmed")], NOW);
  assert.equal(board[0].officialsConfirmed, true);
  assert.equal(board[0].recommendedAction, null); // on time, no recommendation
});

// ---- buildAttentionQueue ---------------------------------------------------

test("buildAttentionQueue: prioritizes urgent, then soon, then info", () => {
  const games = [
    game({ id: "late", status: "active", lifecycleStatus: "live", startTime: minsAgo(200), endTime: minsAgo(45) }), // 45 behind -> soon
    game({ id: "nxt", status: "scheduled", startTime: minsAhead(20), fieldId: "F1" }), // next, no umpire -> soon
  ];
  const fields = [field("F1", "Field 7", "closed")]; // closed -> urgent
  const assets: VenueAsset[] = [{ id: "a1", venueId: "V1", assetName: "Scoreboard 7", status: "offline", physicalLocation: "Field 7" } as unknown as VenueAsset];
  const workOrders: WorkOrder[] = [{ id: "w1", fieldId: "F1", title: "Low water", detail: "Stand 2", priority: "low", status: "open", closedAt: null } as unknown as WorkOrder];
  const weather = { risk: "severe" as const, reasons: ["Lightning: Storm risk reported"] };

  const queue = buildAttentionQueue({ fields, games, officials: [], workOrders, assets, audioProfiles: [], weather, now: NOW });

  // Sorted: all urgent items precede soon, which precede info.
  const tiers = queue.map((i) => i.tier);
  const firstSoon = tiers.indexOf("soon");
  const firstInfo = tiers.indexOf("info");
  assert.ok(tiers.lastIndexOf("urgent") < firstSoon, "urgent before soon");
  assert.ok(firstInfo === -1 || firstSoon < firstInfo, "soon before info");

  const ids = queue.map((i) => i.id);
  assert.ok(ids.includes("weather"));
  assert.ok(ids.includes("asset:a1"));
  assert.ok(ids.includes("field:F1"));
  assert.ok(ids.includes("late:late"));
  assert.ok(ids.includes("umpire:F1"));
  assert.ok(ids.includes("workorder:w1"));
  assert.equal(queue.find((i) => i.id === "weather")?.tier, "urgent");
  assert.equal(queue.find((i) => i.id === "workorder:w1")?.tier, "info");
});

test("buildAttentionQueue: caution weather is soon, not urgent; clear venue is empty", () => {
  const caution = buildAttentionQueue({ fields: [field("F1", "F1")], games: [], officials: [], workOrders: [], assets: [], audioProfiles: [], weather: { risk: "caution", reasons: ["Wind 32 mph"] }, now: NOW });
  assert.equal(caution.find((i) => i.id === "weather")?.tier, "soon");

  const clear = buildAttentionQueue({ fields: [field("F1", "F1")], games: [], officials: [], workOrders: [], assets: [], audioProfiles: [], weather: { risk: "clear", reasons: [] }, now: NOW });
  assert.equal(clear.length, 0);
});

// ---- summarize -------------------------------------------------------------

test("summarize: counts games, delays, flagged fields, and systems", () => {
  const games = [
    game({ id: "live1", status: "active", lifecycleStatus: "live", startTime: minsAgo(30), endTime: minsAhead(60), fieldId: "F1" }),
    game({ id: "behind1", status: "scheduled", startTime: minsAgo(40), fieldId: "F2" }), // 40 late -> behind
    game({ id: "sched1", status: "scheduled", startTime: minsAhead(120), fieldId: "F2" }),
  ];
  const fields = [field("F1", "F1", "open"), field("F2", "F2", "maintenance")];
  const assets: VenueAsset[] = [
    { id: "a1", venueId: "V1", assetName: "S1", status: "healthy" } as unknown as VenueAsset,
    { id: "a2", venueId: "V1", assetName: "S2", status: "offline" } as unknown as VenueAsset,
  ];
  const s = summarize({ games, fields, officials: [], assets, weather: { risk: "clear", reasons: [] }, now: NOW });
  assert.equal(s.gamesScheduled, 3);
  assert.equal(s.gamesLive, 1);
  assert.equal(s.gamesBehind, 1);
  assert.equal(s.fieldsNeedAttention, 1); // F2 maintenance
  assert.equal(s.systemsOffline, 1);
  assert.equal(s.systemsTotal, 2);
  assert.equal(s.weatherRisk, "clear");
});

// ---- buildModeChecklist ----------------------------------------------------

const asset = (id: string, type: string, status = "healthy"): VenueAsset =>
  ({ id, venueId: "V1", assetName: id, assetType: type, assetCategory: type === "scoreboard" ? "scoreboards" : type === "camera" ? "video" : "audio", status } as unknown as VenueAsset);

test("buildModeChecklist: pre-game readiness auto-checks clear fields, online devices, staffing, weather", () => {
  const cl = buildModeChecklist({
    mode: "pregame",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "scheduled", startTime: minsAhead(60) })],
    officials: [official("g1", "confirmed")],
    assets: [asset("sb1", "scoreboard"), asset("cam1", "camera"), asset("spk1", "speaker")],
    weather: { risk: "clear", reasons: [] },
    workOrders: [],
  });
  assert.equal(cl.title, "Pre-game readiness");
  const byKey = new Map(cl.items.map((i) => [i.key, i]));
  assert.equal(byKey.get("fields_inspected")?.status, "ready");
  assert.equal(byKey.get("scoreboards_online")?.status, "ready");
  assert.equal(byKey.get("officials_assigned")?.status, "ready");
  assert.equal(byKey.get("weather_reviewed")?.status, "ready");
  assert.equal(byKey.get("gates_opened")?.status, "manual");
  assert.ok(cl.readyCount >= 4 && cl.autoCount >= 5);
});

test("buildModeChecklist: pre-game surfaces gaps as todo (flagged field, offline scoreboard, unconfirmed official)", () => {
  const cl = buildModeChecklist({
    mode: "pregame",
    now: NOW,
    fields: [field("F1", "F1", "maintenance")],
    games: [game({ id: "g1", status: "scheduled", startTime: minsAhead(60) })],
    officials: [],
    assets: [asset("sb1", "scoreboard", "offline")],
    weather: null,
    workOrders: [],
  });
  const byKey = new Map(cl.items.map((i) => [i.key, i]));
  assert.equal(byKey.get("fields_inspected")?.status, "todo");
  assert.equal(byKey.get("scoreboards_online")?.status, "todo");
  assert.equal(byKey.get("officials_assigned")?.status, "todo");
  assert.equal(byKey.get("weather_reviewed")?.status, "manual"); // no weather signal
  assert.equal(byKey.get("cameras_online")?.status, "manual"); // none registered
});

test("buildModeChecklist: end-of-day closing marks games completed when all final", () => {
  const cl = buildModeChecklist({
    mode: "postgame",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "final" }), game({ id: "g2", status: "final" })],
    officials: [],
    assets: [],
    weather: null,
    workOrders: [{ id: "w1", fieldId: "F1", title: "x", detail: null, priority: "low", status: "open", closedAt: null } as unknown as WorkOrder],
  });
  assert.equal(cl.title, "End-of-day closing");
  const byKey = new Map(cl.items.map((i) => [i.key, i]));
  assert.equal(byKey.get("games_completed")?.status, "ready");
  assert.equal(byKey.get("maintenance_created")?.status, "ready"); // an open work order exists
  assert.equal(byKey.get("cash_closeout")?.status, "manual");
});

test("buildModeChecklist: live ops flags schedule when a game runs behind", () => {
  const cl = buildModeChecklist({
    mode: "live",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "active", lifecycleStatus: "live", startTime: minsAgo(200), endTime: minsAgo(45) })],
    officials: [],
    assets: [asset("sb1", "scoreboard")],
    weather: null,
    workOrders: [],
  });
  assert.equal(cl.title, "Live operations");
  const byKey = new Map(cl.items.map((i) => [i.key, i]));
  assert.equal(byKey.get("schedule_on_track")?.status, "todo");
  assert.equal(byKey.get("scoreboards_live")?.status, "ready");
});

// ---- chicagoDateString -----------------------------------------------------

test("chicagoDateString: renders YYYY-MM-DD in Central Time", () => {
  // 2026-07-14T02:00Z is still 2026-07-13 in Chicago (UTC-5 in July).
  assert.equal(chicagoDateString(Date.parse("2026-07-14T02:00:00.000Z")), "2026-07-13");
  assert.match(chicagoDateString(NOW), /^\d{4}-\d{2}-\d{2}$/);
});

// ---- isSameVenueDay --------------------------------------------------------

test("isSameVenueDay: an evening game stays on today's venue date", () => {
  // 8:09pm Chicago on the 16th is already 2026-07-17 in UTC. Comparing the UTC
  // date prefix dropped every game played under the lights off the board.
  assert.equal(isSameVenueDay("2026-07-17T01:09:00.000Z", "2026-07-16"), true);
  assert.equal(isSameVenueDay("2026-07-16T14:00:00.000Z", "2026-07-16"), true);
});

test("isSameVenueDay: an early-morning UTC stamp belongs to the prior venue day", () => {
  // 2026-07-16T02:00Z is 9pm on the 15th in Chicago.
  assert.equal(isSameVenueDay("2026-07-16T02:00:00.000Z", "2026-07-16"), false);
  assert.equal(isSameVenueDay("2026-07-16T02:00:00.000Z", "2026-07-15"), true);
});

test("isSameVenueDay: garbage timestamps never match", () => {
  assert.equal(isSameVenueDay("not-a-date", "2026-07-16"), false);
  assert.equal(isSameVenueDay("", "2026-07-16"), false);
});

// ---- deviceCheck honesty ----------------------------------------------------

// Onboarding registers hardware BEFORE it is installed (status "unknown"). The
// checklist used to count unknown as online, so a freshly provisioned venue would
// have reported "31 online" for boards not yet hung on a wall -- green that reads
// exactly like success while meaning nothing.
test("buildModeChecklist: registered-but-never-reporting devices are not 'online'", () => {
  const cl = buildModeChecklist({
    mode: "live",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    officials: [],
    assets: [asset("sb1", "scoreboard", "unknown"), asset("sb2", "scoreboard", "unknown")],
    weather: null,
    workOrders: [],
  });
  const board = cl.items.find((i) => i.key === "scoreboards_live");
  assert.equal(board?.status, "manual");
  assert.match(board?.detail ?? "", /2 registered, none reporting yet/);
});

test("buildModeChecklist: a partly-reporting fleet is not green", () => {
  const cl = buildModeChecklist({
    mode: "live",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    officials: [],
    assets: [asset("sb1", "scoreboard", "healthy"), asset("sb2", "scoreboard", "unknown")],
    weather: null,
    workOrders: [],
  });
  const board = cl.items.find((i) => i.key === "scoreboards_live");
  assert.equal(board?.status, "todo");
  assert.match(board?.detail ?? "", /1 of 2 reporting/);
});

test("buildModeChecklist: an offline board still outranks an unknown one", () => {
  const cl = buildModeChecklist({
    mode: "live",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    officials: [],
    assets: [asset("sb1", "scoreboard", "offline"), asset("sb2", "scoreboard", "unknown")],
    weather: null,
    workOrders: [],
  });
  const board = cl.items.find((i) => i.key === "scoreboards_live");
  assert.equal(board?.status, "todo");
  assert.match(board?.detail ?? "", /need attention/);
});

test("buildModeChecklist: a fully healthy fleet is still green", () => {
  const cl = buildModeChecklist({
    mode: "live",
    now: NOW,
    fields: [field("F1", "F1", "open")],
    games: [game({ id: "g1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    officials: [],
    assets: [asset("sb1", "scoreboard"), asset("sb2", "scoreboard")],
    weather: null,
    workOrders: [],
  });
  const board = cl.items.find((i) => i.key === "scoreboards_live");
  assert.equal(board?.status, "ready");
  assert.match(board?.detail ?? "", /2 online/);
});

// ---- Audio in the attention queue -------------------------------------------

const audio = (over: Partial<AudioProfile> = {}): AudioProfile =>
  ({
    id: "ap1", venueId: "V1", fieldId: "F1", sessionId: null,
    audioMode: "venue_pa", speakerType: null, provider: null,
    status: "offline", notes: null, createdAt: "", updatedAt: "",
    ...over,
  } as AudioProfile);

const audioQueue = (over: { games?: GameRecord[]; audioProfiles?: AudioProfile[] } = {}) =>
  buildAttentionQueue({
    fields: [field("F1", "Field 3", "open")],
    games: over.games ?? [],
    officials: [], workOrders: [], assets: [],
    audioProfiles: over.audioProfiles ?? [audio()],
    weather: null,
    now: NOW,
  }).filter((i) => i.id.startsWith("audio:"));

test("attention: offline audio on a field with a live game is flagged", () => {
  const q = audioQueue({ games: [game({ id: "g1", fieldId: "F1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })] });
  assert.equal(q.length, 1);
  assert.equal(q[0].tier, "soon");
  assert.match(q[0].title, /Audio is offline on Field 3/);
  // The reason a GM cares is not the music -- it's that they cannot announce.
  assert.match(q[0].why, /weather hold/i);
});

test("attention: offline audio on a field with NO games stays quiet", () => {
  // A dead PA on an empty field at 7am is not a GM's problem. A queue that cries
  // about it stops being read, which costs us the items that matter.
  assert.deepEqual(audioQueue({ games: [] }), []);
});

test("attention: a game far in the future doesn't warrant it yet", () => {
  const q = audioQueue({ games: [game({ id: "g1", fieldId: "F1", status: "scheduled", lifecycleStatus: "scheduled", startTime: minsAhead(UPCOMING_WINDOW_MIN + 30) })] });
  assert.deepEqual(q, []);
});

test("attention: a game starting inside the window is flagged with its time", () => {
  const q = audioQueue({ games: [game({ id: "g1", fieldId: "F1", status: "scheduled", lifecycleStatus: "scheduled", startTime: minsAhead(45) })] });
  assert.equal(q.length, 1);
  assert.match(q[0].why, /starts at .* and has no working audio/);
});

test("attention: audio_mode 'none' is never flagged offline", () => {
  // That field has no sound by design; "offline" there means nothing.
  const q = audioQueue({
    games: [game({ id: "g1", fieldId: "F1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    audioProfiles: [audio({ audioMode: "none" })],
  });
  assert.deepEqual(q, []);
});

test("attention: a healthy profile is never flagged", () => {
  const q = audioQueue({
    games: [game({ id: "g1", fieldId: "F1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    audioProfiles: [audio({ status: "active" })],
  });
  assert.deepEqual(q, []);
});

test("attention: a per-game override only speaks for its own game", () => {
  // The override names g2, but g1 is what's playing -- g1 uses the field default,
  // so the override's offline status says nothing about the game on the field.
  const q = audioQueue({
    games: [game({ id: "g1", fieldId: "F1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    audioProfiles: [audio({ id: "ap2", sessionId: "g2" })],
  });
  assert.deepEqual(q, []);
});

test("attention: a per-game override IS flagged for the game it names", () => {
  const q = audioQueue({
    games: [game({ id: "g2", fieldId: "F1", status: "active", lifecycleStatus: "live", startTime: minsAgo(20), endTime: minsAhead(70) })],
    audioProfiles: [audio({ id: "ap2", sessionId: "g2" })],
  });
  assert.equal(q.length, 1);
  assert.equal(q[0].href, "/admin/audio/ap2/edit");
});

// ---- Systems summary honesty ------------------------------------------------

const summaryFor = (assets: VenueAsset[]) =>
  summarize({ games: [], fields: [], officials: [], assets, weather: null, now: NOW });

test("summary: never-reported devices are not counted as healthy systems", () => {
  // The Systems tile renders (total - offline - unknown)/total. Counting unknown
  // as good is how a venue with six manual boards nobody had ever verified showed
  // a green 9/9.
  const s = summaryFor([
    asset("sb1", "scoreboard", "healthy"),
    asset("sb2", "scoreboard", "unknown"),
    asset("sb3", "scoreboard", "unknown"),
  ]);
  assert.equal(s.systemsTotal, 3);
  assert.equal(s.systemsOffline, 0);
  assert.equal(s.systemsUnknown, 2);
  // What the tile shows: 1 of 3 actually reporting.
  assert.equal(s.systemsTotal - s.systemsOffline - s.systemsUnknown, 1);
});

test("summary: an all-healthy fleet still reports every system green", () => {
  const s = summaryFor([asset("sb1", "scoreboard"), asset("sb2", "scoreboard")]);
  assert.equal(s.systemsUnknown, 0);
  assert.equal(s.systemsTotal - s.systemsOffline - s.systemsUnknown, 2);
});

test("summary: offline and unknown are counted separately", () => {
  // They mean different things: offline is broken, unknown is never heard from.
  // A manual scoreboard is not broken.
  const s = summaryFor([
    asset("sb1", "scoreboard", "offline"),
    asset("sb2", "scoreboard", "unknown"),
    asset("sb3", "scoreboard", "healthy"),
  ]);
  assert.equal(s.systemsOffline, 1);
  assert.equal(s.systemsUnknown, 1);
});

// ---- Per-sport game durations -----------------------------------------------

// minutesBehind's fallback duration was a baseball assumption (90 min) applied to
// every sport. A volleyball tournament plans courts in ~60-minute waves; judging
// it by baseball's clock hides a court running 25 minutes hot. A scheduled
// end_time always wins — the sport default only fills the gap.
test("defaultGameMinutes: per-sport, with 90 as the unknown-sport fallback", () => {
  assert.equal(defaultGameMinutes("baseball"), 90);
  assert.equal(defaultGameMinutes("volleyball"), 60);
  assert.equal(defaultGameMinutes("soccer"), 75);
  assert.equal(defaultGameMinutes("football"), 120);
  assert.equal(defaultGameMinutes("quidditch"), 90);
  assert.equal(defaultGameMinutes(null), 90);
});

test("minutesBehind: a clockless volleyball match runs behind on volleyball time", () => {
  // Live for 70 minutes, no scheduled end. Volleyball slot = 60 -> 10 behind.
  const vb = game({ status: "active", lifecycleStatus: "live", sportType: "volleyball", startTime: minsAgo(70), endTime: null });
  assert.equal(minutesBehind(vb, NOW), 10);
  // The identical game on baseball's 90-minute clock is still fine.
  const bb = game({ status: "active", lifecycleStatus: "live", sportType: "baseball", startTime: minsAgo(70), endTime: null });
  assert.equal(minutesBehind(bb, NOW), 0);
});

test("minutesBehind: a real scheduled end always beats the sport default", () => {
  // Volleyball with a 90-minute booked slot, 70 minutes in -> not behind.
  const vb = game({ status: "active", lifecycleStatus: "live", sportType: "volleyball", startTime: minsAgo(70), endTime: minsAhead(20) });
  assert.equal(minutesBehind(vb, NOW), 0);
});
