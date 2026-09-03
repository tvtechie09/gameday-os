import type { GameRecord } from "@/lib/game-engine/game-service";
import type { WorkOrder } from "@/lib/services/work-orders";
import type { Field, VenueAsset } from "@/lib/types";
// Value imports use relative paths with an explicit .ts extension — the `@/`
// alias only resolves under the bundler, and these pure cores are run directly
// by `node --test`. Type-only imports above are erased, so they can use `@/`.
import { gameLabel, isSameVenueDay, timeLabel } from "./command-center-core.ts";
import { DEFAULT_VENUE_TIMEZONE } from "../venue-timezone.ts";
import { issueLifecycle, resolveIssueStage, type IssueStage } from "./work-order-core.ts";

// End-of-day operations report — the artifact a GM forwards to their board on
// Monday. Pure and dependency-free (type-only imports + sibling pure cores) so
// it is unit-testable; all IO lives in end-of-day.ts.
//
// Two things make this different from the live Command Center:
//   1. It measures what ACTUALLY happened, from the event ledger's real
//      first-pitch/final timestamps — not the scheduled slot. `minutesBehind`
//      deliberately returns 0 for a final game (you can't recover a finished
//      game), so the live delay math is useless for a retrospective.
//   2. It separates "what happened" from "what carries into tomorrow", because
//      the carry-over is the part somebody has to act on.

// A start within this many minutes of the slot counts as on time. Youth sports
// never start to the second; flagging a 2-minute variance as "late" would make
// the report noise instead of signal.
export const ON_TIME_GRACE_MIN = 5;

const COMPLETED_STATUSES = new Set(["final", "archived"]);

export type EndOfDayGameCounts = {
  scheduled: number;
  completed: number;
  cancelled: number;
  postponed: number;
  // Neither played to a final nor formally cancelled/postponed — the anomaly a
  // GM has to chase before closing the books.
  unfinished: number;
};

export type EndOfDaySchedule = {
  measured: number; // games with a real start timestamp in the ledger
  unmeasured: number; // games we cannot honestly measure
  startedOnTime: number;
  startedLate: number;
  averageStartDelayMin: number; // across MEASURED games only
  worstStartDelayMin: number;
  worstStartField: string | null;
};

export type EndOfDayIssues = {
  openedToday: number;
  resolvedToday: number;
  stillOpen: number;
  overdue: number;
  unowned: number;
};

export type EndOfDayCarryOver = {
  openIssues: Array<{ id: string; title: string; fieldName: string; stage: IssueStage; assignedRole: string | null; isOverdue: boolean }>;
  flaggedFields: Array<{ name: string; status: string }>;
  unfinishedGames: Array<{ id: string; label: string; fieldName: string; status: string; scheduledStartLabel: string }>;
  devicesOffline: number;
  devicesUnknown: number;
};

export type EndOfDayReport = {
  venueName: string | null;
  date: string;
  // The zone `date` and every label in this report are expressed in. Carried out
  // so the page renders its own date/time headers on the venue's clock instead
  // of re-deriving a guess.
  timeZone: string;
  generatedAt: string;
  games: EndOfDayGameCounts;
  schedule: EndOfDaySchedule;
  issues: EndOfDayIssues;
  carryOver: EndOfDayCarryOver;
  // Plain-language caveats and follow-ups. Never fabricate certainty: if a
  // number couldn't be measured, this says so.
  notes: string[];
};

export type EndOfDayInput = {
  venueName: string | null;
  date: string; // venue-local YYYY-MM-DD
  games: GameRecord[];
  fields: Field[];
  workOrders: WorkOrder[];
  assets: VenueAsset[];
  // ACTUAL first-pitch / final times from the game_events ledger. Absent or
  // empty (pre-engine data) => start-delay stats report as unmeasured rather
  // than silently falling back to the scheduled time, which would show a
  // perfect on-time day that never happened.
  actuals?: Map<string, { startedAt: string | null; finalAt: string | null }>;
  // The venue's zone. `date` is already a venue-local YYYY-MM-DD, so this is
  // what decides which work orders count as opened/resolved "today" — measuring
  // an Eastern venue in Central would misfile every late-evening item.
  timeZone?: string;
  now: number;
};

const FLAGGED_FIELD_STATUSES = new Set(["delayed", "closed", "maintenance"]);

