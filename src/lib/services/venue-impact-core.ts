import type { GameRecord } from "@/lib/game-engine/game-service";
import type { WorkOrder } from "@/lib/services/work-orders";
// Relative (not "@/...") on purpose: this is a VALUE import, so it must resolve
// under the node test runner too — only type-only imports get erased. Reusing the
// Command Center's own threshold keeps "behind" meaning one thing everywhere.
import { minutesBehind, LATE_ATTENTION_THRESHOLD_MIN } from "./command-center-core.ts";

// Pilot impact / ROI (pure core).
//
// This is the artifact that turns founding venue #1 into the case study for
// venues 2-10, so it has ONE rule: every number here traces to a real row we
// actually recorded. No modelled attendance, no "hours saved x $rate", no
// projected revenue. If we can't count it, it isn't on the report — an
// invented number is worse than no number in front of a GM who knows his own
// operation (see docs/pricing-and-packaging.md).
//
// Where a judgement is unavoidable (what counts as "on time"), the threshold is
// named and shared with the Command Center rather than invented here.

export type ImpactInput = {
  games: GameRecord[];              // games at the venue in the window
  alertsPosted: number;             // rows in alerts
  familiesNotified: number;         // rows in alert_deliveries — people actually reached
  weatherHolds: number;             // alerts of type weather
  workOrders: WorkOrder[];          // field work orders raised in the window
  sponsorPlacementsDelivered: number; // from Proof-of-Performance (game-record backed)
  sponsorContracted: number;        // contracted placements across active campaigns
  engineEventsRecorded: number;     // game_events rows: score/lifecycle captured automatically
  now: number;
};

export type ImpactReport = {
  // Operations
  gamesRun: number;
  gamesCompleted: number;
  gamesOnTime: number;
  onTimeRate: number;          // 0..1 of games that reached a milestone without running materially behind
  gamesBehind: number;
  // Safety & comms
  alertsPosted: number;
  familiesNotified: number;
  weatherHolds: number;
  // Upkeep
  workOrdersOpened: number;
  workOrdersClosed: number;
  workOrderCloseRate: number;  // 0..1
  // Money we can prove
  sponsorPlacementsDelivered: number;
  sponsorContracted: number;
  sponsorDeliveryRate: number; // 0..1, capped
  // Automation actually performed
  engineEventsRecorded: number;
  automatedActions: number;    // engine events + sponsor placements + family notifications
};

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(1, numerator / denominator);
}

export function buildImpactReport(input: ImpactInput): ImpactReport {
  // "On time" is judged only on games that actually started — a scheduled game
  // that never happened is not an on-time win.
  const started = input.games.filter((g) => g.status === "active" || g.status === "final");
  const behind = started.filter((g) => minutesBehind(g, input.now) >= LATE_ATTENTION_THRESHOLD_MIN);
  const onTime = started.length - behind.length;

  const opened = input.workOrders.length;
  const closed = input.workOrders.filter((o) => o.status === "done" || Boolean(o.closedAt)).length;

  return {
    gamesRun: started.length,
    gamesCompleted: input.games.filter((g) => g.status === "final").length,
    gamesOnTime: onTime,
    onTimeRate: rate(onTime, started.length),
    gamesBehind: behind.length,

    alertsPosted: input.alertsPosted,
    familiesNotified: input.familiesNotified,
    weatherHolds: input.weatherHolds,

    workOrdersOpened: opened,
    workOrdersClosed: closed,
    workOrderCloseRate: rate(closed, opened),

    sponsorPlacementsDelivered: input.sponsorPlacementsDelivered,
    sponsorContracted: input.sponsorContracted,
    sponsorDeliveryRate: rate(input.sponsorPlacementsDelivered, input.sponsorContracted),

    engineEventsRecorded: input.engineEventsRecorded,
    automatedActions: input.engineEventsRecorded + input.sponsorPlacementsDelivered + input.familiesNotified,
  };
}

// The sentences a GM would actually repeat to his board — built from the counted
// numbers above, and only emitted when there is something real to say.
export function impactHeadlines(r: ImpactReport): string[] {
  const out: string[] = [];
  if (r.gamesRun > 0) {
    out.push(`${r.gamesRun} games run · ${Math.round(r.onTimeRate * 100)}% started on time`);
  }
  if (r.familiesNotified > 0) {
    out.push(`${r.familiesNotified} families reached automatically with delays and safety alerts`);
  }
  if (r.weatherHolds > 0) {
    out.push(`${r.weatherHolds} weather ${r.weatherHolds === 1 ? "hold" : "holds"} coordinated from one screen`);
  }
  if (r.sponsorContracted > 0) {
    out.push(`${r.sponsorPlacementsDelivered} of ${r.sponsorContracted} contracted sponsor placements delivered and proven (${Math.round(r.sponsorDeliveryRate * 100)}%)`);
  } else if (r.sponsorPlacementsDelivered > 0) {
    out.push(`${r.sponsorPlacementsDelivered} sponsor placements delivered and proven`);
  }
  if (r.workOrdersOpened > 0) {
    out.push(`${r.workOrdersClosed} of ${r.workOrdersOpened} field issues logged and closed`);
  }
  if (r.automatedActions > 0) {
    out.push(`${r.automatedActions} actions recorded automatically instead of by hand`);
  }
  return out;
}
