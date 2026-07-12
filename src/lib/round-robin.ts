// Round-robin schedule generation for house leagues: fair pairings (circle
// method), balanced home/away, slotted across fields and time windows.
// Pure logic — persistence happens in the generate action.

export type RoundRobinTeam = { name: string; teamSeasonId?: string };

export type ScheduledMatch = {
  round: number;
  home: RoundRobinTeam;
  away: RoundRobinTeam;
  fieldId: string;
  fieldName: string;
  startTime: string;
  endTime: string;
};

export function roundRobinPairings(teams: RoundRobinTeam[]): Array<Array<[RoundRobinTeam, RoundRobinTeam]>> {
  const list = [...teams];
  const bye: RoundRobinTeam | null = list.length % 2 === 1 ? { name: "__BYE__" } : null;
  if (bye) list.push(bye);
  const n = list.length;
  const rounds: Array<Array<[RoundRobinTeam, RoundRobinTeam]>> = [];
  const rotation = [...list];
  for (let round = 0; round < n - 1; round += 1) {
    const pairs: Array<[RoundRobinTeam, RoundRobinTeam]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a.name === "__BYE__" || b.name === "__BYE__") continue;
      // Alternate home/away by round so no team is always home.
      pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    // rotate all but the first element
    rotation.splice(1, 0, rotation.pop() as RoundRobinTeam);
  }
  return rounds;
}

export function buildTimeSlots(dates: string[], startTime: string, endTime: string, gameMinutes: number): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  for (const date of dates) {
    const dayStart = new Date(date + " " + startTime);
    const dayEnd = new Date(date + " " + endTime);
    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) continue;
    let cursor = dayStart;
    while (cursor.getTime() + gameMinutes * 60000 <= dayEnd.getTime()) {
      const end = new Date(cursor.getTime() + gameMinutes * 60000);
      slots.push({ start: cursor, end });
      cursor = end;
    }
  }
  return slots;
}

/**
 * Assigns round-robin pairs to (slot x field) positions in round order.
 * Within one time slot a team plays at most once (guaranteed because a round's
 * pairs are disjoint and rounds are consumed in order).
 */
export function scheduleRoundRobin(
  teams: RoundRobinTeam[],
  fields: Array<{ id: string; name: string }>,
  dates: string[],
  options: { startTime: string; endTime: string; gameMinutes: number }
): { matches: ScheduledMatch[]; unscheduled: number } {
  const rounds = roundRobinPairings(teams);
  const slots = buildTimeSlots(dates, options.startTime, options.endTime, options.gameMinutes);
  const matches: ScheduledMatch[] = [];
  let slotIndex = 0;
  let unscheduled = 0;
  for (let round = 0; round < rounds.length; round += 1) {
    let pairs = [...rounds[round]];
    while (pairs.length) {
      if (slotIndex >= slots.length) {
        unscheduled += pairs.length;
        pairs = [];
        for (let later = round + 1; later < rounds.length; later += 1) unscheduled += rounds[later].length;
        return { matches, unscheduled };
      }
      const slot = slots[slotIndex];
      const take = pairs.splice(0, fields.length);
      take.forEach(([home, away], fieldIndex) => {
        matches.push({
          round: round + 1,
          home,
          away,
          fieldId: fields[fieldIndex].id,
          fieldName: fields[fieldIndex].name,
          startTime: slot.start.toISOString(),
          endTime: slot.end.toISOString()
        });
      });
      slotIndex += 1;
    }
  }
  return { matches, unscheduled };
}