export function buildEndOfDayReport(input: EndOfDayInput): EndOfDayReport {
  const { games, fields, workOrders, assets, date, now } = input;
  const actuals = input.actuals ?? new Map();
  const timeZone = input.timeZone ?? DEFAULT_VENUE_TIMEZONE;
  const fieldName = new Map(fields.map((field) => [field.id, field.name]));
  const nameOf = (fieldId: string) => fieldName.get(fieldId) ?? "Unassigned field";

  // ---- games -------------------------------------------------------------
  const counts: EndOfDayGameCounts = { scheduled: games.length, completed: 0, cancelled: 0, postponed: 0, unfinished: 0 };
  const unfinishedGames: EndOfDayCarryOver["unfinishedGames"] = [];

  for (const game of games) {
    const lifecycle = game.lifecycleStatus;
    if (COMPLETED_STATUSES.has(lifecycle) || game.status === "final") {
      counts.completed += 1;
    } else if (lifecycle === "cancelled") {
      counts.cancelled += 1;
    } else if (lifecycle === "postponed") {
      counts.postponed += 1;
    } else {
      counts.unfinished += 1;
      unfinishedGames.push({
        id: game.id,
        label: gameLabel(game),
        fieldName: nameOf(game.fieldId),
        status: lifecycle || game.status,
        scheduledStartLabel: timeLabel(game.startTime, timeZone),
      });
    }
  }

  // ---- schedule performance (measured against the ledger) ----------------
  let measured = 0;
  let startedOnTime = 0;
  let startedLate = 0;
  let totalDelay = 0;
  let worstStartDelayMin = 0;
  let worstStartField: string | null = null;

  for (const game of games) {
    // Only games that were meant to be played can be "late"; a cancelled game
    // has no start to judge.
    if (game.lifecycleStatus === "cancelled" || game.lifecycleStatus === "postponed") continue;
    const startedAt = actuals.get(game.id)?.startedAt;
    if (!startedAt) continue;

    const scheduled = new Date(game.startTime).getTime();
    const actual = new Date(startedAt).getTime();
    if (Number.isNaN(scheduled) || Number.isNaN(actual)) continue;

    measured += 1;
    const delay = Math.max(0, Math.round((actual - scheduled) / 60_000));
    totalDelay += delay;
    if (delay > ON_TIME_GRACE_MIN) {
      startedLate += 1;
      if (delay > worstStartDelayMin) {
        worstStartDelayMin = delay;
        worstStartField = nameOf(game.fieldId);
      }
    } else {
      startedOnTime += 1;
    }
  }

  const playable = games.filter((g) => g.lifecycleStatus !== "cancelled" && g.lifecycleStatus !== "postponed").length;
  const schedule: EndOfDaySchedule = {
    measured,
    unmeasured: Math.max(0, playable - measured),
    startedOnTime,
    startedLate,
    averageStartDelayMin: measured ? Math.round(totalDelay / measured) : 0,
    worstStartDelayMin,
    worstStartField,
  };

  // ---- issues ------------------------------------------------------------
  const issues: EndOfDayIssues = { openedToday: 0, resolvedToday: 0, stillOpen: 0, overdue: 0, unowned: 0 };
  const openIssues: EndOfDayCarryOver["openIssues"] = [];

  for (const order of workOrders) {
    if (isSameVenueDay(order.createdAt, date, timeZone)) issues.openedToday += 1;
    if (order.closedAt && isSameVenueDay(order.closedAt, date, timeZone)) issues.resolvedToday += 1;

    const life = issueLifecycle(order, now);
    if (life.stage !== "resolved") {
      issues.stillOpen += 1;
      if (life.isOverdue) issues.overdue += 1;
      if (life.unowned) issues.unowned += 1;
      openIssues.push({
        id: order.id,
        title: order.title,
        fieldName: order.fieldId ? nameOf(order.fieldId) : "Venue-wide",
        stage: resolveIssueStage(order),
        assignedRole: order.assignedRole,
        isOverdue: life.isOverdue,
      });
    }
  }

  // ---- carry-over --------------------------------------------------------
  const carryOver: EndOfDayCarryOver = {
    openIssues,
    flaggedFields: fields.filter((f) => FLAGGED_FIELD_STATUSES.has(f.status)).map((f) => ({ name: f.name, status: f.status })),
    unfinishedGames,
    devicesOffline: assets.filter((a) => a.status === "offline" || a.status === "maintenance_needed").length,
    devicesUnknown: assets.filter((a) => a.status === "unknown").length,
  };

  // ---- notes (honest caveats + follow-ups) -------------------------------
  const notes: string[] = [];
  if (schedule.unmeasured > 0) {
    notes.push(
      `Start-time accuracy covers ${schedule.measured} of ${playable} playable game(s); ` +
        `${schedule.unmeasured} had no recorded first pitch, so they are excluded rather than assumed on time.`,
    );
  }
  if (counts.unfinished > 0) {
    notes.push(`${counts.unfinished} game(s) never reached a final — confirm the score or mark them cancelled before closing the day.`);
  }
  if (issues.stillOpen > 0) {
    notes.push(`${issues.stillOpen} issue(s) carry into tomorrow${issues.unowned > 0 ? `, ${issues.unowned} with nobody assigned` : ""}.`);
  }
  if (carryOver.flaggedFields.length > 0) {
    notes.push(`${carryOver.flaggedFields.length} field(s) are still flagged and need clearing before first pitch tomorrow.`);
  }
  if (carryOver.devicesUnknown > 0) {
    notes.push(`${carryOver.devicesUnknown} device(s) have never reported — verify them on site rather than treating them as healthy.`);
  }
  if (notes.length === 0) {
    notes.push("Clean close: every game finished, no issues carried over, no fields flagged.");
  }

  return {
    venueName: input.venueName,
    date,
    timeZone,
    generatedAt: new Date(now).toISOString(),
    games: counts,
    schedule,
    issues,
    carryOver,
    notes,
  };
}
