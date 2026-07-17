// Demo day planner (pure core).
//
// The Command Center is the hero of the walkthrough and its whole claim is "your
// whole Saturday on one screen". Seeded games go stale within days, so on demo day
// a prospect would see "0 scheduled, 0 live" — or worse, games stuck live for a
// week reading "7,000 minutes behind". This re-times demo games onto *today* so the
// board looks like a real Saturday whenever you demo.
//
// Safety: the planner only ever produces new times for session ids it is handed.
// demo-day.ts decides which ids those are, and only ever passes sessions flagged
// is_demo — a real venue's schedule can never be rewritten by this.

export type DemoStatus = "final" | "active" | "scheduled";

export type DemoSlot = {
  id: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: DemoStatus;
  behind: boolean;   // a live game overrunning its slot — the Attention Queue's "running behind"
};

const MIN = 60_000;
const GAME_MINUTES = 90;

export type DemoDayShape = {
  finals: number;
  live: number;
  behind: number; // subset of live that overrun (drives the attention queue)
  scheduled: number;
};

// A believable Saturday: some games done, a handful in progress (a couple slipping),
// the rest still to come.
export function planDemoShape(count: number): DemoDayShape {
  if (count <= 0) return { finals: 0, live: 0, behind: 0, scheduled: 0 };
  if (count <= 3) return { finals: 1, live: 1, behind: count >= 2 ? 1 : 0, scheduled: Math.max(0, count - 2) };
  const finals = Math.round(count * 0.35);
  const live = Math.max(1, Math.round(count * 0.3));
  const scheduled = Math.max(0, count - finals - live);
  return { finals, live, behind: Math.min(live, live >= 3 ? 2 : 1), scheduled };
}

export function planDemoDay(sessionIds: string[], now: number): DemoSlot[] {
  const shape = planDemoShape(sessionIds.length);
  const slots: DemoSlot[] = [];
  const iso = (ms: number) => new Date(ms).toISOString();
  let i = 0;

  // Finished this morning: started and ended before now.
  for (let n = 0; n < shape.finals && i < sessionIds.length; n++, i++) {
    const start = now - (5 * 60 + n * 45) * MIN;
    slots.push({ id: sessionIds[i], startTime: iso(start), endTime: iso(start + GAME_MINUTES * MIN), status: "final", behind: false });
  }

  // In progress right now. `behind` ones are already past their slot end, which is
  // what makes the Attention Queue light up with something worth acting on.
  for (let n = 0; n < shape.live && i < sessionIds.length; n++, i++) {
    const isBehind = n < shape.behind;
    const start = isBehind ? now - (GAME_MINUTES + 25 + n * 10) * MIN : now - (20 + n * 5) * MIN;
    slots.push({
      id: sessionIds[i],
      startTime: iso(start),
      endTime: iso(start + GAME_MINUTES * MIN),
      status: "active",
      behind: isBehind,
    });
  }

  // Still to come today.
  for (let n = 0; i < sessionIds.length; n++, i++) {
    const start = now + (40 + n * 35) * MIN;
    slots.push({ id: sessionIds[i], startTime: iso(start), endTime: iso(start + GAME_MINUTES * MIN), status: "scheduled", behind: false });
  }

  return slots;
}
